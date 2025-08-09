import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { removeWhatsAppClient } from "@/libs/whatsapp/baileys-client";
import fs from 'fs';
import path from 'path';

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

    // Remove the client from memory first
    removeWhatsAppClient("default");

    // Clear session files
    const authDir = path.join(process.cwd(), 'baileys_auth', 'default');
    if (fs.existsSync(authDir)) {
      console.log('Clearing WhatsApp session files...');
      try {
        // Remove all files in the auth directory
        const files = fs.readdirSync(authDir);
        for (const file of files) {
          const filePath = path.join(authDir, file);
          if (fs.lstatSync(filePath).isFile()) {
            fs.unlinkSync(filePath);
          }
        }
        console.log('Session files cleared successfully');
      } catch (cleanupError) {
        console.error('Error clearing session files:', cleanupError);
      }
    }

    // Reset database status
    if (settings) {
      const { error: updateError } = await supabase
        .from("whatsapp_settings")
        .update({
          connection_status: "disconnected",
          is_connected: false,
          phone_number: null,
          qr_code: null,
          qr_expires_at: null,
          session_data: null,
          updated_at: new Date().toISOString()
        })
        .eq("session_id", "default")
        .eq("is_active", true);

      if (updateError) {
        console.error("Error updating WhatsApp status:", updateError);
      }
    } else {
      // Create fresh settings entry
      const { error: createError } = await supabase
        .from("whatsapp_settings")
        .insert({
          session_id: "default",
          device_name: "Kelolakos Management System",
          connection_status: "disconnected",
          is_connected: false,
          auto_reconnect: true,
          is_active: true
        });

      if (createError) {
        console.error("Error creating WhatsApp settings:", createError);
      }
    }

    return NextResponse.json({
      success: true,
      message: "WhatsApp session berhasil direset. Silakan hubungkan kembali WhatsApp Anda."
    });

  } catch (error: any) {
    console.error("WhatsApp reset error:", error);
    return NextResponse.json({
      success: false,
      error: `Gagal mereset session WhatsApp: ${error.message}`
    }, { status: 500 });
  }
}