export interface WhatsAppSettings {
  id: string;
  session_id: string;
  phone_number?: string | null;
  device_name: string;
  is_connected: boolean;
  connection_status: 'connecting' | 'connected' | 'disconnected' | 'qr_required';
  last_connected_at?: string | null;
  session_data?: any;
  qr_code?: string | null;
  qr_expires_at?: string | null;
  auto_reconnect: boolean;
  is_active: boolean;
  webhook_url?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface WhatsAppMessage {
  id: string;
  whatsapp_session_id: string;
  recipient_phone: string;
  recipient_name?: string | null;
  message_type: 'text' | 'document' | 'image';
  message_content: string;
  file_url?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  tagihan_id?: string | null;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  sent_at?: string | null;
  delivered_at?: string | null;
  read_at?: string | null;
  failed_at?: string | null;
  error_message?: string | null;
  whatsapp_message_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppConnectionStatus {
  isConnected: boolean;
  status: WhatsAppSettings['connection_status'];
  phoneNumber?: string;
  qrCode?: string;
  lastConnected?: string;
}

export interface WhatsAppSendMessageRequest {
  phone: string;
  message: string;
  fileUrl?: string;
  fileName?: string;
  tagihanId?: string;
}

export interface WhatsAppSendMessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}