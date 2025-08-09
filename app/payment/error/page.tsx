"use client";

import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function PaymentErrorPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Pembayaran Gagal</h1>
        <p className="text-gray-600 mb-6">
          Maaf, pembayaran Anda tidak dapat diproses. Silakan coba lagi atau hubungi pengelola kos.
        </p>
        
        {orderId && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-1">Order ID:</p>
            <p className="font-mono text-sm font-semibold text-gray-900">{orderId}</p>
          </div>
        )}
        
        <div className="space-y-3">
          <Link 
            href="/dashboard/tagihan"
            className="w-full bg-primary text-white py-3 px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors inline-block"
          >
            Coba Bayar Lagi
          </Link>
          
          <Link 
            href="/dashboard"
            className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors inline-block"
          >
            Kembali ke Dashboard
          </Link>
        </div>
        
        <div className="mt-6 text-xs text-gray-500">
          <p>Jika masalah terus berlanjut, hubungi pengelola kos untuk bantuan.</p>
        </div>
      </div>
    </div>
  );
}