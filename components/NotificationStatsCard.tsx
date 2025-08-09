"use client";

import type { NotificationStats } from "@/types/notification";

interface NotificationStatsCardProps {
  stats: NotificationStats;
}

export default function NotificationStatsCard({ stats }: NotificationStatsCardProps) {
  const successfulDeliveries = stats.delivered + stats.read;
  const deliveryRate = stats.total > 0 ? (successfulDeliveries / stats.total) * 100 : 0;
  const readRate = successfulDeliveries > 0 ? (stats.read / successfulDeliveries) * 100 : 0;

  const statItems = [
    {
      label: "Total Notifikasi",
      value: stats.total,
      color: "text-gray-900",
      bgColor: "bg-gray-50"
    },
    {
      label: "Berhasil Terkirim",
      value: successfulDeliveries,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      label: "Gagal",
      value: stats.failed,
      color: "text-red-600",
      bgColor: "bg-red-50"
    },
    {
      label: "Dibaca",
      value: stats.read,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      label: "Email",
      value: stats.email_count,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      label: "WhatsApp",
      value: stats.whatsapp_count,
      color: "text-green-600",
      bgColor: "bg-green-50"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statItems.map((item, index) => (
          <div key={index} className={`${item.bgColor} rounded-lg p-4`}>
            <div className="text-center">
              <div className={`text-2xl font-bold ${item.color}`}>
                {item.value.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {item.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Rate Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Tingkat Pengiriman</h3>
              <p className="text-2xl font-bold text-green-600">
                {deliveryRate.toFixed(1)}%
              </p>
            </div>
            <div className="w-16 h-16 relative">
              <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="#e5e7eb"
                  strokeWidth="4"
                  fill="transparent"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="#10b981"
                  strokeWidth="4"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  strokeDashoffset={`${2 * Math.PI * 28 * (1 - deliveryRate / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-medium text-green-600">
                  📤
                </span>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {successfulDeliveries} dari {stats.total} berhasil
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Tingkat Baca</h3>
              <p className="text-2xl font-bold text-purple-600">
                {readRate.toFixed(1)}%
              </p>
            </div>
            <div className="w-16 h-16 relative">
              <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="#e5e7eb"
                  strokeWidth="4"
                  fill="transparent"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="#9333ea"
                  strokeWidth="4"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  strokeDashoffset={`${2 * Math.PI * 28 * (1 - readRate / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-medium text-purple-600">
                  👁️
                </span>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {stats.read} dari {successfulDeliveries} dibaca
          </p>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Status Breakdown</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
              <span className="text-sm text-gray-600">Menunggu</span>
            </div>
            <span className="text-sm font-medium">{stats.pending}</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
              <span className="text-sm text-gray-600">Terkirim</span>
            </div>
            <span className="text-sm font-medium">{stats.sent}</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              <span className="text-sm text-gray-600">Sampai</span>
            </div>
            <span className="text-sm font-medium">{stats.delivered}</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
              <span className="text-sm text-gray-600">Dibaca</span>
            </div>
            <span className="text-sm font-medium">{stats.read}</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-400 rounded-full"></div>
              <span className="text-sm text-gray-600">Gagal</span>
            </div>
            <span className="text-sm font-medium">{stats.failed}</span>
          </div>
        </div>
      </div>
    </div>
  );
}