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
  const status = searchParams.get("status") || "";

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("kamar")
    .select("*", { count: "exact" })
    .is("deleted_at", null)
    .range(from, to);

  if (status) {
    query = query.eq("status", status);
  }

  if (q) {
    const like = `%${q}%`;
    query = query.or(`nomor_kamar.ilike.${like},status.ilike.${like}`);
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

  // basic validation
  if (!body.nomor_kamar) {
    return NextResponse.json({ error: "Nomor kamar is required" }, { status: 400 });
  }

  if (body.harga === undefined || body.harga === null || isNaN(Number(body.harga))) {
    return NextResponse.json({ error: "Harga is required" }, { status: 400 });
  }

  const allowedStatus = ["terisi", "kosong", "booked"];
  if (body.status && !allowedStatus.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const { count: exist } = await supabase
    .from("kamar")
    .select("id", { count: "exact", head: true })
    .eq("nomor_kamar", body.nomor_kamar)
    .is("deleted_at", null);

  if (exist && exist > 0) {
    return NextResponse.json(
      { error: "Nomor kamar sudah ada" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("kamar")
    .insert({
      nomor_kamar: body.nomor_kamar,
      harga: body.harga,
      status: body.status,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
