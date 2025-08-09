-- STEP-BY-STEP MIGRATION GUIDE
-- Execute these steps in order to migrate your existing data to multi-kos support

-- STEP 1: Create the kos table and add columns (run first)
CREATE TABLE IF NOT EXISTS public.kos (
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

-- Add kos_id columns to existing tables if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kamar' AND column_name = 'kos_id') THEN
    ALTER TABLE public.kamar ADD COLUMN kos_id UUID;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'penghuni' AND column_name = 'kos_id') THEN
    ALTER TABLE public.penghuni ADD COLUMN kos_id UUID;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tagihan' AND column_name = 'kos_id') THEN
    ALTER TABLE public.tagihan ADD COLUMN kos_id UUID;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'template_tagihan' AND column_name = 'kos_id') THEN
    ALTER TABLE public.template_tagihan ADD COLUMN kos_id UUID;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'add_on' AND column_name = 'kos_id') THEN
    ALTER TABLE public.add_on ADD COLUMN kos_id UUID;
  END IF;
  
  -- Add to conditional tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_info') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_info' AND column_name = 'kos_id') THEN
      ALTER TABLE public.payment_info ADD COLUMN kos_id UUID;
    END IF;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'whatsapp_settings') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_settings' AND column_name = 'kos_id') THEN
      ALTER TABLE public.whatsapp_settings ADD COLUMN kos_id UUID;
    END IF;
  END IF;
END $$;

-- STEP 2: Create default kos for existing users and migrate data
DO $$
DECLARE
  default_kos_id UUID;
  user_count INTEGER;
BEGIN
  -- Check if we have any users
  SELECT COUNT(*) INTO user_count FROM auth.users;
  
  IF user_count > 0 THEN
    -- Check if there are any existing records that need migration
    IF EXISTS (SELECT 1 FROM public.kamar WHERE kos_id IS NULL LIMIT 1) THEN
      
      -- Create a default kos for the system (we'll assign it to the first user we find)
      -- In a real scenario, you might want to create one default kos per user
      INSERT INTO public.kos (user_id, nama_kos, alamat, deskripsi)
      SELECT 
        (SELECT id FROM auth.users LIMIT 1),
        'Kos Utama',
        'Alamat belum diisi',
        'Kos default untuk migrasi data existing'
      WHERE NOT EXISTS (SELECT 1 FROM public.kos)
      RETURNING id INTO default_kos_id;
      
      -- If kos already exists, get the first one
      IF default_kos_id IS NULL THEN
        SELECT id INTO default_kos_id FROM public.kos LIMIT 1;
      END IF;
      
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
      
      RAISE NOTICE 'Data migration completed. Default kos created with ID: %', default_kos_id;
    END IF;
  END IF;
END $$;

-- STEP 3: Add foreign key constraints (run after data migration)
DO $$
BEGIN
  -- Add foreign key constraints if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_kamar_kos') THEN
    ALTER TABLE public.kamar ADD CONSTRAINT fk_kamar_kos FOREIGN KEY (kos_id) REFERENCES public.kos(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_penghuni_kos') THEN
    ALTER TABLE public.penghuni ADD CONSTRAINT fk_penghuni_kos FOREIGN KEY (kos_id) REFERENCES public.kos(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_tagihan_kos') THEN
    ALTER TABLE public.tagihan ADD CONSTRAINT fk_tagihan_kos FOREIGN KEY (kos_id) REFERENCES public.kos(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_template_tagihan_kos') THEN
    ALTER TABLE public.template_tagihan ADD CONSTRAINT fk_template_tagihan_kos FOREIGN KEY (kos_id) REFERENCES public.kos(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_add_on_kos') THEN
    ALTER TABLE public.add_on ADD CONSTRAINT fk_add_on_kos FOREIGN KEY (kos_id) REFERENCES public.kos(id) ON DELETE CASCADE;
  END IF;
  
  -- Add constraints for conditional tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_info') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_payment_info_kos') THEN
      ALTER TABLE public.payment_info ADD CONSTRAINT fk_payment_info_kos FOREIGN KEY (kos_id) REFERENCES public.kos(id) ON DELETE CASCADE;
    END IF;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'whatsapp_settings') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_whatsapp_settings_kos') THEN
      ALTER TABLE public.whatsapp_settings ADD CONSTRAINT fk_whatsapp_settings_kos FOREIGN KEY (kos_id) REFERENCES public.kos(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- STEP 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_kos_user_id ON public.kos(user_id);
CREATE INDEX IF NOT EXISTS idx_kos_deleted_at ON public.kos(deleted_at);
CREATE INDEX IF NOT EXISTS idx_kamar_kos_id ON public.kamar(kos_id);
CREATE INDEX IF NOT EXISTS idx_penghuni_kos_id ON public.penghuni(kos_id);
CREATE INDEX IF NOT EXISTS idx_tagihan_kos_id ON public.tagihan(kos_id);
CREATE INDEX IF NOT EXISTS idx_template_tagihan_kos_id ON public.template_tagihan(kos_id);
CREATE INDEX IF NOT EXISTS idx_add_on_kos_id ON public.add_on(kos_id);

-- STEP 5: Enable Row Level Security (RLS) on kos table
ALTER TABLE public.kos ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for kos table
DROP POLICY IF EXISTS "Users can only access their own kos" ON public.kos;
CREATE POLICY "Users can only access their own kos" ON public.kos
  FOR ALL USING (auth.uid() = user_id);

-- STEP 6: Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_kos_updated_at ON public.kos;
CREATE TRIGGER update_kos_updated_at 
  BEFORE UPDATE ON public.kos 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- STEP 7: Verify migration
DO $$
DECLARE
  kos_count INTEGER;
  unmigrated_kamar INTEGER;
  unmigrated_penghuni INTEGER;
  unmigrated_tagihan INTEGER;
BEGIN
  SELECT COUNT(*) INTO kos_count FROM public.kos;
  SELECT COUNT(*) INTO unmigrated_kamar FROM public.kamar WHERE kos_id IS NULL;
  SELECT COUNT(*) INTO unmigrated_penghuni FROM public.penghuni WHERE kos_id IS NULL;
  SELECT COUNT(*) INTO unmigrated_tagihan FROM public.tagihan WHERE kos_id IS NULL;
  
  RAISE NOTICE 'Migration Status:';
  RAISE NOTICE '- Total kos buildings: %', kos_count;
  RAISE NOTICE '- Unmigrated kamar: %', unmigrated_kamar;
  RAISE NOTICE '- Unmigrated penghuni: %', unmigrated_penghuni;
  RAISE NOTICE '- Unmigrated tagihan: %', unmigrated_tagihan;
  
  IF unmigrated_kamar = 0 AND unmigrated_penghuni = 0 AND unmigrated_tagihan = 0 THEN
    RAISE NOTICE 'SUCCESS: All data has been migrated successfully!';
  ELSE
    RAISE WARNING 'Some data may not have been migrated. Please check the records.';
  END IF;
END $$;