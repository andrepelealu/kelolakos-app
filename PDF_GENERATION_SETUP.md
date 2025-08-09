# Invoice PDF Generation Setup Guide

## Overview
This document outlines the implementation of PDF generation and download functionality for invoices in the Kelolakos boarding house management system.

## Features Implemented

### 1. **PDF Template Design**
- **File**: `components/InvoiceHTML.tsx`
- Clean, professional invoice design using HTML/CSS templates
- Includes company branding, invoice details, billing breakdown, and add-ons table
- Responsive layout with proper styling and typography
- Status badges with colors for payment status
- Professional footer with auto-generation notice
- Print-optimized CSS for high-quality PDF output

### 2. **PDF Generation API**
- **File**: `app/api/tagihan/[id]/pdf/route.ts`
- **GET**: Downloads existing PDF or generates new one if not exists
- **POST**: Forces regeneration of PDF (useful for updates)  
- Uses Puppeteer for reliable HTML-to-PDF conversion
- Integrates with Supabase storage for PDF file management
- Returns PDF as downloadable file with proper headers
- Compatible with Next.js 14 and React 18

### 3. **Database Schema Update**
- **File**: `supabase-migration-add-pdf-path.sql`
- Added `pdf_path` column to `tagihan` table
- Stores the path to the generated PDF in Supabase storage
- Includes proper indexing for performance
- Migration script with storage bucket setup instructions

### 4. **Enhanced Invoice Detail Page**
- **File**: `app/dashboard/tagihan/[id]/page.tsx`
- Added "Download PDF" button with loading states
- Added "Regenerate PDF" button for existing invoices
- Modern UI with proper error handling and user feedback
- Clean layout with consistent design system

### 5. **Auto-PDF Generation**
- **Modified**: `app/api/tagihan/route.ts` (create invoice endpoint)
- **Modified**: `app/api/template-tagihan/[id]/generate/route.ts` (template generation)
- Automatically generates PDF when creating new invoices
- Works for both manual invoice creation and template-based bulk generation
- Non-blocking - doesn't fail invoice creation if PDF generation fails

## Setup Instructions

### 1. **Install Dependencies**
```bash
npm install puppeteer @types/puppeteer
```

### 2. **Database Migration**
Run the SQL migration in your Supabase SQL Editor:
```sql
-- Add pdf_path column to tagihan table
ALTER TABLE tagihan 
ADD COLUMN pdf_path TEXT NULL;

-- Add comment to the column
COMMENT ON COLUMN tagihan.pdf_path IS 'Path to the generated invoice PDF file in Supabase storage';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_tagihan_pdf_path ON tagihan(pdf_path) WHERE pdf_path IS NOT NULL;
```

### 3. **Supabase Storage Setup**
Create the `invoices` bucket in Supabase Dashboard or via SQL:

#### Option A: Via Supabase Dashboard
1. Go to Storage in your Supabase Dashboard
2. Create a new bucket named `invoices`
3. Set it as private (public = false)
4. Set file size limit to 5MB
5. Allow only PDF files (`application/pdf`)

#### Option B: Via SQL
```sql
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
```

### 4. **Environment Variables**
Ensure you have the following environment variables set:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Usage

### For Users
1. **View Invoice**: Navigate to any invoice detail page
2. **Download PDF**: Click the "Download PDF" button
3. **Regenerate PDF**: Click "Regenerate PDF" to create a fresh copy
4. **Auto-generation**: PDFs are automatically created when new invoices are made

### For Developers
1. **PDF Template**: Modify `components/InvoiceHTML.tsx` to customize design
2. **API Endpoints**: 
   - `GET /api/tagihan/[id]/pdf` - Download PDF
   - `POST /api/tagihan/[id]/pdf` - Regenerate PDF
3. **Storage**: PDFs are stored in Supabase storage bucket `invoices`
4. **Path Format**: `{tagihan_id}/invoice-{invoice_number}-{timestamp}.pdf`
5. **PDF Engine**: Uses Puppeteer with Chrome headless for consistent rendering

## File Structure
```
├── components/
│   └── InvoiceHTML.tsx                # HTML template component
├── app/api/tagihan/
│   ├── route.ts                       # Modified for auto-PDF generation
│   └── [id]/
│       └── pdf/
│           └── route.ts               # PDF generation API (Puppeteer-based)
├── app/dashboard/tagihan/[id]/
│   └── page.tsx                       # Enhanced detail page with download
├── types/
│   └── tagihan.ts                     # Updated with pdf_path field
└── supabase-migration-add-pdf-path.sql # Database migration
```

## Technical Details

### PDF Generation Process
1. Fetch invoice data with all relations (kamar, penghuni, add_ons)
2. Generate HTML template with invoice data using CSS styling
3. Launch headless Chrome browser using Puppeteer
4. Load HTML content into browser page
5. Generate PDF with specified format (A4, margins, print background)
6. Close browser and return PDF buffer
7. Upload to Supabase storage
8. Update database with PDF path
9. Return PDF file for download

### Error Handling
- Non-blocking PDF generation for new invoices
- Graceful fallback if storage upload fails
- Proper error messages for users
- Console logging for debugging

### Performance Considerations
- PDFs are cached in storage and only regenerated when requested
- Database indexing on pdf_path for efficient queries
- Parallel PDF generation for template-based bulk creation
- 5MB file size limit to prevent abuse

## Security
- Private storage bucket (not publicly accessible)
- Row Level Security (RLS) policies for authenticated users
- PDF paths stored in database for access control
- Proper MIME type validation (application/pdf only)

## Future Enhancements
- Email PDF invoices to tenants
- PDF customization options (logo, colors, etc.)
- Batch PDF download for multiple invoices
- PDF compression for smaller file sizes
- Digital signatures for legal compliance