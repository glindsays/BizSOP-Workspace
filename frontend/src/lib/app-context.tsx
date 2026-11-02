'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ChatMessage, DocumentItem, getErrorMessage, listDocuments, sendChat } from '@/lib/api';

const ACTIVE_KEY = 'current_document_id';
const CHATS_KEY = 'bizsop:chats';

interface AppState {
  documents: DocumentItem[];
  activeDoc: DocumentItem | null;
  loading: boolean;
  error: string | null;
  setActiveId: (id: string) => void;
  refresh: (selectId?: string) => Promise<void>;
  chats: Record<string, ChatMessage[]>;
  setChat: (docId: string, updater: (prev: ChatMessage[]) => ChatMessage[]) => void;
  pending: Record<string, boolean>;
  sendMessage: (docId: string, text: string) => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [activeId, setActiveIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chats, setChats] = useState<Record<string, ChatMessage[]>>({});
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [chatsLoaded, setChatsLoaded] = useState(false);

  // 1. Deklarasikan setChat terlebih dahulu
  const setChat = useCallback(
    (docId: string, updater: (prev: ChatMessage[]) => ChatMessage[]) => {
      setChats((prev) => ({ ...prev, [docId]: updater(prev[docId] ?? []) }));
    },
    []
  );

  // 2. Deklarasikan sendMessage setelah setChat siap
  const sendMessage = useCallback(
    async (docId: string, text: string) => {
      const query = text.trim();
      if (!query) return;

      setChat(docId, (p) => [...p, { role: 'user', content: query }]);
      setPending((p) => ({ ...p, [docId]: true }));

      try {
        const res = await sendChat(query, docId);
        setChat(docId, (p) => [
          ...p,
          {
            role: 'assistant',
            content: res.answer || 'Tidak ada respons dari server.',
            citations: res.citations || [],
          },
        ]);
      } catch (err) {
        setChat(docId, (p) => [
          ...p,
          {
            role: 'assistant',
            content: getErrorMessage(err, 'Maaf, terjadi kesalahan saat menghubungi server AI.'),
            isError: true,
          },
        ]);
      } finally {
        setPending((p) => ({ ...p, [docId]: false }));
      }
    },
    [setChat]
  );

  // Muat riwayat chat saat pertama kali dibuka
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CHATS_KEY);
      if (raw) setChats(JSON.parse(raw));
    } catch {
      // data rusak: abaikan
    }
    setChatsLoaded(true);
  }, []);

  // Simpan setiap kali chat berubah (setelah proses muat selesai)
  useEffect(() => {
    if (!chatsLoaded) return;
    try {
      localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
    } catch {
      // penyimpanan penuh: abaikan
    }
  }, [chats, chatsLoaded]);

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
    // 3. Masukkan pending dan sendMessage ke Provider
    <AppContext.Provider
      value={{
        documents,
        activeDoc,
        loading,
        error,
        setActiveId,
        refresh,
        chats,
        setChat,
        pending,
        sendMessage,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp harus dipakai di dalam <AppProvider>');
  return ctx;
}