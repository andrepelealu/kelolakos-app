import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/libs/supabase/admin";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createAdminClient();
  const body = await req.json();

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
    .update({
      nama: body.nama,
      nomor_kamar: body.nomor_kamar,
      nomor_telepon: body.nomor_telepon,
      email: body.email,
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
    .from("penghuni")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({});
}
