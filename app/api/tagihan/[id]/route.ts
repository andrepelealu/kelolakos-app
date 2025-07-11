import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/libs/supabase/admin";

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
