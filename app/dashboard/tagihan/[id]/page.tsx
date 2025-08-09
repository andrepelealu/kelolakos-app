"use client";

import { useEffect, useState } from "react";
import apiClient from "@/libs/api";
import { Tagihan } from "@/types";
import { useParams, useRouter } from "next/navigation";
import { formatRupiah, formatDate } from "@/libs/formatter";
import toast from "react-hot-toast";
import { 
  getComputedStatus, 
  getStatusConfig, 
  getNextStatuses, 
  getStatusActionLabel,
  getStatusLabel,
  canEditInvoice,
  canSendToCustomer
} from "@/libs/invoice-status";


export default function TagihanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<Tagihan | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res: Tagihan = await apiClient.get(`/tagihan/${params?.id}`);
        setData(res);
      } catch (e) {
        console.error("Error fetching tagihan:", e);
      }
      setLoading(false);
    };
    fetchData();
  }, [params]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 text-center">
          <p>Data not found</p>
          <button className="btn" onClick={() => router.back()}>
            Back
          </button>
        </div>
      </main>
    );
  }

  const handleDownloadPDF = async () => {
    if (!data?.id) return;
    
    setIsGeneratingPDF(true);
    try {
      const response = await fetch(`/api/tagihan/${data.id}/pdf`);
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `invoice-${data.nomor_invoice}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Invoice PDF berhasil diunduh');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Gagal mengunduh PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleRegeneratePDF = async () => {
    if (!data?.id) return;
    
    setIsGeneratingPDF(true);
    try {
      const response = await fetch(`/api/tagihan/${data.id}/pdf`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to regenerate PDF');
      }
      
      toast.success('PDF berhasil dibuat ulang');
      // Optionally refresh the data to get updated pdf_path
      window.location.reload();
    } catch (error) {
      console.error('Error regenerating PDF:', error);
      toast.error('Gagal membuat ulang PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!data?.id) return;
    
    setIsUpdatingStatus(true);
    try {
      const response = await fetch(`/api/tagihan/${data.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newStatus })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update status');
      }
      
      const updatedData = await response.json();
      setData(updatedData);
      toast.success(`Status berhasil diubah ke ${getStatusLabel(newStatus)}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(error instanceof Error ? error.message : 'Gagal mengubah status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const currentStatus = getComputedStatus({
    tanggal_jatuh_tempo: data?.tanggal_jatuh_tempo || '',
    status_pembayaran: data?.status_pembayaran || 'draft'
  });
  const statusConfig = getStatusConfig(currentStatus);
  const nextStatuses = getNextStatuses(currentStatus);

  return (
    <main className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Detail Tagihan</h1>
              <p className="text-gray-600">Invoice {data?.nomor_invoice}</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {/* Status Action Buttons */}
            {nextStatuses.map((nextStatus) => (
              <button
                key={nextStatus}
                onClick={() => handleStatusChange(nextStatus)}
                disabled={isUpdatingStatus}
                className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 ${
                  nextStatus === 'menunggu_pembayaran' ? 'bg-amber-600 hover:bg-amber-700 text-white' :
                  nextStatus === 'lunas' ? 'bg-green-600 hover:bg-green-700 text-white' :
                  'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isUpdatingStatus ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {nextStatus === 'menunggu_pembayaran' ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    ) : nextStatus === 'lunas' ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    )}
                  </svg>
                )}
                {getStatusActionLabel(currentStatus, nextStatus)}
              </button>
            ))}
            
            {/* Edit Button - only show if status allows editing */}
            {canEditInvoice(currentStatus) && (
              <button
                onClick={() => router.push(`/dashboard/tagihan/edit/${data?.id}`)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Edit
              </button>
            )}
            
            {/* PDF Actions */}
            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 disabled:opacity-50"
            >
              {isGeneratingPDF ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
              {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
            </button>
            
            {data?.pdf_path && (
              <button
                onClick={handleRegeneratePDF}
                disabled={isGeneratingPDF}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 disabled:opacity-50"
              >
                {isGeneratingPDF ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                Regenerate PDF
              </button>
            )}
          </div>
        </div>
      </div>
      {/* Invoice Info Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Informasi Tagihan</h2>
        
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Invoice</label>
              <p className="text-lg font-semibold text-gray-900">{data.nomor_invoice}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Kamar</label>
              <p className="text-lg text-gray-900">{data.kamar?.nomor_kamar}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Penghuni</label>
              <p className="text-lg text-gray-900">{data.penghuni?.nama || '-'}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status Pembayaran</label>
              <div 
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium"
                style={{ 
                  backgroundColor: statusConfig.bgColor, 
                  color: statusConfig.color 
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {currentStatus === 'lunas' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  ) : currentStatus === 'terlambat' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  ) : currentStatus === 'draft' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  )}
                </svg>
                <span>{statusConfig.label}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{statusConfig.description}</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Terbit</label>
              <p className="text-lg text-gray-900">{formatDate(data.tanggal_terbit)}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Jatuh Tempo</label>
              <p className="text-lg text-gray-900">{formatDate(data.tanggal_jatuh_tempo)}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Harga Kamar</label>
              <p className="text-lg text-gray-900">{formatRupiah(data.kamar?.harga || 0)}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Add-on</label>
              <p className="text-lg text-gray-900">{formatRupiah(data.add_on)}</p>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-200 mt-6 pt-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Denda</label>
              <p className="text-lg font-semibold text-red-600">{formatRupiah(data.denda)}</p>
            </div>
            
            <div className="text-right">
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Tagihan</label>
              <p className="text-3xl font-bold text-primary">{formatRupiah(data.total_tagihan)}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Add-ons Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Detail Layanan Tambahan</h2>
        
        {data.add_ons && data.add_ons.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nama Layanan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Harga Satuan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Satuan
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Qty
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subtotal
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.add_ons.map((addon, index) => (
                  <tr key={addon.add_on_id || index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {addon.add_on?.nama || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatRupiah(addon.add_on?.harga || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {addon.add_on?.satuan || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                      {addon.qty}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                      {formatRupiah((addon.add_on?.harga || 0) * addon.qty)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                    Total Add-on:
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-bold text-primary">
                    {formatRupiah(data.add_on)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <svg
              className="w-12 h-12 text-gray-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak ada layanan tambahan</h3>
            <p className="text-gray-600">Tagihan ini tidak memiliki add-on atau layanan tambahan</p>
          </div>
        )}
      </div>
    </main>
  );
}
