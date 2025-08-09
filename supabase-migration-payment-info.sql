-- Migration: Create payment_info table for storing owner's payment information
-- This table will store bank account details to be displayed in invoices and emails

CREATE TABLE payment_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_pemilik VARCHAR(255) NOT NULL,
  nama_kos VARCHAR(255) NOT NULL,
  bank_name VARCHAR(100) NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  account_holder_name VARCHAR(255) NOT NULL,
  
  -- Alternative payment methods
  ewallet_type VARCHAR(50), -- 'gopay', 'ovo', 'dana', 'shopeepay', etc.
  ewallet_number VARCHAR(50),
  ewallet_holder_name VARCHAR(255),
  
  -- Additional payment info
  payment_notes TEXT,
  qr_code_image_url TEXT, -- URL to QR code image if uploaded
  
  -- Status and metadata
  is_active BOOLEAN DEFAULT true,
  is_primary BOOLEAN DEFAULT false, -- Only one can be primary
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE NULL
);

-- Create indexes for better performance
CREATE INDEX idx_payment_info_active ON payment_info(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_payment_info_primary ON payment_info(is_primary) WHERE deleted_at IS NULL AND is_active = true;

-- Ensure only one primary payment method exists
CREATE UNIQUE INDEX idx_payment_info_single_primary ON payment_info(is_primary) 
WHERE is_primary = true AND deleted_at IS NULL;

-- Add RLS (Row Level Security) policies if needed
ALTER TABLE payment_info ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read payment info
CREATE POLICY "payment_info_select_policy" ON payment_info
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert/update/delete payment info
CREATE POLICY "payment_info_modify_policy" ON payment_info
  FOR ALL USING (auth.role() = 'authenticated');

-- Insert sample data
INSERT INTO payment_info (
  nama_pemilik,
  nama_kos,
  bank_name,
  account_number,
  account_holder_name,
  payment_notes,
  is_active,
  is_primary
) VALUES (
  'Budi Santoso',
  'Kos Mawar Indah',
  'Bank BCA',
  '1234567890',
  'Budi Santoso',
  'Transfer dapat dilakukan 24 jam. Mohon konfirmasi setelah transfer dengan mengirim bukti ke WhatsApp.',
  true,
  true
);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payment_info_updated_at 
    BEFORE UPDATE ON payment_info 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();