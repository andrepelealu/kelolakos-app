import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { getNextStatuses, type InvoiceStatus } from "@/libs/invoice-status";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAdminClient();
    const { newStatus } = await req.json();

    if (!newStatus) {
      return NextResponse.json({ error: "Status baru diperlukan" }, { status: 400 });
    }

    // Get current invoice
    const { data: currentInvoice, error: fetchError } = await supabase
      .from("tagihan")
      .select("status_pembayaran")
      .eq("id", params.id)
      .is("deleted_at", null)
      .single();

    if (fetchError || !currentInvoice) {
      return NextResponse.json({ error: "Invoice tidak ditemukan" }, { status: 404 });
    }

    // Validate status transition
    const currentStatus = currentInvoice.status_pembayaran;
    const allowedStatuses = getNextStatuses(currentStatus);
    
    if (!allowedStatuses.includes(newStatus as InvoiceStatus)) {
      return NextResponse.json({ 
        error: `Transisi dari ${currentStatus} ke ${newStatus} tidak diizinkan` 
      }, { status: 400 });
    }

    // Update status
    const { data, error } = await supabase
      .from("tagihan")
      .update({ 
        status_pembayaran: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Clear PDF cache when status changes to ensure updated PDF
    try {
      const { data: currentData } = await supabase
        .from("tagihan")
        .select("pdf_path")
        .eq("id", params.id)
        .single();

      if (currentData?.pdf_path) {
        await supabase.storage
          .from('invoices')
          .remove([currentData.pdf_path]);
      }

      await supabase
        .from("tagihan")
        .update({ pdf_path: null })
        .eq("id", params.id);

      console.log(`Invoice ${params.id} status changed to ${newStatus}, PDF cache cleared`);
    } catch (pdfError) {
      console.error('Error clearing PDF cache after status change:', pdfError);
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error("Status update error:", error);
    return NextResponse.json(
      { error: "Gagal mengubah status invoice" },
      { status: 500 }
    );
  }
}