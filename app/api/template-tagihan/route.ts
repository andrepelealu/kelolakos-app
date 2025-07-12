import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = createAdminClient();
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, count, error } = await supabase
    .from("template_tagihan")
    .select("*", { count: "exact" })
    .is("deleted_at", null)
    .range(from, to);

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
    return NextResponse.json(
      { error: "Nama template is required" },
      { status: 400 }
    );
  }

  if (!body.tanggal_terbit) {
    return NextResponse.json({ error: "Tanggal terbit is required" }, { status: 400 });
  }
  if (!body.tanggal_jatuh_tempo) {
    return NextResponse.json({ error: "Tanggal jatuh tempo is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("template_tagihan")
    .insert({
      nama: body.nama,
      tanggal_terbit: body.tanggal_terbit,
      tanggal_jatuh_tempo: body.tanggal_jatuh_tempo,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (data) {
    if (Array.isArray(body.add_ons) && body.add_ons.length > 0) {
      const rows = body.add_ons.map((id: string) => ({
        id_template_tagihan: data.id,
        id_add_on: id,
      }));
      await supabase.from("add_on_tetap").insert(rows);
    }
    if (!body.set_semua_kamar && Array.isArray(body.kamar_ids) && body.kamar_ids.length > 0) {
      const rows = body.kamar_ids.map((id: string) => ({
        id_template_tagihan: data.id,
        id_kamar: id,
      }));
      await supabase.from("template_tagihan_kamar").insert(rows);
    }
  }

  return NextResponse.json(data);
}
