"use client";

import { useEffect, useState } from "react";
import { useKos } from "@/contexts/KosContext";
import apiClient from "@/libs/api";
import { PaymentGatewaySettings } from "@/types/payment-gateway";

export default function PaymentGatewayPage() {
  const { selectedKosId } = useKos();
  const [settings, setSettings] = useState<PaymentGatewaySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKeys, setShowKeys] = useState(false);

  const [formData, setFormData] = useState({
    is_active: false,
    server_key: "",
    client_key: "",
    merchant_id: "",
    is_production: false,
    auto_expire_duration: 1440, // 24 hours
    payment_methods: ["credit_card", "bank_transfer", "e_wallet"]
  });

  useEffect(() => {
    if (selectedKosId) {
      fetchSettings();
    } else {
      setLoading(false);
    }
  }, [selectedKosId]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/payment-gateway/settings?kos_id=${selectedKosId}`);
      
      if (response.data) {
        setSettings(response.data);
        setFormData({
          is_active: response.data.is_active,
          server_key: response.data.server_key || "",
          client_key: response.data.client_key || "",
          merchant_id: response.data.merchant_id || "",
          is_production: response.data.is_production,
          auto_expire_duration: response.data.auto_expire_duration,
          payment_methods: response.data.payment_methods || ["credit_card", "bank_transfer", "e_wallet"]
        });
      }
    } catch (error) {
      console.error("Error fetching payment gateway settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      if (settings) {
        // Update existing settings
        await apiClient.put(`/payment-gateway/settings/${settings.id}`, formData);
      } else {
        // Create new settings
        await apiClient.post("/payment-gateway/settings", {
          ...formData,
          kos_id: selectedKosId,
          provider: "midtrans"
        });
      }
      
      await fetchSettings();
      alert("Pengaturan payment gateway berhasil disimpan!");
    } catch (error) {
      console.error("Error saving payment gateway settings:", error);
      alert("Gagal menyimpan pengaturan payment gateway!");
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePaymentMethodChange = (method: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      payment_methods: checked 
        ? [...prev.payment_methods, method]
        : prev.payment_methods.filter(m => m !== method)
    }));
  };

  // Render different content based on state, but never return early
  let content;

  if (!selectedKosId) {
    content = (
      <div className="text-center py-12">
        <p className="text-gray-500">Pilih kos terlebih dahulu untuk mengatur payment gateway</p>
      </div>
    );
  } else if (loading) {
    content = (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  } else {
    content = (
      <>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Gateway</h1>
          <p className="text-gray-600">Atur integrasi dengan payment gateway untuk pembayaran online</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Konfigurasi Midtrans</h2>
            
            {/* Active Status */}
            <div className="mb-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => handleInputChange("is_active", e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  Aktifkan Payment Gateway
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Jika diaktifkan, invoice akan menyertakan link pembayaran online
              </p>
            </div>

            {/* Environment */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Environment
              </label>
              <div className="space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="environment"
                    checked={!formData.is_production}
                    onChange={() => handleInputChange("is_production", false)}
                    className="form-radio text-primary"
                  />
                  <span className="ml-2 text-sm text-gray-700">Sandbox (Testing)</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="environment"
                    checked={formData.is_production}
                    onChange={() => handleInputChange("is_production", true)}
                    className="form-radio text-primary"
                  />
                  <span className="ml-2 text-sm text-gray-700">Production</span>
                </label>
              </div>
            </div>

            {/* API Keys */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Server Key *
                </label>
                <div className="relative">
                  <input
                    type={showKeys ? "text" : "password"}
                    value={formData.server_key}
                    onChange={(e) => handleInputChange("server_key", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="SB-Mid-server-..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Key *
                </label>
                <div className="relative">
                  <input
                    type={showKeys ? "text" : "password"}
                    value={formData.client_key}
                    onChange={(e) => handleInputChange("client_key", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="SB-Mid-client-..."
                  />
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showKeys}
                  onChange={(e) => setShowKeys(e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="ml-2 text-sm text-gray-700">Tampilkan API Keys</span>
              </label>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Merchant ID
              </label>
              <input
                type="text"
                value={formData.merchant_id}
                onChange={(e) => handleInputChange("merchant_id", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Merchant ID dari dashboard Midtrans"
              />
            </div>

            {/* Payment Methods */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Metode Pembayaran
              </label>
              <div className="space-y-2">
                {[
                  { id: "credit_card", label: "Kartu Kredit/Debit" },
                  { id: "bank_transfer", label: "Transfer Bank" },
                  { id: "e_wallet", label: "E-Wallet (GoPay, OVO, DANA)" },
                  { id: "cstore", label: "Convenience Store" },
                  { id: "cardless_credit", label: "Cardless Credit" }
                ].map((method) => (
                  <label key={method.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.payment_methods.includes(method.id)}
                      onChange={(e) => handlePaymentMethodChange(method.id, e.target.checked)}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="ml-2 text-sm text-gray-700">{method.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Expiry Duration */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Durasi Kedaluwarsa Pembayaran (menit)
              </label>
              <input
                type="number"
                value={formData.auto_expire_duration}
                onChange={(e) => handleInputChange("auto_expire_duration", parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="1440"
                min="60"
                max="10080"
              />
              <p className="text-xs text-gray-500 mt-1">
                Durasi dalam menit (60 = 1 jam, 1440 = 24 jam, 10080 = 7 hari)
              </p>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Simpan Pengaturan"}
            </button>
          </div>
        </div>

        {/* Information Panel */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Informasi Integrasi</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p>• Daftarkan akun di <a href="https://midtrans.com" target="_blank" rel="noopener noreferrer" className="underline">midtrans.com</a></p>
            <p>• Dapatkan Server Key dan Client Key dari dashboard Midtrans</p>
            <p>• Gunakan Sandbox untuk testing, Production untuk live</p>
            <p>• Notification URL: <code className="bg-blue-100 px-1 rounded">{typeof window !== 'undefined' ? window.location.origin : ''}/api/payment-gateway/midtrans/callback</code></p>
            <p>• Return URL: <code className="bg-blue-100 px-1 rounded">{typeof window !== 'undefined' ? window.location.origin : ''}/payment/success</code></p>
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