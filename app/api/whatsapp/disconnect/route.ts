import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { getWhatsAppClient, removeWhatsAppClient } from "@/libs/whatsapp/baileys-client";

export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    
    // Get WhatsApp settings
    const { data: settings, error } = await supabase
      .from("whatsapp_settings")
      .select("*")
      .eq("session_id", "default")
      .eq("is_active", true)
      .is("deleted_at", null)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (settings) {
      // Disconnect WhatsApp client
      const client = getWhatsAppClient(settings.session_id);
      await client.disconnect();
      
      // Remove client from memory
      removeWhatsAppClient(settings.session_id);

      // Update database status
      const { error: updateError } = await supabase
        .from("whatsapp_settings")
        .update({
          connection_status: "disconnected",
          is_connected: false,
          phone_number: null,
          qr_code: null,
          qr_expires_at: null,
          updated_at: new Date().toISOString()
        })
        .eq("session_id", "default")
        .eq("is_active", true);

      if (updateError) {
        console.error("Error updating WhatsApp status:", updateError);
      }
    }

    return NextResponse.json({
      success: true,
      message: "WhatsApp berhasil diputuskan"
    });

  } catch (error: any) {
    console.error("WhatsApp disconnect error:", error);
    return NextResponse.json({
      success: false,
      error: `Gagal memutuskan koneksi WhatsApp: ${error.message}`
    }, { status: 500 });
  }
}