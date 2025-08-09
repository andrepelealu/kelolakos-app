"use client";

import React, { useState } from "react";
import { createClient } from "@/libs/supabase/client";
import OnboardingFlow from "./OnboardingFlow";

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKosCreated: (kosId: string) => void;
}

export default function WelcomeModal({ isOpen, onClose, onKosCreated }: WelcomeModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [createdKosId, setCreatedKosId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nama_kos: '',
    alamat: '',
    deskripsi: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama_kos.trim()) {
      setError('Nama kos harus diisi');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/kos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Gagal membuat kos');
      }

      const newKos = await response.json();
      setCreatedKosId(newKos.id);
      onKosCreated(newKos.id);
      setStep(3); // Success step
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Onboarding Flow */}
      {showOnboarding && createdKosId && (
        <OnboardingFlow
          isOpen={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          onComplete={handleOnboardingComplete}
          selectedKosId={createdKosId}
        />
      )}

      {/* Welcome Modal */}
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2-2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Selamat Datang di Kelolakos! 🎉
            </h1>
            
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              Untuk memulai, kita perlu membuat profil kos pertama Anda. 
              Ini akan menjadi dasar untuk mengelola kamar, penghuni, dan tagihan.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-blue-50 rounded-xl p-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2-2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Kelola Kamar</h3>
                <p className="text-sm text-gray-600">Atur kamar dan tarif sewa</p>
              </div>

              <div className="bg-green-50 rounded-xl p-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Data Penghuni</h3>
                <p className="text-sm text-gray-600">Kelola informasi penghuni</p>
              </div>

              <div className="bg-purple-50 rounded-xl p-4">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Tagihan Otomatis</h3>
                <p className="text-sm text-gray-600">Buat tagihan otomatis</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => setStep(2)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold transition-colors"
              >
                Mulai Setup Kos
              </button>
              <button
                onClick={handleSkip}
                className="text-gray-600 hover:text-gray-800 px-8 py-3 rounded-xl font-medium transition-colors"
              >
                Nanti Saja
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Create Kos Form */}
        {step === 2 && (
          <div className="p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Buat Kos Pertama Anda</h2>
              <p className="text-gray-600">Isi informasi dasar tentang kos Anda</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nama Kos *
                </label>
                <input
                  type="text"
                  value={formData.nama_kos}
                  onChange={(e) => setFormData({ ...formData, nama_kos: e.target.value })}
                  placeholder="Contoh: Kos Putri Melati"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Alamat Lengkap
                </label>
                <textarea
                  value={formData.alamat}
                  onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                  placeholder="Jl. Contoh No. 123, Kelurahan ABC, Kecamatan XYZ, Jakarta Selatan"
                  rows={3}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Deskripsi (Optional)
                </label>
                <textarea
                  value={formData.deskripsi}
                  onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                  placeholder="Kos nyaman dan strategis, dekat kampus dan pusat kota..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="sm:order-1 text-gray-600 hover:text-gray-800 px-6 py-3 rounded-xl font-medium transition-colors"
                >
                  Kembali
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="sm:order-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-8 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Membuat...
                    </>
                  ) : (
                    'Buat Kos'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <div className="p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Kos Berhasil Dibuat! 🎉
            </h2>
            
            <p className="text-lg text-gray-600 mb-8">
              Selamat! Kos "<strong>{formData.nama_kos}</strong>" telah berhasil dibuat. 
              Sekarang Anda dapat mulai menambahkan kamar dan mengelola penghuni.
            </p>

            <div className="bg-blue-50 rounded-xl p-6 mb-8">
              <h3 className="font-semibold text-gray-900 mb-4">Langkah Selanjutnya:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">1</div>
                  <div>
                    <h4 className="font-medium text-gray-900">Tambah Kamar</h4>
                    <p className="text-sm text-gray-600">Daftarkan kamar-kamar yang tersedia</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">2</div>
                  <div>
                    <h4 className="font-medium text-gray-900">Daftarkan Penghuni</h4>
                    <p className="text-sm text-gray-600">Input data penghuni kos</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">3</div>
                  <div>
                    <h4 className="font-medium text-gray-900">Buat Tagihan</h4>
                    <p className="text-sm text-gray-600">Generate tagihan bulanan</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">4</div>
                  <div>
                    <h4 className="font-medium text-gray-900">Setup WhatsApp</h4>
                    <p className="text-sm text-gray-600">Integrasikan notifikasi WhatsApp</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => setShowOnboarding(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold transition-colors"
              >
                Lanjut Setup (Rekomendasi)
              </button>
              <button
                onClick={onClose}
                className="border border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-900 px-8 py-3 rounded-xl font-medium transition-colors"
              >
                Setup Nanti
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}