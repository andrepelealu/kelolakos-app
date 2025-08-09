import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";

export const dynamic = "force-dynamic";

export async function PUT(
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
  const body = await req.json();

  // Verify user owns this payment gateway setting
  const { data: settingData } = await supabase
    .from("payment_gateway_settings")
    .select("id, kos_id, kos!inner(user_id)")
    .eq("id", params.id)
    .is("deleted_at", null)
    .single();

  if (!settingData || settingData.kos.user_id !== user.id) {
    return NextResponse.json({ error: "Setting not found or access denied" }, { status: 403 });
  }

  try {
    const { data, error } = await supabase
      .from("payment_gateway_settings")
      .update({
        is_active: body.is_active,
        server_key: body.server_key || null,
        client_key: body.client_key || null,
        merchant_id: body.merchant_id || null,
        is_production: body.is_production,
        auto_expire_duration: body.auto_expire_duration,
        payment_methods: body.payment_methods,
        updated_at: new Date().toISOString()
      })
      .eq("id", params.id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}