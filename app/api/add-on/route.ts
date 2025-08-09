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

  let query = supabase
    .from("add_on")
    .select("*, kos(nama_kos)", { count: "exact" })
    .eq("kos_id", kos_id)
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

  if (!body.kos_id) {
    return NextResponse.json({ error: "kos_id is required" }, { status: 400 });
  }
  if (!body.nama) {
    return NextResponse.json({ error: "Nama is required" }, { status: 400 });
  }
  if (body.harga === undefined || body.harga === null || isNaN(Number(body.harga))) {
    return NextResponse.json({ error: "Harga is required" }, { status: 400 });
  }
  if (!body.satuan) {
    return NextResponse.json({ error: "Satuan is required" }, { status: 400 });
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

  const { data, error } = await supabase
    .from("add_on")
    .insert({ kos_id: body.kos_id, nama: body.nama, harga: body.harga, satuan: body.satuan })
    .select("*, kos(nama_kos)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
