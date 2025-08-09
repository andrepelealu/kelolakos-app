import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";

export const dynamic = "force-dynamic";

// Simple test endpoint to verify payment gateway setup
export async function GET(req: NextRequest) {
  const supabaseUser = createClient();
  const {
    data: { user },
  } = await supabaseUser.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const kos_id = searchParams.get("kos_id");

  if (!kos_id) {
    return NextResponse.json({ error: "kos_id is required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    // Check payment gateway settings
    const { data: paymentSettings, error: settingsError } = await supabase
      .from("payment_gateway_settings")
      .select("*")
      .eq("kos_id", kos_id)
      .eq("provider", "midtrans")
      .is("deleted_at", null)
      .single();

    // Check if there are any tagihan for this kos
    const { data: tagihan, error: tagihanError } = await supabase
      .from("tagihan")
      .select("id, nomor_invoice, status_pembayaran, total_tagihan")
      .eq("kos_id", kos_id)
      .is("deleted_at", null)
      .limit(5);

    // Check if there are any payment transactions
    const { data: transactions, error: transactionsError } = await supabase
      .from("payment_transactions")
      .select("*")
      .eq("kos_id", kos_id)
      .is("deleted_at", null)
      .limit(5);

    return NextResponse.json({
      message: "Payment gateway test endpoint",
      user_id: user.id,
      kos_id,
      payment_settings: {
        exists: !!paymentSettings,
        is_active: paymentSettings?.is_active || false,
        provider: paymentSettings?.provider || null,
        is_production: paymentSettings?.is_production || false,
        has_server_key: !!paymentSettings?.server_key,
        has_client_key: !!paymentSettings?.client_key,
        error: settingsError?.message || null
      },
      sample_tagihan: {
        count: tagihan?.length || 0,
        data: tagihan || [],
        error: tagihanError?.message || null
      },
      transactions: {
        count: transactions?.length || 0,
        data: transactions || [],
        error: transactionsError?.message || null
      },
      callback_url: `${req.nextUrl.origin}/api/payment-gateway/midtrans/callback`,
      return_urls: {
        success: `${req.nextUrl.origin}/payment/success`,
        error: `${req.nextUrl.origin}/payment/error`,
        pending: `${req.nextUrl.origin}/payment/pending`
      }
    });

  } catch (error) {
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}