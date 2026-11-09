'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { DocumentItem, getErrorMessage, listDocuments } from '@/lib/api';

const ACTIVE_KEY = 'current_document_id';
const POLL_INTERVAL_MS = 4000;
const POLL_MAX_AGE_MS = 15 * 60 * 1000;

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
  const activeIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

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

  // Refresh diam-diam (polling): memperbarui daftar tanpa mengganti dokumen aktif
  const refreshQuietly = useCallback(async () => {
    try {
      const docs = await listDocuments();
      setDocuments(docs);
      const current = activeIdRef.current;
      if (current && !docs.some((d) => d.id === current)) {
        const next = docs[0]?.id ?? null;
        setActiveIdState(next);
        if (next) localStorage.setItem(ACTIVE_KEY, next);
        else localStorage.removeItem(ACTIVE_KEY);
      }
    } catch {
      // gangguan sesaat saat polling: abaikan, coba lagi di putaran berikutnya
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Polling selama ada dokumen yang masih diindeks
  const hasProcessing = useMemo(
    () =>
      documents.some(
        (d) =>
          d.status === 'processing' &&
          Date.now() - new Date(d.created_at).getTime() < POLL_MAX_AGE_MS
      ),
    [documents]
  );

  useEffect(() => {
    if (!hasProcessing) return;
    const timer = setInterval(refreshQuietly, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [hasProcessing, refreshQuietly]);

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