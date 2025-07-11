"use client";

import { useEffect, useState } from "react";
import apiClient from "@/libs/api";
import { Tagihan } from "@/types";
import { useParams, useRouter } from "next/navigation";
import { formatRupiah, formatDate } from "@/libs/formatter";


export default function TagihanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<Tagihan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res: Tagihan = await apiClient.get(`/tagihan/${params?.id}`);
        setData(res);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchData();
  }, [params]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 text-center">
          <p>Data not found</p>
          <button className="btn" onClick={() => router.back()}>
            Back
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 space-y-4">
      <button className="btn mb-4" onClick={() => router.back()}>
        Back
      </button>
      <h1 className="text-2xl font-bold mb-4">Detail Tagihan</h1>
      <table className="table w-full max-w-xl">
        <tbody>
          <tr>
            <th>Nomor Invoice</th>
            <td>{data.nomor_invoice}</td>
          </tr>
          <tr>
            <th>Nomor Kamar</th>
            <td>{data.kamar?.nomor_kamar}</td>
          </tr>
          <tr>
            <th>Nama Penghuni</th>
            <td>{data.penghuni?.nama}</td>
          </tr>
          <tr>
            <th>Status</th>
            <td>{data.status_pembayaran}</td>
          </tr>
          <tr>
            <th>Harga Kamar</th>
            <td>{formatRupiah(data.kamar?.harga || 0)}</td>
          </tr>
          <tr>
            <th>Add-on</th>
            <td>{formatRupiah(data.add_on)}</td>
          </tr>
          <tr>
            <th>Tanggal Terbit</th>
            <td>{formatDate(data.tanggal_terbit)}</td>
          </tr>
          <tr>
            <th>Tanggal Jatuh Tempo</th>
            <td>{formatDate(data.tanggal_jatuh_tempo)}</td>
          </tr>
          <tr>
            <th>Denda</th>
            <td>{formatRupiah(data.denda)}</td>
          </tr>
          <tr>
            <th>Total Tagihan</th>
            <td>{formatRupiah(data.total_tagihan)}</td>
          </tr>
        </tbody>
      </table>
      {data.add_ons && data.add_ons.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mt-6 mb-2">Add-on</h2>
          <table className="table w-full max-w-xl">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Qty</th>
                <th>Harga</th>
                <th>Satuan</th>
              </tr>
            </thead>
            <tbody>
              {data.add_ons.map((a) => (
                <tr key={a.add_on_id}>
                  <td>{a.add_on?.nama}</td>
                  <td>{a.qty}</td>
                  <td>{formatRupiah(a.add_on?.harga || 0)}</td>
                  <td>{a.add_on?.satuan}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
