"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import apiClient from "@/libs/api";
import { Penghuni } from "@/types";
import toast from "react-hot-toast";

interface FormData {
  nama: string;
  nomor_kamar: string;
  nomor_telepon: string;
  email: string;
}

export default function PenghuniPage() {
  const [penghuni, setPenghuni] = useState<Penghuni[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const limit = 10;
  const [search, setSearch] = useState<string>("");
  const [form, setForm] = useState<FormData>({
    nama: "",
    nomor_kamar: "",
    nomor_telepon: "",
    email: "",
  });
  const [editing, setEditing] = useState<Penghuni | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchPenghuni = async () => {
    setIsLoading(true);
    try {
      const res: { data: Penghuni[]; count: number } = await apiClient.get(
        "/penghuni",
        { params: { page, limit, q: search } }
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
  }, [page, search]);

  const openAdd = () => {
    setForm({ nama: "", nomor_kamar: "", nomor_telepon: "", email: "" });
    setEditing(null);
    setIsSaving(false);
    setIsModalOpen(true);
  };

  const openEdit = (row: Penghuni) => {
    setForm({
      nama: row.nama,
      nomor_kamar: row.nomor_kamar,
      nomor_telepon: row.nomor_telepon,
      email: row.email,
    });
    setEditing(row);
    setIsSaving(false);
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.nama) {
      toast.error("Nama wajib diisi");
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
 
      <div className="flex justify-start">
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
              <th>Nama</th>
              <th>Nomor Kamar</th>
              <th>Nomor Telepon</th>
              <th>Email</th>
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
                <td className="flex gap-2">
                  <button className="btn btn-sm" onClick={() => openEdit(p)}>
                    Edit
                  </button>
                  <button
                    className="btn btn-sm btn-error"
                    onClick={() => handleDelete(p)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {penghuni.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center">
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
            className="input input-bordered w-full"
            placeholder="Nomor Kamar"
            value={form.nomor_kamar}
            onChange={(e) => setForm({ ...form, nomor_kamar: e.target.value })}
          />
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
          <button className="btn btn-primary w-full" onClick={handleSubmit} disabled={isSaving}>
            {isSaving && <span className="loading loading-spinner loading-xs"></span>}
            Save
          </button>
        </div>
      </Modal>
    </main>
  );
}
