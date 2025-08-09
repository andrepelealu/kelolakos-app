"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import apiClient from "@/libs/api";
import { Penghuni, Kamar } from "@/types";
import toast from "react-hot-toast";
import { formatDate } from "@/libs/formatter";
import { useKos } from "@/contexts/KosContext";

interface FormData {
  nama: string;
  kamar_id: string;
  nomor_kamar: string;
  nomor_telepon: string;
  email: string;
  mulai_sewa: string;
  selesai_sewa: string;
}

export default function PenghuniPage() {
  const { selectedKosId } = useKos();
  const [penghuni, setPenghuni] = useState<Penghuni[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const limit = 10;
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [mulaiStartFilter, setMulaiStartFilter] = useState<string>("");
  const [mulaiEndFilter, setMulaiEndFilter] = useState<string>("");
  const [selesaiStartFilter, setSelesaiStartFilter] = useState<string>("");
  const [selesaiEndFilter, setSelesaiEndFilter] = useState<string>("");
  const [form, setForm] = useState<FormData>({
    nama: "",
    kamar_id: "",
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
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  // Functions and effects

  const fetchKamarOptions = async (q: string, kosongOnly = false) => {
    if (!selectedKosId) return;
    try {
      const params: Record<string, any> = { page: 1, limit: 10, q, kos_id: selectedKosId };
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
    if (!selectedKosId) return;
    setIsLoading(true);
    try {
      const params: Record<string, any> = { page, limit, q: search, kos_id: selectedKosId };
      if (statusFilter) params.status = statusFilter;
      if (mulaiStartFilter) params.mulai_sewa_start = mulaiStartFilter;
      if (mulaiEndFilter) params.mulai_sewa_end = mulaiEndFilter;
      if (selesaiStartFilter) params.selesai_sewa_start = selesaiStartFilter;
      if (selesaiEndFilter) params.selesai_sewa_end = selesaiEndFilter;
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
  }, [
    page,
    search,
    statusFilter,
    mulaiStartFilter,
    mulaiEndFilter,
    selesaiStartFilter,
    selesaiEndFilter,
    selectedKosId,
  ]);

  const openAdd = () => {
    const today = new Date().toISOString().slice(0, 10);
    setForm({
      nama: "",
      kamar_id: "",
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
      kamar_id: row.kamar_id,
      nomor_kamar: row.kamar?.nomor_kamar || "",
      nomor_telepon: row.nomor_telepon,
      email: row.email,
      mulai_sewa: row.mulai_sewa ? row.mulai_sewa.slice(0, 10) : "",
      selesai_sewa: row.selesai_sewa ? row.selesai_sewa.slice(0, 10) : "",
    });
    setEditing(row);
    setIsSaving(false);
    fetchKamarOptions(row.kamar?.nomor_kamar || "");
    setIsModalOpen(true);
  };

  const handleKamarChange = (value: string) => {
    setForm({ ...form, nomor_kamar: value });
    fetchKamarOptions(value, editing === null);
    const found = kamarOptions.find((k) => k.nomor_kamar === value);
    if (found) {
      setForm((f) => ({ ...f, kamar_id: found.id }));
    } else {
      setForm((f) => ({ ...f, kamar_id: "" }));
    }
  };

  const handleSubmit = async () => {
    if (!form.nama) {
      toast.error("Nama wajib diisi");
      return;
    }

    if (!form.kamar_id) {
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
      const payload = { ...form, kos_id: selectedKosId };
      if (editing) {
        await apiClient.put(`/penghuni/${editing.id}`, payload);
      } else {
        await apiClient.post("/penghuni", payload);
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

  const getStatusSewa = (mulai: string | null, selesai: string | null) => {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const gmt7 = new Date(utc + 7 * 60 * 60000);

    if (mulai && new Date(mulai) > gmt7) return "akan datang";

    if (!selesai) return "";
    const selesaiDate = new Date(selesai);
    const diff =
      (selesaiDate.getTime() - gmt7.getTime()) / (1000 * 60 * 60 * 24);
    if (diff > 14) return "panjang";
    if (diff > 0) return "hampir habis";
    return "habis";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'panjang': return 'bg-green-100 text-green-800';
      case 'hampir habis': return 'bg-yellow-100 text-yellow-800';
      case 'habis': return 'bg-red-100 text-red-800';
      case 'akan datang': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'panjang':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'hampir habis':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'habis':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'akan datang':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <main className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Manajemen Penghuni</h1>
            <p className="text-gray-600">Kelola data penghuni dan masa sewa</p>
          </div>
          <button
            onClick={openAdd}
            className="bg-primary hover:bg-primary-focus text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Tambah Penghuni
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Cari Penghuni</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Cari nama, nomor kamar..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
              <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status Sewa</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Semua Status</option>
              <option value="panjang">Panjang</option>
              <option value="hampir habis">Hampir Habis</option>
              <option value="habis">Habis</option>
              <option value="akan datang">Akan Datang</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mulai Sewa</label>
            <div className="space-y-2">
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                placeholder="Dari"
                value={mulaiStartFilter}
                onChange={(e) => {
                  setMulaiStartFilter(e.target.value);
                  setPage(1);
                }}
              />
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                placeholder="Sampai"
                value={mulaiEndFilter}
                onChange={(e) => {
                  setMulaiEndFilter(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Selesai Sewa</label>
            <div className="space-y-2">
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                placeholder="Dari"
                value={selesaiStartFilter}
                onChange={(e) => {
                  setSelesaiStartFilter(e.target.value);
                  setPage(1);
                }}
              />
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                placeholder="Sampai"
                value={selesaiEndFilter}
                onChange={(e) => {
                  setSelesaiEndFilter(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded mb-4"></div>
              <div className="flex gap-2">
                <div className="h-8 bg-gray-200 rounded flex-1"></div>
                <div className="h-8 w-8 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : penghuni.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
            <svg
              className="w-16 h-16 text-gray-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Belum ada penghuni</h3>
            <p className="text-gray-600 mb-6">Mulai dengan menambahkan penghuni pertama Anda</p>
            <button
              onClick={openAdd}
              className="bg-primary hover:bg-primary-focus text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
            >
              Tambah Penghuni Pertama
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            {penghuni.map((tenant) => (
              <div
                key={tenant.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {tenant.nama}
                    </h3>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2-2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <span>Kamar {tenant.kamar?.nomor_kamar}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span>{tenant.nomor_telepon}</span>
                      </div>
                      {tenant.email && (
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span className="truncate">{tenant.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setOpenMenu(openMenu === tenant.id ? null : tenant.id)}
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                    {openMenu === tenant.id && (
                      <div className="absolute right-0 top-10 z-10 w-48 bg-white rounded-md shadow-lg border border-gray-200">
                        <div className="py-1">
                          <button
                            onClick={() => {
                              openEdit(tenant);
                              setOpenMenu(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit Penghuni
                          </button>
                          <button
                            onClick={() => {
                              openExtend(tenant);
                              setOpenMenu(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Perpanjang Sewa
                          </button>
                          <button
                            onClick={() => {
                              handleStop(tenant);
                              setOpenMenu(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                            </svg>
                            Hentikan Sewa
                          </button>
                          <button
                            onClick={() => {
                              handleDelete(tenant);
                              setOpenMenu(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Hapus Penghuni
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Mulai sewa:</span>
                      <span className="font-medium">{formatDate(tenant.mulai_sewa)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Selesai sewa:</span>
                      <span className="font-medium">{formatDate(tenant.selesai_sewa)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Status:</span>
                      {(tenant.mulai_sewa || tenant.selesai_sewa) && (
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(getStatusSewa(tenant.mulai_sewa, tenant.selesai_sewa))}`}>
                          {getStatusIcon(getStatusSewa(tenant.mulai_sewa, tenant.selesai_sewa))}
                          <span className="capitalize">{getStatusSewa(tenant.mulai_sewa, tenant.selesai_sewa)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sebelumnya
                </button>
                <span className="px-4 py-2 text-sm text-gray-700">
                  Halaman {page} dari {totalPages}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </>
      )}
      <Modal
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        title={editing ? "Edit Penghuni" : "Tambah Penghuni Baru"}
      >
        <div className="space-y-6">
          {/* Personal Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">Informasi Pribadi</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nama Lengkap <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Masukkan nama lengkap"
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nomor Telepon <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="62812xxxxxxx"
                value={form.nomor_telepon}
                onChange={(e) => setForm({ ...form, nomor_telepon: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">Gunakan format 62 diikuti nomor telepon</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="email@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>

          {/* Room Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">Informasi Kamar</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nomor Kamar <span className="text-red-500">*</span>
              </label>
              <input
                list="nomor-kamar-options"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Pilih atau ketik nomor kamar"
                value={form.nomor_kamar}
                onChange={(e) => handleKamarChange(e.target.value)}
              />
              <datalist id="nomor-kamar-options">
                {kamarOptions.map((k) => (
                  <option key={k.id} value={k.nomor_kamar} />
                ))}
              </datalist>
              <p className="text-xs text-gray-500 mt-1">{editing ? "Dapat diubah ke kamar lain" : "Hanya kamar yang kosong yang tersedia"}</p>
            </div>
          </div>

          {/* Rental Period */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">Periode Sewa</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mulai Sewa <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  value={form.mulai_sewa}
                  onChange={(e) => setForm({ ...form, mulai_sewa: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selesai Sewa <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  value={form.selesai_sewa}
                  onChange={(e) => setForm({ ...form, selesai_sewa: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors duration-200"
            >
              Batal
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSaving}
              className="flex-1 px-4 py-2 bg-primary hover:bg-primary-focus text-white rounded-md transition-colors duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
              {editing ? "Simpan Perubahan" : "Tambah Penghuni"}
            </button>
          </div>
        </div>
      </Modal>
      <Modal
        isModalOpen={isExtendOpen}
        setIsModalOpen={setIsExtendOpen}
        title="Perpanjang Masa Sewa"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Perpanjang Sampai Tanggal <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              value={extendDate}
              onChange={(e) => setExtendDate(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Pilihan Cepat</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors duration-200"
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
                +7 Hari
              </button>
              <button
                type="button"
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors duration-200"
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
                +1 Bulan
              </button>
              <button
                type="button"
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors duration-200"
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
                +1 Tahun
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setIsExtendOpen(false)}
              className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors duration-200"
            >
              Batal
            </button>
            <button
              onClick={handleExtend}
              className="flex-1 px-4 py-2 bg-primary hover:bg-primary-focus text-white rounded-md transition-colors duration-200"
            >
              Perpanjang Sewa
            </button>
          </div>
        </div>
      </Modal>
    </main>
  );
}
