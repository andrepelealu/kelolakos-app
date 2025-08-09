"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function PaymentPendingPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Pembayaran Pending</h1>
        <p className="text-gray-600 mb-6">
          Pembayaran Anda sedang diproses. Mohon tunggu konfirmasi dari sistem pembayaran.
        </p>
        
        {orderId && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-1">Order ID:</p>
            <p className="font-mono text-sm font-semibold text-gray-900">{orderId}</p>
          </div>
        )}
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-center mb-2">
            <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-sm font-semibold text-blue-900">Petunjuk:</h3>
          </div>
          <p className="text-xs text-blue-800 text-left">
            • Untuk Bank Transfer: Lakukan pembayaran sesuai instruksi yang diberikan<br/>
            • Untuk E-Wallet: Buka aplikasi dan konfirmasi pembayaran<br/>
            • Status akan diperbarui otomatis setelah pembayaran dikonfirmasi
          </p>
        </div>
        
        <div className="space-y-3">
          <Link 
            href="/dashboard/tagihan"
            className="w-full bg-primary text-white py-3 px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors inline-block"
          >
            Lihat Status Tagihan
          </Link>
          
          <Link 
            href="/dashboard"
            className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors inline-block"
          >
            Kembali ke Dashboard
          </Link>
        </div>
        
        <div className="mt-6 text-xs text-gray-500">
          <p>Pembayaran akan expired dalam waktu yang telah ditentukan.</p>
        </div>
      </div>
    </div>
  );
}