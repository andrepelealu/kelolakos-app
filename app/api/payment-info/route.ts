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
  const activeOnly = searchParams.get("active_only") === "true";

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("payment_info")
    .select("*", { count: "exact" })
    .is("deleted_at", null)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: false });

  if (activeOnly) {
    query = query.eq("is_active", true);
  }

  if (q) {
    const like = `%${q}%`;
    query = query.or(
      `nama_pemilik.ilike.${like},nama_kos.ilike.${like},bank_name.ilike.${like},account_holder_name.ilike.${like}`
    );
  }

  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, count, page, limit });
}

export async function POST(req: NextRequest) {
  const supabaseUser = createClient();
  await supabaseUser.auth.getUser();

  const supabase = createAdminClient();
  const body = await req.json();

  // Validation
  if (!body.nama_pemilik) {
    return NextResponse.json({ error: "Nama pemilik wajib diisi" }, { status: 400 });
  }
  if (!body.nama_kos) {
    return NextResponse.json({ error: "Nama kos wajib diisi" }, { status: 400 });
  }
  if (!body.bank_name) {
    return NextResponse.json({ error: "Nama bank wajib diisi" }, { status: 400 });
  }
  if (!body.account_number) {
    return NextResponse.json({ error: "Nomor rekening wajib diisi" }, { status: 400 });
  }
  if (!body.account_holder_name) {
    return NextResponse.json({ error: "Nama pemegang rekening wajib diisi" }, { status: 400 });
  }

  // If this is set as primary, unset other primary records
  if (body.is_primary) {
    await supabase
      .from("payment_info")
      .update({ is_primary: false })
      .neq("id", "00000000-0000-0000-0000-000000000000") // dummy ID for new records
      .is("deleted_at", null);
  }

  const { data, error } = await supabase
    .from("payment_info")
    .insert({
      nama_pemilik: body.nama_pemilik,
      nama_kos: body.nama_kos,
      bank_name: body.bank_name,
      account_number: body.account_number,
      account_holder_name: body.account_holder_name,
      ewallet_type: body.ewallet_type || null,
      ewallet_number: body.ewallet_number || null,
      ewallet_holder_name: body.ewallet_holder_name || null,
      payment_notes: body.payment_notes || null,
      is_active: body.is_active !== false,
      is_primary: body.is_primary || false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}