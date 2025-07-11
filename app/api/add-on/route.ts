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
    .from("add_on")
    .select("*", { count: "exact" })
    .is("deleted_at", null)
    .range(from, to);

  if (q) {
    const like = `%${q}%`;
    query = query.or(`nama.ilike.${like},satuan.ilike.${like}`);
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

  if (!body.nama) {
    return NextResponse.json({ error: "Nama is required" }, { status: 400 });
  }
  if (body.harga === undefined || body.harga === null || isNaN(Number(body.harga))) {
    return NextResponse.json({ error: "Harga is required" }, { status: 400 });
  }
  if (!body.satuan) {
    return NextResponse.json({ error: "Satuan is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("add_on")
    .insert({ nama: body.nama, harga: body.harga, satuan: body.satuan })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
