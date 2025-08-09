import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabaseUser = createClient();
  const {
    data: { user },
  } = await supabaseUser.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { id } = params;

  const { data, error } = await supabase
    .from("kos")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Kos not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabaseUser = createClient();
  const {
    data: { user },
  } = await supabaseUser.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { id } = params;
  const body = await req.json();

  // Basic validation
  if (body.nama_kos !== undefined && (!body.nama_kos || body.nama_kos.trim() === "")) {
    return NextResponse.json({ error: "Nama kos is required" }, { status: 400 });
  }

  const updateData: any = {};
  if (body.nama_kos !== undefined) updateData.nama_kos = body.nama_kos.trim();
  if (body.alamat !== undefined) updateData.alamat = body.alamat?.trim() || null;
  if (body.deskripsi !== undefined) updateData.deskripsi = body.deskripsi?.trim() || null;

  const { data, error } = await supabase
    .from("kos")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Kos not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabaseUser = createClient();
  const {
    data: { user },
  } = await supabaseUser.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { id } = params;

  // Check if kos has any active data before deletion
  const { count: kamarCount } = await supabase
    .from("kamar")
    .select("id", { count: "exact", head: true })
    .eq("kos_id", id)
    .is("deleted_at", null);

  if (kamarCount && kamarCount > 0) {
    return NextResponse.json(
      { error: "Cannot delete kos that has active rooms. Please delete all rooms first." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("kos")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Kos not found" }, { status: 404 });
  }

  return NextResponse.json({ message: "Kos deleted successfully" });
}