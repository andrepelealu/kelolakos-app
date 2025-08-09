-- Migration: Create whatsapp_settings table for storing WhatsApp connection settings
-- This table will store WhatsApp session data and connection status

CREATE TABLE whatsapp_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Connection details
  session_id VARCHAR(255) NOT NULL UNIQUE DEFAULT 'default',
  phone_number VARCHAR(20), -- Connected phone number
  device_name VARCHAR(255) DEFAULT 'Kelolakos System',
  
  -- Connection status
  is_connected BOOLEAN DEFAULT false,
  connection_status VARCHAR(50) DEFAULT 'disconnected', -- 'connecting', 'connected', 'disconnected', 'qr_required'
  last_connected_at TIMESTAMP WITH TIME ZONE,
  
  -- Session data (encrypted)
  session_data JSONB, -- Store Baileys session data
  qr_code TEXT, -- Base64 QR code for connection
  qr_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Settings
  auto_reconnect BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  webhook_url TEXT, -- Optional webhook for message status updates
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE NULL
);

-- Create WhatsApp message log table
CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Message details
  whatsapp_session_id UUID REFERENCES whatsapp_settings(id) ON DELETE CASCADE,
  recipient_phone VARCHAR(20) NOT NULL,
  recipient_name VARCHAR(255),
  
  -- Message content
  message_type VARCHAR(50) DEFAULT 'text', -- 'text', 'document', 'image', etc.
  message_content TEXT NOT NULL,
  file_url TEXT, -- URL to attached file (PDF invoice, etc.)
  file_name VARCHAR(255),
  file_size INTEGER,
  
  -- Related invoice (if applicable)
  tagihan_id UUID REFERENCES tagihan(id) ON DELETE SET NULL,
  
  -- Status tracking
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'read', 'failed'
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  
  -- WhatsApp message ID for tracking
  whatsapp_message_id VARCHAR(255),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_whatsapp_settings_active ON whatsapp_settings(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_whatsapp_settings_status ON whatsapp_settings(connection_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_whatsapp_settings_session ON whatsapp_settings(session_id) WHERE deleted_at IS NULL;

CREATE INDEX idx_whatsapp_messages_session ON whatsapp_messages(whatsapp_session_id);
CREATE INDEX idx_whatsapp_messages_status ON whatsapp_messages(status);
CREATE INDEX idx_whatsapp_messages_tagihan ON whatsapp_messages(tagihan_id) WHERE tagihan_id IS NOT NULL;
CREATE INDEX idx_whatsapp_messages_created ON whatsapp_messages(created_at);

-- Ensure only one active WhatsApp session
CREATE UNIQUE INDEX idx_whatsapp_settings_single_active ON whatsapp_settings(is_active) 
WHERE is_active = true AND deleted_at IS NULL;

-- Add RLS (Row Level Security) policies
ALTER TABLE whatsapp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read WhatsApp settings
CREATE POLICY "whatsapp_settings_select_policy" ON whatsapp_settings
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to modify WhatsApp settings
CREATE POLICY "whatsapp_settings_modify_policy" ON whatsapp_settings
  FOR ALL USING (auth.role() = 'authenticated');

-- Allow authenticated users to read WhatsApp messages
CREATE POLICY "whatsapp_messages_select_policy" ON whatsapp_messages
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to modify WhatsApp messages
CREATE POLICY "whatsapp_messages_modify_policy" ON whatsapp_messages
  FOR ALL USING (auth.role() = 'authenticated');

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_whatsapp_settings_updated_at BEFORE UPDATE ON whatsapp_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whatsapp_messages_updated_at BEFORE UPDATE ON whatsapp_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default WhatsApp settings
INSERT INTO whatsapp_settings (
  session_id,
  device_name,
  connection_status,
  auto_reconnect,
  is_active
) VALUES (
  'default',
  'Kelolakos Management System',
  'disconnected',
  true,
  true
) ON CONFLICT (session_id) DO NOTHING;