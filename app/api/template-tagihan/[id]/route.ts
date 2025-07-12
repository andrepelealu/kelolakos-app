import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/libs/supabase/admin";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("template_tagihan")
    .select(
      `*, add_on_tetap: add_on_tetap(id,id_add_on, add_on: id_add_on(*)), template_tagihan_kamar(id,id_kamar, kamar:id_kamar(*))`
    )
    .eq("id", params.id)
    .is("deleted_at", null)
    .single();

  if (data) {
    if ((data as any).add_on_tetap) {
      (data as any).add_ons = (data as any).add_on_tetap.map((a: any) => ({
        id: a.id,
        id_template_tagihan: params.id,
        id_add_on: a.id_add_on,
        add_on: a.add_on,
      }));
      delete (data as any).add_on_tetap;
    }
    if ((data as any).template_tagihan_kamar) {
      (data as any).kamars = (data as any).template_tagihan_kamar.map((k: any) => ({
        id: k.id,
        id_template_tagihan: params.id,
        id_kamar: k.id_kamar,
        kamar: k.kamar,
      }));
      delete (data as any).template_tagihan_kamar;
    }
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createAdminClient();
  const body = await req.json();

  const updatePayload: any = {};
  ["nama", "tanggal_terbit", "tanggal_jatuh_tempo"].forEach((key) => {
    if (body[key] !== undefined) {
      if (key === "tanggal_terbit" || key === "tanggal_jatuh_tempo") {
        updatePayload[key] = Number(body[key]);
      } else {
        updatePayload[key] = body[key];
      }
    }
  });

  const { data, error } = await supabase
    .from("template_tagihan")
    .update(updatePayload)
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (Array.isArray(body.add_ons)) {
    await supabase.from("add_on_tetap").delete().eq("id_template_tagihan", params.id);
    if (body.add_ons.length > 0) {
      const rows = body.add_ons.map((id: string) => ({
        id_template_tagihan: params.id,
        id_add_on: id,
      }));
      await supabase.from("add_on_tetap").insert(rows);
    }
  }

  if (Array.isArray(body.kamar_ids)) {
    await supabase
      .from("template_tagihan_kamar")
      .delete()
      .eq("id_template_tagihan", params.id);
    if (body.kamar_ids.length > 0) {
      const rows = body.kamar_ids.map((id: string) => ({
        id_template_tagihan: params.id,
        id_kamar: id,
      }));
      await supabase.from("template_tagihan_kamar").insert(rows);
    }
  }

  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("template_tagihan")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({});
}
