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
  const kos_id = searchParams.get("kos_id");
  const from = (page - 1) * limit;
  const to = from + limit - 1;

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

  const { data, count, error } = await supabase
    .from("template_tagihan")
    .select("*, kos(nama_kos)", { count: "exact" })
    .eq("kos_id", kos_id)
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

  if (!body.kos_id) {
    return NextResponse.json(
      { error: "kos_id is required" },
      { status: 400 }
    );
  }
  if (!body.nama) {
    return NextResponse.json(
      { error: "Nama template is required" },
      { status: 400 }
    );
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

  if (body.tanggal_terbit === undefined || body.tanggal_terbit === null) {
    return NextResponse.json(
      { error: "Tanggal terbit is required" },
      { status: 400 }
    );
  }
  if (body.tanggal_jatuh_tempo === undefined || body.tanggal_jatuh_tempo === null) {
    return NextResponse.json(
      { error: "Tanggal jatuh tempo is required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("template_tagihan")
    .insert({
      kos_id: body.kos_id,
      nama: body.nama,
      tanggal_terbit: Number(body.tanggal_terbit),
      tanggal_jatuh_tempo: Number(body.tanggal_jatuh_tempo),
    })
    .select("*, kos(nama_kos)")
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
      // Verify all kamar_ids belong to this kos
      const { data: kamarData } = await supabase
        .from("kamar")
        .select("id")
        .eq("kos_id", body.kos_id)
        .in("id", body.kamar_ids)
        .is("deleted_at", null);
      
      const validKamarIds = kamarData?.map(k => k.id) || [];
      if (validKamarIds.length > 0) {
        const rows = validKamarIds.map((id: string) => ({
          id_template_tagihan: data.id,
          id_kamar: id,
        }));
        await supabase.from("template_tagihan_kamar").insert(rows);
      }
    }
  }

  return NextResponse.json(data);
}
