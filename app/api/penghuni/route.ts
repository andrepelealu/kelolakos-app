import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabaseUser = createClient();
  const {
    data: { user },
  } = await supabaseUser.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
  const kos_id = searchParams.get("kos_id");

  if (!kos_id) {
    return NextResponse.json({ error: "kos_id is required" }, { status: 400 });
  }

  // Verify user owns this kos
  const { data: kosData } = await supabase
    .from("kos")
    .select("id")
    .eq("id", kos_id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .single();

  if (!kosData) {
    return NextResponse.json({ error: "Kos not found or access denied" }, { status: 403 });
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let penghuniIds: string[] = [];
  
  // If there's a search query, we need to find matching records
  if (q) {
    const like = `%${q}%`;
    
    // Search in penghuni table for this kos
    const { data: penghuniMatches } = await supabase
      .from("penghuni")
      .select("id")
      .eq("kos_id", kos_id)
      .is("deleted_at", null)
      .or(`nama.ilike.${like},nomor_telepon.ilike.${like},email.ilike.${like}`);
    
    // Search for kamar by nomor_kamar in this kos and get penghuni with those kamar_ids
    const { data: kamarMatches } = await supabase
      .from("kamar")
      .select("id")
      .eq("kos_id", kos_id)
      .is("deleted_at", null)
      .ilike("nomor_kamar", like);
      
    const penghuniByKamarQuery = kamarMatches && kamarMatches.length > 0 
      ? await supabase
          .from("penghuni")
          .select("id")
          .eq("kos_id", kos_id)
          .is("deleted_at", null)
          .in("kamar_id", kamarMatches.map(k => k.id))
      : { data: [] as {id: string}[] };
    const { data: penghuniByKamar } = penghuniByKamarQuery;
    
    // Combine all matching IDs
    const allMatches = [
      ...(penghuniMatches || []),
      ...(penghuniByKamar || [])
    ];
    
    penghuniIds = Array.from(new Set(allMatches.map(p => p.id)));
    
    // If no matches found, return empty result
    if (penghuniIds.length === 0) {
      return NextResponse.json({ data: [], count: 0, page, limit });
    }
  }

  let query = supabase
    .from("penghuni")
    .select("*, kamar: kamar_id (nomor_kamar), kos(nama_kos)", { count: "exact" })
    .eq("kos_id", kos_id)
    .is("deleted_at", null);
    
  // Apply search filter if we have search results
  if (q && penghuniIds.length > 0) {
    query = query.in("id", penghuniIds);
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

  // Apply pagination
  query = query.range(from, to);
  
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

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const body = await req.json();

  // basic validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^62\d{8,15}$/;

  if (!body.kos_id) {
    return NextResponse.json({ error: "kos_id is required" }, { status: 400 });
  }

  if (!body.nama) {
    return NextResponse.json({ error: "Nama is required" }, { status: 400 });
  }

  if (!body.nomor_telepon) {
    return NextResponse.json(
      { error: "Nomor telepon is required" },
      { status: 400 }
    );
  }

  if (!body.kamar_id) {
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

  // Verify user owns this kos
  const { data: kosData } = await supabase
    .from("kos")
    .select("id")
    .eq("id", body.kos_id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .single();

  if (!kosData) {
    return NextResponse.json({ error: "Kos not found or access denied" }, { status: 403 });
  }

  const { data: kamar, error: kamarError } = await supabase
    .from("kamar")
    .select("id, kos_id")
    .eq("id", body.kamar_id)
    .eq("kos_id", body.kos_id)
    .is("deleted_at", null)
    .single();

  if (kamarError || !kamar) {
    return NextResponse.json(
      { error: "Nomor kamar tidak valid atau tidak ditemukan di kos ini" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("penghuni")
    .insert({
      kos_id: body.kos_id,
      nama: body.nama,
      kamar_id: body.kamar_id,
      nomor_telepon: body.nomor_telepon,
      email: body.email,
      mulai_sewa: body.mulai_sewa,
      selesai_sewa: body.selesai_sewa,
    })
    .select("*, kamar: kamar_id (nomor_kamar), kos(nama_kos)")
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
