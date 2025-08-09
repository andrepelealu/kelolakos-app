"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import apiClient from "@/libs/api";
import { useKos } from "@/contexts/KosContext";
import NotificationStatus, { NotificationStatusBadge, NotificationTypeBadge, NotificationReadCount } from "@/components/NotificationStatus";
import NotificationStatsCard from "@/components/NotificationStatsCard";
import type { Notification, NotificationStats, NotificationFilter } from "@/types/notification";


export default function NotifikasiPage() {
  const { selectedKosId } = useKos();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<NotificationFilter>({});

  useEffect(() => {
    if (selectedKosId) {
      fetchNotifications();
      fetchStats();
    }
  }, [selectedKosId, currentPage, filters]);

  const fetchNotifications = async () => {
    if (!selectedKosId) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        kos_id: selectedKosId,
        page: currentPage.toString(),
        limit: '10'
      });

      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });

      const response = await apiClient.get(`/notifications?${params}`);
      setNotifications(response.data || []);
      setTotalPages(response.totalPages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat notifikasi');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!selectedKosId) return;

    try {
      const params = new URLSearchParams({ kos_id: selectedKosId });
      const response = await apiClient.get(`/notifications/stats?${params}`);
      setStats(response);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleFilterChange = (key: keyof NotificationFilter, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setCurrentPage(1);
  };

  // Render different content based on state, but never return early
  let content;

  if (!selectedKosId) {
    content = (
      <div className="text-center py-12">
        <p className="text-gray-500">Pilih kos terlebih dahulu</p>
      </div>
    );
  } else {
    content = (
      <>
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Notifikasi</h1>
        <p className="text-gray-600">Monitor status pengiriman email dan WhatsApp</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="mb-8">
          <NotificationStatsCard stats={stats} />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipe</label>
            <select
              value={filters.type || ''}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua</option>
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status || ''}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua</option>
              <option value="pending">Menunggu</option>
              <option value="sent">Terkirim</option>
              <option value="delivered">Sampai</option>
              <option value="failed">Gagal</option>
              <option value="read">Dibaca</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pencarian</label>
            <input
              type="text"
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Cari dalam pesan..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
            >
              Reset Filter
            </button>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading notifikasi...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-600">{error}</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-gray-500">Belum ada notifikasi</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {notifications.map((notification) => (
              <div key={notification.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <NotificationTypeBadge type={notification.type} />
                      <NotificationStatusBadge status={notification.status} />
                      <NotificationReadCount notification={notification} />
                    </div>
                    
                    {notification.subject && (
                      <h3 className="text-sm font-medium text-gray-900 mb-1">
                        {notification.subject}
                      </h3>
                    )}
                    
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                      {notification.content}
                    </p>
                    
                    <div className="flex items-center text-xs text-gray-500 space-x-4">
                      <span>
                        Kepada: {notification.penghuni?.nama || 
                          notification.recipient_email || 
                          notification.recipient_phone}
                      </span>
                      <span>•</span>
                      <span>
                        {formatDistanceToNow(new Date(notification.created_at), { 
                          addSuffix: true, 
                          locale: id 
                        })}
                      </span>
                      {notification.tagihan && (
                        <>
                          <span>•</span>
                          <span>
                            Tagihan {notification.tagihan.nomor_invoice}
                          </span>
                        </>
                      )}
                    </div>
                    
                    {notification.error_message && (
                      <div className="mt-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                        Error: {notification.error_message}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-500">
                    {notification.read_at && (
                      <div className="text-right">
                        <div className="text-purple-600 font-medium">Dibaca</div>
                        <div className="text-xs">
                          {formatDistanceToNow(new Date(notification.read_at), { 
                            addSuffix: true, 
                            locale: id 
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Halaman {currentPage} dari {totalPages}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sebelumnya
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
      </>
    );
  }

  return (
    <div className="p-6">
      {content}
    </div>
  );
}