"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import apiClient from "@/libs/api";
import { Penghuni, Kamar } from "@/types";
import toast from "react-hot-toast";

const formatDate = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const DotsIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="w-4 h-4"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z"
    />
  </svg>
);

interface FormData {
  nama: string;
  nomor_kamar: string;
  nomor_telepon: string;
  email: string;
  mulai_sewa: string;
  selesai_sewa: string;
}

export default function PenghuniPage() {
  const [penghuni, setPenghuni] = useState<Penghuni[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const limit = 10;
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [mulaiFilter, setMulaiFilter] = useState<string>("");
  const [selesaiFilter, setSelesaiFilter] = useState<string>("");
  const [form, setForm] = useState<FormData>({
    nama: "",
    nomor_kamar: "",
    nomor_telepon: "",
    email: "",
    mulai_sewa: new Date().toISOString().slice(0, 10),
    selesai_sewa: new Date().toISOString().slice(0, 10),
  });
  const [editing, setEditing] = useState<Penghuni | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [kamarOptions, setKamarOptions] = useState<Kamar[]>([]);
  const [extendRow, setExtendRow] = useState<Penghuni | null>(null);
  const [extendDate, setExtendDate] = useState<string>("");
  const [isExtendOpen, setIsExtendOpen] = useState(false);

  const fetchKamarOptions = async (q: string, kosongOnly = false) => {
    try {
      const params: Record<string, any> = { page: 1, limit: 10, q };
      if (kosongOnly) params.status = "kosong";
      const res: { data: Kamar[] } = await apiClient.get("/kamar", {
        params,
      });
      setKamarOptions(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPenghuni = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, any> = { page, limit, q: search };
      if (statusFilter) params.status = statusFilter;
      if (mulaiFilter) params.mulai_sewa = mulaiFilter;
      if (selesaiFilter) params.selesai_sewa = selesaiFilter;
      const res: { data: Penghuni[]; count: number } = await apiClient.get(
        "/penghuni",
        { params }
      );
      setPenghuni(res.data);
      setTotalPages(Math.ceil(res.count / limit));
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchPenghuni();
  }, [page, search, statusFilter, mulaiFilter, selesaiFilter]);

  const openAdd = () => {
    const today = new Date().toISOString().slice(0, 10);
    setForm({
      nama: "",
      nomor_kamar: "",
      nomor_telepon: "",
      email: "",
      mulai_sewa: today,
      selesai_sewa: today,
    });
    setEditing(null);
    setIsSaving(false);
    fetchKamarOptions("", true);
    setIsModalOpen(true);
  };

  const openEdit = (row: Penghuni) => {
    setForm({
      nama: row.nama,
      nomor_kamar: row.nomor_kamar,
      nomor_telepon: row.nomor_telepon,
      email: row.email,
      mulai_sewa: row.mulai_sewa ? row.mulai_sewa.slice(0, 10) : "",
      selesai_sewa: row.selesai_sewa ? row.selesai_sewa.slice(0, 10) : "",
    });
    setEditing(row);
    setIsSaving(false);
    fetchKamarOptions(row.nomor_kamar);
    setIsModalOpen(true);
  };

  const handleKamarChange = (value: string) => {
    setForm({ ...form, nomor_kamar: value });
    fetchKamarOptions(value, editing === null);
  };

  const handleSubmit = async () => {
    if (!form.nama) {
      toast.error("Nama wajib diisi");
      return;
    }

    if (!form.nomor_kamar) {
      toast.error("Nomor kamar wajib diisi");
      return;
    }

    if (!/^62\d{8,15}$/.test(form.nomor_telepon)) {
      toast.error("Nomor telepon harus diawali 62 dan berupa angka");
      return;
    }

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error("Email tidak valid");
      return;
    }

    if (!form.mulai_sewa || !form.selesai_sewa) {
      toast.error("Tanggal sewa wajib diisi");
      return;
    }

    if (new Date(form.selesai_sewa) < new Date(form.mulai_sewa)) {
      toast.error("Selesai sewa harus setelah mulai sewa");
      return;
    }

    setIsSaving(true);
    try {
      if (editing) {
        await apiClient.put(`/penghuni/${editing.id}`, form);
      } else {
        await apiClient.post("/penghuni", form);
      }
      setIsModalOpen(false);
      fetchPenghuni();
    } catch (e) {
      console.error(e);
    }
    setIsSaving(false);
  };

  const handleDelete = async (row: Penghuni) => {
    if (!confirm("Delete this penghuni?")) return;
    try {
      await apiClient.delete(`/penghuni/${row.id}`);
      fetchPenghuni();
    } catch (e) {
      console.error(e);
    }
  };

  const handleStop = async (row: Penghuni) => {
    if (!confirm("Hentikan sewa penghuni ini?")) return;
    try {
      await apiClient.post(`/penghuni/${row.id}/stop`);
      fetchPenghuni();
    } catch (e) {
      console.error(e);
    }
  };

  const openExtend = (row: Penghuni) => {
    setExtendRow(row);
    setExtendDate(row.selesai_sewa ? row.selesai_sewa.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setIsExtendOpen(true);
  };

  const handleExtend = async () => {
    if (!extendRow) return;
    try {
      await apiClient.put(`/penghuni/${extendRow.id}`, {
        selesai_sewa: extendDate,
      });
      setIsExtendOpen(false);
      setExtendRow(null);
      fetchPenghuni();
    } catch (e) {
      console.error(e);
    }
  };

  const getStatusSewa = (selesai: string | null) => {
    if (!selesai) return "";
    const selesaiDate = new Date(selesai);
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const gmt7 = new Date(utc + 7 * 60 * 60000);
    const diff = (selesaiDate.getTime() - gmt7.getTime()) / (1000 * 60 * 60 * 24);
    if (diff > 14) return "panjang";
    if (diff > 0) return "hampir habis";
    return "habis";
  };

  return (
    <main className="min-h-screen p-8 pb-24 space-y-6">
      <div className="flex justify-between items-center gap-2 flex-wrap">
        <h1 className="text-2xl font-bold">Penghuni</h1>
        <div className="flex gap-2 flex-1 justify-end">
  
          <button className="btn btn-primary" onClick={openAdd}>
            Tambah Penghuni
          </button>
        </div>
      </div>
 
      <div className="flex flex-wrap gap-2 justify-start">
        <input
          type="text"
          placeholder="Search..."
          className="input input-bordered w-full max-w-xs"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          className="select select-bordered"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Semua Status</option>
          <option value="panjang">Panjang</option>
          <option value="hampir habis">Hampir habis</option>
          <option value="habis">Habis</option>
        </select>
        <input
          type="date"
          className="input input-bordered"
          value={mulaiFilter}
          onChange={(e) => {
            setMulaiFilter(e.target.value);
            setPage(1);
          }}
        />
        <input
          type="date"
          className="input input-bordered"
          value={selesaiFilter}
          onChange={(e) => {
            setSelesaiFilter(e.target.value);
            setPage(1);
          }}
        />
      </div>
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : (
          <table className="table w-full">
            <thead>
            <tr>
              <th>Nama</th>
              <th>Nomor Kamar</th>
              <th>Nomor Telepon</th>
              <th>Email</th>
              <th>Mulai Sewa</th>
              <th>Selesai Sewa</th>
              <th>Status Sewa</th>
              <th></th>
            </tr>
            </thead>
            <tbody>
            {penghuni.map((p) => (
              <tr key={p.id}>
                <td>{p.nama}</td>
                <td>{p.nomor_kamar}</td>
                <td>{p.nomor_telepon}</td>
                <td>{p.email}</td>
                <td>{formatDate(p.mulai_sewa)}</td>
                <td>{formatDate(p.selesai_sewa)}</td>
                <td>
                  {p.selesai_sewa && (
                    <span
                      className={`btn btn-xs text-white ${
                        getStatusSewa(p.selesai_sewa) === "habis"
                          ? "btn-error"
                          : getStatusSewa(p.selesai_sewa) === "hampir habis"
                          ? "btn-warning"
                          : "btn-success"
                      }`}
                    >
                      {getStatusSewa(p.selesai_sewa)}
                    </span>
                  )}
                </td>
                <td>
                  <div className="dropdown dropdown-end">
                    <div tabIndex={0} role="button" className="btn btn-sm btn-ghost">
                      <DotsIcon />
                    </div>
                    <ul
                      tabIndex={0}
                      className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-40"
                    >
                      <li>
                        <a onClick={() => openEdit(p)}>Edit</a>
                      </li>
                      <li>
                        <a onClick={() => handleDelete(p)}>Delete</a>
                      </li>
                      <li>
                        <a onClick={() => handleStop(p)}>Hentikan sewa</a>
                      </li>
                      <li>
                        <a onClick={() => openExtend(p)}>Perpanjang sewa</a>
                      </li>
                    </ul>
                  </div>
                </td>
              </tr>
            ))}
            {penghuni.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center">
                  No data
                </td>
              </tr>
            )}
            </tbody>
          </table>
        )}
      </div>
      <div className="flex justify-center" hidden={isLoading}>
        <div className="join">
          <button
            className="join-item btn"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Prev
          </button>
          <button className="join-item btn" disabled>
            Page {page} of {totalPages}
          </button>
          <button
            className="join-item btn"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      </div>
      <Modal
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        title={editing ? "Edit Penghuni" : "Tambah Penghuni"}
      >
        <div className="space-y-4">
          <input
            className="input input-bordered w-full"
            placeholder="Nama"
            value={form.nama}
            onChange={(e) => setForm({ ...form, nama: e.target.value })}
          />
          <input
            list="nomor-kamar-options"
            className="input input-bordered w-full"
            placeholder="Nomor Kamar"
            value={form.nomor_kamar}
            onChange={(e) => handleKamarChange(e.target.value)}
          />
          <datalist id="nomor-kamar-options">
            {kamarOptions.map((k) => (
              <option key={k.id} value={k.nomor_kamar} />
            ))}
          </datalist>
          <input
            className="input input-bordered w-full"
            placeholder="Nomor Telepon"
            value={form.nomor_telepon}
            onChange={(e) => setForm({ ...form, nomor_telepon: e.target.value })}
          />
          <input
            className="input input-bordered w-full"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            type="date"
            className="input input-bordered w-full"
            placeholder="Mulai Sewa"
            value={form.mulai_sewa}
            onChange={(e) => setForm({ ...form, mulai_sewa: e.target.value })}
          />
          <input
            type="date"
            className="input input-bordered w-full"
            placeholder="Selesai Sewa"
            value={form.selesai_sewa}
            onChange={(e) => setForm({ ...form, selesai_sewa: e.target.value })}
          />
          <button className="btn btn-primary w-full" onClick={handleSubmit} disabled={isSaving}>
            {isSaving && <span className="loading loading-spinner loading-xs"></span>}
            Save
          </button>
        </div>
      </Modal>
      <Modal
        isModalOpen={isExtendOpen}
        setIsModalOpen={setIsExtendOpen}
        title="Perpanjang Sewa"
      >
        <div className="space-y-4">
          <input
            type="date"
            className="input input-bordered w-full"
            value={extendDate}
            onChange={(e) => setExtendDate(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              className="btn btn-sm"
              onClick={() =>
                setExtendDate(
                  new Date(
                    new Date(extendDate).getTime() + 7 * 24 * 60 * 60 * 1000
                  )
                    .toISOString()
                    .slice(0, 10)
                )
              }
            >
              7 hari
            </button>
            <button
              className="btn btn-sm"
              onClick={() =>
                setExtendDate(
                  new Date(
                    new Date(extendDate).setMonth(
                      new Date(extendDate).getMonth() + 1
                    )
                  )
                    .toISOString()
                    .slice(0, 10)
                )
              }
            >
              1 bulan
            </button>
            <button
              className="btn btn-sm"
              onClick={() =>
                setExtendDate(
                  new Date(
                    new Date(extendDate).setFullYear(
                      new Date(extendDate).getFullYear() + 1
                    )
                  )
                    .toISOString()
                    .slice(0, 10)
                )
              }
            >
              1 tahun
            </button>
          </div>
          <button className="btn btn-primary w-full" onClick={handleExtend}>
            Save
          </button>
        </div>
      </Modal>
    </main>
  );
}
