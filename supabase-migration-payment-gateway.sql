-- Migration: Add payment gateway settings and payment transactions

-- Create payment_gateway_settings table
CREATE TABLE IF NOT EXISTS payment_gateway_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kos_id UUID NOT NULL REFERENCES kos(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL DEFAULT 'midtrans', -- midtrans, xendit, etc
    is_active BOOLEAN NOT NULL DEFAULT false,
    
    -- Midtrans settings
    server_key TEXT,
    client_key TEXT,
    merchant_id TEXT,
    is_production BOOLEAN NOT NULL DEFAULT false,
    
    -- General settings
    auto_expire_duration INTEGER DEFAULT 1440, -- in minutes, default 24 hours
    payment_methods JSONB DEFAULT '["credit_card", "bank_transfer", "e_wallet"]'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    
    UNIQUE(kos_id, provider)
);

-- Create payment_transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kos_id UUID NOT NULL REFERENCES kos(id) ON DELETE CASCADE,
    tagihan_id UUID NOT NULL REFERENCES tagihan(id) ON DELETE CASCADE,
    
    -- Transaction identifiers
    order_id VARCHAR(255) NOT NULL UNIQUE,
    transaction_id VARCHAR(255), -- from payment gateway
    payment_type VARCHAR(50),
    
    -- Transaction details
    gross_amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'IDR',
    
    -- Status tracking
    transaction_status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, settlement, cancel, expire, failure
    payment_gateway_status VARCHAR(50), -- raw status from gateway
    
    -- Gateway response data
    gateway_response JSONB,
    
    -- Timestamps
    transaction_time TIMESTAMP WITH TIME ZONE,
    settlement_time TIMESTAMP WITH TIME ZONE,
    expiry_time TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Add payment_link column to tagihan table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tagihan' AND column_name = 'payment_link') THEN
        ALTER TABLE tagihan ADD COLUMN payment_link TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tagihan' AND column_name = 'payment_order_id') THEN
        ALTER TABLE tagihan ADD COLUMN payment_order_id VARCHAR(255);
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_gateway_settings_kos_id ON payment_gateway_settings(kos_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_kos_id ON payment_transactions(kos_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_tagihan_id ON payment_transactions(tagihan_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id ON payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_transaction_id ON payment_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_tagihan_payment_order_id ON tagihan(payment_order_id) WHERE payment_order_id IS NOT NULL;

-- Enable RLS
ALTER TABLE payment_gateway_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_gateway_settings
CREATE POLICY "Users can view their kos payment settings" ON payment_gateway_settings
    FOR SELECT USING (
        kos_id IN (
            SELECT id FROM kos 
            WHERE user_id = auth.uid() 
            AND deleted_at IS NULL
        )
    );

CREATE POLICY "Users can insert their kos payment settings" ON payment_gateway_settings
    FOR INSERT WITH CHECK (
        kos_id IN (
            SELECT id FROM kos 
            WHERE user_id = auth.uid() 
            AND deleted_at IS NULL
        )
    );

CREATE POLICY "Users can update their kos payment settings" ON payment_gateway_settings
    FOR UPDATE USING (
        kos_id IN (
            SELECT id FROM kos 
            WHERE user_id = auth.uid() 
            AND deleted_at IS NULL
        )
    );

CREATE POLICY "Users can delete their kos payment settings" ON payment_gateway_settings
    FOR DELETE USING (
        kos_id IN (
            SELECT id FROM kos 
            WHERE user_id = auth.uid() 
            AND deleted_at IS NULL
        )
    );

-- RLS Policies for payment_transactions
CREATE POLICY "Users can view their kos payment transactions" ON payment_transactions
    FOR SELECT USING (
        kos_id IN (
            SELECT id FROM kos 
            WHERE user_id = auth.uid() 
            AND deleted_at IS NULL
        )
    );

CREATE POLICY "Users can insert their kos payment transactions" ON payment_transactions
    FOR INSERT WITH CHECK (
        kos_id IN (
            SELECT id FROM kos 
            WHERE user_id = auth.uid() 
            AND deleted_at IS NULL
        )
    );

CREATE POLICY "Users can update their kos payment transactions" ON payment_transactions
    FOR UPDATE USING (
        kos_id IN (
            SELECT id FROM kos 
            WHERE user_id = auth.uid() 
            AND deleted_at IS NULL
        )
    );

-- Function to update payment transaction status and tagihan status
CREATE OR REPLACE FUNCTION update_payment_status()
RETURNS TRIGGER AS $$
BEGIN
    -- If payment is successful, update tagihan status
    IF NEW.transaction_status = 'settlement' AND OLD.transaction_status != 'settlement' THEN
        UPDATE tagihan 
        SET 
            status_pembayaran = 'lunas',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.tagihan_id;
    END IF;
    
    -- Update updated_at timestamp
    NEW.updated_at = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for payment status updates
DROP TRIGGER IF EXISTS trigger_update_payment_status ON payment_transactions;
CREATE TRIGGER trigger_update_payment_status
    BEFORE UPDATE ON payment_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_status();

-- Function to generate unique order ID
CREATE OR REPLACE FUNCTION generate_order_id(p_kos_id UUID, p_tagihan_id UUID)
RETURNS TEXT AS $$
DECLARE
    order_prefix TEXT;
    timestamp_part TEXT;
    random_part TEXT;
    order_id TEXT;
BEGIN
    -- Get kos abbreviation or use first 3 chars of ID
    SELECT COALESCE(
        UPPER(LEFT(REPLACE(nama_kos, ' ', ''), 3)),
        UPPER(LEFT(id::text, 3))
    ) INTO order_prefix
    FROM kos WHERE id = p_kos_id;
    
    -- Generate timestamp part (YYYYMMDDHHMMSS)
    timestamp_part := TO_CHAR(NOW(), 'YYYYMMDDHH24MISS');
    
    -- Generate random part
    random_part := UPPER(SUBSTRING(gen_random_uuid()::text FROM 1 FOR 4));
    
    -- Combine parts
    order_id := order_prefix || '-' || timestamp_part || '-' || random_part;
    
    RETURN order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;