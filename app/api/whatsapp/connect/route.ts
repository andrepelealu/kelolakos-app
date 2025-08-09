import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { getWhatsAppClient } from "@/libs/whatsapp/baileys-client";

export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    
    // Get or create WhatsApp settings
    let { data: settings, error } = await supabase
      .from("whatsapp_settings")
      .select("*")
      .eq("session_id", "default")
      .eq("is_active", true)
      .is("deleted_at", null)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!settings) {
      // Create default settings
      const { data: newSettings, error: createError } = await supabase
        .from("whatsapp_settings")
        .insert({
          session_id: "default",
          device_name: "Kelolakos Management System",
          connection_status: "disconnected",
          auto_reconnect: true,
          is_active: true
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }
      settings = newSettings;
    }

    // Get WhatsApp client and connect
    const client = getWhatsAppClient(settings.session_id);
    
    // Start connection process (don't await it, let it run in background)
    client.connect().catch(error => {
      console.error('WhatsApp connection error:', error);
    });

    // Wait a moment for initial connection attempt
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Return initial status
    const status = client.getConnectionStatus();

    return NextResponse.json({
      success: true,
      status: status.status,
      isConnected: status.isConnected,
      phoneNumber: status.phoneNumber,
      qrCode: status.qrCode,
      message: "WhatsApp connection initiated"
    });

  } catch (error: any) {
    console.error("WhatsApp connect error:", error);
    return NextResponse.json({
      success: false,
      error: `Gagal menghubungkan WhatsApp: ${error.message}`
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    
    // Get current WhatsApp settings
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

    if (!settings) {
      return NextResponse.json({
        success: true,
        status: "disconnected",
        isConnected: false,
        phoneNumber: null,
        qrCode: null
      });
    }

    // Get client status if available
    const client = getWhatsAppClient(settings.session_id);
    const clientStatus = client.getConnectionStatus();

    // Merge database status with client status
    return NextResponse.json({
      success: true,
      status: clientStatus.status || settings.connection_status,
      isConnected: clientStatus.isConnected || settings.is_connected,
      phoneNumber: clientStatus.phoneNumber || settings.phone_number,
      qrCode: clientStatus.qrCode || settings.qr_code,
      lastConnected: settings.last_connected_at,
      autoReconnect: settings.auto_reconnect
    });

  } catch (error: any) {
    console.error("WhatsApp status error:", error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}