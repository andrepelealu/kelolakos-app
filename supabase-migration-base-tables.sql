-- Base Tables Migration for KelolakKos.com
-- This migration creates all the core tables required for the application
-- Run this migration BEFORE running the other migration files

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create kamar (rooms) table
CREATE TABLE IF NOT EXISTS public.kamar (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kos_id UUID REFERENCES public.kos(id) ON DELETE CASCADE,
    nomor_kamar TEXT NOT NULL,
    harga INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'kosong' CHECK (status IN ('kosong', 'terisi', 'booked')),
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create penghuni (tenants) table
CREATE TABLE IF NOT EXISTS public.penghuni (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kos_id UUID REFERENCES public.kos(id) ON DELETE CASCADE,
    nama TEXT NOT NULL,
    kamar_id UUID REFERENCES public.kamar(id) ON DELETE SET NULL,
    nomor_telepon TEXT,
    email TEXT,
    mulai_sewa DATE,
    selesai_sewa DATE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create add_on (add-ons/services) table
CREATE TABLE IF NOT EXISTS public.add_on (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kos_id UUID REFERENCES public.kos(id) ON DELETE CASCADE,
    nama TEXT NOT NULL,
    harga INTEGER NOT NULL,
    satuan TEXT NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create template_tagihan (invoice templates) table
CREATE TABLE IF NOT EXISTS public.template_tagihan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kos_id UUID REFERENCES public.kos(id) ON DELETE CASCADE,
    nama TEXT NOT NULL,
    tanggal_terbit TEXT NOT NULL,
    tanggal_jatuh_tempo TEXT NOT NULL,
    set_semua_kamar BOOLEAN DEFAULT true,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tagihan (invoices) table
CREATE TABLE IF NOT EXISTS public.tagihan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kos_id UUID REFERENCES public.kos(id) ON DELETE CASCADE,
    nomor_invoice TEXT UNIQUE NOT NULL,
    kamar_id UUID REFERENCES public.kamar(id) ON DELETE SET NULL,
    status_pembayaran TEXT NOT NULL DEFAULT 'draft' CHECK (status_pembayaran IN ('draft', 'menunggu_pembayaran', 'lunas', 'terlambat')),
    tanggal_terbit DATE NOT NULL,
    tanggal_jatuh_tempo DATE NOT NULL,
    denda INTEGER DEFAULT 0,
    total_tagihan INTEGER NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tagihan_addon (junction table for invoice add-ons)
CREATE TABLE IF NOT EXISTS public.tagihan_addon (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tagihan_id UUID REFERENCES public.tagihan(id) ON DELETE CASCADE,
    add_on_id UUID REFERENCES public.add_on(id) ON DELETE CASCADE,
    qty INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create add_on_tetap (fixed add-ons for templates)
CREATE TABLE IF NOT EXISTS public.add_on_tetap (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_template_tagihan UUID REFERENCES public.template_tagihan(id) ON DELETE CASCADE,
    id_add_on UUID REFERENCES public.add_on(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create template_tagihan_kamar (junction table for template rooms)
CREATE TABLE IF NOT EXISTS public.template_tagihan_kamar (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_template_tagihan UUID REFERENCES public.template_tagihan(id) ON DELETE CASCADE,
    id_kamar UUID REFERENCES public.kamar(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_kamar_kos_id ON public.kamar(kos_id);
CREATE INDEX IF NOT EXISTS idx_kamar_status ON public.kamar(status);
CREATE INDEX IF NOT EXISTS idx_penghuni_kos_id ON public.penghuni(kos_id);
CREATE INDEX IF NOT EXISTS idx_penghuni_kamar_id ON public.penghuni(kamar_id);
CREATE INDEX IF NOT EXISTS idx_add_on_kos_id ON public.add_on(kos_id);
CREATE INDEX IF NOT EXISTS idx_template_tagihan_kos_id ON public.template_tagihan(kos_id);
CREATE INDEX IF NOT EXISTS idx_tagihan_kos_id ON public.tagihan(kos_id);
CREATE INDEX IF NOT EXISTS idx_tagihan_kamar_id ON public.tagihan(kamar_id);
CREATE INDEX IF NOT EXISTS idx_tagihan_status ON public.tagihan(status_pembayaran);
CREATE INDEX IF NOT EXISTS idx_tagihan_nomor_invoice ON public.tagihan(nomor_invoice);
CREATE INDEX IF NOT EXISTS idx_tagihan_addon_tagihan_id ON public.tagihan_addon(tagihan_id);
CREATE INDEX IF NOT EXISTS idx_tagihan_addon_add_on_id ON public.tagihan_addon(add_on_id);

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE public.kamar ENABLE row level security;
ALTER TABLE public.penghuni ENABLE row level security;
ALTER TABLE public.add_on ENABLE row level security;
ALTER TABLE public.template_tagihan ENABLE row level security;
ALTER TABLE public.tagihan ENABLE row level security;
ALTER TABLE public.tagihan_addon ENABLE row level security;
ALTER TABLE public.add_on_tetap ENABLE row level security;
ALTER TABLE public.template_tagihan_kamar ENABLE row level security;

-- Create RLS policies for kamar table
CREATE POLICY "Users can view kamar from their kos" ON public.kamar
    FOR SELECT USING (kos_id IN (
        SELECT id FROM public.kos WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert kamar to their kos" ON public.kamar
    FOR INSERT WITH CHECK (kos_id IN (
        SELECT id FROM public.kos WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update kamar from their kos" ON public.kamar
    FOR UPDATE USING (kos_id IN (
        SELECT id FROM public.kos WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can delete kamar from their kos" ON public.kamar
    FOR DELETE USING (kos_id IN (
        SELECT id FROM public.kos WHERE user_id = auth.uid()
    ));

-- Create RLS policies for penghuni table
CREATE POLICY "Users can view penghuni from their kos" ON public.penghuni
    FOR SELECT USING (kos_id IN (
        SELECT id FROM public.kos WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert penghuni to their kos" ON public.penghuni
    FOR INSERT WITH CHECK (kos_id IN (
        SELECT id FROM public.kos WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update penghuni from their kos" ON public.penghuni
    FOR UPDATE USING (kos_id IN (
        SELECT id FROM public.kos WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can delete penghuni from their kos" ON public.penghuni
    FOR DELETE USING (kos_id IN (
        SELECT id FROM public.kos WHERE user_id = auth.uid()
    ));

-- Create RLS policies for add_on table
CREATE POLICY "Users can view add_on from their kos" ON public.add_on
    FOR SELECT USING (kos_id IN (
        SELECT id FROM public.kos WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert add_on to their kos" ON public.add_on
    FOR INSERT WITH CHECK (kos_id IN (
        SELECT id FROM public.kos WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update add_on from their kos" ON public.add_on
    FOR UPDATE USING (kos_id IN (
        SELECT id FROM public.kos WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can delete add_on from their kos" ON public.add_on
    FOR DELETE USING (kos_id IN (
        SELECT id FROM public.kos WHERE user_id = auth.uid()
    ));

-- Create RLS policies for template_tagihan table
CREATE POLICY "Users can view template_tagihan from their kos" ON public.template_tagihan
    FOR SELECT USING (kos_id IN (
        SELECT id FROM public.kos WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert template_tagihan to their kos" ON public.template_tagihan
    FOR INSERT WITH CHECK (kos_id IN (
        SELECT id FROM public.kos WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update template_tagihan from their kos" ON public.template_tagihan
    FOR UPDATE USING (kos_id IN (
        SELECT id FROM public.kos WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can delete template_tagihan from their kos" ON public.template_tagihan
    FOR DELETE USING (kos_id IN (
        SELECT id FROM public.kos WHERE user_id = auth.uid()
    ));

-- Create RLS policies for tagihan table
CREATE POLICY "Users can view tagihan from their kos" ON public.tagihan
    FOR SELECT USING (kos_id IN (
        SELECT id FROM public.kos WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert tagihan to their kos" ON public.tagihan
    FOR INSERT WITH CHECK (kos_id IN (
        SELECT id FROM public.kos WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update tagihan from their kos" ON public.tagihan
    FOR UPDATE USING (kos_id IN (
        SELECT id FROM public.kos WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can delete tagihan from their kos" ON public.tagihan
    FOR DELETE USING (kos_id IN (
        SELECT id FROM public.kos WHERE user_id = auth.uid()
    ));

-- Create RLS policies for tagihan_addon table
CREATE POLICY "Users can view tagihan_addon from their invoices" ON public.tagihan_addon
    FOR SELECT USING (tagihan_id IN (
        SELECT t.id FROM public.tagihan t 
        INNER JOIN public.kos k ON t.kos_id = k.id 
        WHERE k.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert tagihan_addon to their invoices" ON public.tagihan_addon
    FOR INSERT WITH CHECK (tagihan_id IN (
        SELECT t.id FROM public.tagihan t 
        INNER JOIN public.kos k ON t.kos_id = k.id 
        WHERE k.user_id = auth.uid()
    ));

CREATE POLICY "Users can update tagihan_addon from their invoices" ON public.tagihan_addon
    FOR UPDATE USING (tagihan_id IN (
        SELECT t.id FROM public.tagihan t 
        INNER JOIN public.kos k ON t.kos_id = k.id 
        WHERE k.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete tagihan_addon from their invoices" ON public.tagihan_addon
    FOR DELETE USING (tagihan_id IN (
        SELECT t.id FROM public.tagihan t 
        INNER JOIN public.kos k ON t.kos_id = k.id 
        WHERE k.user_id = auth.uid()
    ));

-- Create RLS policies for add_on_tetap table
CREATE POLICY "Users can view add_on_tetap from their templates" ON public.add_on_tetap
    FOR SELECT USING (id_template_tagihan IN (
        SELECT tt.id FROM public.template_tagihan tt 
        INNER JOIN public.kos k ON tt.kos_id = k.id 
        WHERE k.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert add_on_tetap to their templates" ON public.add_on_tetap
    FOR INSERT WITH CHECK (id_template_tagihan IN (
        SELECT tt.id FROM public.template_tagihan tt 
        INNER JOIN public.kos k ON tt.kos_id = k.id 
        WHERE k.user_id = auth.uid()
    ));

CREATE POLICY "Users can update add_on_tetap from their templates" ON public.add_on_tetap
    FOR UPDATE USING (id_template_tagihan IN (
        SELECT tt.id FROM public.template_tagihan tt 
        INNER JOIN public.kos k ON tt.kos_id = k.id 
        WHERE k.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete add_on_tetap from their templates" ON public.add_on_tetap
    FOR DELETE USING (id_template_tagihan IN (
        SELECT tt.id FROM public.template_tagihan tt 
        INNER JOIN public.kos k ON tt.kos_id = k.id 
        WHERE k.user_id = auth.uid()
    ));

-- Create RLS policies for template_tagihan_kamar table
CREATE POLICY "Users can view template_tagihan_kamar from their templates" ON public.template_tagihan_kamar
    FOR SELECT USING (id_template_tagihan IN (
        SELECT tt.id FROM public.template_tagihan tt 
        INNER JOIN public.kos k ON tt.kos_id = k.id 
        WHERE k.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert template_tagihan_kamar to their templates" ON public.template_tagihan_kamar
    FOR INSERT WITH CHECK (id_template_tagihan IN (
        SELECT tt.id FROM public.template_tagihan tt 
        INNER JOIN public.kos k ON tt.kos_id = k.id 
        WHERE k.user_id = auth.uid()
    ));

CREATE POLICY "Users can update template_tagihan_kamar from their templates" ON public.template_tagihan_kamar
    FOR UPDATE USING (id_template_tagihan IN (
        SELECT tt.id FROM public.template_tagihan tt 
        INNER JOIN public.kos k ON tt.kos_id = k.id 
        WHERE k.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete template_tagihan_kamar from their templates" ON public.template_tagihan_kamar
    FOR DELETE USING (id_template_tagihan IN (
        SELECT tt.id FROM public.template_tagihan tt 
        INNER JOIN public.kos k ON tt.kos_id = k.id 
        WHERE k.user_id = auth.uid()
    ));

-- Create triggers to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_kamar_updated_at BEFORE UPDATE ON public.kamar
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_penghuni_updated_at BEFORE UPDATE ON public.penghuni
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_add_on_updated_at BEFORE UPDATE ON public.add_on
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_template_tagihan_updated_at BEFORE UPDATE ON public.template_tagihan
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tagihan_updated_at BEFORE UPDATE ON public.tagihan
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();