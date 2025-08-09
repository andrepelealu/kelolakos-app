"use client";

import { useState, useEffect } from "react";
import { useKos } from "@/contexts/KosContext";
import OnboardingFlow from "./OnboardingFlow";

export default function OnboardingButton() {
  const { selectedKosId } = useKos();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!selectedKosId) return;

      try {
        // Check if user has completed basic setup
        const [kamarRes, penghuniRes, paymentRes] = await Promise.all([
          fetch(`/api/kamar?kos_id=${selectedKosId}&limit=1`),
          fetch(`/api/penghuni?kos_id=${selectedKosId}&limit=1`),
          fetch(`/api/payment-info?kos_id=${selectedKosId}&limit=1`)
        ]);

        const [kamarData, penghuniData, paymentData] = await Promise.all([
          kamarRes.ok ? kamarRes.json() : { data: [] },
          penghuniRes.ok ? penghuniRes.json() : { data: [] },
          paymentRes.ok ? paymentRes.json() : { data: [] }
        ]);

        // Consider onboarding complete if user has at least kamar and penghuni OR payment info
        const hasKamar = kamarData.data && kamarData.data.length > 0;
        const hasPenghuni = penghuniData.data && penghuniData.data.length > 0;
        const hasPayment = paymentData.data && paymentData.data.length > 0;

        setIsCompleted((hasKamar && hasPenghuni) || hasPayment);
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      }
    };

    checkOnboardingStatus();
  }, [selectedKosId]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    setIsCompleted(true);
  };

  // Don't show if no kos selected or if already completed
  if (!selectedKosId || isCompleted) {
    return null;
  }

  return (
    <>
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Lengkapi Setup Kos Anda</h3>
              <p className="text-sm text-gray-600">Tambahkan kamar, penghuni, dan informasi pembayaran untuk memulai</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsCompleted(true)}
              className="text-gray-600 hover:text-gray-800 text-sm px-3 py-1 rounded transition-colors"
            >
              Nanti
            </button>
            <button
              onClick={() => setShowOnboarding(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Mulai Setup
            </button>
          </div>
        </div>
      </div>

      {/* Onboarding Flow */}
      <OnboardingFlow
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={handleOnboardingComplete}
        selectedKosId={selectedKosId}
      />
    </>
  );
}