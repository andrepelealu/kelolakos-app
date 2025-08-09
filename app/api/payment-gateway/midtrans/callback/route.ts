import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { MidtransNotification } from "@/types/payment-gateway";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = createAdminClient();
  
  try {
    const notification: MidtransNotification = await req.json();
    
    console.log("Midtrans notification received:", notification);

    // Validate required fields
    if (!notification.order_id || !notification.signature_key) {
      console.error("Invalid notification: missing required fields");
      return NextResponse.json({ error: "Invalid notification" }, { status: 400 });
    }

    // Get payment transaction
    const { data: transaction, error: transactionError } = await supabase
      .from("payment_transactions")
      .select(`
        *,
        kos!inner(id),
        tagihan!inner(id, kos_id)
      `)
      .eq("order_id", notification.order_id)
      .single();

    if (transactionError || !transaction) {
      console.error("Transaction not found:", notification.order_id);
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    // Get payment gateway settings for signature verification
    const { data: paymentSettings, error: settingsError } = await supabase
      .from("payment_gateway_settings")
      .select("*")
      .eq("kos_id", transaction.kos_id)
      .eq("provider", "midtrans")
      .single();

    if (settingsError || !paymentSettings) {
      console.error("Payment settings not found for kos:", transaction.kos_id);
      return NextResponse.json({ error: "Payment settings not found" }, { status: 400 });
    }

    // Verify signature
    const signaturePayload = `${notification.order_id}${notification.status_code}${notification.gross_amount}${paymentSettings.server_key}`;
    const calculatedSignature = crypto
      .createHash("sha512")
      .update(signaturePayload)
      .digest("hex");

    if (calculatedSignature !== notification.signature_key) {
      console.error("Invalid signature for order:", notification.order_id);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Map Midtrans status to our status
    let transactionStatus = notification.transaction_status;
    let shouldUpdateTagihan = false;

    switch (notification.transaction_status) {
      case "capture":
        if (notification.fraud_status === "accept") {
          transactionStatus = "settlement";
          shouldUpdateTagihan = true;
        }
        break;
      case "settlement":
        transactionStatus = "settlement";
        shouldUpdateTagihan = true;
        break;
      case "pending":
        transactionStatus = "pending";
        break;
      case "deny":
      case "cancel":
      case "expire":
      case "failure":
        transactionStatus = notification.transaction_status;
        break;
    }

    // Update payment transaction
    const updateData: any = {
      transaction_status: transactionStatus,
      payment_gateway_status: notification.transaction_status,
      payment_type: notification.payment_type,
      transaction_id: notification.transaction_id,
      transaction_time: notification.transaction_time,
      gateway_response: notification,
      updated_at: new Date().toISOString()
    };

    if (notification.settlement_time) {
      updateData.settlement_time = notification.settlement_time;
    }

    const { error: updateError } = await supabase
      .from("payment_transactions")
      .update(updateData)
      .eq("id", transaction.id);

    if (updateError) {
      console.error("Error updating payment transaction:", updateError);
      return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 });
    }

    // Update tagihan status if payment is successful
    if (shouldUpdateTagihan) {
      const { error: tagihanUpdateError } = await supabase
        .from("tagihan")
        .update({
          status_pembayaran: "lunas",
          updated_at: new Date().toISOString()
        })
        .eq("id", transaction.tagihan_id);

      if (tagihanUpdateError) {
        console.error("Error updating tagihan status:", tagihanUpdateError);
      } else {
        console.log(`Tagihan ${transaction.tagihan_id} marked as paid (lunas)`);
      }
    }

    console.log(`Payment transaction updated: ${notification.order_id} -> ${transactionStatus}`);

    return NextResponse.json({ status: "OK" });

  } catch (error) {
    console.error("Error processing Midtrans callback:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Handle GET requests (for testing)
export async function GET(req: NextRequest) {
  return NextResponse.json({ 
    message: "Midtrans callback endpoint", 
    timestamp: new Date().toISOString() 
  });
}