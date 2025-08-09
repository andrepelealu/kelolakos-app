"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [transactionDetails, setTransactionDetails] = useState(null);
  
  const orderId = searchParams.get("order_id");

  useEffect(() => {
    if (!orderId) {
      router.push("/dashboard");
      return;
    }

    // Give some time for the callback to process
    setTimeout(() => {
      setLoading(false);
    }, 3000);
  }, [orderId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Memproses Pembayaran</h2>
          <p className="text-gray-600">Mohon tunggu, kami sedang memverifikasi pembayaran Anda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Pembayaran Berhasil!</h1>
        <p className="text-gray-600 mb-6">
          Terima kasih! Pembayaran Anda telah berhasil diproses.
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
            Lihat Tagihan
          </Link>
          
          <Link 
            href="/dashboard"
            className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors inline-block"
          >
            Kembali ke Dashboard
          </Link>
        </div>
        
        <div className="mt-6 text-xs text-gray-500">
          <p>Status tagihan akan diperbarui secara otomatis dalam beberapa saat.</p>
        </div>
      </div>
    </div>
  );
}