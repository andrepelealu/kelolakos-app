import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/libs/supabase/admin";

const generateInvoice = (nomor_kamar: string, tanggal: string) => {
  const [year, month, day] = tanggal.split("-");
  return `inv/${nomor_kamar}/${day}${month}${year}`;
};

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createAdminClient();

  const { data: template, error } = await supabase
    .from("template_tagihan")
    .select("*")
    .eq("id", params.id)
    .is("deleted_at", null)
    .single();

  if (error || !template) {
    return NextResponse.json({ error: error?.message || "Template not found" }, { status: 400 });
  }

  const { data: kamarLinks } = await supabase
    .from("template_tagihan_kamar")
    .select("id_kamar")
    .eq("id_template_tagihan", params.id);

  const { data: addOnLinks } = await supabase
    .from("add_on_tetap")
    .select("id_add_on")
    .eq("id_template_tagihan", params.id);

  const { data: addOns } = await supabase
    .from("add_on")
    .select("id,harga")
    .in("id", addOnLinks?.map((a) => a.id_add_on) || []);

  let kamarIds: string[] = kamarLinks?.map((k) => k.id_kamar) || [];

  if (kamarIds.length === 0) {
    const { data: allKamar } = await supabase
      .from("kamar")
      .select("id")
      .is("deleted_at", null);
    kamarIds = allKamar?.map((k) => k.id) || [];
  }

  const kamarRes = await supabase
    .from("kamar")
    .select("id, nomor_kamar, harga")
    .in("id", kamarIds);

  const kamars = kamarRes.data || [];

  const addOnTotal = (addOns || []).reduce((acc, a) => acc + (a.harga || 0), 0);

  for (const k of kamars) {
    const invoice = generateInvoice(k.nomor_kamar, template.tanggal_terbit);
    await supabase.from("tagihan").insert({
      nomor_invoice: invoice,
      kamar_id: k.id,
      status_pembayaran: "belum bayar",
      add_on: addOnTotal,
      tanggal_terbit: template.tanggal_terbit,
      tanggal_jatuh_tempo: template.tanggal_jatuh_tempo,
      denda: 0,
      total_tagihan: addOnTotal + (k.harga || 0),
    });
  }

  return NextResponse.json({});
}
