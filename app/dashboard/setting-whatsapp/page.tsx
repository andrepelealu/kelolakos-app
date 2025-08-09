"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { WhatsAppConnectionStatus } from "@/types/whatsapp";

export default function SettingWhatsappPage() {
  const [connectionStatus, setConnectionStatus] = useState<WhatsAppConnectionStatus>({
    isConnected: false,
    status: 'disconnected'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [connectionTimeout, setConnectionTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Fetch connection status on component mount
  useEffect(() => {
    fetchConnectionStatus();
    
    // Poll status every 3 seconds for most states, but less frequently for stuck states
    const interval = setInterval(() => {
      if (connectionStatus.status === 'connecting' || connectionStatus.status === 'qr_required') {
        fetchConnectionStatus();
      } else if (connectionStatus.status === 'disconnected' && isConnecting) {
        // If we've been trying to connect for too long, allow user to try again
        fetchConnectionStatus();
      }
    }, 3000);

    return () => {
      clearInterval(interval);
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
      }
    };
  }, [connectionStatus.status, isConnecting, connectionTimeout]);

  const fetchConnectionStatus = async () => {
    try {
      const response = await fetch('/api/whatsapp/connect', {
        method: 'GET',
      });
      
      const data = await response.json();
      
      if (data.success) {
        setConnectionStatus({
          isConnected: data.isConnected,
          status: data.status,
          phoneNumber: data.phoneNumber,
          qrCode: data.qrCode,
          lastConnected: data.lastConnected
        });
      }
    } catch (error) {
      console.error('Error fetching connection status:', error);
    }
  };

  const handleConnect = async () => {
    setIsLoading(true);
    setIsConnecting(true);
    
    // Clear any existing timeout
    if (connectionTimeout) {
      clearTimeout(connectionTimeout);
    }
    
    // Set a timeout to reset connecting state if it takes too long
    const timeout = setTimeout(() => {
      console.log('Connection timeout, resetting states');
      setIsConnecting(false);
      setIsLoading(false);
      toast.error('Koneksi timeout. Silakan coba lagi atau reset session.');
    }, 60000); // 60 seconds timeout
    
    setConnectionTimeout(timeout);
    
    try {
      const response = await fetch('/api/whatsapp/connect', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.success) {
        setConnectionStatus({
          isConnected: data.isConnected,
          status: data.status,
          phoneNumber: data.phoneNumber,
          qrCode: data.qrCode
        });
        
        if (data.status === 'qr_required') {
          toast.success('Silakan scan QR code dengan WhatsApp Anda');
        } else if (data.status === 'connected') {
          toast.success('WhatsApp berhasil terhubung!');
          setIsConnecting(false);
          clearTimeout(timeout);
        }
      } else {
        toast.error(data.error || 'Gagal menghubungkan WhatsApp');
        setIsConnecting(false);
        clearTimeout(timeout);
      }
    } catch (error) {
      console.error('Error connecting WhatsApp:', error);
      toast.error('Terjadi kesalahan saat menghubungkan WhatsApp');
      setIsConnecting(false);
      clearTimeout(timeout);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/whatsapp/disconnect', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.success) {
        setConnectionStatus({
          isConnected: false,
          status: 'disconnected'
        });
        toast.success('WhatsApp berhasil diputuskan');
      } else {
        toast.error(data.error || 'Gagal memutuskan koneksi WhatsApp');
      }
    } catch (error) {
      console.error('Error disconnecting WhatsApp:', error);
      toast.error('Terjadi kesalahan saat memutuskan koneksi');
    } finally {
      setIsLoading(false);
      setIsConnecting(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset WhatsApp session? Ini akan menghapus semua data session dan Anda perlu scan QR code lagi.')) return;
    
    setIsResetting(true);
    
    try {
      const response = await fetch('/api/whatsapp/reset', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.success) {
        setConnectionStatus({
          isConnected: false,
          status: 'disconnected'
        });
        toast.success('WhatsApp session berhasil direset. Silakan hubungkan kembali.');
        setIsConnecting(false);
      } else {
        toast.error(data.error || 'Gagal mereset WhatsApp session');
      }
    } catch (error) {
      console.error('Error resetting WhatsApp:', error);
      toast.error('Terjadi kesalahan saat mereset WhatsApp session');
    } finally {
      setIsResetting(false);
    }
  };

  const getStatusBadge = () => {
    const statusConfig = {
      connected: { bg: 'bg-green-100', text: 'text-green-800', label: 'Terhubung' },
      connecting: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Menghubungkan...' },
      qr_required: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Menunggu QR Scan' },
      disconnected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Terputus' }
    };

    const config = statusConfig[connectionStatus.status] || statusConfig.disconnected;

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
        <div className={`w-2 h-2 rounded-full mr-2 ${config.bg === 'bg-green-100' ? 'bg-green-500' : config.bg === 'bg-yellow-100' ? 'bg-yellow-500' : config.bg === 'bg-blue-100' ? 'bg-blue-500' : 'bg-red-500'}`}></div>
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Setting WhatsApp</h1>
        <p className="text-gray-600">
          Kelola koneksi WhatsApp untuk mengirim invoice dan notifikasi ke penghuni kos
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Connection Status Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Status Koneksi</h2>
            {getStatusBadge()}
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-gray-600">Status:</span>
              <span className="font-medium text-gray-900">
                {connectionStatus.status === 'connected' ? 'Terhubung' :
                 connectionStatus.status === 'connecting' ? 'Menghubungkan...' :
                 connectionStatus.status === 'qr_required' ? 'Menunggu QR Scan' :
                 'Terputus'}
              </span>
            </div>

            {connectionStatus.phoneNumber && (
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-gray-600">Nomor WhatsApp:</span>
                <span className="font-medium text-gray-900">+{connectionStatus.phoneNumber}</span>
              </div>
            )}

            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-gray-600">Terakhir Terhubung:</span>
              <span className="font-medium text-gray-900">
                {formatDate(connectionStatus.lastConnected)}
              </span>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <div className="flex gap-3">
              {!connectionStatus.isConnected ? (
                <button
                  onClick={handleConnect}
                  disabled={(isLoading && !isConnecting) || isResetting}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Menghubungkan...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      Hubungkan WhatsApp
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleDisconnect}
                  disabled={isLoading || isResetting}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Memutuskan...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Putuskan Koneksi
                    </>
                  )}
                </button>
              )}
            </div>
            
            {/* Reset button - only show when stuck or having issues */}
            <button
              onClick={handleReset}
              disabled={isResetting || isLoading || isConnecting}
              className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center text-sm"
            >
              {isResetting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Mereset Session...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reset Session WhatsApp
                </>
              )}
            </button>
          </div>
        </div>

        {/* QR Code Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">QR Code Scanner</h2>
          
          {connectionStatus.status === 'qr_required' && connectionStatus.qrCode ? (
            <div className="text-center">
              <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300 mb-4 inline-block">
                <img 
                  src={connectionStatus.qrCode} 
                  alt="WhatsApp QR Code" 
                  className="w-64 h-64 mx-auto"
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-900">Scan QR Code dengan WhatsApp Anda</p>
                <p className="text-xs text-gray-500">
                  1. Buka WhatsApp di ponsel Anda<br/>
                  2. Ketuk menu ⋮ atau Settings<br/>
                  3. Pilih &quot;Perangkat Tertaut&quot;<br/>
                  4. Ketuk &quot;Tautkan Perangkat&quot;<br/>
                  5. Arahkan kamera ke QR code ini
                </p>
              </div>
              
              {isConnecting && (
                <div className="mt-4 flex items-center justify-center text-blue-600">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Menunggu scan QR code...
                </div>
              )}
            </div>
          ) : connectionStatus.status === 'connected' ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-lg font-medium text-gray-900 mb-2">WhatsApp Terhubung!</p>
              <p className="text-gray-500">
                WhatsApp siap digunakan untuk mengirim invoice dan notifikasi
              </p>
            </div>
          ) : connectionStatus.status === 'connecting' ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="animate-spin w-8 h-8 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <p className="text-lg font-medium text-gray-900 mb-2">Menghubungkan...</p>
              <p className="text-gray-500">
                Sedang menyiapkan koneksi WhatsApp
              </p>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-lg font-medium text-gray-900 mb-2">WhatsApp Terputus</p>
              <p className="text-gray-500">
                Klik &quot;Hubungkan WhatsApp&quot; untuk memulai koneksi
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Information Card */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-medium text-blue-900 mb-2">Informasi Penting</h3>
            <div className="text-blue-800 space-y-2">
              <p>• WhatsApp harus tetap terhubung di perangkat utama agar pengiriman pesan berfungsi</p>
              <p>• Sistem akan mencoba menghubungkan ulang secara otomatis jika koneksi terputus</p>
              <p>• Invoice akan dikirim melalui WhatsApp dan email secara bersamaan untuk memastikan penghuni menerima tagihan</p>
              <p>• Pastikan nomor WhatsApp penghuni valid dan aktif untuk pengiriman yang berhasil</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}