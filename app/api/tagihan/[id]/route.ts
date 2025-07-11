import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/libs/supabase/admin";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tagihan")
    .select(
      `*, kamar:kamar_id(nomor_kamar, harga), tagihan_addon(qty, add_on:add_on_id(*))`
    )
    .eq("id", params.id)
    .is("deleted_at", null)
    .single();

  if (data && Array.isArray(data.tagihan_addon)) {
    data.add_ons = data.tagihan_addon.map((t: any) => ({
      tagihan_id: t.tagihan_id,
      add_on_id: t.add_on_id,
      qty: t.qty,
      add_on: t.add_on,
    }));
    delete (data as any).tagihan_addon;
  }

  if (data) {
    const penghuniRes = await supabase
      .from("penghuni")
      .select("id,nama,kamar_id")
      .eq("kamar_id", data.kamar_id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    (data as any).penghuni = penghuniRes.data || null;
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createAdminClient();
  const body = await req.json();

  const updatePayload: any = {};
  [
    "nomor_invoice",
    "kamar_id",
    "status_pembayaran",
    "add_on",
    "tanggal_terbit",
    "tanggal_jatuh_tempo",
    "denda",
    "total_tagihan",
  ].forEach((key) => {
    if (body[key] !== undefined) updatePayload[key] = body[key];
  });

  const { data, error } = await supabase
    .from("tagihan")
    .update(updatePayload)
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (Array.isArray(body.add_ons)) {
    await supabase.from("tagihan_addon").delete().eq("tagihan_id", params.id);
    if (body.add_ons.length > 0) {
      const rows = body.add_ons.map((item: any) => ({
        tagihan_id: params.id,
        add_on_id: item.id,
        qty: item.qty,
      }));
      await supabase.from("tagihan_addon").insert(rows);
    }
  }

  return NextResponse.json(data);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("tagihan")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({});
}
