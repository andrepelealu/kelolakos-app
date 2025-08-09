"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import apiClient from "@/libs/api";
import { AddOn } from "@/types";
import toast from "react-hot-toast";
import { formatRupiah } from "@/libs/formatter";
import { useKos } from "@/contexts/KosContext";


interface FormData {
  nama: string;
  harga: string;
  satuan: string;
}

export default function AddOnPage() {
  const { selectedKosId } = useKos();
  const [addons, setAddons] = useState<AddOn[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const limit = 10;
  const [search, setSearch] = useState<string>("");
  const [form, setForm] = useState<FormData>({ nama: "", harga: "", satuan: "" });
  const [editing, setEditing] = useState<AddOn | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchAddons = async () => {
    if (!selectedKosId) return;
    setIsLoading(true);
    try {
      const params = { page, limit, q: search, kos_id: selectedKosId };
      const res: { data: AddOn[]; count: number } = await apiClient.get("/add-on", { params });
      setAddons(res.data);
      setTotalPages(Math.ceil(res.count / limit));
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAddons();
  }, [page, search, selectedKosId]);

  const openAdd = () => {
    setForm({ nama: "", harga: "", satuan: "" });
    setEditing(null);
    setIsSaving(false);
    setOpenMenu(null);
    setIsModalOpen(true);
  };

  const openEdit = (row: AddOn) => {
    setForm({
      nama: row.nama,
      harga: String(row.harga),
      satuan: row.satuan,
    });
    setEditing(row);
    setIsSaving(false);
    setOpenMenu(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.nama || !form.harga || !form.satuan) {
      toast.error("Semua field wajib diisi");
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
        await apiClient.put(`/add-on/${editing.id}`, payload);
      } else {
        await apiClient.post("/add-on", payload);
      }
      setIsModalOpen(false);
      fetchAddons();
    } catch (e) {
      console.error(e);
    }
    setIsSaving(false);
  };

  const handleDelete = async (row: AddOn) => {
    if (!confirm("Delete this add-on?")) return;
    try {
      await apiClient.delete(`/add-on/${row.id}`);
      fetchAddons();
    } catch (e) {
      console.error(e);
    }
    setOpenMenu(null);
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
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Pilih Kos Terlebih Dahulu</h3>
            <p className="text-gray-600">Silakan pilih kos dari dropdown di header untuk mengelola layanan tambahan</p>
          </div>
        </div>
      ) : (
        <div>
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Layanan Tambahan</h1>
                <p className="text-gray-600">Kelola add-on dan layanan tambahan kos</p>
              </div>
              <button
                onClick={openAdd}
                className="bg-primary hover:bg-primary-focus text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Tambah Add-on
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Cari Add-on</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Cari nama layanan..."
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
          ) : addons.length === 0 ? (
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
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Belum ada layanan tambahan</h3>
                <p className="text-gray-600 mb-6">Mulai dengan menambahkan layanan tambahan pertama</p>
                <button
                  onClick={openAdd}
                  className="bg-primary hover:bg-primary-focus text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
                >
                  Tambah Add-on Pertama
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                {addons.map((addon) => (
                  <div
                    key={addon.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {addon.nama}
                        </h3>
                        <p className="text-2xl font-bold text-primary mb-2">
                          {formatRupiah(addon.harga)}
                        </p>
                        <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                          per {addon.satuan}
                        </div>
                      </div>
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenu(openMenu === addon.id ? null : addon.id)}
                          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>
                        {openMenu === addon.id && (
                          <div className="absolute right-0 top-10 z-10 w-48 bg-white rounded-md shadow-lg border border-gray-200">
                            <div className="py-1">
                              <button
                                onClick={() => openEdit(addon)}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit Add-on
                              </button>
                              <button
                                onClick={() => handleDelete(addon)}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Hapus Add-on
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
        title={editing ? "Edit Layanan Tambahan" : "Tambah Layanan Tambahan"}
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nama Layanan <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="e.g., Laundry, Cleaning Service"
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Harga <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="Masukkan harga"
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
              Satuan <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="e.g., kg, bulan, kali"
              value={form.satuan}
              onChange={(e) => setForm({ ...form, satuan: e.target.value })}
            />
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
              {editing ? "Simpan Perubahan" : "Tambah Add-on"}
            </button>
          </div>
        </div>
      </Modal>
    </main>
  );
}