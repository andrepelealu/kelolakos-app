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

  if (body.nama !== undefined && body.nama === "") {
    return NextResponse.json({ error: "Nama is required" }, { status: 400 });
  }

  if (body.nomor_telepon !== undefined && body.nomor_telepon === "") {
    return NextResponse.json(
      { error: "Nomor telepon is required" },
      { status: 400 }
    );
  }

  if (body.email && !emailRegex.test(body.email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  if (body.nomor_telepon && !phoneRegex.test(body.nomor_telepon)) {
    return NextResponse.json(
      { error: "Nomor telepon must start with 62 and contain digits only" },
      { status: 400 }
    );
  }

  if (
    body.mulai_sewa !== undefined &&
    body.selesai_sewa !== undefined &&
    new Date(body.selesai_sewa) < new Date(body.mulai_sewa)
  ) {
    return NextResponse.json(
      { error: "Selesai sewa harus setelah mulai sewa" },
      { status: 400 }
    );
  }

  const updatePayload: any = {};
  [
    "nama",
    "kamar_id",
    "nomor_telepon",
    "email",
    "mulai_sewa",
    "selesai_sewa",
  ].forEach(
    (key) => {
      if (body[key] !== undefined) updatePayload[key] = body[key];
    }
  );

  const { data, error } = await supabase
    .from("penghuni")
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
    .from("penghuni")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({});
}
