import { makeWASocket, DisconnectReason, useMultiFileAuthState, WAMessageKey, WAMessage, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';
import { createAdminClient } from '@/libs/supabase/admin';
import path from 'path';
import fs from 'fs';
import pino from 'pino';

// Import initialization to ensure it runs
import './init';

export class BaileysWhatsAppClient {
  private socket: any = null;
  private qrCode: string | null = null;
  private connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'qr_required' = 'disconnected';
  private phoneNumber: string | null = null;
  private authDir: string;
  private sessionId: string;

  constructor(sessionId: string = 'default') {
    this.sessionId = sessionId;
    this.authDir = path.join(process.cwd(), 'baileys_auth', sessionId);
    
    // Create auth directory if it doesn't exist
    if (!fs.existsSync(this.authDir)) {
      fs.mkdirSync(this.authDir, { recursive: true });
    }
    
    // Try to restore connection status from database (with delay)
    setTimeout(() => {
      this.restoreConnectionState().catch(console.error);
    }, 2000);
  }

  private async restoreConnectionState(): Promise<void> {
    try {
      const supabase = createAdminClient();
      const { data: settings } = await supabase
        .from('whatsapp_settings')
        .select('connection_status, is_connected, phone_number')
        .eq('session_id', this.sessionId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .maybeSingle();

      if (settings) {
        this.connectionStatus = settings.connection_status as any;
        this.phoneNumber = settings.phone_number;
        console.log(`Restored WhatsApp state: ${this.connectionStatus}, phone: ${this.phoneNumber}`);
        
        // If database shows connected but we don't have a socket, try to reconnect
        if (settings.is_connected && this.connectionStatus === 'connected' && !this.socket) {
          console.log('Database shows connected but no socket found, attempting to reconnect...');
          setTimeout(() => this.connect().catch(console.error), 2000);
        }
      }
    } catch (error) {
      console.error('Error restoring WhatsApp connection state:', error);
    }
  }

  async connect(): Promise<void> {
    try {
      console.log('Initializing WhatsApp connection...');
      this.connectionStatus = 'connecting';
      await this.updateDatabaseStatus();

      const { state, saveCreds } = await useMultiFileAuthState(this.authDir);
      
      // Get latest Baileys version
      const { version, isLatest } = await fetchLatestBaileysVersion();
      console.log(`Using WA v${version.join('.')}, isLatest: ${isLatest}`);

      // Create logger with minimal output
      const logger = pino({ 
        level: 'error' // Only show errors
      });

      this.socket = makeWASocket({
        version,
        logger,
        auth: state,
        printQRInTerminal: false,
        browser: ['Kelolakos Management System', 'Chrome', '122.0.0'],
        generateHighQualityLinkPreview: false,
        syncFullHistory: false,
        markOnlineOnConnect: false,
        fireInitQueries: false,
        emitOwnEvents: false,
        defaultQueryTimeoutMs: 30000,
        keepAliveIntervalMs: 30000,
        connectTimeoutMs: 30000,
        qrTimeout: 60000,
        retryRequestDelayMs: 1000,
        maxMsgRetryCount: 3,
        shouldIgnoreJid: () => false,
        shouldSyncHistoryMessage: () => false,
        getMessage: async () => undefined
      });

      // Handle connection updates
      this.socket.ev.on('connection.update', async (update: any) => {
        const { connection, lastDisconnect, qr, receivedPendingNotifications } = update;
        console.log('Connection update:', { connection, qr: !!qr });

        if (qr) {
          console.log('QR Code received, generating image...');
          try {
            this.qrCode = await QRCode.toDataURL(qr);
            this.connectionStatus = 'qr_required';
            await this.updateDatabaseStatus();
            console.log('QR Code generated and saved to database');
          } catch (qrError) {
            console.error('QR Code generation error:', qrError);
          }
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const errorMessage = lastDisconnect?.error?.message || '';
          
          console.log('Connection closed due to:', {
            error: errorMessage,
            statusCode,
            disconnectReason: statusCode
          });

          // Don't reconnect for these specific conditions
          const shouldNotReconnect = 
            statusCode === DisconnectReason.loggedOut ||
            statusCode === DisconnectReason.badSession ||
            statusCode === 440 || // Conflict error
            errorMessage.includes('conflict') ||
            errorMessage.includes('replaced');

          if (shouldNotReconnect) {
            console.log('Not reconnecting due to:', errorMessage || statusCode);
            this.connectionStatus = 'disconnected';
            this.phoneNumber = null;
            this.qrCode = null;
            await this.updateDatabaseStatus();
          } else {
            // Only reconnect for network issues or temporary problems
            this.connectionStatus = 'connecting';
            await this.updateDatabaseStatus();
            console.log('Attempting to reconnect in 10 seconds...');
            setTimeout(() => {
              this.connect().catch(error => {
                console.error('Reconnection failed:', error);
                this.connectionStatus = 'disconnected';
                this.updateDatabaseStatus();
              });
            }, 10000); // Increased delay to 10 seconds
          }
        } else if (connection === 'open') {
          console.log('WhatsApp connection opened successfully');
          this.connectionStatus = 'connected';
          this.qrCode = null;
          
          // Get phone number
          if (this.socket.user) {
            this.phoneNumber = this.socket.user.id.split(':')[0];
            console.log('Connected with phone number:', this.phoneNumber);
          }
          
          await this.updateDatabaseStatus();
        } else if (connection === 'connecting') {
          console.log('WhatsApp is connecting...');
          this.connectionStatus = 'connecting';
          await this.updateDatabaseStatus();
        }
      });

      // Handle credentials update
      this.socket.ev.on('creds.update', saveCreds);

      // Handle messages (for future message handling)
      this.socket.ev.on('messages.upsert', async (m: any) => {
        console.log('Received messages:', JSON.stringify(m, undefined, 2));
      });

      // Handle message updates (delivery and read receipts)
      this.socket.ev.on('messages.update', async (messageUpdates: any[]) => {
        console.log('Message updates received:', JSON.stringify(messageUpdates, undefined, 2));
        
        for (const update of messageUpdates) {
          try {
            await this.handleMessageStatusUpdate(update);
          } catch (error) {
            console.error('Error handling message status update:', error);
          }
        }
      });

      // Handle message receipts (read receipts)
      this.socket.ev.on('message-receipt.update', async (receipts: any[]) => {
        console.log('Message receipts received:', JSON.stringify(receipts, undefined, 2));
        
        for (const receipt of receipts) {
          try {
            await this.handleMessageReceipt(receipt);
          } catch (error) {
            console.error('Error handling message receipt:', error);
          }
        }
      });

    } catch (error: any) {
      console.error('Error connecting to WhatsApp:', error);
      this.connectionStatus = 'disconnected';
      await this.updateDatabaseStatus();
      
      // Don't throw the error, just log it and update status
      // This prevents the API from returning 500 errors for connection issues
      console.log('Connection attempt failed, but continuing...');
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.socket) {
        await this.socket.logout();
        this.socket = null;
      }
      this.connectionStatus = 'disconnected';
      this.phoneNumber = null;
      this.qrCode = null;
      await this.updateDatabaseStatus();
      console.log('WhatsApp disconnected successfully');
    } catch (error) {
      console.error('Error disconnecting from WhatsApp:', error);
      throw error;
    }
  }

  async sendMessage(phone: string, message: string, filePath?: string, fileName?: string): Promise<string | null> {
    try {
      if (!this.socket || this.connectionStatus !== 'connected') {
        throw new Error('WhatsApp not connected');
      }

      // Format phone number - handle both international and local formats
      let formattedPhone = phone.replace(/\D/g, ''); // Remove all non-digits
      
      // If doesn't start with country code, assume Indonesian (+62)
      if (!formattedPhone.startsWith('62') && formattedPhone.startsWith('0')) {
        formattedPhone = '62' + formattedPhone.substring(1);
      } else if (!formattedPhone.startsWith('62') && !formattedPhone.startsWith('1')) {
        formattedPhone = '62' + formattedPhone;
      }
      
      const jid = `${formattedPhone}@s.whatsapp.net`;
      console.log(`Sending WhatsApp message to: ${jid}`);

      let messageResponse;

      if (filePath && fs.existsSync(filePath)) {
        // Send document
        console.log(`Sending document: ${filePath}`);
        messageResponse = await this.socket.sendMessage(jid, {
          document: fs.readFileSync(filePath),
          fileName: fileName || path.basename(filePath),
          caption: message,
          mimetype: 'application/pdf'
        });
      } else {
        // Send text message
        console.log('Sending text message');
        messageResponse = await this.socket.sendMessage(jid, {
          text: message,
        });
      }

      console.log('Message sent successfully:', messageResponse.key.id);
      return messageResponse.key.id;

    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      throw error;
    }
  }

  private async updateDatabaseStatus(): Promise<void> {
    try {
      const supabase = createAdminClient();
      
      const updateData: any = {
        connection_status: this.connectionStatus,
        is_connected: this.connectionStatus === 'connected',
        updated_at: new Date().toISOString(),
      };

      if (this.connectionStatus === 'connected') {
        updateData.last_connected_at = new Date().toISOString();
        updateData.phone_number = this.phoneNumber;
      }

      if (this.qrCode) {
        updateData.qr_code = this.qrCode;
        updateData.qr_expires_at = new Date(Date.now() + 2 * 60 * 1000).toISOString(); // 2 minutes from now
      } else if (this.connectionStatus === 'connected') {
        updateData.qr_code = null;
        updateData.qr_expires_at = null;
      }

      const { error } = await supabase
        .from('whatsapp_settings')
        .update(updateData)
        .eq('session_id', this.sessionId)
        .eq('is_active', true);

      if (error) {
        console.error('Error updating WhatsApp status in database:', error);
      }
    } catch (error) {
      console.error('Error updating database status:', error);
    }
  }

  getConnectionStatus() {
    return {
      isConnected: this.connectionStatus === 'connected',
      status: this.connectionStatus,
      phoneNumber: this.phoneNumber,
      qrCode: this.qrCode,
    };
  }

  isConnected(): boolean {
    const connected = this.connectionStatus === 'connected' && this.socket;
    console.log(`WhatsApp connection check: status=${this.connectionStatus}, hasSocket=${!!this.socket}, isConnected=${connected}`);
    return connected;
  }

  getQRCode(): string | null {
    return this.qrCode;
  }

  private async handleMessageStatusUpdate(update: any): Promise<void> {
    try {
      const { key, update: messageUpdate } = update;
      const messageId = key?.id;
      
      if (!messageId) return;

      const supabase = createAdminClient();
      
      // Check if this is one of our sent messages
      const { data: notifications } = await supabase
        .from('notifications')
        .select('id')
        .eq('external_message_id', messageId)
        .eq('type', 'whatsapp')
        .is('deleted_at', null);

      if (!notifications || notifications.length === 0) return;

      // Handle status updates
      if (messageUpdate.status) {
        let newStatus = 'sent';
        
        switch (messageUpdate.status) {
          case 2: // delivered
            newStatus = 'delivered';
            break;
          case 3: // read
            newStatus = 'read';
            break;
          case 1: // sent/pending
            newStatus = 'sent';
            break;
          default:
            return; // Unknown status
        }

        // Update notification status
        for (const notification of notifications) {
          await supabase.rpc('update_notification_status', {
            p_notification_id: notification.id,
            p_status: newStatus
          });
          
          // If read, also create a receipt
          if (newStatus === 'read') {
            await supabase.rpc('mark_notification_read', {
              p_notification_id: notification.id,
              p_read_from: 'whatsapp_mobile',
              p_ip_address: null,
              p_user_agent: 'WhatsApp Mobile',
              p_location: null
            });
          }
        }

        console.log(`Updated WhatsApp message ${messageId} status to: ${newStatus}`);
      }
    } catch (error) {
      console.error('Error handling WhatsApp message status update:', error);
    }
  }

  private async handleMessageReceipt(receipt: any): Promise<void> {
    try {
      const { key, receipt: receiptUpdate } = receipt;
      const messageId = key?.id;
      
      if (!messageId || !receiptUpdate) return;

      const supabase = createAdminClient();
      
      // Check if this is one of our sent messages
      const { data: notifications } = await supabase
        .from('notifications')
        .select('id')
        .eq('external_message_id', messageId)
        .eq('type', 'whatsapp')
        .is('deleted_at', null);

      if (!notifications || notifications.length === 0) return;

      // Handle read receipts
      if (receiptUpdate.readTimestamp) {
        for (const notification of notifications) {
          // Update status to read
          await supabase.rpc('update_notification_status', {
            p_notification_id: notification.id,
            p_status: 'read'
          });
          
          // Create read receipt
          await supabase.rpc('mark_notification_read', {
            p_notification_id: notification.id,
            p_read_from: 'whatsapp_mobile',
            p_ip_address: null,
            p_user_agent: 'WhatsApp Mobile',
            p_location: null
          });
        }

        console.log(`WhatsApp message ${messageId} marked as read via receipt`);
      }
    } catch (error) {
      console.error('Error handling WhatsApp message receipt:', error);
    }
  }
}

// Global instance management
const whatsappClients = new Map<string, BaileysWhatsAppClient>();

export function getWhatsAppClient(sessionId: string = 'default'): BaileysWhatsAppClient {
  if (!whatsappClients.has(sessionId)) {
    console.log(`Creating new WhatsApp client for session: ${sessionId}`);
    whatsappClients.set(sessionId, new BaileysWhatsAppClient(sessionId));
  } else {
    console.log(`Using existing WhatsApp client for session: ${sessionId}`);
  }
  return whatsappClients.get(sessionId)!;
}

export function removeWhatsAppClient(sessionId: string = 'default'): void {
  const client = whatsappClients.get(sessionId);
  if (client) {
    client.disconnect().catch(console.error);
    whatsappClients.delete(sessionId);
  }
}

export async function ensureWhatsAppConnection(sessionId: string = 'default'): Promise<BaileysWhatsAppClient> {
  const client = getWhatsAppClient(sessionId);
  
  // If client is not connected, check database and possibly reconnect
  if (!client.isConnected()) {
    console.log('Client not connected, checking database status...');
    
    try {
      const supabase = createAdminClient();
      const { data: settings } = await supabase
        .from('whatsapp_settings')
        .select('is_connected, connection_status')
        .eq('session_id', sessionId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .maybeSingle();

      if (settings?.is_connected && settings.connection_status === 'connected') {
        console.log('Database shows connected, attempting to restore connection...');
        await client.connect();
        
        // Wait a moment for connection to establish
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error('Error checking WhatsApp connection state:', error);
    }
  }
  
  return client;
}