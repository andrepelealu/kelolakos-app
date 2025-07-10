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
    .from("penghuni")
    .select("*", { count: "exact" })
    .is("deleted_at", null)
    .range(from, to);

  if (q) {
    const like = `%${q}%`;
    query = query.or(
      `nama.ilike.${like},nomor_kamar.ilike.${like},nomor_telepon.ilike.${like},email.ilike.${like}`
    );
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
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^62\d{8,15}$/;

  if (!body.nama) {
    return NextResponse.json({ error: "Nama is required" }, { status: 400 });
  }

  if (!body.nomor_telepon) {
    return NextResponse.json(
      { error: "Nomor telepon is required" },
      { status: 400 }
    );
  }

  if (body.email && !emailRegex.test(body.email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  if (!phoneRegex.test(body.nomor_telepon)) {
    return NextResponse.json(
      { error: "Nomor telepon must start with 62 and contain digits only" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("penghuni")
    .insert({
      nama: body.nama,
      nomor_kamar: body.nomor_kamar,
      nomor_telepon: body.nomor_telepon,
      email: body.email,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
