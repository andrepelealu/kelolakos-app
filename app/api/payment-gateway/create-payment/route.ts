import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { PaymentLinkRequest } from "@/types/payment-gateway";

export const dynamic = "force-dynamic";

// Helper function to format date for Midtrans API
function formatMidtransDate(date: Date): string {
  // Format: YYYY-MM-DD HH:mm:ss +0700
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} +0700`;
}

export async function POST(req: NextRequest) {
  const supabase = createAdminClient();
  const body: PaymentLinkRequest = await req.json();
  
  // Check if this is a server-side request (from email/whatsapp sending)
  const isServerSideRequest = req.headers.get('x-server-request') === 'true';
  
  let userId: string | null = null;
  
  if (isServerSideRequest) {
    // For server-side requests, we'll get the user ID from the tagihan ownership
  } else {
    // For client requests, verify user authentication
    const supabaseUser = createClient();
    const {
      data: { user },
    } = await supabaseUser.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    userId = user.id;
  }

  if (!body.tagihan_id) {
    return NextResponse.json({ error: "tagihan_id is required" }, { status: 400 });
  }

  try {
    // Get tagihan data with kos info
    const { data: tagihan, error: tagihanError } = await supabase
      .from("tagihan")
      .select(`
        *,
        kos!inner(id, nama_kos, user_id),
        kamar!inner(nomor_kamar, harga)
      `)
      .eq("id", body.tagihan_id)
      .is("deleted_at", null)
      .single();

    if (tagihanError || !tagihan) {
      return NextResponse.json({ error: "Tagihan not found" }, { status: 404 });
    }

    // Verify user owns this tagihan (for client requests)
    if (!isServerSideRequest && tagihan.kos.user_id !== userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    
    // For server-side requests, we trust that the tagihan exists and is valid

    // Get payment gateway settings
    const { data: paymentSettings, error: settingsError } = await supabase
      .from("payment_gateway_settings")
      .select("*")
      .eq("kos_id", tagihan.kos_id)
      .eq("provider", "midtrans")
      .eq("is_active", true)
      .is("deleted_at", null)
      .single();

    if (settingsError || !paymentSettings) {
      return NextResponse.json({ 
        error: "Payment gateway not configured or not active" 
      }, { status: 400 });
    }

    if (!paymentSettings.server_key || !paymentSettings.client_key) {
      return NextResponse.json({ 
        error: "Payment gateway configuration incomplete" 
      }, { status: 400 });
    }

    // Generate unique order ID
    const orderIdResult = await supabase.rpc('generate_order_id', {
      p_kos_id: tagihan.kos_id,
      p_tagihan_id: tagihan.id
    });

    const orderId = orderIdResult.data;

    if (!orderId) {
      return NextResponse.json({ error: "Failed to generate order ID" }, { status: 500 });
    }

    // Calculate expiry time
    const expiryTime = new Date();
    expiryTime.setMinutes(expiryTime.getMinutes() + paymentSettings.auto_expire_duration);

    // Prepare Midtrans Snap request
    const snapRequest = {
      transaction_details: {
        order_id: orderId,
        gross_amount: tagihan.total_tagihan
      },
      credit_card: {
        secure: true
      },
      customer_details: {
        first_name: body.customer_details.first_name,
        last_name: body.customer_details.last_name || "",
        email: body.customer_details.email,
        phone: body.customer_details.phone
      },
      item_details: body.item_details.map(item => ({
        id: item.id,
        price: item.price,
        quantity: item.quantity,
        name: item.name
      })),
      enabled_payments: paymentSettings.payment_methods,
      expiry: {
        start_time: formatMidtransDate(new Date()),
        unit: "minutes",
        duration: paymentSettings.auto_expire_duration
      },
      callbacks: {
        finish: `${req.nextUrl.origin}/payment/success?order_id=${orderId}`,
        error: `${req.nextUrl.origin}/payment/error?order_id=${orderId}`,
        pending: `${req.nextUrl.origin}/payment/pending?order_id=${orderId}`
      }
    };

    // Call Midtrans Snap API
    const midtransBaseUrl = paymentSettings.is_production 
      ? "https://app.midtrans.com/snap/v1"
      : "https://app.sandbox.midtrans.com/snap/v1";

    const snapResponse = await fetch(`${midtransBaseUrl}/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${Buffer.from(paymentSettings.server_key + ":").toString("base64")}`
      },
      body: JSON.stringify(snapRequest)
    });

    if (!snapResponse.ok) {
      const errorData = await snapResponse.text();
      console.error("Midtrans Snap API error:", errorData);
      return NextResponse.json({ 
        error: "Failed to create payment link",
        details: errorData
      }, { status: 500 });
    }

    const snapData = await snapResponse.json();

    // Save payment transaction
    const { data: transaction, error: transactionError } = await supabase
      .from("payment_transactions")
      .insert({
        kos_id: tagihan.kos_id,
        tagihan_id: tagihan.id,
        order_id: orderId,
        gross_amount: tagihan.total_tagihan,
        currency: "IDR",
        transaction_status: "pending",
        expiry_time: expiryTime.toISOString(),
        gateway_response: snapData
      })
      .select("*")
      .single();

    if (transactionError) {
      console.error("Error saving payment transaction:", transactionError);
      return NextResponse.json({ 
        error: "Failed to save payment transaction" 
      }, { status: 500 });
    }

    // Update tagihan with payment info
    await supabase
      .from("tagihan")
      .update({
        payment_link: snapData.redirect_url,
        payment_order_id: orderId,
        updated_at: new Date().toISOString()
      })
      .eq("id", tagihan.id);

    return NextResponse.json({
      order_id: orderId,
      payment_url: snapData.redirect_url,
      expires_at: expiryTime.toISOString(),
      snap_token: snapData.token
    });

  } catch (error) {
    console.error("Error creating payment link:", error);
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}