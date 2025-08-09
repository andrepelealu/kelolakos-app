-- Migration: Add notification tracking system
-- This migration creates tables to track email and WhatsApp message status

-- Create notifications table for tracking all messages
CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kos_id UUID NOT NULL,
  penghuni_id UUID,
  tagihan_id UUID,
  
  -- Message details
  type VARCHAR(20) NOT NULL CHECK (type IN ('email', 'whatsapp')),
  subject VARCHAR(500),
  content TEXT,
  recipient_email VARCHAR(255),
  recipient_phone VARCHAR(50),
  
  -- Status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'read')),
  
  -- Delivery tracking
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  
  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- External provider IDs for tracking
  external_message_id VARCHAR(255), -- For WhatsApp message ID
  email_message_id VARCHAR(255),    -- For email service message ID
  
  -- Metadata
  metadata JSONB, -- For storing additional data like template info, attachments, etc.
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  
  -- Foreign key constraints
  CONSTRAINT fk_notifications_kos FOREIGN KEY (kos_id) REFERENCES public.kos(id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_penghuni FOREIGN KEY (penghuni_id) REFERENCES public.penghuni(id) ON DELETE SET NULL,
  CONSTRAINT fk_notifications_tagihan FOREIGN KEY (tagihan_id) REFERENCES public.tagihan(id) ON DELETE SET NULL
);

-- Create notification read receipts table for detailed tracking
CREATE TABLE public.notification_receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id UUID NOT NULL,
  
  -- Read tracking details
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_from VARCHAR(100), -- 'email_client', 'whatsapp_mobile', 'whatsapp_web', etc.
  ip_address INET,
  user_agent TEXT,
  
  -- Location data (optional)
  location JSONB,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign key constraint
  CONSTRAINT fk_receipts_notification FOREIGN KEY (notification_id) REFERENCES public.notifications(id) ON DELETE CASCADE
);

-- Create notification templates table for reusable content
CREATE TABLE public.notification_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kos_id UUID NOT NULL,
  
  -- Template details
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('email', 'whatsapp')),
  category VARCHAR(50) NOT NULL, -- 'tagihan', 'reminder', 'welcome', 'payment_confirmation', etc.
  
  -- Content
  subject VARCHAR(500), -- For email templates
  content TEXT NOT NULL,
  
  -- Template variables (JSON array of variable names)
  variables JSONB DEFAULT '[]'::jsonb,
  
  -- Settings
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  
  -- Foreign key constraint
  CONSTRAINT fk_templates_kos FOREIGN KEY (kos_id) REFERENCES public.kos(id) ON DELETE CASCADE,
  
  -- Unique constraint for default templates
  CONSTRAINT unique_default_template UNIQUE (kos_id, type, category, is_default) 
    DEFERRABLE INITIALLY DEFERRED
);

-- Create partial unique index for default templates (only when is_default = true)
CREATE UNIQUE INDEX idx_unique_default_template 
ON public.notification_templates (kos_id, type, category) 
WHERE is_default = true AND deleted_at IS NULL;

-- Create indexes for better performance
CREATE INDEX idx_notifications_kos_id ON public.notifications(kos_id);
CREATE INDEX idx_notifications_penghuni_id ON public.notifications(penghuni_id);
CREATE INDEX idx_notifications_tagihan_id ON public.notifications(tagihan_id);
CREATE INDEX idx_notifications_type ON public.notifications(type);
CREATE INDEX idx_notifications_status ON public.notifications(status);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at);
CREATE INDEX idx_notifications_sent_at ON public.notifications(sent_at);
CREATE INDEX idx_notifications_deleted_at ON public.notifications(deleted_at);

CREATE INDEX idx_receipts_notification_id ON public.notification_receipts(notification_id);
CREATE INDEX idx_receipts_read_at ON public.notification_receipts(read_at);

CREATE INDEX idx_templates_kos_id ON public.notification_templates(kos_id);
CREATE INDEX idx_templates_type_category ON public.notification_templates(type, category);
CREATE INDEX idx_templates_deleted_at ON public.notification_templates(deleted_at);

-- Enable Row Level Security (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for notifications
CREATE POLICY "Users can only access notifications from their kos" ON public.notifications
  FOR ALL USING (
    kos_id IN (
      SELECT id FROM public.kos WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

-- Create RLS policies for notification receipts
CREATE POLICY "Users can only access receipts from their notifications" ON public.notification_receipts
  FOR ALL USING (
    notification_id IN (
      SELECT n.id FROM public.notifications n
      JOIN public.kos k ON n.kos_id = k.id
      WHERE k.user_id = auth.uid() AND k.deleted_at IS NULL
    )
  );

-- Create RLS policies for notification templates
CREATE POLICY "Users can only access templates from their kos" ON public.notification_templates
  FOR ALL USING (
    kos_id IN (
      SELECT id FROM public.kos WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notifications_updated_at 
  BEFORE UPDATE ON public.notifications 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at 
  BEFORE UPDATE ON public.notification_templates 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Note: Default templates will be created automatically for each kos via trigger function below

-- Create function to automatically create default templates for new kos
CREATE OR REPLACE FUNCTION create_default_notification_templates()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default WhatsApp tagihan template
  INSERT INTO public.notification_templates (kos_id, name, type, category, content, variables, is_default)
  VALUES (
    NEW.id,
    'Template Tagihan WhatsApp',
    'whatsapp',
    'tagihan',
    'Halo {{nama_penghuni}}, tagihan kos bulan {{bulan}} sebesar {{total_tagihan}} sudah tersedia. Mohon segera lakukan pembayaran sebelum {{tanggal_jatuh_tempo}}. Terima kasih!',
    '["nama_penghuni", "bulan", "total_tagihan", "tanggal_jatuh_tempo"]'::jsonb,
    true
  );
  
  -- Create default Email tagihan template
  INSERT INTO public.notification_templates (kos_id, name, type, category, subject, content, variables, is_default)
  VALUES (
    NEW.id,
    'Template Tagihan Email',
    'email',
    'tagihan',
    'Tagihan Kos {{bulan}}',
    'Kepada Yth. {{nama_penghuni}},

Tagihan kos untuk bulan {{bulan}} telah tersedia dengan rincian:

Nomor Kamar: {{nomor_kamar}}
Periode: {{periode}}
Total Tagihan: {{total_tagihan}}
Jatuh Tempo: {{tanggal_jatuh_tempo}}

Silakan lakukan pembayaran sesuai jadwal.

Terima kasih.',
    '["nama_penghuni", "bulan", "nomor_kamar", "periode", "total_tagihan", "tanggal_jatuh_tempo"]'::jsonb,
    true
  );
  
  -- Create default WhatsApp reminder template
  INSERT INTO public.notification_templates (kos_id, name, type, category, content, variables, is_default)
  VALUES (
    NEW.id,
    'Template Pengingat WhatsApp',
    'whatsapp',
    'reminder',
    'Pengingat: Tagihan kos bulan {{bulan}} sebesar {{total_tagihan}} akan jatuh tempo pada {{tanggal_jatuh_tempo}}. Mohon segera lakukan pembayaran. Terima kasih!',
    '["bulan", "total_tagihan", "tanggal_jatuh_tempo"]'::jsonb,
    true
  );

  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-create templates for new kos
CREATE TRIGGER create_default_templates_trigger
  AFTER INSERT ON public.kos
  FOR EACH ROW EXECUTE FUNCTION create_default_notification_templates();

-- Create function to log notifications
CREATE OR REPLACE FUNCTION log_notification(
  p_kos_id UUID,
  p_type VARCHAR(20),
  p_content TEXT,
  p_penghuni_id UUID DEFAULT NULL,
  p_tagihan_id UUID DEFAULT NULL,
  p_subject VARCHAR(500) DEFAULT NULL,
  p_recipient_email VARCHAR(255) DEFAULT NULL,
  p_recipient_phone VARCHAR(50) DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (
    kos_id, penghuni_id, tagihan_id, type, subject, content,
    recipient_email, recipient_phone, metadata, status
  ) VALUES (
    p_kos_id, p_penghuni_id, p_tagihan_id, p_type, p_subject, p_content,
    p_recipient_email, p_recipient_phone, p_metadata, 'pending'
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ language 'plpgsql';

-- Create function to update notification status
CREATE OR REPLACE FUNCTION update_notification_status(
  p_notification_id UUID,
  p_status VARCHAR(20),
  p_external_message_id VARCHAR(255) DEFAULT NULL,
  p_email_message_id VARCHAR(255) DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.notifications 
  SET 
    status = p_status,
    external_message_id = COALESCE(p_external_message_id, external_message_id),
    email_message_id = COALESCE(p_email_message_id, email_message_id),
    error_message = COALESCE(p_error_message, error_message),
    sent_at = CASE WHEN p_status = 'sent' THEN NOW() ELSE sent_at END,
    delivered_at = CASE WHEN p_status = 'delivered' THEN NOW() ELSE delivered_at END,
    failed_at = CASE WHEN p_status = 'failed' THEN NOW() ELSE failed_at END,
    retry_count = CASE WHEN p_status = 'failed' THEN retry_count + 1 ELSE retry_count END
  WHERE id = p_notification_id;
  
  RETURN FOUND;
END;
$$ language 'plpgsql';

-- Create function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(
  p_notification_id UUID,
  p_read_from VARCHAR(100) DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_location JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  receipt_id UUID;
BEGIN
  -- Update notification status to read
  UPDATE public.notifications 
  SET 
    status = 'read',
    read_at = NOW()
  WHERE id = p_notification_id AND status != 'read';
  
  -- Insert read receipt
  INSERT INTO public.notification_receipts (
    notification_id, read_from, ip_address, user_agent, location
  ) VALUES (
    p_notification_id, p_read_from, p_ip_address, p_user_agent, p_location
  ) RETURNING id INTO receipt_id;
  
  RETURN receipt_id;
END;
$$ language 'plpgsql';