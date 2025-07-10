import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("penghuni")
    .select("*")
    .is("deleted_at", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabaseUser = createClient();
  const {
    data: { user },
  } = await supabaseUser.auth.getUser();

  const supabase = createAdminClient();
  const body = await req.json();

  const { data, error } = await supabase
    .from("penghuni")
    .insert({
      nama: body.nama,
      nomor_kamar: body.nomor_kamar,
      nomor_telepon: body.nomor_telepon,
      email: body.email,
      user_id: user?.id ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
