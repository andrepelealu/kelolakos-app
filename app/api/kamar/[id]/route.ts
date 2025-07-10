import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/libs/supabase/admin";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createAdminClient();
  const body = await req.json();

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
    .is("deleted_at", null)
    .neq("id", params.id);

  if (exist && exist > 0) {
    return NextResponse.json(
      { error: "Nomor kamar sudah ada" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("kamar")
    .update({
      nomor_kamar: body.nomor_kamar,
      harga: body.harga,
      status: body.status,
    })
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
    .from("kamar")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({});
}
