import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("payment_info")
    .select("*")
    .eq("id", params.id)
    .is("deleted_at", null)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json(
      { error: "Informasi pembayaran tidak ditemukan" },
      { status: 404 }
    );
  }

  return NextResponse.json(data);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabaseUser = createClient();
  await supabaseUser.auth.getUser();

  const supabase = createAdminClient();
  const body = await req.json();

  // Validation
  if (!body.nama_pemilik) {
    return NextResponse.json({ error: "Nama pemilik wajib diisi" }, { status: 400 });
  }
  if (!body.nama_kos) {
    return NextResponse.json({ error: "Nama kos wajib diisi" }, { status: 400 });
  }
  if (!body.bank_name) {
    return NextResponse.json({ error: "Nama bank wajib diisi" }, { status: 400 });
  }
  if (!body.account_number) {
    return NextResponse.json({ error: "Nomor rekening wajib diisi" }, { status: 400 });
  }
  if (!body.account_holder_name) {
    return NextResponse.json({ error: "Nama pemegang rekening wajib diisi" }, { status: 400 });
  }

  // If this is set as primary, unset other primary records
  if (body.is_primary) {
    await supabase
      .from("payment_info")
      .update({ is_primary: false })
      .neq("id", params.id)
      .is("deleted_at", null);
  }

  const { data, error } = await supabase
    .from("payment_info")
    .update({
      nama_pemilik: body.nama_pemilik,
      nama_kos: body.nama_kos,
      bank_name: body.bank_name,
      account_number: body.account_number,
      account_holder_name: body.account_holder_name,
      ewallet_type: body.ewallet_type || null,
      ewallet_number: body.ewallet_number || null,
      ewallet_holder_name: body.ewallet_holder_name || null,
      payment_notes: body.payment_notes || null,
      is_active: body.is_active !== false,
      is_primary: body.is_primary || false,
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
  const supabaseUser = createClient();
  await supabaseUser.auth.getUser();

  const supabase = createAdminClient();

  // Soft delete
  const { data, error } = await supabase
    .from("payment_info")
    .update({ 
      deleted_at: new Date().toISOString(),
      is_primary: false, // Remove primary status when deleted
      is_active: false
    })
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Informasi pembayaran berhasil dihapus" });
}