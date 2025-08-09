import type { Kos } from "./kos";
import type { Penghuni } from "./penghuni";
import type { Tagihan } from "./tagihan";

export interface Notification {
  id: string;
  kos_id: string;
  penghuni_id?: string;
  tagihan_id?: string;
  
  // Message details
  type: 'email' | 'whatsapp';
  subject?: string;
  content: string;
  recipient_email?: string;
  recipient_phone?: string;
  
  // Status tracking
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
  
  // Delivery tracking
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  failed_at?: string;
  
  // Error handling
  error_message?: string;
  retry_count: number;
  
  // External provider IDs
  external_message_id?: string;
  email_message_id?: string;
  
  // Metadata
  metadata?: Record<string, any>;
  
  // Audit fields
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  
  // Relations
  kos?: Kos;
  penghuni?: {
    id: string;
    nama: string;
    nomor_telepon: string;
    email: string;
  };
  tagihan?: {
    id: string;
    nomor_invoice: string;
    tanggal_terbit: string;
    total_tagihan: number;
  };
  receipts?: NotificationReceipt[];
}

export interface NotificationReceipt {
  id: string;
  notification_id: string;
  
  // Read tracking details
  read_at: string;
  read_from?: string;
  ip_address?: string;
  user_agent?: string;
  location?: Record<string, any>;
  
  // Audit fields
  created_at: string;
  
  // Relations
  notification?: Notification;
}

export interface NotificationTemplate {
  id: string;
  kos_id: string;
  
  // Template details
  name: string;
  type: 'email' | 'whatsapp';
  category: string;
  
  // Content
  subject?: string;
  content: string;
  
  // Template variables
  variables: string[];
  
  // Settings
  is_active: boolean;
  is_default: boolean;
  
  // Audit fields
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  
  // Relations
  kos?: Kos;
}

export interface NotificationStats {
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  read: number;
  pending: number;
  email_count: number;
  whatsapp_count: number;
  read_rate: number;
  delivery_rate: number;
}

export interface NotificationFilter {
  type?: 'email' | 'whatsapp';
  status?: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
  penghuni_id?: string;
  tagihan_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface CreateNotificationRequest {
  kos_id: string;
  penghuni_id?: string;
  tagihan_id?: string;
  type: 'email' | 'whatsapp';
  subject?: string;
  content: string;
  recipient_email?: string;
  recipient_phone?: string;
  metadata?: Record<string, any>;
}

export interface UpdateNotificationStatusRequest {
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
  external_message_id?: string;
  email_message_id?: string;
  error_message?: string;
}

export interface MarkReadRequest {
  read_from?: string;
  ip_address?: string;
  user_agent?: string;
  location?: Record<string, any>;
}