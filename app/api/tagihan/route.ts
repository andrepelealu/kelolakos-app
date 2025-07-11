import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = createAdminClient();
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);
  const q = searchParams.get("q") || "";

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("tagihan")
    .select("*, kamar: kamar_id (nomor_kamar, harga)", { count: "exact" })
    .is("deleted_at", null)
    .range(from, to);

  if (q) {
    const like = `%${q}%`;
    query = query.or(`nomor_invoice.ilike.${like},kamar.nomor_kamar.ilike.${like}`);
  }

  const { data, count, error } = await query;

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

  const supabase = createAdminClient();
  const body = await req.json();

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

  const { data: kamar, error: kamarError } = await supabase
    .from("kamar")
    .select("id")
    .eq("id", body.kamar_id)
    .is("deleted_at", null)
    .single();

  if (kamarError || !kamar) {
    return NextResponse.json({ error: "Nomor kamar tidak valid" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("tagihan")
    .insert({
      nomor_invoice: body.nomor_invoice,
      kamar_id: body.kamar_id,
      status_pembayaran: body.status_pembayaran,
      add_on: Number(body.add_on) || 0,
      tanggal_terbit: body.tanggal_terbit,
      tanggal_jatuh_tempo: body.tanggal_jatuh_tempo,
      denda: Number(body.denda) || 0,
      total_tagihan: Number(body.total_tagihan) || 0,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
