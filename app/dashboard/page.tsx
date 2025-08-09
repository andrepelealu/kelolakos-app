"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import apiClient from "@/libs/api";
import { formatRupiah } from "@/libs/formatter";
import { useKos } from "@/contexts/KosContext";
import OnboardingButton from "@/components/OnboardingButton";

interface DashboardStats {
  totalKamar: number;
  kamarTerisi: number;
  kamarKosong: number;
  totalPenghuni: number;
  tagihanBelumBayar: number;
  totalPendapatan: number;
}

export default function Dashboard() {
  const { selectedKosId } = useKos();
  const [stats, setStats] = useState<DashboardStats>({
    totalKamar: 0,
    kamarTerisi: 0,
    kamarKosong: 0,
    totalPenghuni: 0,
    tagihanBelumBayar: 0,
    totalPendapatan: 0,
  });
  const [loading, setLoading] = useState(true);
  const [kosExists, setKosExists] = useState<boolean | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      // If selectedKosId is null, we're still loading the context
      if (selectedKosId === null) {
        return;
      }

      // If selectedKosId is empty string, no kos exists
      if (selectedKosId === '') {
        setKosExists(false);
        setLoading(false);
        return;
      }

      // We have a valid kos ID
      setKosExists(true);
      setLoading(true);

      try {
        // Get current month for filtering tagihan
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1; // JavaScript months are 0-based
        const startOfMonth = new Date(currentYear, now.getMonth(), 1).toISOString().split('T')[0];
        const endOfMonth = new Date(currentYear, now.getMonth() + 1, 0).toISOString().split('T')[0];
        
        // Fetch basic stats and current month tagihan
        const [kamarRes, penghuniRes, tagihanRes, currentMonthTagihanRes] = await Promise.all([
          apiClient.get(`/kamar?limit=1000&kos_id=${selectedKosId}`),
          apiClient.get(`/penghuni?limit=1000&kos_id=${selectedKosId}`),
          apiClient.get(`/tagihan?limit=1000&kos_id=${selectedKosId}`),
          // Fetch current month tagihan with date filter
          apiClient.get(`/tagihan?limit=1000&kos_id=${selectedKosId}&date_from=${startOfMonth}&date_to=${endOfMonth}`),
        ]);

        const kamarData = kamarRes.data || [];
        const penghuniData = penghuniRes.data || [];
        const tagihanData = tagihanRes.data || [];
        const currentMonthTagihan = currentMonthTagihanRes.data || [];

        const kamarTerisi = kamarData.filter((k: any) => k.status === 'terisi').length;
        const kamarKosong = kamarData.filter((k: any) => k.status === 'kosong').length;
        
        // Current month statistics  
        const tagihanBelumBayar = currentMonthTagihan.filter((t: any) => 
          t.status_pembayaran === 'menunggu_pembayaran' || t.status_pembayaran === 'terlambat'
        ).length;
        
        const paidTagihan = currentMonthTagihan.filter((t: any) => t.status_pembayaran === 'lunas');
        const totalPendapatan = paidTagihan.reduce((sum: number, t: any) => sum + (t.total_tagihan || 0), 0);

        setStats({
          totalKamar: kamarData.length,
          kamarTerisi,
          kamarKosong,
          totalPenghuni: penghuniData.length,
          tagihanBelumBayar,
          totalPendapatan,
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [selectedKosId]);

  // Get current month name for display
  const getCurrentMonthName = () => {
    const now = new Date();
    return now.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
  };

  const statCards = [
    {
      title: "Total Kamar",
      value: stats.totalKamar,
      icon: (
        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2-2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      color: "bg-blue-50",
      href: "/dashboard/kamar",
      subtitle: null,
    },
    {
      title: "Kamar Terisi",
      value: stats.kamarTerisi,
      icon: (
        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: "bg-green-50",
      href: "/dashboard/kamar",
      subtitle: null,
    },
    {
      title: "Kamar Kosong",
      value: stats.kamarKosong,
      icon: (
        <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      ),
      color: "bg-gray-50",
      href: "/dashboard/kamar",
      subtitle: null,
    },
    {
      title: "Total Penghuni",
      value: stats.totalPenghuni,
      icon: (
        <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      ),
      color: "bg-purple-50",
      href: "/dashboard/penghuni",
      subtitle: null,
    },
    {
      title: "Tagihan Belum Bayar",
      value: stats.tagihanBelumBayar,
      icon: (
        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      ),
      color: "bg-red-50",
      href: "/dashboard/tagihan",
      subtitle: getCurrentMonthName(),
    },
    {
      title: "Total Pendapatan",
      value: formatRupiah(stats.totalPendapatan),
      icon: (
        <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      ),
      color: "bg-emerald-50",
      href: "/dashboard/tagihan",
      subtitle: getCurrentMonthName(),
    },
  ];

  const quickActions = [
    {
      title: "Tambah Kamar Baru",
      description: "Daftarkan kamar baru ke sistem",
      href: "/dashboard/kamar",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
      color: "bg-blue-600 hover:bg-blue-700",
    },
    {
      title: "Daftarkan Penghuni",
      description: "Tambah penghuni baru",
      href: "/dashboard/penghuni",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      ),
      color: "bg-green-600 hover:bg-green-700",
    },
    {
      title: "Buat Tagihan",
      description: "Buat tagihan untuk penghuni",
      href: "/dashboard/tagihan",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: "bg-purple-600 hover:bg-purple-700",
    },
    {
      title: "Kelola Add-on",
      description: "Atur layanan tambahan",
      href: "/dashboard/add-on",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      color: "bg-orange-600 hover:bg-orange-700",
    },
  ];

  // Show loading while kos context is initializing
  if (kosExists === null || (selectedKosId === null && loading)) {
    return (
      <main className="p-6">
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </main>
    );
  }

  // Show message when no kos exists
  if (kosExists === false || selectedKosId === '') {
    return (
      <main className="p-6">
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2-2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Welcome to Kelolakos!</h3>
          <p className="text-gray-600 mb-4">Get started by creating your first kos building</p>
          <button
            onClick={() => window.location.href = '/dashboard/kos'}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Create Your First Kos
          </button>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Selamat datang di sistem manajemen kos Kelolakos</p>
      </div>

      {/* Onboarding Prompt */}
      <OnboardingButton />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((card, index) => (
          <Link
            key={index}
            href={card.href}
            className="group bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 group-hover:text-gray-900">
                  {card.title}
                </p>
                {card.subtitle && (
                  <p className="text-xs text-gray-500 mb-1">
                    {card.subtitle}
                  </p>
                )}
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {typeof card.value === 'string' ? card.value : card.value.toLocaleString()}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${card.color}`}>
                {card.icon}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Aksi Cepat</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              href={action.href}
              className={`${action.color} text-white p-6 rounded-lg shadow-sm transition-colors duration-200`}
            >
              <div className="flex items-center gap-3 mb-2">
                {action.icon}
                <h3 className="font-semibold">{action.title}</h3>
              </div>
              <p className="text-white/90 text-sm">{action.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Aktivitas Terbaru</h2>
        <div className="text-center py-12">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-gray-500">Belum ada aktivitas terbaru</p>
          <p className="text-sm text-gray-400 mt-1">Aktivitas akan muncul di sini setelah Anda mulai menggunakan sistem</p>
        </div>
      </div>
    </main>
  );
}
