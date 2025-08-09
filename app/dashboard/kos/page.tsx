"use client";

import { useState, useEffect } from "react";
import { Kos } from "@/types";

export default function KosPage() {
  const [kosList, setKosList] = useState<Kos[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingKos, setEditingKos] = useState<Kos | null>(null);

  useEffect(() => {
    fetchKosList();
  }, []);

  const fetchKosList = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/kos?limit=50');
      
      if (!response.ok) {
        throw new Error('Failed to fetch kos list');
      }
      
      const result = await response.json();
      setKosList(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch kos list');
    } finally {
      setLoading(false);
    }
  };

  const handleAddKos = async (formData: FormData) => {
    try {
      const response = await fetch('/api/kos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nama_kos: formData.get('nama_kos'),
          alamat: formData.get('alamat'),
          deskripsi: formData.get('deskripsi'),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create kos');
      }

      await fetchKosList();
      setShowAddForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create kos');
    }
  };

  const handleEditKos = async (formData: FormData) => {
    if (!editingKos) return;

    try {
      const response = await fetch(`/api/kos/${editingKos.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nama_kos: formData.get('nama_kos'),
          alamat: formData.get('alamat'),
          deskripsi: formData.get('deskripsi'),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update kos');
      }

      await fetchKosList();
      setEditingKos(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update kos');
    }
  };

  const handleDeleteKos = async (kosId: string) => {
    if (!confirm('Are you sure you want to delete this kos? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/kos/${kosId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to delete kos');
      }

      await fetchKosList();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete kos');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manage Kos Buildings</h1>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
        >
          Add New Kos
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Add Kos Form */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add New Kos</h2>
            <form action={handleAddKos}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Kos *
                </label>
                <input
                  type="text"
                  name="nama_kos"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alamat
                </label>
                <textarea
                  name="alamat"
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deskripsi
                </label>
                <textarea
                  name="deskripsi"
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Add Kos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Kos Form */}
      {editingKos && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Edit Kos</h2>
            <form action={handleEditKos}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Kos *
                </label>
                <input
                  type="text"
                  name="nama_kos"
                  required
                  defaultValue={editingKos.nama_kos}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alamat
                </label>
                <textarea
                  name="alamat"
                  rows={3}
                  defaultValue={editingKos.alamat || ''}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deskripsi
                </label>
                <textarea
                  name="deskripsi"
                  rows={3}
                  defaultValue={editingKos.deskripsi || ''}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingKos(null)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Update Kos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Kos List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {kosList.map((kos) => (
          <div key={kos.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{kos.nama_kos}</h3>
            {kos.alamat && (
              <p className="text-sm text-gray-600 mb-2">
                <span className="font-medium">Alamat:</span> {kos.alamat}
              </p>
            )}
            {kos.deskripsi && (
              <p className="text-sm text-gray-600 mb-4">
                <span className="font-medium">Deskripsi:</span> {kos.deskripsi}
              </p>
            )}
            <div className="text-xs text-gray-500 mb-4">
              Created: {new Date(kos.created_at).toLocaleDateString()}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditingKos(kos)}
                className="text-primary hover:text-primary/80 text-sm font-medium"
              >
                Edit
              </button>
              <button
                onClick={() => handleDeleteKos(kos.id)}
                className="text-red-600 hover:text-red-800 text-sm font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {kosList.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">No kos buildings found</div>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Create Your First Kos
          </button>
        </div>
      )}
    </div>
  );
}