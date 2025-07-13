"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import apiClient from "@/libs/api";
import { Tagihan, Kamar, AddOn } from "@/types";
import toast from "react-hot-toast";
import { formatRupiah, formatDate } from "@/libs/formatter";


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
    status_pembayaran: "belum bayar",
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

  const fetchTagihan = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, any> = { page, limit, q: search };
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
    try {
      const res: { data: Kamar[] } = await apiClient.get("/kamar", {
        params: { page: 1, limit: 10, q },
      });
      setKamarOptions(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAddOnOptions = async () => {
    try {
      const res: { data: AddOn[] } = await apiClient.get("/add-on", {
        params: { page: 1, limit: 100 },
      });
      setAddOnOptions(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchTagihan();
  }, [page, search]);

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
      status_pembayaran: "belum bayar",
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
    setIsBulkLoading(true);
    try {
      await Promise.all(
        selectedIds.map((id) => apiClient.post(`/tagihan/${id}/send`, {}))
      );
      toast.success("Tagihan dikirim");
    } catch (e) {
      console.error(e);
    }
    setIsBulkLoading(false);
  };

  return (
    <main className="min-h-screen p-8 pb-24 space-y-6">
      <div className="flex justify-between items-center gap-2 flex-wrap">
        <h1 className="text-2xl font-bold">Tagihan</h1>
        <div className="flex gap-2 flex-1 justify-end">
          {selectedIds.length > 0 && (
            <>
              <button
                className="btn btn-error"
                onClick={handleBulkDelete}
                disabled={isBulkLoading}
              >
                {isBulkLoading && (
                  <span className="loading loading-spinner loading-xs"></span>
                )}
                Delete Selected
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleBulkSend}
                disabled={isBulkLoading}
              >
                {isBulkLoading && (
                  <span className="loading loading-spinner loading-xs"></span>
                )}
                Send Selected
              </button>
            </>
          )}
          <button className="btn btn-primary" onClick={openAdd}>
            Tambah Tagihan
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
                <th>
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={
                      tagihan.length > 0 &&
                      tagihan.every((t) => selectedIds.includes(t.id))
                    }
                    onChange={(e) => selectAll(e.target.checked)}
                  />
                </th>
                <th>Nomor Invoice</th>
                <th>Nomor Kamar</th>
                <th>Nama Penghuni</th>
                <th>Status</th>
                <th>Add-on</th>
                <th>Harga Kamar</th>
                <th>Tanggal Terbit</th>
                <th>Tanggal Jatuh Tempo</th>
                <th>Denda</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tagihan.map((t) => (
                <tr key={t.id}>
                  <td>
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={selectedIds.includes(t.id)}
                      onChange={() => toggleSelect(t.id)}
                    />
                  </td>
                  <td>{t.nomor_invoice}</td>
                  <td>{t.kamar?.nomor_kamar}</td>
                  <td>{t.penghuni?.nama}</td>
                  <td>{t.status_pembayaran}</td>
                  <td>{formatRupiah(t.add_on)}</td>
                  <td>{formatRupiah(t.kamar?.harga || 0)}</td>
                  <td>{formatDate(t.tanggal_terbit)}</td>
                  <td>{formatDate(t.tanggal_jatuh_tempo)}</td>
                  <td>{formatRupiah(t.denda)}</td>
                  <td>{formatRupiah(t.total_tagihan)}</td>
                  <td className="relative">
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => setOpenMenu(openMenu === t.id ? null : t.id)}
                    >
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
                    </button>
                    {openMenu === t.id && (
                      <ul className="absolute right-0 z-[1] menu p-2 shadow bg-base-100 rounded-box w-32">
                        <li>
                          <a onClick={() => openEdit(t)}>Edit</a>
                        </li>
                        <li>
                          <a onClick={() => handleDelete(t)}>Delete</a>
                        </li>
                        <li>
                          <a href={`/dashboard/tagihan/${t.id}`}>Detail</a>
                        </li>
                      </ul>
                    )}
                  </td>
                </tr>
              ))}
              {tagihan.length === 0 && (
                <tr>
                  <td colSpan={12} className="text-center">
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
        title={editing ? "Edit Tagihan" : "Tambah Tagihan"}
      >
        <div className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="checkbox"
              checked={form.auto_invoice}
              onChange={(e) => setForm({ ...form, auto_invoice: e.target.checked })}
            />
            <span className="label-text">Auto generate nomor invoice</span>
          </label>
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">Nomor Invoice</span>
            </div>
            <input
              className="input input-bordered w-full"
              placeholder="Nomor Invoice"
              value={form.nomor_invoice}
              onChange={(e) =>
                setForm({ ...form, nomor_invoice: e.target.value })
              }
            />
          </label>
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">Nomor Kamar</span>
            </div>
            <input
              list="nomor-kamar-options"
              className="input input-bordered w-full"
              placeholder="Nomor Kamar"
              value={form.nomor_kamar}
              onChange={(e) => handleKamarChange(e.target.value)}
            />
          </label>
          <datalist id="nomor-kamar-options">
            {kamarOptions.map((k) => (
              <option key={k.id} value={k.nomor_kamar} />
            ))}
          </datalist>
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">Status Pembayaran</span>
            </div>
            <input
              className="input input-bordered w-full"
              placeholder="Status Pembayaran"
              value={form.status_pembayaran}
              onChange={(e) =>
                setForm({ ...form, status_pembayaran: e.target.value })
              }
            />
          </label>
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">Add-on</span>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {addOnOptions.map((a) => {
                const selected = selectedAddOns.find((s) => s.id === a.id);
                return (
                  <label key={a.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={!!selected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedAddOns([...selectedAddOns, { id: a.id, qty: 1 }]);
                        } else {
                          setSelectedAddOns(selectedAddOns.filter((i) => i.id !== a.id));
                        }
                      }}
                    />
                    <span className="label-text">
                      {a.nama} - {formatRupiah(a.harga)} / {a.satuan}
                    </span>
                    {selected && (
                      <input
                        type="number"
                        className="input input-bordered input-sm w-16"
                        value={selected.qty}
                        min={1}
                        onChange={(e) => {
                          const qty = Number(e.target.value) || 1;
                          setSelectedAddOns(
                            selectedAddOns.map((s) =>
                              s.id === a.id ? { ...s, qty } : s
                            )
                          );
                        }}
                      />
                    )}
                  </label>
                );
              })}
            </div>
            <div className="label">
              <span className="label-text-alt">Total Add-on: {formatRupiah(Number(form.add_on) || 0)}</span>
            </div>
          </label>
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">Harga Kamar</span>
            </div>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="Harga Kamar"
              value={formatRupiah(form.harga_kamar)}
              onChange={(e) =>
                setForm({
                  ...form,
                  harga_kamar: Number(e.target.value.replace(/[^0-9]/g, "")),
                })
              }
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
              onChange={(e) =>
                setForm({ ...form, tanggal_jatuh_tempo: e.target.value })
              }
            />
          </label>
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">Denda</span>
            </div>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="Denda"
              value={formatRupiah(Number(form.denda) || 0)}
              onChange={(e) =>
                setForm({ ...form, denda: e.target.value.replace(/[^0-9]/g, "") })
              }
            />
          </label>
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">Total Tagihan</span>
            </div>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="Total Tagihan"
              value={formatRupiah(Number(form.total_tagihan) || 0)}
              onChange={(e) =>
                setForm({
                  ...form,
                  total_tagihan: e.target.value.replace(/[^0-9]/g, ""),
                })
              }
            />
          </label>
          <button className="btn btn-primary w-full" onClick={handleSubmit} disabled={isSaving}>
            {isSaving && <span className="loading loading-spinner loading-xs"></span>}
            Save
          </button>
        </div>
      </Modal>
    </main>
  );
}
