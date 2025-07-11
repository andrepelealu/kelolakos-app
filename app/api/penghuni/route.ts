import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = createAdminClient();
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);
  const q = searchParams.get("q") || "";
  const mulaiSewaStart = searchParams.get("mulai_sewa_start") || "";
  const mulaiSewaEnd = searchParams.get("mulai_sewa_end") || "";
  const selesaiSewaStart = searchParams.get("selesai_sewa_start") || "";
  const selesaiSewaEnd = searchParams.get("selesai_sewa_end") || "";
  const status = searchParams.get("status") || "";

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("penghuni")
    .select("*", { count: "exact" })
    .is("deleted_at", null)
    .range(from, to);

  if (q) {
    const like = `%${q}%`;
    query = query.or(
      `nama.ilike.${like},nomor_kamar.ilike.${like},nomor_telepon.ilike.${like},email.ilike.${like}`
    );
  }

  if (mulaiSewaStart) {
    query = query.gte("mulai_sewa", mulaiSewaStart);
  }

  if (mulaiSewaEnd) {
    query = query.lte("mulai_sewa", mulaiSewaEnd);
  }

  if (selesaiSewaStart) {
    query = query.gte("selesai_sewa", selesaiSewaStart);
  }

  if (selesaiSewaEnd) {
    query = query.lte("selesai_sewa", selesaiSewaEnd);
  }

  if (status) {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const gmt7 = new Date(utc + 7 * 60 * 60000);
    const isoToday = gmt7.toISOString().slice(0, 10);
    const iso14 = new Date(gmt7.getTime() + 14 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    if (status === "habis") {
      query = query.lte("selesai_sewa", isoToday);
    } else if (status === "hampir habis") {
      query = query.gt("selesai_sewa", isoToday).lte("selesai_sewa", iso14);
    } else if (status === "panjang") {
      query = query.gt("selesai_sewa", iso14);
    } else if (status === "akan datang") {
      query = query.gt("mulai_sewa", isoToday);
    }
  }

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, count, page, limit });
}

export async function POST(req: NextRequest) {
  const supabaseUser = createClient();
  const {
    data: { user },
  } = await supabaseUser.auth.getUser();

  const supabase = createAdminClient();
  const body = await req.json();

  // basic validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^62\d{8,15}$/;

  if (!body.nama) {
    return NextResponse.json({ error: "Nama is required" }, { status: 400 });
  }

  if (!body.nomor_telepon) {
    return NextResponse.json(
      { error: "Nomor telepon is required" },
      { status: 400 }
    );
  }

  if (!body.nomor_kamar) {
    return NextResponse.json(
      { error: "Nomor kamar is required" },
      { status: 400 }
    );
  }

  if (!body.mulai_sewa || !body.selesai_sewa) {
    return NextResponse.json(
      { error: "Tanggal sewa is required" },
      { status: 400 }
    );
  }

  if (body.email && !emailRegex.test(body.email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  if (!phoneRegex.test(body.nomor_telepon)) {
    return NextResponse.json(
      { error: "Nomor telepon must start with 62 and contain digits only" },
      { status: 400 }
    );
  }

  if (new Date(body.selesai_sewa) < new Date(body.mulai_sewa)) {
    return NextResponse.json(
      { error: "Selesai sewa harus setelah mulai sewa" },
      { status: 400 }
    );
  }

  const { data: kamar, error: kamarError } = await supabase
    .from("kamar")
    .select("id")
    .eq("nomor_kamar", body.nomor_kamar)
    .is("deleted_at", null)
    .single();

  if (kamarError || !kamar) {
    return NextResponse.json(
      { error: "Nomor kamar tidak valid" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("penghuni")
    .insert({
      nama: body.nama,
      nomor_kamar: body.nomor_kamar,
      nomor_telepon: body.nomor_telepon,
      email: body.email,
      mulai_sewa: body.mulai_sewa,
      selesai_sewa: body.selesai_sewa,
    })
    .select()
    .single();

  if (!error) {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const gmt7 = new Date(utc + 7 * 60 * 60000);
    const statusKamar = new Date(body.mulai_sewa) > gmt7 ? "booked" : "terisi";

    await supabase
      .from("kamar")
      .update({ status: statusKamar })
      .eq("id", kamar.id);
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
