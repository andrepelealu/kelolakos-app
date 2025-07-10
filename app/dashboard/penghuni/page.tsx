"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import apiClient from "@/libs/api";
import { Penghuni } from "@/types";

interface FormData {
  nama: string;
  nomor_kamar: string;
  nomor_telepon: string;
  email: string;
}

export default function PenghuniPage() {
  const [penghuni, setPenghuni] = useState<Penghuni[]>([]);
  const [form, setForm] = useState<FormData>({
    nama: "",
    nomor_kamar: "",
    nomor_telepon: "",
    email: "",
  });
  const [editing, setEditing] = useState<Penghuni | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchPenghuni = async () => {
    try {
      const data: Penghuni[] = await apiClient.get("/penghuni");
      setPenghuni(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchPenghuni();
  }, []);

  const openAdd = () => {
    setForm({ nama: "", nomor_kamar: "", nomor_telepon: "", email: "" });
    setEditing(null);
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
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Penghuni</h1>
        <button className="btn btn-primary" onClick={openAdd}>
          Tambah Penghuni
        </button>
      </div>
      <div className="overflow-x-auto">
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
          <button className="btn btn-primary w-full" onClick={handleSubmit}>
            Save
          </button>
        </div>
      </Modal>
    </main>
  );
}
