"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import apiClient from "@/libs/api";
import { Tagihan, Kamar, AddOn } from "@/types";
import toast from "react-hot-toast";
import { formatRupiah, formatDate } from "@/libs/formatter";
import { 
  getComputedStatus, 
  getStatusConfig
} from "@/libs/invoice-status";
import { useKos } from "@/contexts/KosContext";


interface FormData {
  nomor_invoice: string;
  kamar_id: string;
  nomor_kamar: string;
  status_pembayaran: string;
  add_on: string;
  harga_kamar: number;
  tanggal_terbit: string;
  tanggal_jatuh_tempo: string;
  denda: string;
  total_tagihan: string;
  auto_invoice: boolean;
}

const generateInvoice = (kamar: string, tanggal: string) => {
  if (!kamar || !tanggal) return "";
  const [year, month, day] = tanggal.split("-");
  return `inv/${kamar}/${day}${month}${year}`;
};

export default function TagihanPage() {
  const { selectedKosId } = useKos();
  const [tagihan, setTagihan] = useState<Tagihan[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const limit = 10;
  const [search, setSearch] = useState<string>("");
  const [form, setForm] = useState<FormData>({
    nomor_invoice: "",
    kamar_id: "",
    nomor_kamar: "",
    status_pembayaran: "draft",
    add_on: "0",
    harga_kamar: 0,
    tanggal_terbit: new Date().toISOString().slice(0, 10),
    tanggal_jatuh_tempo: new Date().toISOString().slice(0, 10),
    denda: "0",
    total_tagihan: "0",
    auto_invoice: true,
  });
  const [editing, setEditing] = useState<Tagihan | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [kamarOptions, setKamarOptions] = useState<Kamar[]>([]);
  const [addOnOptions, setAddOnOptions] = useState<AddOn[]>([]);
  const [selectedAddOns, setSelectedAddOns] = useState<{ id: string; qty: number }[]>([]);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const fetchTagihan = async () => {
    if (!selectedKosId) return;
    setIsLoading(true);
    try {
      const params: Record<string, any> = { page, limit, q: search, kos_id: selectedKosId };
      if (statusFilter) params.status_pembayaran = statusFilter;
      const res: { data: Tagihan[]; count: number } = await apiClient.get(
        "/tagihan",
        { params }
      );
      setTagihan(res.data);
      setTotalPages(Math.ceil(res.count / limit));
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  const fetchKamarOptions = async (q: string) => {
    if (!selectedKosId) return;
    try {
      const res: { data: Kamar[] } = await apiClient.get("/kamar", {
        params: { page: 1, limit: 10, q, kos_id: selectedKosId },
      });
      setKamarOptions(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAddOnOptions = async () => {
    if (!selectedKosId) return;
    try {
      const res: { data: AddOn[] } = await apiClient.get("/add-on", {
        params: { page: 1, limit: 100, kos_id: selectedKosId },
      });
      setAddOnOptions(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchTagihan();
  }, [page, search, statusFilter, selectedKosId]);

  useEffect(() => {
    if (form.auto_invoice) {
      setForm((f) => ({
        ...f,
        nomor_invoice: generateInvoice(f.nomor_kamar, f.tanggal_terbit),
      }));
    }
  }, [form.nomor_kamar, form.tanggal_terbit, form.auto_invoice]);

  useEffect(() => {
    setForm((f) => ({
      ...f,
      total_tagihan: String(
        (Number(f.harga_kamar) || 0) + (Number(f.add_on) || 0) + (Number(f.denda) || 0)
      ),
    }));
  }, [form.harga_kamar, form.add_on, form.denda]);

  useEffect(() => {
    const sum = selectedAddOns.reduce((acc, item) => {
      const found = addOnOptions.find((a) => a.id === item.id);
      return acc + (found ? found.harga * item.qty : 0);
    }, 0);
    setForm((f) => ({ ...f, add_on: String(sum) }));
  }, [selectedAddOns, addOnOptions]);

  const openAdd = () => {
    const today = new Date().toISOString().slice(0, 10);
    setForm({
      nomor_invoice: "",
      kamar_id: "",
      nomor_kamar: "",
      status_pembayaran: "draft",
      add_on: "0",
      harga_kamar: 0,
      tanggal_terbit: today,
      tanggal_jatuh_tempo: today,
      denda: "0",
      total_tagihan: "0",
      auto_invoice: true,
    });
    setSelectedAddOns([]);
    setEditing(null);
    setIsSaving(false);
    fetchKamarOptions("");
    fetchAddOnOptions();
    setOpenMenu(null);
    setIsModalOpen(true);
  };

  const openEdit = (row: Tagihan) => {
    setForm({
      nomor_invoice: row.nomor_invoice,
      kamar_id: row.kamar_id,
      nomor_kamar: row.kamar?.nomor_kamar || "",
      status_pembayaran: row.status_pembayaran,
      add_on: String(row.add_on),
      harga_kamar: row.kamar?.harga || 0,
      tanggal_terbit: row.tanggal_terbit ? row.tanggal_terbit.slice(0, 10) : "",
      tanggal_jatuh_tempo: row.tanggal_jatuh_tempo
        ? row.tanggal_jatuh_tempo.slice(0, 10)
        : "",
      denda: String(row.denda),
      total_tagihan: String(row.total_tagihan),
      auto_invoice: false,
    });
    setEditing(row);
    setIsSaving(false);
    fetchKamarOptions(row.kamar?.nomor_kamar || "");
    fetchAddOnOptions();
    setSelectedAddOns(
      row.add_ons?.map((a) => ({ id: a.add_on_id, qty: a.qty })) || []
    );
    setOpenMenu(null);
    setIsModalOpen(true);
  };

  const handleKamarChange = (value: string) => {
    setForm((f) => ({ ...f, nomor_kamar: value }));
    fetchKamarOptions(value);
    const found = kamarOptions.find((k) => k.nomor_kamar === value);
    if (found) {
      setForm((f) => ({
        ...f,
        kamar_id: found.id,
        harga_kamar: found.harga,
      }));
    } else {
      setForm((f) => ({ ...f, kamar_id: "" }));
    }
  };

  const handleSubmit = async () => {
    if (!form.nomor_invoice) {
      toast.error("Nomor invoice wajib diisi");
      return;
    }

    if (!form.kamar_id) {
      toast.error("Nomor kamar wajib diisi");
      return;
    }

    if (!form.tanggal_terbit || !form.tanggal_jatuh_tempo) {
      toast.error("Tanggal wajib diisi");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        nomor_invoice: form.nomor_invoice,
        kamar_id: form.kamar_id,
        status_pembayaran: form.status_pembayaran,
        add_on: Number(form.add_on) || 0,
        tanggal_terbit: form.tanggal_terbit,
        tanggal_jatuh_tempo: form.tanggal_jatuh_tempo,
        denda: Number(form.denda) || 0,
        total_tagihan: Number(form.total_tagihan) || 0,
        add_ons: selectedAddOns,
        kos_id: selectedKosId,
      };
      if (editing) {
        await apiClient.put(`/tagihan/${editing.id}`, payload);
      } else {
        await apiClient.post("/tagihan", payload);
      }
      setIsModalOpen(false);
      fetchTagihan();
    } catch (e: any) {
      const message = e?.response?.data?.error;
      if (message) {
        toast.error(message);
      } else {
        console.error(e);
      }
    }
    setIsSaving(false);
  };

  const handleDelete = async (row: Tagihan) => {
    if (!confirm("Delete this tagihan?")) return;
    try {
      await apiClient.delete(`/tagihan/${row.id}`);
      fetchTagihan();
      setSelectedIds((ids) => ids.filter((i) => i !== row.id));
    } catch (e) {
      console.error(e);
    }
    setOpenMenu(null);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((ids) =>
      ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]
    );
  };

  const selectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(tagihan.map((t) => t.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm("Delete selected tagihan?")) return;
    setIsBulkLoading(true);
    try {
      await Promise.all(selectedIds.map((id) => apiClient.delete(`/tagihan/${id}`)));
      setSelectedIds([]);
      fetchTagihan();
    } catch (e) {
      console.error(e);
    }
    setIsBulkLoading(false);
  };

  const handleBulkSend = async () => {
    if (!confirm("Kirim tagihan ke penghuni yang dipilih?")) return;
    
    setIsBulkLoading(true);
    try {
      const results = await Promise.allSettled(
        selectedIds.map((id) => apiClient.post(`/tagihan/${id}/send`, {}))
      );
      
      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.filter(result => result.status === 'rejected').length;
      
      if (successful > 0) {
        toast.success(`${successful} tagihan berhasil dikirim${failed > 0 ? `, ${failed} gagal` : ''}`);
        // Refresh data to show updated statuses
        fetchTagihan();
        setSelectedIds([]);
      }
      
      if (failed > 0 && successful === 0) {
        toast.error("Gagal mengirim tagihan. Periksa email penghuni.");
      }
      
    } catch (e: any) {
      console.error(e);
      toast.error("Terjadi kesalahan saat mengirim tagihan");
    }
    setIsBulkLoading(false);
  };

  const handleSendSingle = async (invoice: Tagihan, method: 'email' | 'whatsapp' | 'both' = 'both') => {
    const methodText = method === 'email' ? 'email' : method === 'whatsapp' ? 'WhatsApp' : 'email dan WhatsApp';
    if (!confirm(`Kirim tagihan ${invoice.nomor_invoice} via ${methodText} ke penghuni?`)) return;
    
    try {
      let endpoint = `/tagihan/${invoice.id}/send`;
      if (method === 'whatsapp') {
        endpoint = `/tagihan/${invoice.id}/send-whatsapp`;
      } else if (method === 'both') {
        endpoint = `/tagihan/${invoice.id}/send-both`;
      }
      
      const response = await apiClient.post(endpoint, {});
      
      if (method === 'both') {
        // Handle dual-channel response
        const { email, whatsapp } = response.data;
        if (email.success && whatsapp.success) {
          toast.success(`Tagihan ${invoice.nomor_invoice} berhasil dikirim via email dan WhatsApp`);
        } else if (email.success && !whatsapp.success) {
          toast.success(`Tagihan berhasil dikirim via email`);
          toast.error(`Gagal kirim WhatsApp: ${whatsapp.error}`);
        } else if (!email.success && whatsapp.success) {
          toast.success(`Tagihan berhasil dikirim via WhatsApp`);
          toast.error(`Gagal kirim email: ${email.error}`);
        } else {
          toast.error(`Gagal mengirim via email dan WhatsApp`);
        }
      } else {
        toast.success(`Tagihan ${invoice.nomor_invoice} berhasil dikirim via ${methodText}`);
      }
      
      fetchTagihan(); // Refresh to show updated status
    } catch (e: any) {
      console.error(e);
      const message = e?.response?.data?.error || `Gagal mengirim tagihan via ${methodText}`;
      toast.error(message);
    }
    setOpenMenu(null);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'lunas':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'menunggu_pembayaran':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
        );
      case 'terlambat':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'draft':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        );
      default:
        return null;
    }
  };

  // Conditional content to avoid early return
  let content;
  
  if (!selectedKosId) {
    content = (
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Pilih Kos Terlebih Dahulu</h3>
          <p className="text-gray-600">Silakan pilih kos dari dropdown di header untuk mengelola tagihan</p>
        </div>
      </div>
    );
  } else {
    content = (
      <>
        {/* Header */}
        <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Manajemen Tagihan</h1>
            <p className="text-gray-600">Kelola tagihan dan pembayaran penghuni</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedIds.length > 0 && (
              <>
                <button
                  onClick={handleBulkDelete}
                  disabled={isBulkLoading}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
                >
                  {isBulkLoading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Hapus ({selectedIds.length})
                </button>
                <button
                  onClick={handleBulkSend}
                  disabled={isBulkLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
                >
                  {isBulkLoading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Kirim ({selectedIds.length})
                </button>
              </>
            )}
            <button
              onClick={openAdd}
              className="bg-primary hover:bg-primary-focus text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Tambah Tagihan
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Cari Tagihan</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Cari nomor invoice, kamar, penghuni..."
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Status Pembayaran</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Semua Status</option>
              <option value="draft">Draft</option>
              <option value="menunggu_pembayaran">Menunggu Pembayaran</option>
              <option value="lunas">Lunas</option>
              <option value="terlambat">Terlambat</option>
            </select>
          </div>
          {selectedIds.length > 0 && (
            <div className="sm:w-32">
              <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Semua</label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  checked={tagihan.length > 0 && tagihan.every((t) => selectedIds.includes(t.id))}
                  onChange={(e) => selectAll(e.target.checked)}
                />
                <span className="ml-2 text-sm text-gray-600">Pilih semua</span>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
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
      ) : tagihan.length === 0 ? (
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Belum ada tagihan</h3>
            <p className="text-gray-600 mb-6">Mulai dengan membuat tagihan pertama Anda</p>
            <button
              onClick={openAdd}
              className="bg-primary hover:bg-primary-focus text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
            >
              Buat Tagihan Pertama
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {tagihan.map((invoice) => (
              <div
                key={invoice.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                      checked={selectedIds.includes(invoice.id)}
                      onChange={() => toggleSelect(invoice.id)}
                    />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {invoice.nomor_invoice}
                      </h3>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2-2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <span>Kamar {invoice.kamar?.nomor_kamar}</span>
                        </div>
                        {invoice.penghuni?.nama && (
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span>{invoice.penghuni.nama}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setOpenMenu(openMenu === invoice.id ? null : invoice.id)}
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                    {openMenu === invoice.id && (
                      <div className="absolute right-0 top-10 z-10 w-48 bg-white rounded-md shadow-lg border border-gray-200">
                        <div className="py-1">
                          <button
                            onClick={() => {
                              openEdit(invoice);
                              setOpenMenu(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit Tagihan
                          </button>
                          <a
                            href={`/dashboard/tagihan/${invoice.id}`}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                            onClick={() => setOpenMenu(null)}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Lihat Detail
                          </a>
                          <div className="border-b border-gray-100">
                            <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Kirim Tagihan
                            </div>
                          </div>
                          <button
                            onClick={() => handleSendSingle(invoice, 'both')}
                            className="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                            Email + WhatsApp
                          </button>
                          <button
                            onClick={() => handleSendSingle(invoice, 'email')}
                            className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            Email Saja
                          </button>
                          <button
                            onClick={() => handleSendSingle(invoice, 'whatsapp')}
                            className="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            WhatsApp Saja
                          </button>
                          <button
                            onClick={() => {
                              handleDelete(invoice);
                              setOpenMenu(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Hapus Tagihan
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Status:</span>
                      {(() => {
                        const computedStatus = getComputedStatus({
                          tanggal_jatuh_tempo: invoice.tanggal_jatuh_tempo,
                          status_pembayaran: invoice.status_pembayaran
                        });
                        const statusConfig = getStatusConfig(computedStatus);
                        return (
                          <div 
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium"
                            style={{
                              backgroundColor: statusConfig.bgColor,
                              color: statusConfig.color
                            }}
                          >
                            {getStatusIcon(computedStatus)}
                            <span>{statusConfig.label}</span>
                          </div>
                        );
                      })()
                    }</div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Harga kamar:</span>
                        <div className="font-medium">{formatRupiah(invoice.kamar?.harga || 0)}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Add-on:</span>
                        <div className="font-medium">{formatRupiah(invoice.add_on)}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Denda:</span>
                        <div className="font-medium">{formatRupiah(invoice.denda)}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Terbit:</span>
                        <div className="font-medium">{formatDate(invoice.tanggal_terbit)}</div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                      <span className="text-gray-600">Jatuh tempo:</span>
                      <span className="text-sm font-medium">{formatDate(invoice.tanggal_jatuh_tempo)}</span>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-900">Total Tagihan:</span>
                        <span className="text-xl font-bold text-primary">{formatRupiah(invoice.total_tagihan)}</span>
                      </div>
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
        title={editing ? "Edit Tagihan" : "Tambah Tagihan Baru"}
      >
        <div className="space-y-6">
          {/* Invoice Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">Informasi Invoice</h3>
            
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="auto-invoice"
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                checked={form.auto_invoice}
                onChange={(e) => setForm({ ...form, auto_invoice: e.target.checked })}
              />
              <label htmlFor="auto-invoice" className="text-sm font-medium text-gray-700">
                Auto generate nomor invoice
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nomor Invoice <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="e.g., inv/101/01012024"
                value={form.nomor_invoice}
                disabled={form.auto_invoice}
                onChange={(e) => setForm({ ...form, nomor_invoice: e.target.value })}
              />
              {form.auto_invoice && (
                <p className="text-xs text-gray-500 mt-1">Nomor invoice akan dibuat otomatis berdasarkan kamar dan tanggal</p>
              )}
            </div>

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
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status Pembayaran <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                value={form.status_pembayaran}
                onChange={(e) => setForm({ ...form, status_pembayaran: e.target.value })}
              >
                <option value="draft">Draft</option>
                <option value="menunggu_pembayaran">Menunggu Pembayaran</option>
                <option value="lunas">Lunas</option>
              </select>
            </div>
          </div>

          {/* Pricing Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">Detail Tagihan</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Harga Kamar
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Harga sewa kamar"
                value={formatRupiah(form.harga_kamar)}
                onChange={(e) =>
                  setForm({
                    ...form,
                    harga_kamar: Number(e.target.value.replace(/[^0-9]/g, "")),
                  })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Layanan Tambahan (Add-on)
              </label>
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md">
                {addOnOptions.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    Belum ada add-on tersedia
                  </div>
                ) : (
                  <div className="p-3 space-y-2">
                    {addOnOptions.map((addon) => {
                      const selected = selectedAddOns.find((s) => s.id === addon.id);
                      return (
                        <label key={addon.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                            checked={!!selected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedAddOns([...selectedAddOns, { id: addon.id, qty: 1 }]);
                              } else {
                                setSelectedAddOns(selectedAddOns.filter((i) => i.id !== addon.id));
                              }
                            }}
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">{addon.nama}</div>
                            <div className="text-xs text-gray-500">
                              {formatRupiah(addon.harga)} / {addon.satuan}
                            </div>
                          </div>
                          {selected && (
                            <input
                              type="number"
                              className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                              value={selected.qty}
                              min={1}
                              onChange={(e) => {
                                const qty = Number(e.target.value) || 1;
                                setSelectedAddOns(
                                  selectedAddOns.map((s) =>
                                    s.id === addon.id ? { ...s, qty } : s
                                  )
                                );
                              }}
                            />
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">Total Add-on: {formatRupiah(Number(form.add_on) || 0)}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Denda
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Denda keterlambatan"
                value={formatRupiah(Number(form.denda) || 0)}
                onChange={(e) =>
                  setForm({ ...form, denda: e.target.value.replace(/[^0-9]/g, "") })
                }
              />
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">Tanggal</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tanggal Terbit <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  value={form.tanggal_terbit}
                  onChange={(e) => setForm({ ...form, tanggal_terbit: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tanggal Jatuh Tempo <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  value={form.tanggal_jatuh_tempo}
                  onChange={(e) => setForm({ ...form, tanggal_jatuh_tempo: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Total */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-900">Total Tagihan:</span>
              <span className="text-xl font-bold text-primary">{formatRupiah(Number(form.total_tagihan) || 0)}</span>
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
              {editing ? "Simpan Perubahan" : "Buat Tagihan"}
            </button>
          </div>
        </div>
      </Modal>
      </>
    );
  }

  return (
    <main className="p-6">
      {content}
    </main>
  );
}
