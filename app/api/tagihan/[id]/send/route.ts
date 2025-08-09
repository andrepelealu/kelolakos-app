import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { formatRupiah, formatDate } from "@/libs/formatter";
import { Resend } from "resend";
import config from "@/config";

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY is not set");
}

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAdminClient();
    const baseUrl = req.nextUrl.origin;
    
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

    if (!penghuni?.email) {
      return NextResponse.json({ 
        error: "Email penghuni tidak ditemukan. Pastikan penghuni memiliki email yang valid." 
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
    const { data: paymentGateway, error: paymentGatewayError } = await supabase
      .from("payment_gateway_settings")
      .select("*")
      .eq("kos_id", data.kos_id)
      .eq("provider", "midtrans")
      .eq("is_active", true)
      .is("deleted_at", null)
      .single();


    // Define namaKos early for use in payment link
    const namaKos = paymentInfo?.nama_kos || 'Kos Kami';

    let paymentLink = null;
    
    // Create payment link for unpaid invoices only
    const unpaidStatuses = ['menunggu_pembayaran', 'terlambat'];
    if (paymentGateway && unpaidStatuses.includes(data.status_pembayaran)) {
      console.log("Attempting to create payment link...");
      try {
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
              email: penghuni.email,
              phone: penghuni.nomor_telepon || ''
            },
            item_details: [
              {
                id: data.nomor_invoice,
                price: data.total_tagihan,
                quantity: 1,
                name: `Sewa Kamar ${data.kamar?.nomor_kamar} - ${namaKos}`
              }
            ]
          })
        });

        console.log("Payment response status:", paymentResponse.status);
        
        if (paymentResponse.ok) {
          paymentLink = await paymentResponse.json();
          console.log("Payment link created successfully:", paymentLink);
        } else {
          const errorText = await paymentResponse.text();
          console.error("Failed to create payment link:", {
            status: paymentResponse.status,
            error: errorText
          });
        }
      } catch (error) {
        console.error("Error creating payment link:", error);
      }
    } else {
      console.log("Payment link not created:", {
        hasPaymentGateway: !!paymentGateway,
        status: data.status_pembayaran,
        condition: paymentGateway && data.status_pembayaran !== 'lunas'
      });
    }

    // Generate PDF first
    const pdfResponse = await fetch(`${baseUrl}/api/tagihan/${params.id}/pdf`);
    
    if (!pdfResponse.ok) {
      return NextResponse.json({ 
        error: "Gagal membuat PDF tagihan" 
      }, { status: 500 });
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');

    // Create email content in Indonesian
    const subject = `Tagihan ${namaKos} - ${data.nomor_invoice}`;
    
    const textContent = `
Tagihan ${namaKos} - ${data.nomor_invoice}

Yth. ${penghuni.nama},

Kami mengirimkan tagihan untuk kamar ${data.kamar?.nomor_kamar} periode ini.

Detail Tagihan:
- Nomor Invoice: ${data.nomor_invoice}
- Tanggal Terbit: ${formatDate(data.tanggal_terbit)}
- Jatuh Tempo: ${formatDate(data.tanggal_jatuh_tempo)}
- Sewa Kamar: ${formatRupiah(data.kamar?.harga || 0)}
${data.add_on > 0 ? `- Layanan Tambahan: ${formatRupiah(data.add_on)}\n` : ''}${data.denda > 0 ? `- Denda: ${formatRupiah(data.denda)}\n` : ''}
TOTAL TAGIHAN: ${formatRupiah(data.total_tagihan)}

${paymentLink ? `💳 BAYAR ONLINE:
Link Pembayaran: ${paymentLink.payment_url}
Kode Order: ${paymentLink.order_id}
Berlaku sampai: ${formatDate(paymentLink.expires_at)}

ATAU

` : ''}${paymentInfo ? `INFORMASI PEMBAYARAN:

🏦 Transfer Bank:
- Bank: ${paymentInfo.bank_name}
- No. Rekening: ${paymentInfo.account_number}
- Atas Nama: ${paymentInfo.account_holder_name}

${paymentInfo.ewallet_type && paymentInfo.ewallet_number ? `📱 E-Wallet:
- Jenis: ${paymentInfo.ewallet_type}
- Nomor: ${paymentInfo.ewallet_number}
${paymentInfo.ewallet_holder_name ? `- Atas Nama: ${paymentInfo.ewallet_holder_name}\n` : ''}
` : ''}${paymentInfo.payment_notes ? `💡 Catatan Pembayaran:
${paymentInfo.payment_notes}

` : ''}` : ''}Silakan lakukan pembayaran sebelum tanggal jatuh tempo.
Hubungi pengelola kos jika Anda memiliki pertanyaan mengenai tagihan ini.

Terima kasih,
${namaKos} - Kelolakos Management System
    `;

    // Log notification to tracking system first
    const { data: notificationId, error: logError } = await supabase.rpc('log_notification', {
      p_kos_id: data.kos_id,
      p_type: 'email',
      p_content: textContent,
      p_penghuni_id: penghuni.id,
      p_tagihan_id: data.id,
      p_subject: subject,
      p_recipient_email: penghuni.email,
      p_recipient_phone: null,
      p_metadata: {
        invoice_number: data.nomor_invoice,
        has_attachment: true,
        attachment_filename: `tagihan-${data.nomor_invoice}.pdf`
      }
    });

    if (logError) {
      console.error("Error logging notification:", logError);
    } else {
      console.log("Notification logged successfully with ID:", notificationId);
    }

    // Create HTML content with tracking pixel (now that we have notificationId)
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin-bottom: 10px;">Tagihan ${namaKos}</h1>
          <p style="color: #666; font-size: 16px;">${paymentInfo?.nama_pemilik || 'Kelolakos Management System'}</p>
        </div>
        
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0 0 15px 0; font-size: 16px;">Yth. <strong>${penghuni.nama}</strong>,</p>
          <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.6;">Kami mengirimkan tagihan untuk kamar <strong>${data.kamar?.nomor_kamar}</strong> periode ini.</p>
        </div>
        
        <div style="background-color: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="color: #374151; margin-top: 0; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Detail Tagihan</h3>
          
          <div style="margin-bottom: 15px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #6b7280;">Nomor Invoice:</span>
              <strong>${data.nomor_invoice}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #6b7280;">Tanggal Terbit:</span>
              <span>${formatDate(data.tanggal_terbit)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #6b7280;">Jatuh Tempo:</span>
              <strong style="color: #dc2626;">${formatDate(data.tanggal_jatuh_tempo)}</strong>
            </div>
          </div>
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 15px; margin-bottom: 15px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #6b7280;">Sewa Kamar:</span>
              <span>${formatRupiah(data.kamar?.harga || 0)}</span>
            </div>
            ${data.add_on > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #6b7280;">Layanan Tambahan:</span>
              <span>${formatRupiah(data.add_on)}</span>
            </div>
            ` : ''}
            ${data.denda > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #dc2626;">
              <span>Denda:</span>
              <span>${formatRupiah(data.denda)}</span>
            </div>
            ` : ''}
          </div>
          
          <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 18px; font-weight: bold; color: #92400e;">Total Tagihan:</span>
              <span style="font-size: 24px; font-weight: bold; color: #92400e;">${formatRupiah(data.total_tagihan)}</span>
            </div>
          </div>
        </div>
        
        ${paymentLink ? `
        <div style="background-color: #e0f2fe; border: 2px solid #0891b2; border-radius: 8px; padding: 20px; margin-bottom: 20px; text-align: center;">
          <h4 style="color: #0c4a6e; margin-top: 0; margin-bottom: 15px; font-size: 18px;">💳 Bayar Sekarang dengan Mudah!</h4>
          <p style="margin: 0 0 20px 0; color: #0c4a6e; font-size: 14px;">Bayar tagihan Anda secara online dengan aman melalui berbagai metode pembayaran</p>
          
          <a href="${paymentLink.payment_url}" 
             style="display: inline-block; background: linear-gradient(135deg, #0891b2 0%, #0369a1 100%); 
                    color: white; text-decoration: none; padding: 15px 30px; 
                    border-radius: 8px; font-weight: bold; font-size: 16px; 
                    box-shadow: 0 4px 12px rgba(8, 145, 178, 0.3); 
                    transition: all 0.3s ease;">
            🚀 BAYAR SEKARANG
          </a>
          
          <div style="margin-top: 15px; padding: 12px; background-color: rgba(255, 255, 255, 0.7); border-radius: 6px; font-size: 12px; color: #0c4a6e;">
            <p style="margin: 0; font-weight: 600;">Kode Order: ${paymentLink.order_id}</p>
            <p style="margin: 5px 0 0 0;">Berlaku sampai: ${formatDate(paymentLink.expires_at)}</p>
          </div>
          
          <div style="margin-top: 15px; font-size: 13px; color: #0c4a6e; font-style: italic;">
            Atau gunakan metode pembayaran manual di bawah ini
          </div>
        </div>
        ` : ''}
        
${paymentInfo ? `
        <div style="background-color: #f0f9ff; border: 2px solid #0ea5e9; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h4 style="color: #0369a1; margin-top: 0; margin-bottom: 15px; text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 8px;">${paymentLink ? '🏦 INFORMASI PEMBAYARAN MANUAL' : '💳 INFORMASI PEMBAYARAN'}</h4>
          
          <div style="background-color: white; border-radius: 6px; padding: 15px; margin-bottom: 15px; border: 1px solid #e2e8f0;">
            <h5 style="color: #374151; margin: 0 0 10px 0; font-size: 16px;">🏦 Transfer Bank</h5>
            <div style="line-height: 1.6;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span style="color: #6b7280; font-size: 14px;">Bank:</span>
                <span style="color: #111827; font-weight: 600; font-size: 14px;">${paymentInfo.bank_name}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span style="color: #6b7280; font-size: 14px;">No. Rekening:</span>
                <span style="color: #92400e; font-weight: 700; font-family: 'Courier New', monospace; background-color: #fef3c7; padding: 4px 8px; border-radius: 4px; font-size: 14px;">${paymentInfo.account_number}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span style="color: #6b7280; font-size: 14px;">Atas Nama:</span>
                <span style="color: #111827; font-weight: 600; font-size: 14px;">${paymentInfo.account_holder_name}</span>
              </div>
            </div>
          </div>
          
          ${paymentInfo.ewallet_type && paymentInfo.ewallet_number ? `
          <div style="background-color: white; border-radius: 6px; padding: 15px; margin-bottom: 15px; border: 1px solid #e2e8f0;">
            <h5 style="color: #374151; margin: 0 0 10px 0; font-size: 16px;">📱 E-Wallet</h5>
            <div style="line-height: 1.6;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span style="color: #6b7280; font-size: 14px;">Jenis:</span>
                <span style="color: #111827; font-weight: 600; font-size: 14px;">${paymentInfo.ewallet_type}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span style="color: #6b7280; font-size: 14px;">Nomor:</span>
                <span style="color: #92400e; font-weight: 700; font-family: 'Courier New', monospace; background-color: #fef3c7; padding: 4px 8px; border-radius: 4px; font-size: 14px;">${paymentInfo.ewallet_number}</span>
              </div>
              ${paymentInfo.ewallet_holder_name ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span style="color: #6b7280; font-size: 14px;">Atas Nama:</span>
                <span style="color: #111827; font-weight: 600; font-size: 14px;">${paymentInfo.ewallet_holder_name}</span>
              </div>
              ` : ''}
            </div>
          </div>
          ` : ''}
          
          ${paymentInfo.payment_notes ? `
          <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; border-radius: 6px;">
            <h5 style="color: #065f46; margin: 0 0 8px 0; font-size: 14px;">💡 Catatan Pembayaran</h5>
            <p style="margin: 0; color: #374151; font-size: 13px; line-height: 1.5;">${paymentInfo.payment_notes}</p>
          </div>
          ` : `
          <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; border-radius: 6px;">
            <p style="margin: 0; color: #374151; font-size: 13px; line-height: 1.5;">
              Silakan lakukan pembayaran sebelum tanggal jatuh tempo. Hubungi pengelola kos jika Anda memiliki pertanyaan mengenai tagihan ini.
            </p>
          </div>
          `}
        </div>
        ` : `
        <div style="background-color: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h4 style="color: #0369a1; margin-top: 0; margin-bottom: 10px;">🏦 Informasi Pembayaran</h4>
          <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #0c4a6e;">
            Silakan lakukan pembayaran sebelum tanggal jatuh tempo. Hubungi pengelola kos jika Anda memiliki pertanyaan mengenai tagihan ini.
          </p>
        </div>
        `}
        
        <div style="background-color: #fef2f2; border: 1px solid #f87171; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 14px; color: #dc2626; text-align: center;">
            ⚠️ <strong>Penting:</strong> Keterlambatan pembayaran dapat dikenakan denda sesuai ketentuan yang berlaku.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">Tagihan ini dibuat secara otomatis oleh sistem</p>
          <p style="margin: 0; color: #6b7280; font-size: 14px;">${namaKos} - Kelolakos Management System</p>
        </div>
        
        <!-- Email tracking pixel -->
        ${notificationId ? `<img src="${baseUrl}/api/notifications/${notificationId}/track" width="1" height="1" style="display:none;" />` : ''}
      </div>
    `;

    // Send email with PDF attachment using Resend directly
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: config.resend.fromAdmin,
      to: penghuni.email,
      subject: subject,
      text: textContent,
      html: htmlContent,
      attachments: [
        {
          filename: `tagihan-${data.nomor_invoice}.pdf`,
          content: pdfBase64,
          contentType: 'application/pdf',
        },
      ],
    });

    if (emailError) {
      console.error("Error sending email:", emailError);
      
      // Update notification status to failed
      if (notificationId) {
        await supabase.rpc('update_notification_status', {
          p_notification_id: notificationId,
          p_status: 'failed',
          p_error_message: emailError.message
        });
      }
      
      return NextResponse.json({ 
        error: `Gagal mengirim email: ${emailError.message}` 
      }, { status: 500 });
    }

    // Update notification status to sent
    if (notificationId) {
      await supabase.rpc('update_notification_status', {
        p_notification_id: notificationId,
        p_status: 'sent',
        p_email_message_id: emailData?.id || null
      });
    }

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
      message: `Tagihan berhasil dikirim ke ${penghuni.email}`,
      emailId: emailData?.id 
    });

  } catch (error: any) {
    console.error("Send invoice error:", error);
    return NextResponse.json({ 
      error: `Gagal mengirim tagihan: ${error.message}` 
    }, { status: 500 });
  }
}
