'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DocumentItem, getErrorMessage, listDocuments } from '@/lib/api';

const ACTIVE_KEY = 'current_document_id';

interface AppState {
  documents: DocumentItem[];
  activeDoc: DocumentItem | null; // dipakai halaman Flowchart
  loading: boolean;
  error: string | null;
  setActiveId: (id: string) => void;
  refresh: (selectId?: string) => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [activeId, setActiveIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setActiveId = useCallback((id: string) => {
    setActiveIdState(id);
    localStorage.setItem(ACTIVE_KEY, id);
  }, []);

  const refresh = useCallback(async (selectId?: string) => {
    try {
      const docs = await listDocuments();
      setDocuments(docs);
      setError(null);
      const stored = localStorage.getItem(ACTIVE_KEY);
      const next =
        (selectId && docs.find((d) => d.id === selectId)?.id) ||
        (stored && docs.find((d) => d.id === stored)?.id) ||
        docs[0]?.id ||
        null;
      setActiveIdState(next);
      if (next) localStorage.setItem(ACTIVE_KEY, next);
      else localStorage.removeItem(ACTIVE_KEY);
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal memuat daftar dokumen.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const activeDoc = useMemo(
    () => documents.find((d) => d.id === activeId) ?? null,
    [documents, activeId]
  );

  return (
    <AppContext.Provider value={{ documents, activeDoc, loading, error, setActiveId, refresh }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp harus dipakai di dalam <AppProvider>');
  return ctx;
}