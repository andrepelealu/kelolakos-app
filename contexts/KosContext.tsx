"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface KosContextType {
  selectedKosId: string | null;
  setSelectedKosId: (kosId: string | null) => void;
}

const KosContext = createContext<KosContextType | undefined>(undefined);

export function KosProvider({ children }: { children: ReactNode }) {
  const [selectedKosId, setSelectedKosId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load selected kos from localStorage on mount
  useEffect(() => {
    const savedKosId = localStorage.getItem('selectedKosId');
    if (savedKosId) {
      setSelectedKosId(savedKosId);
    }
    setIsLoaded(true);
  }, []);

  // Save selected kos to localStorage when it changes
  useEffect(() => {
    if (isLoaded) {
      if (selectedKosId) {
        localStorage.setItem('selectedKosId', selectedKosId);
      } else {
        localStorage.removeItem('selectedKosId');
      }
    }
  }, [selectedKosId, isLoaded]);

  return (
    <KosContext.Provider value={{ selectedKosId, setSelectedKosId }}>
      {children}
    </KosContext.Provider>
  );
}

export function useKos() {
  const context = useContext(KosContext);
  if (context === undefined) {
    throw new Error('useKos must be used within a KosProvider');
  }
  return context;
}