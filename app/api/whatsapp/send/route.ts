import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { getWhatsAppClient, ensureWhatsAppConnection } from "@/libs/whatsapp/baileys-client";
import { WhatsAppSendMessageRequest } from "@/types/whatsapp";

export async function POST(req: NextRequest) {
  try {
    const body: WhatsAppSendMessageRequest = await req.json();
    const { phone, message, fileUrl, fileName, tagihanId } = body;

    if (!phone || !message) {
      return NextResponse.json({
        success: false,
        error: "Phone number and message are required"
      }, { status: 400 });
    }

    const supabase = createAdminClient();
    
    // Get WhatsApp settings
    const { data: settings, error: settingsError } = await supabase
      .from("whatsapp_settings")
      .select("*")
      .eq("session_id", "default")
      .eq("is_active", true)
      .eq("is_connected", true)
      .is("deleted_at", null)
      .maybeSingle();

    if (settingsError || !settings) {
      return NextResponse.json({
        success: false,
        error: "WhatsApp tidak terhubung atau tidak aktif"
      }, { status: 400 });
    }

    // Get WhatsApp client and ensure connection
    const client = await ensureWhatsAppConnection(settings.session_id);
    
    if (!client.isConnected()) {
      return NextResponse.json({
        success: false,
        error: "WhatsApp client tidak terhubung. Silakan coba hubungkan ulang WhatsApp."
      }, { status: 400 });
    }

    // Create message record in database first
    const { data: messageRecord, error: insertError } = await supabase
      .from("whatsapp_messages")
      .insert({
        whatsapp_session_id: settings.id,
        recipient_phone: phone,
        message_type: fileUrl ? 'document' : 'text',
        message_content: message,
        file_url: fileUrl,
        file_name: fileName,
        tagihan_id: tagihanId,
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    try {
      // Send message via WhatsApp
      let filePath: string | undefined;
      if (fileUrl) {
        // For now, we'll pass the URL directly
        // In a production environment, you might want to download the file first
        filePath = fileUrl;
      }

      const whatsappMessageId = await client.sendMessage(phone, message, filePath);

      // Update message record with success status
      const { error: updateError } = await supabase
        .from("whatsapp_messages")
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          whatsapp_message_id: whatsappMessageId
        })
        .eq("id", messageRecord.id);

      if (updateError) {
        console.error("Error updating message status:", updateError);
      }

      return NextResponse.json({
        success: true,
        messageId: whatsappMessageId,
        message: "Pesan WhatsApp berhasil dikirim"
      });

    } catch (sendError: any) {
      console.error("Error sending WhatsApp message:", sendError);

      // Update message record with failed status
      const { error: updateError } = await supabase
        .from("whatsapp_messages")
        .update({
          status: 'failed',
          failed_at: new Date().toISOString(),
          error_message: sendError.message
        })
        .eq("id", messageRecord.id);

      if (updateError) {
        console.error("Error updating failed message status:", updateError);
      }

      return NextResponse.json({
        success: false,
        error: `Gagal mengirim pesan: ${sendError.message}`
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error("WhatsApp send error:", error);
    return NextResponse.json({
      success: false,
      error: `Gagal mengirim pesan WhatsApp: ${error.message}`
    }, { status: 500 });
  }
}