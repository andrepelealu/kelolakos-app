"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import apiClient from "@/libs/api";
import { TemplateTagihan, AddOn, Kamar, Penghuni } from "@/types";
import toast from "react-hot-toast";
import { formatRupiah, dayOfMonth } from "@/libs/formatter";
import { useKos } from "@/contexts/KosContext";

interface FormData {
  nama: string;
  tanggal_terbit: string;
  tanggal_jatuh_tempo: string;
  set_semua_kamar: boolean;
  kamar_ids: string[];
  add_ons: string[];
}

export default function TemplateTagihanPage() {
  const { selectedKosId } = useKos();
  const [templates, setTemplates] = useState<TemplateTagihan[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<TemplateTagihan | null>(null);
  const [addOnOptions, setAddOnOptions] = useState<AddOn[]>([]);
  const [kamarOptions, setKamarOptions] = useState<Kamar[]>([]);
  const [kamarPage, setKamarPage] = useState<number>(1);
  const kamarPageSize = 25;
  const today = new Date().getDate().toString().padStart(2, "0");
  const [form, setForm] = useState<FormData>({
    nama: "",
    tanggal_terbit: today,
    tanggal_jatuh_tempo: today,
    set_semua_kamar: true,
    kamar_ids: [],
    add_ons: [],
  });

  const fetchTemplates = async () => {
    if (!selectedKosId) return;
    setIsLoading(true);
    try {
      const res: { data: TemplateTagihan[] } = await apiClient.get("/template-tagihan", {
        params: { page: 1, limit: 100, kos_id: selectedKosId },
      });
      setTemplates(res.data);
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  const fetchOptions = async () => {
    if (!selectedKosId) return;
    try {
      const addOnRes: { data: AddOn[] } = await apiClient.get("/add-on", {
        params: { page: 1, limit: 100, kos_id: selectedKosId },
      });
      setAddOnOptions(addOnRes.data);

      const kamarRes: { data: Kamar[] } = await apiClient.get("/kamar", {
        params: { page: 1, limit: 100, kos_id: selectedKosId },
      });
      let kamars = kamarRes.data;

      try {
        const penghuniRes: { data: Penghuni[] } = await apiClient.get(
          "/penghuni",
          { params: { page: 1, limit: 1000, kos_id: selectedKosId } }
        );
        const today = new Date().toISOString().slice(0, 10);
        const activeIds = new Set(
          penghuniRes.data
            .filter((p) => !p.selesai_sewa || p.selesai_sewa >= today)
            .map((p) => p.kamar_id)
        );
        kamars = kamars.filter((k) => activeIds.has(k.id));
      } catch (e) {
        console.error("Error fetching penghuni:", e);
      }

      setKamarOptions(kamars);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (selectedKosId) {
      fetchTemplates();
      fetchOptions();
    }
  }, [selectedKosId]);

  const openAdd = () => {
    setForm({
      nama: "",
      tanggal_terbit: today,
      tanggal_jatuh_tempo: today,
      set_semua_kamar: true,
      kamar_ids: [],
      add_ons: [],
    });
    setEditing(null);
    setIsSaving(false);
    setIsModalOpen(true);
  };

  const openEdit = (template: TemplateTagihan) => {
    setForm({
      nama: template.nama,
      tanggal_terbit: template.tanggal_terbit,
      tanggal_jatuh_tempo: template.tanggal_jatuh_tempo,
      set_semua_kamar: template.set_semua_kamar,
      kamar_ids: template.kamar_ids || [],
      add_ons: template.add_ons || [],
    });
    setEditing(template);
    setIsSaving(false);
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.nama) {
      toast.error("Nama template wajib diisi");
      return;
    }

    if (!form.set_semua_kamar && form.kamar_ids.length === 0) {
      toast.error("Pilih minimal satu kamar");
      return;
    }

    setIsSaving(true);
    try {
      const payload = { ...form, kos_id: selectedKosId };
      if (editing) {
        await apiClient.put(`/template-tagihan/${editing.id}`, payload);
      } else {
        await apiClient.post("/template-tagihan", payload);
      }
      setIsModalOpen(false);
      fetchTemplates();
    } catch (e) {
      console.error(e);
    }
    setIsSaving(false);
  };

  const handleDelete = async (template: TemplateTagihan) => {
    if (!confirm("Delete this template?")) return;
    try {
      await apiClient.delete(`/template-tagihan/${template.id}`);
      fetchTemplates();
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerate = async (template: TemplateTagihan) => {
    if (!confirm("Generate tagihan dari template ini?")) return;
    try {
      await apiClient.post(`/template-tagihan/${template.id}/generate`);
      toast.success("Tagihan berhasil dibuat dari template");
    } catch (e) {
      console.error(e);
      toast.error("Gagal membuat tagihan dari template");
    }
  };

  const toggleKamar = (kamarId: string) => {
    setForm(prev => ({
      ...prev,
      kamar_ids: prev.kamar_ids.includes(kamarId)
        ? prev.kamar_ids.filter(id => id !== kamarId)
        : [...prev.kamar_ids, kamarId]
    }));
  };

  const toggleAddOn = (addOnId: string) => {
    setForm(prev => ({
      ...prev,
      add_ons: prev.add_ons.includes(addOnId)
        ? prev.add_ons.filter(id => id !== addOnId)
        : [...prev.add_ons, addOnId]
    }));
  };

  const displayedKamars = kamarOptions.slice(
    (kamarPage - 1) * kamarPageSize,
    kamarPage * kamarPageSize
  );

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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Pilih Kos Terlebih Dahulu</h3>
            <p className="text-gray-600">Silakan pilih kos dari dropdown di header untuk mengelola template tagihan</p>
          </div>
        </div>
      ) : (
        <div>
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Template Tagihan</h1>
                <p className="text-gray-600">Otomatisasi pembuatan tagihan bulanan dengan template</p>
              </div>
              <button
                onClick={openAdd}
                className="bg-primary hover:bg-primary-focus text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Template Baru
              </button>
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
                  <div className="h-6 bg-gray-200 rounded mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded mb-4"></div>
                  <div className="flex gap-2">
                    <div className="h-10 bg-gray-200 rounded flex-1"></div>
                    <div className="h-10 w-10 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : templates.length === 0 ? (
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
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Belum ada template</h3>
                <p className="text-gray-600 mb-6">Buat template untuk otomatisasi pembuatan tagihan bulanan</p>
                <button
                  onClick={openAdd}
                  className="bg-primary hover:bg-primary-focus text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
                >
                  Buat Template Pertama
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {template.nama}
                      </h3>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div>Terbit: {dayOfMonth(template.tanggal_terbit)}</div>
                        <div>Jatuh tempo: {dayOfMonth(template.tanggal_jatuh_tempo)}</div>
                        <div>
                          {template.set_semua_kamar 
                            ? "Semua kamar" 
                            : `${template.kamar_ids?.length || 0} kamar terpilih`
                          }
                        </div>
                        {template.add_ons && template.add_ons.length > 0 && (
                          <div>{template.add_ons.length} add-on terpilih</div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleGenerate(template)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                    >
                      Generate
                    </button>
                    <button
                      onClick={() => openEdit(template)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors duration-200"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(template)}
                      className="px-4 py-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-md transition-colors duration-200"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <Modal
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        title={editing ? "Edit Template" : "Buat Template Baru"}
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nama Template <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="e.g., Tagihan Bulanan Januari"
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tanggal Terbit <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                value={form.tanggal_terbit}
                onChange={(e) => setForm({ ...form, tanggal_terbit: e.target.value })}
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <option key={day} value={day.toString().padStart(2, "0")}>
                    {day}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tanggal Jatuh Tempo <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                value={form.tanggal_jatuh_tempo}
                onChange={(e) => setForm({ ...form, tanggal_jatuh_tempo: e.target.value })}
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <option key={day} value={day.toString().padStart(2, "0")}>
                    {day}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Pilih Kamar</label>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={form.set_semua_kamar}
                  onChange={(e) => setForm({ ...form, set_semua_kamar: e.target.checked })}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  Pilih semua kamar yang memiliki penghuni aktif
                </span>
              </label>
              
              {!form.set_semua_kamar && (
                <div className="border rounded-md p-4 max-h-60 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-2">
                    {displayedKamars.map((kamar) => (
                      <label key={kamar.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={form.kamar_ids.includes(kamar.id)}
                          onChange={() => toggleKamar(kamar.id)}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          Kamar {kamar.nomor_kamar}
                        </span>
                      </label>
                    ))}
                  </div>
                  
                  {kamarOptions.length > kamarPageSize && (
                    <div className="flex justify-between items-center mt-4 pt-4 border-t">
                      <button
                        type="button"
                        onClick={() => setKamarPage(prev => Math.max(prev - 1, 1))}
                        disabled={kamarPage === 1}
                        className="text-sm text-primary hover:text-primary-focus disabled:opacity-50"
                      >
                        Sebelumnya
                      </button>
                      <span className="text-sm text-gray-500">
                        {(kamarPage - 1) * kamarPageSize + 1}-{Math.min(kamarPage * kamarPageSize, kamarOptions.length)} dari {kamarOptions.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => setKamarPage(prev => prev + 1)}
                        disabled={kamarPage * kamarPageSize >= kamarOptions.length}
                        className="text-sm text-primary hover:text-primary-focus disabled:opacity-50"
                      >
                        Selanjutnya
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {addOnOptions.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Layanan Tambahan</label>
              <div className="border rounded-md p-4 max-h-48 overflow-y-auto">
                <div className="space-y-2">
                  {addOnOptions.map((addOn) => (
                    <label key={addOn.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={form.add_ons.includes(addOn.id)}
                        onChange={() => toggleAddOn(addOn.id)}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        {addOn.nama} - {formatRupiah(addOn.harga)}/{addOn.satuan}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

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
              {editing ? "Simpan Perubahan" : "Buat Template"}
            </button>
          </div>
        </div>
      </Modal>
    </main>
  );
}