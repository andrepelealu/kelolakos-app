import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/libs/supabase/admin";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createAdminClient();
  // First, get the main tagihan data
  const { data, error } = await supabase
    .from("tagihan")
    .select("*, kamar:kamar_id(nomor_kamar, harga)")
    .eq("id", params.id)
    .is("deleted_at", null)
    .single();


  // Then get the add-ons separately
  if (data && !error) {
    const { data: addOnData, error: addOnError } = await supabase
      .from("tagihan_addon")
      .select(`
        tagihan_id,
        add_on_id,
        qty,
        add_on:add_on_id(nama, harga, satuan)
      `)
      .eq("tagihan_id", params.id);


    if (addOnData && !addOnError) {
      data.add_ons = addOnData.map((item: any) => ({
        tagihan_id: item.tagihan_id,
        add_on_id: item.add_on_id,
        qty: item.qty,
        add_on: item.add_on,
      }));
      
      // Calculate total add-on amount and verify with stored value
      const calculatedAddOnTotal = addOnData.reduce((total: number, item: any) => {
        return total + ((item.add_on?.harga || 0) * item.qty);
      }, 0);
      
      
      // Update the stored total if it doesn't match (data integrity)
      if (Math.abs(calculatedAddOnTotal - (data.add_on || 0)) > 0.01) {
        await supabase
          .from("tagihan")
          .update({ add_on: calculatedAddOnTotal })
          .eq("id", params.id);
        data.add_on = calculatedAddOnTotal;
      }
    } else {
      data.add_ons = [];
    }
  }


  if (data) {
    const penghuniRes = await supabase
      .from("penghuni")
      .select("id,nama,kamar_id")
      .eq("kamar_id", data.kamar_id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    (data as any).penghuni = penghuniRes.data || null;
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createAdminClient();
  const body = await req.json();

  const updatePayload: any = {};
  [
    "nomor_invoice",
    "kamar_id",
    "status_pembayaran",
    "add_on",
    "tanggal_terbit",
    "tanggal_jatuh_tempo",
    "denda",
    "total_tagihan",
  ].forEach((key) => {
    if (body[key] !== undefined) updatePayload[key] = body[key];
  });

  const { data, error } = await supabase
    .from("tagihan")
    .update(updatePayload)
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (Array.isArray(body.add_ons)) {
    await supabase.from("tagihan_addon").delete().eq("tagihan_id", params.id);
    if (body.add_ons.length > 0) {
      const rows = body.add_ons.map((item: any) => ({
        tagihan_id: params.id,
        add_on_id: item.id,
        qty: item.qty,
      }));
      await supabase.from("tagihan_addon").insert(rows);
    }
  }

  // Clear PDF path to force regeneration on next download
  // This ensures the PDF stays up-to-date with any changes
  try {
    // Get current PDF path to delete old file
    const { data: currentData } = await supabase
      .from("tagihan")
      .select("pdf_path")
      .eq("id", params.id)
      .single();

    if (currentData?.pdf_path) {
      // Delete old PDF file from storage
      await supabase.storage
        .from('invoices')
        .remove([currentData.pdf_path]);
    }

    // Clear PDF path to force regeneration
    await supabase
      .from("tagihan")
      .update({ pdf_path: null })
      .eq("id", params.id);

    console.log('Invoice updated, PDF cache cleared for regeneration');
  } catch (pdfError) {
    console.error('Error clearing PDF cache:', pdfError);
    // Don't fail the update if PDF clearing fails
  }

  return NextResponse.json(data);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("tagihan")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({});
}
