-- Migration: Add pdf_path column to tagihan table
-- This migration adds the pdf_path column to store the path of generated invoice PDFs

-- Add pdf_path column to tagihan table
ALTER TABLE tagihan 
ADD COLUMN pdf_path TEXT NULL;

-- Add comment to the column
COMMENT ON COLUMN tagihan.pdf_path IS 'Path to the generated invoice PDF file in Supabase storage';

-- Create index for better performance when querying by pdf_path
CREATE INDEX IF NOT EXISTS idx_tagihan_pdf_path ON tagihan(pdf_path) WHERE pdf_path IS NOT NULL;

-- You also need to create the storage bucket in Supabase Dashboard or via SQL:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('invoices', 'invoices', false);

-- Set up RLS (Row Level Security) policies for the storage bucket:
-- This should be done in Supabase Dashboard under Storage > Policies
-- Policy name: "Allow authenticated users to manage invoice PDFs"
-- Allowed operations: SELECT, INSERT, UPDATE, DELETE
-- Target roles: authenticated
-- Policy definition: true (or more restrictive based on your needs)

-- Alternative: Create storage bucket and policies via SQL (run these in Supabase SQL Editor):
/*
-- Create the invoices bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'invoices', 
  'invoices', 
  false, 
  5242880, -- 5MB limit
  ARRAY['application/pdf']
);

-- Create policy to allow authenticated users to manage their invoices
CREATE POLICY "Allow authenticated users to manage invoice PDFs" 
  ON storage.objects 
  FOR ALL 
  TO authenticated 
  USING (bucket_id = 'invoices');
*/