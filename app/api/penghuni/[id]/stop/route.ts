import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/libs/supabase/admin";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createAdminClient();

  const { data: penghuni, error } = await supabase
    .from("penghuni")
    .select("kamar_id")
    .eq("id", params.id)
    .single();

  if (error || !penghuni) {
    return NextResponse.json(
      { error: error?.message || "Penghuni not found" },
      { status: 404 }
    );
  }

  await supabase
    .from("kamar")
    .update({ status: "kosong" })
    .eq("id", penghuni.kamar_id)
    .is("deleted_at", null);

  await supabase
    .from("penghuni")
    .update({ selesai_sewa: new Date().toISOString().slice(0, 10) })
    .eq("id", params.id);

  return NextResponse.json({});
}
