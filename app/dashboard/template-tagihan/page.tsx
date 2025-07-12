"use client";

// Ensure this page is always rendered dynamically to avoid 404 errors
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import apiClient from "@/libs/api";
import { TemplateTagihan, AddOn, Kamar } from "@/types";
import toast from "react-hot-toast";
import { formatDate, formatRupiah } from "@/libs/formatter";

interface FormData {
  nama: string;
  tanggal_terbit: string;
  tanggal_jatuh_tempo: string;
  set_semua_kamar: boolean;
  kamar_ids: string[];
  add_ons: string[];
}

export default function TemplateTagihanPage() {
  const [templates, setTemplates] = useState<TemplateTagihan[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<TemplateTagihan | null>(null);
  const [addOnOptions, setAddOnOptions] = useState<AddOn[]>([]);
  const [kamarOptions, setKamarOptions] = useState<Kamar[]>([]);
  const [kamarPage, setKamarPage] = useState<number>(1);
  const kamarPageSize = 25;
  const [form, setForm] = useState<FormData>({
    nama: "",
    tanggal_terbit: new Date().toISOString().slice(0, 10),
    tanggal_jatuh_tempo: new Date().toISOString().slice(0, 10),
    set_semua_kamar: true,
    kamar_ids: [],
    add_ons: [],
  });

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const res: { data: TemplateTagihan[] } = await apiClient.get("/template-tagihan", {
        params: { page: 1, limit: 100 },
      });
      setTemplates(res.data);
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  const fetchOptions = async () => {
    try {
      const addOnRes: { data: AddOn[] } = await apiClient.get("/add-on", {
        params: { page: 1, limit: 100 },
      });
      setAddOnOptions(addOnRes.data);
      const kamarRes: { data: Kamar[] } = await apiClient.get("/kamar", {
        params: { page: 1, limit: 100 },
      });
      setKamarOptions(kamarRes.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const openAdd = () => {
    setForm({
      nama: "",
      tanggal_terbit: new Date().toISOString().slice(0, 10),
      tanggal_jatuh_tempo: new Date().toISOString().slice(0, 10),
      set_semua_kamar: true,
      kamar_ids: [],
      add_ons: [],
    });
    setEditing(null);
    setIsSaving(false);
    setKamarPage(1);
    fetchOptions();
    setIsModalOpen(true);
  };

  const openEdit = async (row: TemplateTagihan) => {
    try {
      const res: TemplateTagihan = await apiClient.get(`/template-tagihan/${row.id}`);
      setForm({
        nama: res.nama,
        tanggal_terbit: res.tanggal_terbit.slice(0, 10),
        tanggal_jatuh_tempo: res.tanggal_jatuh_tempo.slice(0, 10),
        set_semua_kamar: !res.kamars || res.kamars.length === 0,
        kamar_ids: res.kamars ? res.kamars.map((k) => k.id_kamar) : [],
        add_ons: res.add_ons ? res.add_ons.map((a) => a.id_add_on) : [],
      });
      setEditing(row);
      setIsSaving(false);
      setKamarPage(1);
      fetchOptions();
      setIsModalOpen(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async () => {
    if (!form.nama) {
      toast.error("Nama template wajib diisi");
      return;
    }

    if (!form.tanggal_terbit || !form.tanggal_jatuh_tempo) {
      toast.error("Tanggal wajib diisi");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        nama: form.nama,
        tanggal_terbit: form.tanggal_terbit,
        tanggal_jatuh_tempo: form.tanggal_jatuh_tempo,
        set_semua_kamar: form.set_semua_kamar,
        kamar_ids: form.set_semua_kamar ? [] : form.kamar_ids,
        add_ons: form.add_ons,
      };
      if (editing) {
        await apiClient.put(`/template-tagihan/${editing.id}`, payload);
      } else {
        await apiClient.post("/template-tagihan", payload);
      }
      setIsModalOpen(false);
      fetchTemplates();
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

  const handleDelete = async (row: TemplateTagihan) => {
    if (!confirm("Delete this template?")) return;
    try {
      await apiClient.delete(`/template-tagihan/${row.id}`);
      fetchTemplates();
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerate = async (row: TemplateTagihan) => {
    if (!confirm("Buat tagihan otomatis dari template ini?")) return;
    try {
      await apiClient.post(`/template-tagihan/${row.id}/generate`, {});
      toast.success("Tagihan dibuat");
    } catch (e) {
      console.error(e);
    }
  };

  const totalKamarPages = Math.ceil(kamarOptions.length / kamarPageSize) || 1;
  const paginatedKamar = kamarOptions.slice(
    (kamarPage - 1) * kamarPageSize,
    kamarPage * kamarPageSize
  );

  return (
    <main className="min-h-screen p-8 pb-24 space-y-6">
      <div className="flex justify-between items-center gap-2 flex-wrap">
        <h1 className="text-2xl font-bold">Template Tagihan</h1>
        <div className="flex gap-2 flex-1 justify-end">
          <button className="btn btn-primary" onClick={openAdd}>
            Tambah Template
          </button>
        </div>
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
                <th>Nama Template</th>
                <th>Tanggal Terbit</th>
                <th>Tanggal Jatuh Tempo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id}>
                  <td>{t.nama}</td>
                  <td>{formatDate(t.tanggal_terbit)}</td>
                  <td>{formatDate(t.tanggal_jatuh_tempo)}</td>
                  <td className="flex gap-2">
                    <button className="btn btn-sm" onClick={() => handleGenerate(t)}>
                      Buat Tagihan Otomatis
                    </button>
                    <button className="btn btn-sm" onClick={() => openEdit(t)}>
                      Edit
                    </button>
                    <button className="btn btn-sm btn-error" onClick={() => handleDelete(t)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {templates.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center">
                    No data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      <Modal
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        title={editing ? "Edit Template" : "Tambah Template"}
      >
        <div className="space-y-4">
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">Nama Template</span>
            </div>
            <input
              className="input input-bordered w-full"
              placeholder="Nama Template"
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
            />
          </label>
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">Tanggal Terbit</span>
            </div>
            <input
              type="date"
              className="input input-bordered w-full"
              value={form.tanggal_terbit}
              onChange={(e) => setForm({ ...form, tanggal_terbit: e.target.value })}
            />
          </label>
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">Tanggal Jatuh Tempo</span>
            </div>
            <input
              type="date"
              className="input input-bordered w-full"
              value={form.tanggal_jatuh_tempo}
              onChange={(e) => setForm({ ...form, tanggal_jatuh_tempo: e.target.value })}
            />
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="checkbox"
              checked={form.set_semua_kamar}
              onChange={(e) => setForm({ ...form, set_semua_kamar: e.target.checked })}
            />
            <span className="label-text">Set semua kamar</span>
          </label>
          {!form.set_semua_kamar && (
            <div className="space-y-2">
              <span className="font-semibold">Pilih Kamar</span>
              <div className="grid grid-cols-5 gap-2">
                {paginatedKamar.map((k) => (
                  <label key={k.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={form.kamar_ids.includes(k.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setForm({ ...form, kamar_ids: [...form.kamar_ids, k.id] });
                        } else {
                          setForm({
                            ...form,
                            kamar_ids: form.kamar_ids.filter((id) => id !== k.id),
                          });
                        }
                      }}
                    />
                    <span className="label-text">{k.nomor_kamar}</span>
                  </label>
                ))}
              </div>
              {totalKamarPages > 1 && (
                <div className="join mt-2">
                  <button
                    className="join-item btn btn-sm"
                    disabled={kamarPage === 1}
                    onClick={() => setKamarPage((p) => Math.max(1, p - 1))}
                  >
                    Prev
                  </button>
                  <button className="join-item btn btn-sm" disabled>
                    Page {kamarPage}/{totalKamarPages}
                  </button>
                  <button
                    className="join-item btn btn-sm"
                    disabled={kamarPage === totalKamarPages}
                    onClick={() => setKamarPage((p) => Math.min(totalKamarPages, p + 1))}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
          <div className="space-y-2">
            <span className="font-semibold">Add-on</span>
            {addOnOptions.map((a) => (
              <label key={a.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={form.add_ons.includes(a.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setForm({ ...form, add_ons: [...form.add_ons, a.id] });
                    } else {
                      setForm({ ...form, add_ons: form.add_ons.filter((id) => id !== a.id) });
                    }
                  }}
                />
                <span className="label-text">
                  {a.nama} - {formatRupiah(a.harga)} / {a.satuan}
                </span>
              </label>
            ))}
          </div>
          <button className="btn btn-primary w-full" onClick={handleSubmit} disabled={isSaving}>
            {isSaving && <span className="loading loading-spinner loading-xs"></span>}
            Save
          </button>
        </div>
      </Modal>
    </main>
  );
}
