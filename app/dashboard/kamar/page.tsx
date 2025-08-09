"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import apiClient from "@/libs/api";
import { Kamar } from "@/types";
import toast from "react-hot-toast";
import { formatRupiah } from "@/libs/formatter";
import { useKos } from "@/contexts/KosContext";


interface FormData {
  nomor_kamar: string;
  harga: string;
  status: string;
}

export default function KamarPage() {
  const { selectedKosId } = useKos();
  const [kamar, setKamar] = useState<Kamar[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const limit = 10;
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [form, setForm] = useState<FormData>({
    nomor_kamar: "",
    harga: "",
    status: "kosong",
  });
  const [editing, setEditing] = useState<Kamar | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchKamar = async () => {
    if (!selectedKosId) return;
    setIsLoading(true);
    try {
      const params: Record<string, any> = { page, limit, q: search, kos_id: selectedKosId };
      if (statusFilter) params.status = statusFilter;
      const res: { data: Kamar[]; count: number } = await apiClient.get(
        "/kamar",
        { params }
      );
      setKamar(res.data);
      setTotalPages(Math.ceil(res.count / limit));
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchKamar();
  }, [page, search, statusFilter, selectedKosId]);

  const openAdd = () => {
    setForm({ nomor_kamar: "", harga: "", status: "kosong" });
    setEditing(null);
    setIsSaving(false);
    setOpenMenu(null);
    setIsModalOpen(true);
  };

  const openEdit = (row: Kamar) => {
    setForm({
      nomor_kamar: row.nomor_kamar,
      harga: String(row.harga),
      status: row.status,
    });
    setEditing(row);
    setIsSaving(false);
    setOpenMenu(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.nomor_kamar || !form.harga) {
      toast.error("Nomor kamar dan harga wajib diisi");
      return;
    }

    const numericHarga = parseInt(form.harga.replace(/[^0-9]/g, ""));
    if (isNaN(numericHarga) || numericHarga <= 0) {
      toast.error("Harga harus berupa angka yang valid");
      return;
    }

    setIsSaving(true);
    try {
      const payload = { ...form, harga: numericHarga, kos_id: selectedKosId };
      if (editing) {
        await apiClient.put(`/kamar/${editing.id}`, payload);
      } else {
        await apiClient.post("/kamar", payload);
      }
      setIsModalOpen(false);
      fetchKamar();
    } catch (e) {
      console.error(e);
    }
    setIsSaving(false);
  };

  const handleDelete = async (row: Kamar) => {
    if (!confirm("Delete this kamar?")) return;
    try {
      await apiClient.delete(`/kamar/${row.id}`);
      fetchKamar();
    } catch (e) {
      console.error(e);
    }
    setOpenMenu(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'kosong':
        return 'bg-green-100 text-green-800';
      case 'terisi':
        return 'bg-blue-100 text-blue-800';
      case 'booked':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'kosong':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'terisi':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case 'booked':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0V6a2 2 0 012-2h4a2 2 0 012 2v1m-6 0h8m-8 0H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-2" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <main className="p-6">
      {!selectedKosId ? (
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
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2-2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Pilih Kos Terlebih Dahulu</h3>
            <p className="text-gray-600">Silakan pilih kos dari dropdown di header untuk mengelola kamar</p>
          </div>
        </div>
      ) : (
        <div>
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Manajemen Kamar</h1>
                <p className="text-gray-600">Kelola informasi kamar kos Anda</p>
              </div>
              <button
                onClick={openAdd}
                className="bg-primary hover:bg-primary-focus text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Tambah Kamar
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Cari Kamar</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Cari nomor kamar..."
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
              <div className="sm:w-48">
                <label className="block text-sm font-medium text-gray-700 mb-2">Filter Status</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Semua Status</option>
                  <option value="kosong">Kosong</option>
                  <option value="terisi">Terisi</option>
                  <option value="booked">Booked</option>
                </select>
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
          ) : kamar.length === 0 ? (
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
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2-2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Belum ada kamar</h3>
                <p className="text-gray-600 mb-6">Mulai dengan menambahkan kamar pertama Anda</p>
                <button
                  onClick={openAdd}
                  className="bg-primary hover:bg-primary-focus text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
                >
                  Tambah Kamar Pertama
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                {kamar.map((room) => (
                  <div
                    key={room.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          Kamar {room.nomor_kamar}
                        </h3>
                        <p className="text-2xl font-bold text-primary mb-2">
                          {formatRupiah(room.harga)}
                        </p>
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(room.status)}`}>
                          {getStatusIcon(room.status)}
                          <span className="capitalize">{room.status}</span>
                        </div>
                      </div>
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenu(openMenu === room.id ? null : room.id)}
                          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>
                        {openMenu === room.id && (
                          <div className="absolute right-0 top-10 z-10 w-48 bg-white rounded-md shadow-lg border border-gray-200">
                            <div className="py-1">
                              <button
                                onClick={() => openEdit(room)}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit Kamar
                              </button>
                              <button
                                onClick={() => handleDelete(room)}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Hapus Kamar
                              </button>
                            </div>
                          </div>
                        )}
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
            </div>
          )}
        </div>
      )}
      <Modal
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        title={editing ? "Edit Kamar" : "Tambah Kamar Baru"}
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nomor Kamar <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="e.g., 101, A1, B-05"
              value={form.nomor_kamar}
              onChange={(e) => setForm({ ...form, nomor_kamar: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Harga Sewa per Bulan <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="Masukkan harga sewa"
              value={formatRupiah(Number(form.harga) || 0)}
              onChange={(e) =>
                setForm({
                  ...form,
                  harga: e.target.value.replace(/[^0-9]/g, ""),
                })
              }
            />
            <p className="text-xs text-gray-500 mt-1">Harga akan ditampilkan dalam format Rupiah</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status Kamar <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="kosong">Kosong - Siap disewakan</option>
              <option value="terisi">Terisi - Sudah ada penghuni</option>
              <option value="booked">Booked - Sudah dipesan</option>
            </select>
          </div>

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
              {editing ? "Simpan Perubahan" : "Tambah Kamar"}
            </button>
          </div>
        </div>
      </Modal>
    </main>
  );
}