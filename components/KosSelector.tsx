"use client";

import { useState, useEffect } from "react";
import { Kos } from "@/types";

interface KosSelectorProps {
  selectedKosId: string | null;
  onKosChange: (kosId: string) => void;
}

export default function KosSelector({ selectedKosId, onKosChange }: KosSelectorProps) {
  const [kosList, setKosList] = useState<Kos[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchKosList();
  }, []);

  const fetchKosList = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/kos?limit=50');
      
      if (!response.ok) {
        // If it's a 401, user is not authenticated - don't show error
        if (response.status === 401) {
          setError('Please log in to access your kos data');
          return;
        }
        throw new Error('Failed to fetch kos list');
      }
      
      const result = await response.json();
      setKosList(result.data);
      
      // If no kos is selected and we have kos available, select the first one
      if (!selectedKosId && result.data.length > 0) {
        onKosChange(result.data[0].id);
      } else if (result.data.length === 0) {
        // No kos available, set to empty string to indicate no kos
        onKosChange('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch kos list');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
        <span className="text-sm text-gray-600">Loading kos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-2">
        <span className="text-sm text-red-600">Error: {error}</span>
      </div>
    );
  }

  if (kosList.length === 0) {
    return (
      <div className="px-4 py-2">
        <div className="text-sm text-gray-600 mb-2">No kos available</div>
        <button 
          onClick={() => window.location.href = '/dashboard/kos'}
          className="text-xs text-primary hover:underline"
        >
          Create your first kos
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 py-2 border-b border-gray-200">
      <label htmlFor="kos-selector" className="block text-xs font-medium text-gray-700 mb-1">
        Select Kos Building
      </label>
      <select
        id="kos-selector"
        value={selectedKosId || ''}
        onChange={(e) => onKosChange(e.target.value)}
        className="w-full text-sm border border-gray-300 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
      >
        <option value="" disabled>Choose a kos...</option>
        {kosList.map((kos) => (
          <option key={kos.id} value={kos.id}>
            {kos.nama_kos}
          </option>
        ))}
      </select>
    </div>
  );
}