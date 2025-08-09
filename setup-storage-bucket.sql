-- Create the invoices storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'invoices', 
  'invoices', 
  false, 
  5242880, -- 5MB limit
  ARRAY['application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Create policy to allow authenticated users to manage their invoices
CREATE POLICY IF NOT EXISTS "Allow authenticated users to manage invoice PDFs" 
  ON storage.objects 
  FOR ALL 
  TO authenticated 
  USING (bucket_id = 'invoices');

-- Create policy for service role (for API routes)
CREATE POLICY IF NOT EXISTS "Allow service role to manage invoice PDFs" 
  ON storage.objects 
  FOR ALL 
  TO service_role 
  USING (bucket_id = 'invoices');