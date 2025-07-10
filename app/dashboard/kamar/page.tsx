"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import apiClient from "@/libs/api";
import { Kamar } from "@/types";
import toast from "react-hot-toast";

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

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

interface FormData {
  nomor_kamar: string;
  harga: string;
  status: string;
}

export default function KamarPage() {
  const [kamar, setKamar] = useState<Kamar[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const limit = 10;
  const [search, setSearch] = useState<string>("");
  const [form, setForm] = useState<FormData>({
    nomor_kamar: "",
    harga: "",
    status: "kosong",
  });
  const [editing, setEditing] = useState<Kamar | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchKamar = async () => {
    setIsLoading(true);
    try {
      const res: { data: Kamar[]; count: number } = await apiClient.get(
        "/kamar",
        { params: { page, limit, q: search } }
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
  }, [page, search]);

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
    if (!form.nomor_kamar) {
      toast.error("Nomor kamar wajib diisi");
      return;
    }

    if (!form.harga || isNaN(Number(form.harga))) {
      toast.error("Harga tidak valid");
      return;
    }

    if (form.status && !["terisi", "kosong", "booked"].includes(form.status)) {
      toast.error("Status tidak valid");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        nomor_kamar: form.nomor_kamar,
        harga: Number(form.harga),
        status: form.status,
      };
      if (editing) {
        await apiClient.put(`/kamar/${editing.id}`, payload);
      } else {
        await apiClient.post("/kamar", payload);
      }
      setIsModalOpen(false);
      fetchKamar();
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

  return (
    <main className="min-h-screen p-8 pb-24 space-y-6">
      <div className="flex justify-between items-center gap-2 flex-wrap">
        <h1 className="text-2xl font-bold">Kamar</h1>
        <div className="flex gap-2 flex-1 justify-end">
          <button className="btn btn-primary" onClick={openAdd}>
            Tambah Kamar
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
          <table className="table w-full h-full">
            <thead>
              <tr>
                <th>Nomor Kamar</th>
                <th>Harga</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {kamar.map((k) => (
                <tr key={k.id}>
                  <td>{k.nomor_kamar}</td>
                  <td>{formatRupiah(k.harga)}</td>
                  <td>
                    <span
                      className={`btn btn-xs text-white pointer-events-none ${
                        k.status === "kosong"
                          ? "btn-success"
                          : k.status === "booked"
                          ? "btn-warning"
                          : "btn-error"
                      }`}
                    >
                      {k.status}
                    </span>
                  </td>
                  <td className="relative">
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() =>
                        setOpenMenu(openMenu === k.id ? null : k.id)
                      }
                    >
                      <DotsIcon />
                    </button>
                    {openMenu === k.id && (
                      <ul className="absolute right-0 z-[1] menu p-2 shadow bg-base-100 rounded-box w-28">
                        <li>
                          <a onClick={() => openEdit(k)}>Edit</a>
                        </li>
                        <li>
                          <a onClick={() => handleDelete(k)}>Delete</a>
                        </li>
                      </ul>
                    )}
                  </td>
                </tr>
              ))}
              {kamar.length === 0 && (
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
        title={editing ? "Edit Kamar" : "Tambah Kamar"}
      >
        <div className="space-y-4">
          <input
            className="input input-bordered w-full"
            placeholder="Nomor Kamar"
            value={form.nomor_kamar}
            onChange={(e) => setForm({ ...form, nomor_kamar: e.target.value })}
          />
          <input
            type="number"
            className="input input-bordered w-full"
            placeholder="Harga"
            value={form.harga}
            onChange={(e) => setForm({ ...form, harga: e.target.value })}
          />
          <select
            className="select select-bordered w-full"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            <option value="kosong">Kosong</option>
            <option value="terisi">Terisi</option>
            <option value="booked">Booked</option>
          </select>
          <button className="btn btn-primary w-full" onClick={handleSubmit} disabled={isSaving}>
            {isSaving && <span className="loading loading-spinner loading-xs"></span>}
            Save
          </button>
        </div>
      </Modal>
    </main>
  );
}
