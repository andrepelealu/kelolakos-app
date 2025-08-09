"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import apiClient from "@/libs/api";
import { PaymentInfo, PaymentInfoForm } from "@/types";
import toast from "react-hot-toast";

const BANK_OPTIONS = [
  "Bank BCA", "Bank Mandiri", "Bank BRI", "Bank BNI", "Bank BTN",
  "Bank Danamon", "Bank CIMB Niaga", "Bank Permata", "Bank Maybank",
  "Bank OCBC NISP", "Bank Panin", "Bank UOB", "Jenius", "Bank Neo Commerce",
  "Lainnya"
];

const EWALLET_OPTIONS = [
  "", "GoPay", "OVO", "DANA", "ShopeePay", "LinkAja", "Sakuku", "Lainnya"
];

export default function SettingPembayaranPage() {
  const [paymentInfos, setPaymentInfos] = useState<PaymentInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const limit = 10;
  const [search, setSearch] = useState<string>("");
  const [form, setForm] = useState<PaymentInfoForm>({
    nama_pemilik: "",
    nama_kos: "",
    bank_name: "",
    account_number: "",
    account_holder_name: "",
    ewallet_type: "",
    ewallet_number: "",
    ewallet_holder_name: "",
    payment_notes: "",
    is_active: true,
    is_primary: false,
  });
  const [editing, setEditing] = useState<PaymentInfo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const fetchPaymentInfos = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, any> = { page, limit, q: search };
      const res: { data: PaymentInfo[]; count: number } = await apiClient.get(
        "/payment-info",
        { params }
      );
      setPaymentInfos(res.data);
      setTotalPages(Math.ceil(res.count / limit));
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchPaymentInfos();
  }, [page, search]);

  const openAdd = () => {
    setForm({
      nama_pemilik: "",
      nama_kos: "",
      bank_name: "",
      account_number: "",
      account_holder_name: "",
      ewallet_type: "",
      ewallet_number: "",
      ewallet_holder_name: "",
      payment_notes: "",
      is_active: true,
      is_primary: false,
    });
    setEditing(null);
    setIsSaving(false);
    setOpenMenu(null);
    setIsModalOpen(true);
  };

  const openEdit = (row: PaymentInfo) => {
    setForm({
      nama_pemilik: row.nama_pemilik,
      nama_kos: row.nama_kos,
      bank_name: row.bank_name,
      account_number: row.account_number,
      account_holder_name: row.account_holder_name,
      ewallet_type: row.ewallet_type || "",
      ewallet_number: row.ewallet_number || "",
      ewallet_holder_name: row.ewallet_holder_name || "",
      payment_notes: row.payment_notes || "",
      is_active: row.is_active,
      is_primary: row.is_primary,
    });
    setEditing(row);
    setIsSaving(false);
    setOpenMenu(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.nama_pemilik) {
      toast.error("Nama pemilik wajib diisi");
      return;
    }
    if (!form.nama_kos) {
      toast.error("Nama kos wajib diisi");
      return;
    }
    if (!form.bank_name) {
      toast.error("Nama bank wajib diisi");
      return;
    }
    if (!form.account_number) {
      toast.error("Nomor rekening wajib diisi");
      return;
    }
    if (!form.account_holder_name) {
      toast.error("Nama pemegang rekening wajib diisi");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        nama_pemilik: form.nama_pemilik,
        nama_kos: form.nama_kos,
        bank_name: form.bank_name,
        account_number: form.account_number,
        account_holder_name: form.account_holder_name,
        ewallet_type: form.ewallet_type || null,
        ewallet_number: form.ewallet_number || null,
        ewallet_holder_name: form.ewallet_holder_name || null,
        payment_notes: form.payment_notes || null,
        is_active: form.is_active,
        is_primary: form.is_primary,
      };

      if (editing) {
        await apiClient.put(`/payment-info/${editing.id}`, payload);
        toast.success("Informasi pembayaran berhasil diperbarui");
      } else {
        await apiClient.post("/payment-info", payload);
        toast.success("Informasi pembayaran berhasil ditambahkan");
      }
      
      setIsModalOpen(false);
      fetchPaymentInfos();
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

  const handleDelete = async (row: PaymentInfo) => {
    if (!confirm("Hapus informasi pembayaran ini?")) return;
    try {
      await apiClient.delete(`/payment-info/${row.id}`);
      toast.success("Informasi pembayaran berhasil dihapus");
      fetchPaymentInfos();
    } catch (e) {
      console.error(e);
      toast.error("Gagal menghapus informasi pembayaran");
    }
    setOpenMenu(null);
  };

  const togglePrimary = async (row: PaymentInfo) => {
    try {
      await apiClient.put(`/payment-info/${row.id}`, {
        ...row,
        is_primary: !row.is_primary
      });
      toast.success(`${row.is_primary ? 'Dibatalkan sebagai' : 'Ditetapkan sebagai'} metode pembayaran utama`);
      fetchPaymentInfos();
    } catch (e) {
      console.error(e);
      toast.error("Gagal mengubah status metode pembayaran");
    }
    setOpenMenu(null);
  };

  return (
    <main className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Setting Pembayaran</h1>
            <p className="text-gray-600">Kelola informasi rekening untuk pembayaran tagihan kos</p>
          </div>
          <button
            onClick={openAdd}
            className="bg-primary hover:bg-primary-focus text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Tambah Metode Pembayaran
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Cari Informasi Pembayaran</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Cari nama pemilik, kos, bank..."
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
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
      ) : paymentInfos.length === 0 ? (
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
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Belum ada informasi pembayaran</h3>
            <p className="text-gray-600 mb-6">Tambahkan informasi rekening untuk ditampilkan di tagihan</p>
            <button
              onClick={openAdd}
              className="bg-primary hover:bg-primary-focus text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
            >
              Tambah Metode Pembayaran Pertama
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {paymentInfos.map((paymentInfo) => (
              <div
                key={paymentInfo.id}
                className={`bg-white rounded-lg shadow-sm border-2 p-6 hover:shadow-md transition-shadow duration-200 ${
                  paymentInfo.is_primary ? 'border-primary bg-primary/5' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {paymentInfo.nama_kos}
                      </h3>
                      {paymentInfo.is_primary && (
                        <span className="bg-primary text-white text-xs px-2 py-1 rounded-full font-medium">
                          Utama
                        </span>
                      )}
                      {!paymentInfo.is_active && (
                        <span className="bg-gray-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                          Nonaktif
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm mb-3">{paymentInfo.nama_pemilik}</p>
                  </div>
                  
                  <div className="relative">
                    <button
                      onClick={() => setOpenMenu(openMenu === paymentInfo.id ? null : paymentInfo.id)}
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                    {openMenu === paymentInfo.id && (
                      <div className="absolute right-0 top-10 z-10 w-56 bg-white rounded-md shadow-lg border border-gray-200">
                        <div className="py-1">
                          <button
                            onClick={() => openEdit(paymentInfo)}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit Informasi
                          </button>
                          <button
                            onClick={() => togglePrimary(paymentInfo)}
                            className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                            {paymentInfo.is_primary ? 'Batal Jadikan Utama' : 'Jadikan Utama'}
                          </button>
                          <button
                            onClick={() => handleDelete(paymentInfo)}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Hapus
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      Transfer Bank
                    </h4>
                    <div className="text-sm space-y-1">
                      <div><span className="text-gray-600">Bank:</span> <span className="font-medium">{paymentInfo.bank_name}</span></div>
                      <div><span className="text-gray-600">No. Rekening:</span> <span className="font-mono font-medium">{paymentInfo.account_number}</span></div>
                      <div><span className="text-gray-600">Atas Nama:</span> <span className="font-medium">{paymentInfo.account_holder_name}</span></div>
                    </div>
                  </div>

                  {paymentInfo.ewallet_type && paymentInfo.ewallet_number && (
                    <div className="bg-green-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        E-Wallet
                      </h4>
                      <div className="text-sm space-y-1">
                        <div><span className="text-gray-600">Jenis:</span> <span className="font-medium">{paymentInfo.ewallet_type}</span></div>
                        <div><span className="text-gray-600">Nomor:</span> <span className="font-mono font-medium">{paymentInfo.ewallet_number}</span></div>
                        {paymentInfo.ewallet_holder_name && (
                          <div><span className="text-gray-600">Atas Nama:</span> <span className="font-medium">{paymentInfo.ewallet_holder_name}</span></div>
                        )}
                      </div>
                    </div>
                  )}

                  {paymentInfo.payment_notes && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                        Catatan Pembayaran
                      </h4>
                      <p className="text-sm text-gray-700">{paymentInfo.payment_notes}</p>
                    </div>
                  )}
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

      {/* Modal */}
      <Modal
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        title={editing ? "Edit Informasi Pembayaran" : "Tambah Informasi Pembayaran"}
      >
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">Informasi Dasar</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Pemilik <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Nama lengkap pemilik kos"
                  value={form.nama_pemilik}
                  onChange={(e) => setForm({ ...form, nama_pemilik: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Kos <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Nama kos"
                  value={form.nama_kos}
                  onChange={(e) => setForm({ ...form, nama_kos: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Bank Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">Informasi Bank</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nama Bank <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                value={form.bank_name}
                onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
              >
                <option value="">Pilih Bank</option>
                {BANK_OPTIONS.map((bank) => (
                  <option key={bank} value={bank}>
                    {bank}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nomor Rekening <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="1234567890"
                  value={form.account_number}
                  onChange={(e) => setForm({ ...form, account_number: e.target.value.replace(/\D/g, '') })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Pemegang Rekening <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Sesuai rekening bank"
                  value={form.account_holder_name}
                  onChange={(e) => setForm({ ...form, account_holder_name: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* E-Wallet Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">E-Wallet (Opsional)</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Jenis E-Wallet</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                value={form.ewallet_type}
                onChange={(e) => setForm({ ...form, ewallet_type: e.target.value })}
              >
                {EWALLET_OPTIONS.map((ewallet, index) => (
                  <option key={index} value={ewallet}>
                    {ewallet || "Tidak menggunakan e-wallet"}
                  </option>
                ))}
              </select>
            </div>
            
            {form.ewallet_type && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nomor E-Wallet</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="08xxxxxxxxxx"
                    value={form.ewallet_number}
                    onChange={(e) => setForm({ ...form, ewallet_number: e.target.value })}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nama Pemegang E-Wallet</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Nama di e-wallet"
                    value={form.ewallet_holder_name}
                    onChange={(e) => setForm({ ...form, ewallet_holder_name: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Payment Notes */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">Catatan Pembayaran</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Instruksi Pembayaran</label>
              <textarea
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Contoh: Transfer dapat dilakukan 24 jam. Mohon konfirmasi setelah transfer dengan mengirim bukti ke WhatsApp 08xxxxxxxxxx."
                value={form.payment_notes}
                onChange={(e) => setForm({ ...form, payment_notes: e.target.value })}
              />
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">Pengaturan</h3>
            
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  checked={form.is_primary}
                  onChange={(e) => setForm({ ...form, is_primary: e.target.checked })}
                />
                <span className="text-sm font-medium text-gray-700">
                  Jadikan sebagai metode pembayaran utama
                </span>
              </label>
              
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
                <span className="text-sm font-medium text-gray-700">
                  Aktif (tampilkan di tagihan dan email)
                </span>
              </label>
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
              {editing ? "Simpan Perubahan" : "Tambah Informasi"}
            </button>
          </div>
        </div>
      </Modal>
    </main>
  );
}