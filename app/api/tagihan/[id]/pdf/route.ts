import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { generateInvoiceHTML } from '@/components/InvoiceHTML';
import puppeteer from 'puppeteer';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createAdminClient();

    // Fetch tagihan data with relations
    const { data: tagihan, error: tagihanError } = await supabase
      .from("tagihan")
      .select(`
        *,
        kamar:kamar_id (
          id,
          nomor_kamar,
          harga
        ),
        add_ons:tagihan_addon (
          qty,
          add_on:add_on_id (
            id,
            nama,
            harga,
            satuan
          )
        )
      `)
      .eq("id", params.id)
      .is("deleted_at", null)
      .single();

    if (tagihanError || !tagihan) {
      return NextResponse.json({ error: "Tagihan not found" }, { status: 404 });
    }

    // Fetch penghuni data separately (similar to main tagihan route)
    const { data: penghuni } = await supabase
      .from("penghuni")
      .select("nama, nomor_telepon, email")
      .eq("kamar_id", tagihan.kamar_id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Add penghuni data to tagihan
    tagihan.penghuni = penghuni;

    // Fetch primary payment info
    const { data: paymentInfo } = await supabase
      .from("payment_info")
      .select("*")
      .eq("is_primary", true)
      .eq("is_active", true)
      .is("deleted_at", null)
      .maybeSingle();

    // Check if PDF already exists and is accessible
    if (tagihan.pdf_path) {
      console.log('Checking existing PDF at path:', tagihan.pdf_path);
      const { data: fileData, error: fileError } = await supabase.storage
        .from('invoices')
        .download(tagihan.pdf_path);
      
      if (!fileError && fileData) {
        console.log('Found existing PDF, serving from storage');
        return new NextResponse(fileData, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="invoice-${tagihan.nomor_invoice}.pdf"`,
          },
        });
      } else {
        console.log('PDF path exists but file not found, will regenerate. Error:', fileError);
        // PDF path exists but file not found, clear the path and regenerate
        await supabase
          .from("tagihan")
          .update({ pdf_path: null })
          .eq("id", params.id);
      }
    }

    // Generate PDF using Puppeteer
    console.log('Generating PDF for tagihan:', tagihan.nomor_invoice);
    
    let pdfBuffer;
    try {
      // Generate HTML content
      const htmlContent = generateInvoiceHTML({ data: tagihan, paymentInfo });
      
      // Launch Puppeteer
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      
      // Set content and generate PDF
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px'
        }
      });
      
      await browser.close();
      console.log('PDF generated successfully, buffer size:', pdfBuffer.length);
    } catch (pdfError) {
      console.error('PDF rendering error:', pdfError);
      return NextResponse.json({ error: "PDF rendering failed", details: pdfError.message }, { status: 500 });
    }

    const fileName = `invoice-${tagihan.nomor_invoice}-${Date.now()}.pdf`;
    const filePath = `${tagihan.id}/${fileName}`;

    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from('invoices')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      // Still return the PDF even if upload fails, but don't store path
      console.log('PDF generated but not stored, serving directly');
    } else {
      // Update tagihan record with PDF path
      const { error: updateError } = await supabase
        .from("tagihan")
        .update({ pdf_path: filePath })
        .eq("id", params.id);
        
      if (updateError) {
        console.error('Failed to update PDF path:', updateError);
      } else {
        console.log('PDF successfully stored and path updated:', filePath);
      }
    }

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${tagihan.nomor_invoice}.pdf"`,
      },
    });

  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createAdminClient();

    // Force regenerate PDF (useful for updates)
    const { data: tagihan, error: tagihanError } = await supabase
      .from("tagihan")
      .select(`
        *,
        kamar:kamar_id (
          id,
          nomor_kamar,
          harga
        ),
        add_ons:tagihan_addon (
          qty,
          add_on:add_on_id (
            id,
            nama,
            harga,
            satuan
          )
        )
      `)
      .eq("id", params.id)
      .is("deleted_at", null)
      .single();

    if (tagihanError || !tagihan) {
      return NextResponse.json({ error: "Tagihan not found" }, { status: 404 });
    }

    // Fetch penghuni data separately (similar to main tagihan route)
    const { data: penghuni } = await supabase
      .from("penghuni")
      .select("nama, nomor_telepon, email")
      .eq("kamar_id", tagihan.kamar_id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Add penghuni data to tagihan
    tagihan.penghuni = penghuni;

    // Delete old PDF if exists
    if (tagihan.pdf_path) {
      await supabase.storage
        .from('invoices')
        .remove([tagihan.pdf_path]);
    }

    // Fetch primary payment info
    const { data: paymentInfo } = await supabase
      .from("payment_info")
      .select("*")
      .eq("is_primary", true)
      .eq("is_active", true)
      .is("deleted_at", null)
      .maybeSingle();

    // Generate new PDF using Puppeteer
    console.log('Regenerating PDF for tagihan:', tagihan.nomor_invoice);
    
    let pdfBuffer;
    try {
      // Generate HTML content
      const htmlContent = generateInvoiceHTML({ data: tagihan, paymentInfo });
      
      // Launch Puppeteer
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      
      // Set content and generate PDF
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px'
        }
      });
      
      await browser.close();
      console.log('PDF regenerated successfully, buffer size:', pdfBuffer.length);
    } catch (pdfError) {
      console.error('PDF rendering error:', pdfError);
      return NextResponse.json({ error: "PDF rendering failed", details: pdfError.message }, { status: 500 });
    }

    const fileName = `invoice-${tagihan.nomor_invoice}-${Date.now()}.pdf`;
    const filePath = `${tagihan.id}/${fileName}`;

    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from('invoices')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      return NextResponse.json(
        { error: "Failed to upload PDF" },
        { status: 500 }
      );
    }

    // Update tagihan record with new PDF path
    const { error: updateError } = await supabase
      .from("tagihan")
      .update({ pdf_path: filePath })
      .eq("id", params.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update PDF path" },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      pdf_path: filePath,
      message: "PDF generated successfully" 
    });

  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}