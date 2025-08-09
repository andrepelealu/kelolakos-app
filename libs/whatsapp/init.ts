import { createAdminClient } from '@/libs/supabase/admin';
import { getWhatsAppClient } from './baileys-client';

export async function initializeWhatsAppConnections() {
  try {
    console.log('Initializing WhatsApp connections...');
    
    const supabase = createAdminClient();
    
    // Get all active WhatsApp settings
    const { data: settings, error } = await supabase
      .from('whatsapp_settings')
      .select('session_id, is_connected, connection_status')
      .eq('is_active', true)
      .is('deleted_at', null);

    if (error) {
      console.error('Error fetching WhatsApp settings:', error);
      return;
    }

    if (!settings || settings.length === 0) {
      console.log('No active WhatsApp settings found');
      return;
    }

    // Initialize clients for each active session
    for (const setting of settings) {
      console.log(`Initializing WhatsApp client for session: ${setting.session_id}`);
      
      // Just create the client instance - it will auto-restore state
      const client = getWhatsAppClient(setting.session_id);
      
      console.log(`WhatsApp client initialized for session: ${setting.session_id}`);
    }
    
    console.log('WhatsApp connections initialization completed');
  } catch (error) {
    console.error('Error initializing WhatsApp connections:', error);
  }
}

// Initialize on module load (server start)
if (typeof window === 'undefined') { // Only run on server
  // Delay initialization to ensure database is ready
  setTimeout(() => {
    initializeWhatsAppConnections().catch(console.error);
  }, 5000);
}