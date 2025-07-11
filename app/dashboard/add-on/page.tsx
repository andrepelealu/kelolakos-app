"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import apiClient from "@/libs/api";
import { AddOn } from "@/types";
import toast from "react-hot-toast";
import { formatRupiah } from "@/libs/formatter";

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
  harga: string;
  satuan: string;
}

export default function AddOnPage() {
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
    setIsLoading(true);
    try {
      const params = { page, limit, q: search };
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
  }, [page, search]);

  const openAdd = () => {
    setForm({ nama: "", harga: "", satuan: "" });
    setEditing(null);
    setIsSaving(false);
    setOpenMenu(null);
    setIsModalOpen(true);
  };

  const openEdit = (row: AddOn) => {
    setForm({ nama: row.nama, harga: String(row.harga), satuan: row.satuan });
    setEditing(row);
    setIsSaving(false);
    setOpenMenu(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.nama) {
      toast.error("Nama wajib diisi");
      return;
    }
    if (!form.harga || isNaN(Number(form.harga))) {
      toast.error("Harga tidak valid");
      return;
    }
    if (!form.satuan) {
      toast.error("Satuan wajib diisi");
      return;
    }

    setIsSaving(true);
    try {
      const payload = { nama: form.nama, harga: Number(form.harga), satuan: form.satuan };
      if (editing) {
        await apiClient.put(`/add-on/${editing.id}`, payload);
      } else {
        await apiClient.post("/add-on", payload);
      }
      setIsModalOpen(false);
      fetchAddons();
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
    <main className="min-h-screen p-8 pb-24 space-y-6">
      <div className="flex justify-between items-center gap-2 flex-wrap">
        <h1 className="text-2xl font-bold">Add-on</h1>
        <div className="flex gap-2 flex-1 justify-end">
          <button className="btn btn-primary" onClick={openAdd}>
            Tambah Add-on
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
          <table className="table w-full h-full">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Harga</th>
                <th>Satuan</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {addons.map((a) => (
                <tr key={a.id}>
                  <td>{a.nama}</td>
                  <td>{formatRupiah(a.harga)}</td>
                  <td>{a.satuan}</td>
                  <td className="relative">
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => setOpenMenu(openMenu === a.id ? null : a.id)}
                    >
                      <DotsIcon />
                    </button>
                    {openMenu === a.id && (
                      <ul className="absolute right-0 z-[1] menu p-2 shadow bg-base-100 rounded-box w-28">
                        <li>
                          <a onClick={() => openEdit(a)}>Edit</a>
                        </li>
                        <li>
                          <a onClick={() => handleDelete(a)}>Delete</a>
                        </li>
                      </ul>
                    )}
                  </td>
                </tr>
              ))}
              {addons.length === 0 && (
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
        title={editing ? "Edit Add-on" : "Tambah Add-on"}
      >
        <div className="space-y-4">
          <input
            className="input input-bordered w-full"
            placeholder="Nama"
            value={form.nama}
            onChange={(e) => setForm({ ...form, nama: e.target.value })}
          />
          <input
            type="text"
            className="input input-bordered w-full"
            placeholder="Harga"
            value={formatRupiah(Number(form.harga) || 0)}
            onChange={(e) =>
              setForm({
                ...form,
                harga: e.target.value.replace(/[^0-9]/g, ""),
              })
            }
          />
          <input
            className="input input-bordered w-full"
            placeholder="Satuan"
            value={form.satuan}
            onChange={(e) => setForm({ ...form, satuan: e.target.value })}
          />
          <button className="btn btn-primary w-full" onClick={handleSubmit} disabled={isSaving}>
            {isSaving && <span className="loading loading-spinner loading-xs"></span>}
            Save
          </button>
        </div>
      </Modal>
    </main>
  );
}
