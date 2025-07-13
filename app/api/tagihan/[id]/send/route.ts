import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { sendEmail } from "@/libs/resend";
import { formatRupiah, formatDate } from "@/libs/formatter";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tagihan")
    .select("*, kamar:kamar_id(nomor_kamar)")
    .eq("id", params.id)
    .is("deleted_at", null)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Tagihan not found" },
      { status: 404 }
    );
  }

  const penghuniRes = await supabase
    .from("penghuni")
    .select("id,nama,email,kamar_id")
    .eq("kamar_id", data.kamar_id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const penghuni = penghuniRes.data;

  if (!penghuni?.email) {
    return NextResponse.json({ error: "Penghuni email not found" }, { status: 400 });
  }

  try {
    await sendEmail({
      to: penghuni.email,
      subject: `Tagihan ${data.nomor_invoice}`,
      text: `Halo ${penghuni.nama}, berikut tagihan ${data.nomor_invoice} dengan total ${formatRupiah(
        data.total_tagihan
      )}. Batas pembayaran sampai ${formatDate(data.tanggal_jatuh_tempo)}.`,
      html: `<p>Halo ${penghuni.nama},</p><p>Berikut tagihan <strong>${data.nomor_invoice}</strong> dengan total <strong>${formatRupiah(
        data.total_tagihan
      )}</strong>.</p><p>Batas pembayaran sampai ${formatDate(
        data.tanggal_jatuh_tempo
      )}.</p>`,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  return NextResponse.json({});
}
