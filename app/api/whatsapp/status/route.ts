import { NextResponse } from "next/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { getWhatsAppClient } from "@/libs/whatsapp/baileys-client";

export async function GET() {
  try {
    const supabase = createAdminClient();
    
    // Get WhatsApp settings from database
    const { data: settings, error } = await supabase
      .from("whatsapp_settings")
      .select("*")
      .eq("session_id", "default")
      .eq("is_active", true)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      throw error;
    }

    // Get client status
    const client = getWhatsAppClient("default");
    const clientStatus = client.getConnectionStatus();

    return NextResponse.json({
      success: true,
      database: {
        exists: !!settings,
        status: settings?.connection_status || 'not_found',
        isConnected: settings?.is_connected || false,
        phoneNumber: settings?.phone_number,
        lastConnected: settings?.last_connected_at
      },
      client: {
        status: clientStatus.status,
        isConnected: clientStatus.isConnected,
        phoneNumber: clientStatus.phoneNumber,
        hasQrCode: !!clientStatus.qrCode
      },
      overall: {
        ready: clientStatus.isConnected && settings?.is_connected,
        message: clientStatus.isConnected 
          ? "WhatsApp siap digunakan" 
          : "WhatsApp tidak terhubung"
      }
    });

  } catch (error: any) {
    console.error("WhatsApp status error:", error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}