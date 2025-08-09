-- Migration: Add multi-kos support
-- This migration adds kos table and updates existing tables to support multiple kos buildings

-- Step 1: Create the kos table
CREATE TABLE public.kos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nama_kos VARCHAR(255) NOT NULL,
  alamat TEXT,
  deskripsi TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign key constraint
  CONSTRAINT fk_kos_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Step 2: Add kos_id to existing tables
-- Add kos_id to kamar table
ALTER TABLE public.kamar 
ADD COLUMN kos_id UUID;

-- Add kos_id to penghuni table (for easier querying)
ALTER TABLE public.penghuni 
ADD COLUMN kos_id UUID;

-- Add kos_id to tagihan table (for easier querying)
ALTER TABLE public.tagihan 
ADD COLUMN kos_id UUID;

-- Add kos_id to template_tagihan table
ALTER TABLE public.template_tagihan 
ADD COLUMN kos_id UUID;

-- Add kos_id to add_on table
ALTER TABLE public.add_on 
ADD COLUMN kos_id UUID;

-- Add kos_id to payment_info table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_info') THEN
    ALTER TABLE public.payment_info ADD COLUMN kos_id UUID;
  END IF;
END $$;

-- Add kos_id to whatsapp_settings table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'whatsapp_settings') THEN
    ALTER TABLE public.whatsapp_settings ADD COLUMN kos_id UUID;
  END IF;
END $$;

-- Step 3: Add foreign key constraints after adding columns
ALTER TABLE public.kamar 
ADD CONSTRAINT fk_kamar_kos FOREIGN KEY (kos_id) REFERENCES public.kos(id) ON DELETE CASCADE;

ALTER TABLE public.penghuni 
ADD CONSTRAINT fk_penghuni_kos FOREIGN KEY (kos_id) REFERENCES public.kos(id) ON DELETE CASCADE;

ALTER TABLE public.tagihan 
ADD CONSTRAINT fk_tagihan_kos FOREIGN KEY (kos_id) REFERENCES public.kos(id) ON DELETE CASCADE;

ALTER TABLE public.template_tagihan 
ADD CONSTRAINT fk_template_tagihan_kos FOREIGN KEY (kos_id) REFERENCES public.kos(id) ON DELETE CASCADE;

ALTER TABLE public.add_on 
ADD CONSTRAINT fk_add_on_kos FOREIGN KEY (kos_id) REFERENCES public.kos(id) ON DELETE CASCADE;

-- Add foreign key constraints for conditional tables
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_info') THEN
    ALTER TABLE public.payment_info ADD CONSTRAINT fk_payment_info_kos FOREIGN KEY (kos_id) REFERENCES public.kos(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'whatsapp_settings') THEN
    ALTER TABLE public.whatsapp_settings ADD CONSTRAINT fk_whatsapp_settings_kos FOREIGN KEY (kos_id) REFERENCES public.kos(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 4: Create indexes for better performance
CREATE INDEX idx_kos_user_id ON public.kos(user_id);
CREATE INDEX idx_kos_deleted_at ON public.kos(deleted_at);
CREATE INDEX idx_kamar_kos_id ON public.kamar(kos_id);
CREATE INDEX idx_penghuni_kos_id ON public.penghuni(kos_id);
CREATE INDEX idx_tagihan_kos_id ON public.tagihan(kos_id);
CREATE INDEX idx_template_tagihan_kos_id ON public.template_tagihan(kos_id);
CREATE INDEX idx_add_on_kos_id ON public.add_on(kos_id);

-- Step 5: Enable Row Level Security (RLS) on kos table
ALTER TABLE public.kos ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies for kos table
CREATE POLICY "Users can only access their own kos" ON public.kos
  FOR ALL USING (auth.uid() = user_id);

-- Step 7: Update existing RLS policies to include kos_id filtering
-- Note: You may need to update existing policies on other tables to include kos filtering
-- This ensures users can only access data from their own kos buildings

-- Step 8: Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_kos_updated_at 
  BEFORE UPDATE ON public.kos 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 9: Create a default kos for existing users (optional migration step)
-- This will create a default kos named "Kos Utama" for users who already have data
-- You can run this manually after the migration if needed

/*
DO $$
DECLARE
  user_record RECORD;
  default_kos_id UUID;
BEGIN
  -- Create default kos for each user who has existing kamar data
  FOR user_record IN 
    SELECT DISTINCT u.id as user_id
    FROM auth.users u
    WHERE EXISTS (
      SELECT 1 FROM public.kamar k WHERE k.deleted_at IS NULL
    )
  LOOP
    -- Insert default kos for this user
    INSERT INTO public.kos (user_id, nama_kos, alamat)
    VALUES (user_record.user_id, 'Kos Utama', 'Alamat belum diisi')
    RETURNING id INTO default_kos_id;
    
    -- Update all existing records to reference this default kos
    UPDATE public.kamar SET kos_id = default_kos_id WHERE kos_id IS NULL;
    UPDATE public.penghuni SET kos_id = default_kos_id WHERE kos_id IS NULL;
    UPDATE public.tagihan SET kos_id = default_kos_id WHERE kos_id IS NULL;
    UPDATE public.template_tagihan SET kos_id = default_kos_id WHERE kos_id IS NULL;
    UPDATE public.add_on SET kos_id = default_kos_id WHERE kos_id IS NULL;
    
    -- Update conditional tables if they exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_info') THEN
      UPDATE public.payment_info SET kos_id = default_kos_id WHERE kos_id IS NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'whatsapp_settings') THEN
      UPDATE public.whatsapp_settings SET kos_id = default_kos_id WHERE kos_id IS NULL;
    END IF;
  END LOOP;
END $$;
*/

-- Step 10: Make kos_id NOT NULL after data migration (uncomment after running data migration)
-- ALTER TABLE public.kamar ALTER COLUMN kos_id SET NOT NULL;
-- ALTER TABLE public.penghuni ALTER COLUMN kos_id SET NOT NULL;
-- ALTER TABLE public.tagihan ALTER COLUMN kos_id SET NOT NULL;
-- ALTER TABLE public.template_tagihan ALTER COLUMN kos_id SET NOT NULL;
-- ALTER TABLE public.add_on ALTER COLUMN kos_id SET NOT NULL;