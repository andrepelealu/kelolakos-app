import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { currentMonthDate } from "@/libs/formatter";

const generateInvoice = (nomor_kamar: string, tanggal: string) => {
  const [year, month, day] = tanggal.split("-");
  return `inv/${nomor_kamar}/${day}${month}${year}`;
};


export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createAdminClient();

  const { data: template, error } = await supabase
    .from("template_tagihan")
    .select("*")
    .eq("id", params.id)
    .is("deleted_at", null)
    .single();

  if (error || !template) {
    return NextResponse.json({ error: error?.message || "Template not found" }, { status: 400 });
  }

  const { data: kamarLinks } = await supabase
    .from("template_tagihan_kamar")
    .select("id_kamar")
    .eq("id_template_tagihan", params.id);

  const { data: addOnLinks } = await supabase
    .from("add_on_tetap")
    .select("id_add_on")
    .eq("id_template_tagihan", params.id);

  const { data: addOns } = await supabase
    .from("add_on")
    .select("id,harga")
    .in("id", addOnLinks?.map((a) => a.id_add_on) || []);

  let kamarIds: string[] = kamarLinks?.map((k) => k.id_kamar) || [];

  if (kamarIds.length === 0) {
    const { data: allKamar } = await supabase
      .from("kamar")
      .select("id")
      .is("deleted_at", null);
    kamarIds = allKamar?.map((k) => k.id) || [];
  }

  const kamarRes = await supabase
    .from("kamar")
    .select("id, nomor_kamar, harga")
    .in("id", kamarIds);

  const kamars = kamarRes.data || [];

  const addOnTotal = (addOns || []).reduce((acc, a) => acc + (a.harga || 0), 0);

  const today = new Date().toISOString().slice(0, 10);

  const results = [];
  
  for (const k of kamars) {
    const penghuniRes = await supabase
      .from("penghuni")
      .select("selesai_sewa")
      .eq("kamar_id", k.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const selesai = penghuniRes.data?.selesai_sewa;
    if (!selesai || selesai < today) {
      continue;
    }

    const tanggalTerbit = currentMonthDate(template.tanggal_terbit);
    const tanggalJatuh = currentMonthDate(template.tanggal_jatuh_tempo);
    const invoice = generateInvoice(k.nomor_kamar, tanggalTerbit);
    
    // Check if invoice already exists
    const { data: existingTagihan } = await supabase
      .from("tagihan")
      .select("id")
      .eq("nomor_invoice", invoice)
      .single();
    
    if (existingTagihan) {
      continue; // Skip if invoice already exists
    }
    
    const { data: tagihan, error: tagihanError } = await supabase
      .from("tagihan")
      .insert({
        nomor_invoice: invoice,
        kamar_id: k.id,
        status_pembayaran: "belum_bayar",
        add_on: addOnTotal,
        tanggal_terbit: tanggalTerbit,
        tanggal_jatuh_tempo: tanggalJatuh,
        denda: 0,
        total_tagihan: addOnTotal + (k.harga || 0),
      })
      .select()
      .single();
    
    if (tagihanError || !tagihan) {
      console.error("Error creating tagihan:", tagihanError);
      continue;
    }
    
    // Insert add-on records
    if (addOnLinks && addOnLinks.length > 0) {
      const addOnRecords = addOnLinks.map((link) => ({
        tagihan_id: tagihan.id,
        add_on_id: link.id_add_on,
        qty: 1,
      }));
      
      const { error: addOnError } = await supabase
        .from("tagihan_addon")
        .insert(addOnRecords);
      
      if (addOnError) {
        console.error("Error creating add-on records:", addOnError);
      }
    }
    
    results.push({
      kamar: k.nomor_kamar,
      invoice: invoice,
      total: addOnTotal + (k.harga || 0),
      tagihan_id: tagihan.id,
    });
  }

  // Auto-generate PDFs for all created invoices
  if (results.length > 0) {
    try {
      const baseUrl = req.nextUrl.origin;
      const pdfPromises = results.map(async (result) => {
        try {
          const pdfResponse = await fetch(`${baseUrl}/api/tagihan/${result.tagihan_id}/pdf`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (pdfResponse.ok) {
            console.log('PDF auto-generated for invoice:', result.invoice);
          } else {
            console.error('Failed to auto-generate PDF for invoice:', result.invoice);
          }
        } catch (error) {
          console.error('Error auto-generating PDF for invoice:', result.invoice, error);
        }
      });
      
      // Execute all PDF generations in parallel but don't wait for them
      Promise.allSettled(pdfPromises);
    } catch (error) {
      console.error('Error initiating PDF generation:', error);
    }
  }

  return NextResponse.json({
    message: `Successfully generated ${results.length} invoices`,
    results: results,
  });
}
