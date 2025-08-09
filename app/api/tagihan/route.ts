import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabaseUser = createClient();
  const {
    data: { user },
  } = await supabaseUser.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);
  const q = searchParams.get("q") || "";
  const kos_id = searchParams.get("kos_id");
  const date_from = searchParams.get("date_from");
  const date_to = searchParams.get("date_to");

  if (!kos_id) {
    return NextResponse.json({ error: "kos_id is required" }, { status: 400 });
  }

  // Verify user owns this kos
  const { data: kosData } = await supabase
    .from("kos")
    .select("id")
    .eq("id", kos_id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .single();

  if (!kosData) {
    return NextResponse.json({ error: "Kos not found or access denied" }, { status: 403 });
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let tagihanIds: string[] = [];
  
  // If there's a search query, we need to find matching records
  if (q) {
    const like = `%${q}%`;
    
    // Search in tagihan table for this kos
    const { data: tagihanMatches } = await supabase
      .from("tagihan")
      .select("id")
      .eq("kos_id", kos_id)
      .is("deleted_at", null)
      .ilike("nomor_invoice", like);
    
    // Search for kamar by nomor_kamar in this kos and get tagihan with those kamar_ids
    const { data: kamarMatches } = await supabase
      .from("kamar")
      .select("id")
      .eq("kos_id", kos_id)
      .is("deleted_at", null)
      .ilike("nomor_kamar", like);
      
    const tagihanByKamarQuery = kamarMatches && kamarMatches.length > 0 
      ? await supabase
          .from("tagihan")
          .select("id")
          .eq("kos_id", kos_id)
          .is("deleted_at", null)
          .in("kamar_id", kamarMatches.map(k => k.id))
      : { data: [] as {id: string}[] };
    const { data: tagihanByKamar } = tagihanByKamarQuery;
    
    // Combine all matching IDs
    const allMatches = [
      ...(tagihanMatches || []),
      ...(tagihanByKamar || [])
    ];
    
    tagihanIds = Array.from(new Set(allMatches.map(t => t.id)));
    
    // If no matches found, return empty result
    if (tagihanIds.length === 0) {
      return NextResponse.json({ data: [], count: 0, page, limit });
    }
  }

  let query = supabase
    .from("tagihan")
    .select("*, kamar: kamar_id (nomor_kamar, harga), kos(nama_kos)", { count: "exact" })
    .eq("kos_id", kos_id)
    .is("deleted_at", null);
    
  // Apply date filters if provided
  if (date_from) {
    query = query.gte("tanggal_terbit", date_from);
  }
  if (date_to) {
    query = query.lte("tanggal_terbit", date_to);
  }
    
  // Apply search filter if we have search results
  if (q && tagihanIds.length > 0) {
    query = query.in("id", tagihanIds);
  }
  
  // Apply pagination
  query = query.range(from, to);

  const { data, count, error } = await query;

  if (!error && data) {
    const penghuniPromises = data.map((t) =>
      supabase
        .from("penghuni")
        .select("id,nama,kamar_id")
        .eq("kamar_id", t.kamar_id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    );
    const penghuniResults = await Promise.all(penghuniPromises);
    penghuniResults.forEach((p, idx) => {
      data[idx].penghuni = p.data || null;
    });
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, count, page, limit });
}

export async function POST(req: NextRequest) {
  const supabaseUser = createClient();
  const {
    data: { user },
  } = await supabaseUser.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const body = await req.json();

  if (!body.kos_id) {
    return NextResponse.json({ error: "kos_id is required" }, { status: 400 });
  }
  if (!body.nomor_invoice) {
    return NextResponse.json({ error: "Nomor invoice is required" }, { status: 400 });
  }
  if (!body.kamar_id) {
    return NextResponse.json({ error: "Kamar is required" }, { status: 400 });
  }
  if (!body.tanggal_terbit) {
    return NextResponse.json({ error: "Tanggal terbit is required" }, { status: 400 });
  }
  if (!body.tanggal_jatuh_tempo) {
    return NextResponse.json({ error: "Tanggal jatuh tempo is required" }, { status: 400 });
  }

  // Verify user owns this kos
  const { data: kosData } = await supabase
    .from("kos")
    .select("id")
    .eq("id", body.kos_id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .single();

  if (!kosData) {
    return NextResponse.json({ error: "Kos not found or access denied" }, { status: 403 });
  }

  const { data: kamar, error: kamarError } = await supabase
    .from("kamar")
    .select("id, kos_id")
    .eq("id", body.kamar_id)
    .eq("kos_id", body.kos_id)
    .is("deleted_at", null)
    .single();

  if (kamarError || !kamar) {
    return NextResponse.json({ error: "Nomor kamar tidak valid atau tidak ditemukan di kos ini" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("tagihan")
    .insert({
      kos_id: body.kos_id,
      nomor_invoice: body.nomor_invoice,
      kamar_id: body.kamar_id,
      status_pembayaran: body.status_pembayaran || "draft", // Default to draft
      add_on: Number(body.add_on) || 0,
      tanggal_terbit: body.tanggal_terbit,
      tanggal_jatuh_tempo: body.tanggal_jatuh_tempo,
      denda: Number(body.denda) || 0,
      total_tagihan: Number(body.total_tagihan) || 0,
    })
    .select("*, kamar: kamar_id (nomor_kamar, harga), kos(nama_kos)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (data && Array.isArray(body.add_ons) && body.add_ons.length > 0) {
    const rows = body.add_ons.map((item: any) => ({
      tagihan_id: data.id,
      add_on_id: item.id,
      qty: item.qty,
    }));
    const { error: addOnError } = await supabase.from("tagihan_addon").insert(rows);
    
    if (addOnError) {
      console.error("Error inserting add-ons:", addOnError);
      // Still return the tagihan data, but log the error
    }
  }

  // Auto-generate PDF after creating invoice
  try {
    const baseUrl = req.nextUrl.origin;
    const pdfResponse = await fetch(`${baseUrl}/api/tagihan/${data.id}/pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!pdfResponse.ok) {
      console.error('Failed to auto-generate PDF for new invoice:', data.id);
    } else {
      console.log('PDF auto-generated for invoice:', data.nomor_invoice);
    }
  } catch (pdfError) {
    console.error('Error auto-generating PDF:', pdfError);
    // Don't fail the invoice creation if PDF generation fails
  }

  return NextResponse.json(data);
}
