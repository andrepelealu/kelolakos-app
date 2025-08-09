"use client";

import React, { useState, useEffect } from "react";
import { useKos } from "@/contexts/KosContext";

interface OnboardingFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  selectedKosId: string;
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  component: React.ReactNode;
  optional?: boolean;
}

interface KamarFormData {
  nomor_kamar: string;
  harga: string;
  status: string;
}

interface PenghuniFormData {
  nama: string;
  nomor_telepon: string;
  email: string;
  kamar_id: string;
  mulai_sewa: string;
  selesai_sewa: string;
}

interface PaymentInfoData {
  bank_name: string;
  account_number: string;
  account_name: string;
}

export default function OnboardingFlow({ isOpen, onClose, onComplete, selectedKosId }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form data states
  const [kamarData, setKamarData] = useState<KamarFormData>({
    nomor_kamar: '',
    harga: '',
    status: 'kosong'
  });
  const [penghuniData, setPenghuniData] = useState<PenghuniFormData>({
    nama: '',
    nomor_telepon: '',
    email: '',
    kamar_id: '',
    mulai_sewa: '',
    selesai_sewa: ''
  });
  const [paymentData, setPaymentData] = useState<PaymentInfoData>({
    bank_name: '',
    account_number: '',
    account_name: ''
  });
  
  const [createdKamar, setCreatedKamar] = useState<any[]>([]);

  // Step components
  const KamarCreationStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Tambah Kamar Pertama</h3>
        <p className="text-gray-600">Daftarkan kamar yang tersedia di kos Anda</p>
      </div>

      <form onSubmit={handleKamarSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nomor Kamar *
            </label>
            <input
              type="text"
              value={kamarData.nomor_kamar}
              onChange={(e) => setKamarData({ ...kamarData, nomor_kamar: e.target.value })}
              placeholder="Contoh: A1, B2, 101"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Harga Sewa (per bulan) *
            </label>
            <input
              type="number"
              value={kamarData.harga}
              onChange={(e) => setKamarData({ ...kamarData, harga: e.target.value })}
              placeholder="1500000"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status Kamar
          </label>
          <select
            value={kamarData.status}
            onChange={(e) => setKamarData({ ...kamarData, status: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="kosong">Kosong</option>
            <option value="terisi">Terisi</option>
            <option value="booked">Booked</option>
          </select>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex justify-between pt-4">
          <button
            type="button"
            onClick={() => handleStepComplete(currentStep)}
            className="text-gray-600 hover:text-gray-800 px-4 py-2 rounded-lg transition-colors"
          >
            Lewati untuk Sekarang
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg transition-colors flex items-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Menambah...
              </>
            ) : (
              'Tambah Kamar'
            )}
          </button>
        </div>
      </form>

      {createdKamar.length > 0 && (
        <div className="mt-6 p-4 bg-green-50 rounded-lg">
          <h4 className="font-medium text-green-900 mb-2">Kamar yang sudah ditambah:</h4>
          <ul className="space-y-1">
            {createdKamar.map((kamar, idx) => (
              <li key={idx} className="text-sm text-green-700">
                • {kamar.nomor_kamar} - Rp {parseInt(kamar.harga).toLocaleString()}
              </li>
            ))}
          </ul>
          <button
            onClick={() => handleStepComplete(currentStep)}
            className="mt-3 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Lanjut ke Step Berikutnya
          </button>
        </div>
      )}
    </div>
  );

  const PenghuniRegistrationStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Daftarkan Penghuni</h3>
        <p className="text-gray-600">Tambahkan data penghuni untuk kamar yang tersedia</p>
      </div>

      {createdKamar.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2-2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <p className="text-gray-600 mb-4">Belum ada kamar yang terdaftar</p>
          <p className="text-sm text-gray-500 mb-6">Tambahkan kamar terlebih dahulu atau lewati step ini</p>
          <button
            onClick={() => handleStepComplete(currentStep)}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Lewati untuk Sekarang
          </button>
        </div>
      ) : (
        <form onSubmit={handlePenghuniSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nama Lengkap *
              </label>
              <input
                type="text"
                value={penghuniData.nama}
                onChange={(e) => setPenghuniData({ ...penghuniData, nama: e.target.value })}
                placeholder="Nama lengkap penghuni"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nomor Telepon *
              </label>
              <input
                type="tel"
                value={penghuniData.nomor_telepon}
                onChange={(e) => setPenghuniData({ ...penghuniData, nomor_telepon: e.target.value })}
                placeholder="628123456789"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={penghuniData.email}
                onChange={(e) => setPenghuniData({ ...penghuniData, email: e.target.value })}
                placeholder="email@contoh.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pilih Kamar *
              </label>
              <select
                value={penghuniData.kamar_id}
                onChange={(e) => setPenghuniData({ ...penghuniData, kamar_id: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Pilih kamar...</option>
                {createdKamar.map((kamar) => (
                  <option key={kamar.id} value={kamar.id}>
                    {kamar.nomor_kamar} - Rp {parseInt(kamar.harga).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mulai Sewa *
              </label>
              <input
                type="date"
                value={penghuniData.mulai_sewa}
                onChange={(e) => setPenghuniData({ ...penghuniData, mulai_sewa: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selesai Sewa *
              </label>
              <input
                type="date"
                value={penghuniData.selesai_sewa}
                onChange={(e) => setPenghuniData({ ...penghuniData, selesai_sewa: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => handleStepComplete(currentStep)}
              className="text-gray-600 hover:text-gray-800 px-4 py-2 rounded-lg transition-colors"
            >
              Lewati untuk Sekarang
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg transition-colors flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Mendaftar...
                </>
              ) : (
                'Daftarkan Penghuni'
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );

  const PaymentInfoStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Setup Informasi Pembayaran</h3>
        <p className="text-gray-600">Atur informasi rekening untuk menerima pembayaran</p>
      </div>

      <form onSubmit={handlePaymentSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nama Bank *
          </label>
          <select
            value={paymentData.bank_name}
            onChange={(e) => setPaymentData({ ...paymentData, bank_name: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Pilih bank...</option>
            <option value="BCA">BCA</option>
            <option value="BNI">BNI</option>
            <option value="BRI">BRI</option>
            <option value="Mandiri">Mandiri</option>
            <option value="CIMB Niaga">CIMB Niaga</option>
            <option value="Danamon">Danamon</option>
            <option value="BSI">BSI</option>
            <option value="Lainnya">Lainnya</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nomor Rekening *
            </label>
            <input
              type="text"
              value={paymentData.account_number}
              onChange={(e) => setPaymentData({ ...paymentData, account_number: e.target.value })}
              placeholder="1234567890"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nama Pemilik Rekening *
            </label>
            <input
              type="text"
              value={paymentData.account_name}
              onChange={(e) => setPaymentData({ ...paymentData, account_name: e.target.value })}
              placeholder="Nama sesuai rekening"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex justify-between pt-4">
          <button
            type="button"
            onClick={() => handleStepComplete(currentStep)}
            className="text-gray-600 hover:text-gray-800 px-4 py-2 rounded-lg transition-colors"
          >
            Lewati untuk Sekarang
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg transition-colors flex items-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Menyimpan...
              </>
            ) : (
              'Simpan Informasi'
            )}
          </button>
        </div>
      </form>
    </div>
  );

  const CompletionStep = () => (
    <div className="text-center py-8">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      
      <h3 className="text-2xl font-bold text-gray-900 mb-4">
        Setup Awal Selesai! 🎉
      </h3>
      
      <p className="text-lg text-gray-600 mb-8">
        Kos Anda sudah siap dikelola. Anda dapat mulai membuat tagihan dan mengelola bisnis kos Anda.
      </p>

      <div className="bg-blue-50 rounded-xl p-6 mb-8">
        <h4 className="font-semibold text-gray-900 mb-4">Yang bisa Anda lakukan selanjutnya:</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">📋</div>
            <div>
              <h5 className="font-medium text-gray-900">Buat Tagihan</h5>
              <p className="text-sm text-gray-600">Generate tagihan bulanan untuk penghuni</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">📱</div>
            <div>
              <h5 className="font-medium text-gray-900">Setup WhatsApp</h5>
              <p className="text-sm text-gray-600">Integrasikan notifikasi WhatsApp</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">➕</div>
            <div>
              <h5 className="font-medium text-gray-900">Tambah Add-on</h5>
              <p className="text-sm text-gray-600">Atur layanan tambahan</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">📊</div>
            <div>
              <h5 className="font-medium text-gray-900">Lihat Laporan</h5>
              <p className="text-sm text-gray-600">Monitor performa bisnis</p>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={onComplete}
        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold transition-colors"
      >
        Mulai Kelola Kos
      </button>
    </div>
  );

  const steps: OnboardingStep[] = [
    {
      id: 'kamar',
      title: 'Tambah Kamar',
      description: 'Daftarkan kamar-kamar yang tersedia',
      optional: true,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2-2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      component: <KamarCreationStep />
    },
    {
      id: 'penghuni',
      title: 'Tambah Penghuni',
      description: 'Daftarkan penghuni untuk kamar',
      optional: true,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      component: <PenghuniRegistrationStep />
    },
    {
      id: 'payment',
      title: 'Info Pembayaran',
      description: 'Setup informasi rekening',
      optional: true,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
      component: <PaymentInfoStep />
    },
    {
      id: 'complete',
      title: 'Selesai',
      description: 'Setup awal completed',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
      component: <CompletionStep />
    }
  ];

  const handleKamarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/kamar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...kamarData,
          kos_id: selectedKosId,
          harga: Number(kamarData.harga)
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Gagal menambah kamar');
      }

      const newKamar = await response.json();
      setCreatedKamar(prev => [...prev, newKamar]);
      setKamarData({
        nomor_kamar: '',
        harga: '',
        status: 'kosong'
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const handlePenghuniSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/penghuni', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...penghuniData,
          kos_id: selectedKosId
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Gagal mendaftarkan penghuni');
      }

      handleStepComplete(currentStep);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/payment-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...paymentData,
          kos_id: selectedKosId
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Gagal menyimpan informasi pembayaran');
      }

      handleStepComplete(currentStep);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const handleStepComplete = (stepIndex: number) => {
    setCompletedSteps(prev => new Set([...prev, stepIndex]));
    if (stepIndex < steps.length - 1) {
      setCurrentStep(stepIndex + 1);
    }
    setError(null);
  };

  const handleStepBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header with Progress */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Setup Awal Kos</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                  index === currentStep
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : completedSteps.has(index)
                    ? 'border-green-600 bg-green-600 text-white'
                    : 'border-gray-300 bg-gray-100 text-gray-400'
                }`}>
                  {completedSteps.has(index) ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step.icon
                  )}
                </div>
                <div className="ml-3 hidden sm:block">
                  <p className={`text-sm font-medium ${
                    index === currentStep ? 'text-blue-600' : completedSteps.has(index) ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {step.title}
                    {step.optional && <span className="ml-1 text-xs">(Opsional)</span>}
                  </p>
                  <p className="text-xs text-gray-400">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`hidden sm:block w-12 h-0.5 ml-4 ${
                    completedSteps.has(index) ? 'bg-green-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="p-6">
          {steps[currentStep].component}
        </div>

        {/* Navigation */}
        {currentStep < steps.length - 1 && (
          <div className="px-6 pb-6">
            <div className="flex justify-between items-center">
              <button
                onClick={handleStepBack}
                disabled={currentStep === 0}
                className="text-gray-600 hover:text-gray-800 disabled:text-gray-400 px-4 py-2 rounded-lg transition-colors disabled:cursor-not-allowed"
              >
                ← Kembali
              </button>
              <div className="text-sm text-gray-500">
                Step {currentStep + 1} dari {steps.length}
              </div>
              <button
                onClick={onClose}
                className="text-gray-600 hover:text-gray-800 px-4 py-2 rounded-lg transition-colors"
              >
                Selesaikan Nanti
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}