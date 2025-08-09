import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { formatRupiah, formatDate } from "@/libs/formatter";
import { ensureWhatsAppConnection } from "@/libs/whatsapp/baileys-client";
import "@/libs/temp-init"; // Ensure temp directory exists

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAdminClient();
    
    // Get invoice data with related information
    const { data, error } = await supabase
      .from("tagihan")
      .select(`
        *,
        kamar:kamar_id(nomor_kamar, harga),
        add_ons:tagihan_addon(qty, add_on:add_on_id(nama, harga, satuan))
      `)
      .eq("id", params.id)
      .is("deleted_at", null)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Tagihan tidak ditemukan" },
        { status: 404 }
      );
    }

    // Get tenant information
    const penghuniRes = await supabase
      .from("penghuni")
      .select("id,nama,email,nomor_telepon,kamar_id")
      .eq("kamar_id", data.kamar_id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const penghuni = penghuniRes.data;

    if (!penghuni?.nomor_telepon) {
      return NextResponse.json({ 
        error: "Nomor WhatsApp penghuni tidak ditemukan. Pastikan penghuni memiliki nomor telepon yang valid." 
      }, { status: 400 });
    }

    // Get payment information
    const { data: paymentInfo } = await supabase
      .from("payment_info")
      .select("*")
      .eq("is_primary", true)
      .eq("is_active", true)
      .is("deleted_at", null)
      .maybeSingle();

    // Check if payment gateway is enabled
    const { data: paymentGateway } = await supabase
      .from("payment_gateway_settings")
      .select("*")
      .eq("kos_id", data.kos_id)
      .eq("provider", "midtrans")
      .eq("is_active", true)
      .is("deleted_at", null)
      .single();

    let paymentLink = null;
    
    // Create payment link for unpaid invoices only
    const unpaidStatuses = ['menunggu_pembayaran', 'terlambat'];
    if (paymentGateway && unpaidStatuses.includes(data.status_pembayaran)) {
      try {
        const baseUrl = req.nextUrl.origin;
        const paymentResponse = await fetch(`${baseUrl}/api/payment-gateway/create-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-server-request': 'true',
          },
          body: JSON.stringify({
            tagihan_id: data.id,
            customer_details: {
              first_name: penghuni.nama.split(' ')[0],
              last_name: penghuni.nama.split(' ').slice(1).join(' ') || '',
              email: penghuni.email || 'noemail@example.com',
              phone: penghuni.nomor_telepon
            },
            item_details: [
              {
                id: data.nomor_invoice,
                price: data.total_tagihan,
                quantity: 1,
                name: `Sewa Kamar ${data.kamar?.nomor_kamar} - ${paymentInfo?.nama_kos || 'Kos'}`
              }
            ]
          })
        });

        if (paymentResponse.ok) {
          paymentLink = await paymentResponse.json();
        } else {
          console.error("Failed to create payment link for WhatsApp:", await paymentResponse.text());
        }
      } catch (error) {
        console.error("Error creating payment link for WhatsApp:", error);
      }
    }

    // Check WhatsApp connection status
    const { data: whatsappSettings, error: whatsappError } = await supabase
      .from("whatsapp_settings")
      .select("*")
      .eq("session_id", "default")
      .eq("is_active", true)
      .eq("is_connected", true)
      .is("deleted_at", null)
      .maybeSingle();

    if (whatsappError || !whatsappSettings) {
      return NextResponse.json({
        error: "WhatsApp tidak terhubung. Silakan hubungkan WhatsApp terlebih dahulu di Setting WhatsApp."
      }, { status: 400 });
    }

    // Get WhatsApp client and ensure connection
    const client = await ensureWhatsAppConnection(whatsappSettings.session_id);
    
    if (!client.isConnected()) {
      return NextResponse.json({
        error: "WhatsApp client tidak terhubung. Silakan coba hubungkan ulang WhatsApp di Setting WhatsApp."
      }, { status: 400 });
    }

    // Generate PDF first to get the file
    const baseUrl = req.nextUrl.origin;
    console.log('Generating PDF for invoice:', data.nomor_invoice);
    const pdfResponse = await fetch(`${baseUrl}/api/tagihan/${params.id}/pdf`);
    
    if (!pdfResponse.ok) {
      const errorText = await pdfResponse.text();
      console.error('PDF generation failed:', pdfResponse.status, errorText);
      return NextResponse.json({ 
        error: "Gagal membuat PDF tagihan" 
      }, { status: 500 });
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    console.log('PDF generated successfully, size:', pdfBuffer.byteLength, 'bytes');
    
    // Save PDF temporarily for WhatsApp sending
    const fs = require('fs');
    const path = require('path');
    const tempDir = path.join(process.cwd(), 'temp');
    
    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      console.log('Creating temp directory:', tempDir);
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const tempFileName = `invoice-${data.nomor_invoice.replace(/\//g, '-')}-${Date.now()}.pdf`;
    const tempFilePath = path.join(tempDir, tempFileName);
    
    console.log('Saving PDF to temp file:', tempFilePath);
    fs.writeFileSync(tempFilePath, Buffer.from(pdfBuffer));
    
    // Verify file was created
    if (!fs.existsSync(tempFilePath)) {
      throw new Error(`Failed to create temp PDF file: ${tempFilePath}`);
    }
    console.log('PDF temp file created successfully:', tempFilePath);

    // Create WhatsApp message content
    const namaKos = paymentInfo?.nama_kos || 'Kos Kami';
    const messageContent = `🏠 *TAGIHAN ${namaKos.toUpperCase()}*

Yth. ${penghuni.nama},

Berikut adalah tagihan untuk kamar *${data.kamar?.nomor_kamar}* periode ini:

*📋 DETAIL TAGIHAN*
• Invoice: ${data.nomor_invoice}
• Tanggal Terbit: ${formatDate(data.tanggal_terbit)}
• Jatuh Tempo: ${formatDate(data.tanggal_jatuh_tempo)}
• Sewa Kamar: ${formatRupiah(data.kamar?.harga || 0)}
${data.add_on > 0 ? `• Layanan Tambahan: ${formatRupiah(data.add_on)}\n` : ''}${data.denda > 0 ? `• Denda: ${formatRupiah(data.denda)}\n` : ''}
*💰 TOTAL TAGIHAN: ${formatRupiah(data.total_tagihan)}*

${paymentLink ? `🚀 *BAYAR ONLINE SEKARANG*

Untuk kemudahan pembayaran, Anda dapat membayar secara online dengan berbagai metode:

📱 *Cara Bayar Online:*
1. Klik link berikut: ${paymentLink.payment_url}
2. Pilih metode pembayaran yang Anda inginkan
3. Ikuti petunjuk pembayaran
4. Tagihan akan otomatis terbayar setelah berhasil

✅ *Metode yang tersedia:*
• Kartu Kredit/Debit
• Transfer Bank (BCA, Mandiri, BNI, dll)
• E-Wallet (GoPay, OVO, DANA, dll)
• ATM/Internet Banking

⏰ *Penting:*
• Kode Order: ${paymentLink.order_id}
• Berlaku sampai: ${formatDate(paymentLink.expires_at)}

➖➖➖➖➖➖➖➖➖➖

*ATAU BAYAR MANUAL:*

` : ''}${paymentInfo ? `*💳 INFORMASI PEMBAYARAN${paymentLink ? ' MANUAL' : ''}*

*🏦 Transfer Bank:*
Bank: ${paymentInfo.bank_name}
No. Rekening: ${paymentInfo.account_number}
Atas Nama: ${paymentInfo.account_holder_name}

${paymentInfo.ewallet_type && paymentInfo.ewallet_number ? `*📱 E-Wallet:*
Jenis: ${paymentInfo.ewallet_type}
Nomor: ${paymentInfo.ewallet_number}
${paymentInfo.ewallet_holder_name ? `Atas Nama: ${paymentInfo.ewallet_holder_name}\n` : ''}
` : ''}${paymentInfo.payment_notes ? `*💡 Catatan Pembayaran:*
${paymentInfo.payment_notes}

` : ''}` : ''}Silakan lakukan pembayaran sebelum tanggal jatuh tempo.

⚠️ *Penting:* Keterlambatan pembayaran dapat dikenakan denda sesuai ketentuan yang berlaku.

Terima kasih atas perhatiannya.

_Pesan ini dikirim otomatis oleh ${namaKos} melalui Kelolakos Management System_`;

    // Log notification to tracking system first
    const { data: notificationId, error: logError } = await supabase.rpc('log_notification', {
      p_kos_id: data.kos_id,
      p_type: 'whatsapp',
      p_content: messageContent,
      p_penghuni_id: penghuni.id,
      p_tagihan_id: data.id,
      p_subject: null,
      p_recipient_email: null,
      p_recipient_phone: penghuni.nomor_telepon,
      p_metadata: {
        invoice_number: data.nomor_invoice,
        has_attachment: true,
        attachment_filename: `tagihan-${data.nomor_invoice}.pdf`,
        message_type: 'document'
      }
    });

    if (logError) {
      console.error("Error logging notification:", logError);
    }

    try {
      // Verify temp file exists before sending
      if (!fs.existsSync(tempFilePath)) {
        throw new Error(`Temp file not found: ${tempFilePath}`);
      }

      console.log('Sending WhatsApp message with attachment to:', penghuni.nomor_telepon);
      
      // Send WhatsApp message with PDF attachment
      const whatsappMessageId = await client.sendMessage(
        penghuni.nomor_telepon,
        messageContent,
        tempFilePath,
        `tagihan-${data.nomor_invoice.replace(/\//g, '-')}.pdf`
      );

      // Update notification status to sent
      if (notificationId) {
        await supabase.rpc('update_notification_status', {
          p_notification_id: notificationId,
          p_status: 'sent',
          p_external_message_id: whatsappMessageId
        });
      }

      // Log message to legacy database (keep for backward compatibility)
      const { error: legacyLogError } = await supabase
        .from("whatsapp_messages")
        .insert({
          whatsapp_session_id: whatsappSettings.id,
          recipient_phone: penghuni.nomor_telepon,
          recipient_name: penghuni.nama,
          message_type: 'document',
          message_content: messageContent,
          file_name: `tagihan-${data.nomor_invoice}.pdf`,
          tagihan_id: data.id,
          status: 'sent',
          sent_at: new Date().toISOString(),
          whatsapp_message_id: whatsappMessageId
        });

      if (legacyLogError) {
        console.error("Error logging WhatsApp message to legacy table:", legacyLogError);
      }

      // Clean up temporary file
      setTimeout(() => {
        try {
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
            console.log('Temp file cleaned up:', tempFilePath);
          }
        } catch (err) {
          console.error("Error deleting temp file:", err);
        }
      }, 10000); // Wait longer before cleanup

      // Update invoice status to 'menunggu_pembayaran' if it's currently 'draft'
      if (data.status_pembayaran === 'draft') {
        await supabase
          .from("tagihan")
          .update({ 
            status_pembayaran: 'menunggu_pembayaran',
            updated_at: new Date().toISOString()
          })
          .eq("id", params.id);
      }

      return NextResponse.json({ 
        success: true,
        message: `Tagihan berhasil dikirim via WhatsApp ke ${penghuni.nomor_telepon}`,
        whatsappMessageId: whatsappMessageId
      });

    } catch (whatsappError: any) {
      console.error("WhatsApp send error:", whatsappError);

      // Update notification status to failed
      if (notificationId) {
        await supabase.rpc('update_notification_status', {
          p_notification_id: notificationId,
          p_status: 'failed',
          p_error_message: whatsappError.message
        });
      }

      // Log failed message to legacy database (keep for backward compatibility)
      const { error: legacyLogError } = await supabase
        .from("whatsapp_messages")
        .insert({
          whatsapp_session_id: whatsappSettings.id,
          recipient_phone: penghuni.nomor_telepon,
          recipient_name: penghuni.nama,
          message_type: 'document',
          message_content: messageContent,
          file_name: `tagihan-${data.nomor_invoice}.pdf`,
          tagihan_id: data.id,
          status: 'failed',
          failed_at: new Date().toISOString(),
          error_message: whatsappError.message
        });

      if (legacyLogError) {
        console.error("Error logging failed WhatsApp message to legacy table:", legacyLogError);
      }

      // Clean up temporary file
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
          console.log('Temp file cleaned up after error:', tempFilePath);
        }
      } catch (err) {
        console.error("Error deleting temp file:", err);
      }

      return NextResponse.json({
        success: false,
        error: `Gagal mengirim pesan WhatsApp: ${whatsappError.message}`
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Send WhatsApp invoice error:", error);
    return NextResponse.json({ 
      error: `Gagal mengirim tagihan via WhatsApp: ${error.message}` 
    }, { status: 500 });
  }
}