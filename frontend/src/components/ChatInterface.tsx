'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Send, BookOpen, Bot, User, Loader2, Sparkles, Files, ChevronDown, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ConversationList } from '@/components/ConversationList';
import { DocumentPicker } from '@/components/DocumentPicker';
import {
  ChatMessage,
  Citation,
  Conversation,
  createConversation,
  deleteConversation,
  getErrorMessage,
  getMessages,
  isNoResponse,
  listConversations,
  sendChat,
  updateConversation,
} from '@/lib/api';
import { useApp } from '@/lib/app-context';
import { NEW_CHAT_KEY } from '@/lib/doc-utils';
import { cn } from '@/lib/utils';

const ACTIVE_CONV_KEY = 'bizsop:active-conversation';
const DEFAULT_TITLE = 'Chat Baru';

const SUGGESTIONS = [
  'Ringkas isi dokumen yang dipilih.',
  'Apa saja langkah-langkah prosedurnya dan siapa penanggung jawabnya?',
  'Dokumen atau persyaratan apa yang perlu disiapkan?',
];

// Merapikan markdown dari AI: bullet yang langsung mengikuti baris bernomor dijadikan
// sub-poin (diindentasi), supaya list bernomor tidak terpecah dan nomornya berlanjut.
function normalizeMarkdown(text: string) {
  const out: string[] = [];
  let inNumbered = false;
  for (const line of text.split('\n')) {
    if (/^\d+\.\s/.test(line)) {
      inNumbered = true;
      out.push(line);
    } else if (inNumbered && /^[-*•]\s/.test(line)) {
      out.push('    ' + line);
    } else {
      if (line.trim() !== '') inNumbered = false; // baris kosong tidak memutus konteks
      out.push(line);
    }
  }
  return out.join('\n');
}

// Kelompokkan kutipan per dokumen. Kunci memakai document_id (nama file bisa kembar);
// pesan lama tanpa document_id jatuh ke nama dokumen.
type CiteItem = { idx: number; cite: Citation; n: number };
function groupCitations(cits: Citation[]): [string, string, CiteItem[]][] {
  const map = new Map<string, { name: string; items: CiteItem[] }>();
  cits.forEach((c, i) => {
    const name = c.document_name ?? 'SOP';
    const key = c.document_id ?? name;
    const entry = map.get(key) ?? { name, items: [] };
    entry.items.push({ idx: i, cite: c, n: c.ref ?? i + 1 });
    map.set(key, entry);
  });
  return Array.from(map.entries()).map(([key, v]) => [key, v.name, v.items]);
}

export function ChatInterface() {
  const { documents, activeDoc } = useApp();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null); // null = chat baru (draft)
  const [draftScope, setDraftScope] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [openCite, setOpenCite] = useState<{ msg: string; idx: number } | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [scopeError, setScopeError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const justCreated = useRef<string | null>(null);
  const initialized = useRef(false);
  const scopeTouched = useRef(false); // true bila user sudah memilih dokumen sendiri pada draft

  const activeConv = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId]
  );
  const isDraft = !activeConv;
  const scope = activeConv ? activeConv.document_ids : draftScope;
  // Setelah percakapan berjalan, dokumen yang sudah dipakai tidak boleh dilepas
  const locked = !!activeConv && (messages.length > 0 || loadingMsgs);
  const pickerVisible = isDraft || pickerOpen;
  const noDocuments = documents.length === 0;

  const last = messages[messages.length - 1];
  const interrupted = !sending && !loadingMsgs && last?.role === 'user';

  // Muat daftar percakapan sekali (guard ref agar aman di React StrictMode)
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    (async () => {
      try {
        const list = await listConversations();
        setConversations(list);

        // Datang dari tombol "Tanya AI" di kartu dokumen: mulai chat baru untuk dokumen itu
        const intent = localStorage.getItem(NEW_CHAT_KEY);
        if (intent) {
          localStorage.removeItem(NEW_CHAT_KEY);
          scopeTouched.current = true;
          setActiveId(null);
          setDraftScope([intent]);
        } else {
          const stored = localStorage.getItem(ACTIVE_CONV_KEY);
          setActiveId(list.find((c) => c.id === stored)?.id ?? list[0]?.id ?? null);
        }
      } catch (err) {
        setListError(getErrorMessage(err, 'Gagal memuat percakapan.'));
      } finally {
        setLoadingList(false);
      }
    })();
  }, []);

  // Draft yang belum diubah user mengikuti dokumen aktif (default yang masuk akal)
  useEffect(() => {
    if (activeId || scopeTouched.current) return;
    setDraftScope(activeDoc ? [activeDoc.id] : []);
  }, [activeId, activeDoc]);

  // Muat pesan tiap kali percakapan aktif berganti
  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    if (justCreated.current === activeId) {
      justCreated.current = null; // baru dibuat, pesan diisi manual oleh send()
      return;
    }
    let cancelled = false;
    setLoadingMsgs(true);
    getMessages(activeId)
      .then((m) => !cancelled && setMessages(m))
      .catch(() => !cancelled && setMessages([]))
      .finally(() => !cancelled && setLoadingMsgs(false));
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, sending]);

  const reloadMessages = async () => {
    if (!activeId) return;
    setLoadingMsgs(true);
    try {
      setMessages(await getMessages(activeId));
    } catch {
      // biarkan pesan yang sudah tampil
    } finally {
      setLoadingMsgs(false);
    }
  };

  const selectConv = (id: string) => {
    setActiveId(id);
    localStorage.setItem(ACTIVE_CONV_KEY, id);
    setPickerOpen(false);
    setOpenCite(null);
    setScopeError(null);
  };

  const newChat = () => {
    scopeTouched.current = false;
    setActiveId(null);
    setDraftScope(activeDoc ? [activeDoc.id] : []);
    localStorage.removeItem(ACTIVE_CONV_KEY);
    setPickerOpen(false);
    setOpenCite(null);
    setScopeError(null);
  };

  const removeConv = async (id: string) => {
    if (!window.confirm('Hapus percakapan ini beserta seluruh pesannya?')) return;
    try {
      await deleteConversation(id);
      const rest = conversations.filter((c) => c.id !== id);
      setConversations(rest);
      if (id === activeId) {
        if (rest[0]) selectConv(rest[0].id);
        else newChat();
      }
    } catch (err) {
      alert(getErrorMessage(err, 'Gagal menghapus percakapan.'));
    }
  };

  const changeScope = async (next: string[]) => {
    setScopeError(null);
    if (!activeConv) {
      scopeTouched.current = true;
      setDraftScope(next);
      return;
    }
    const before = activeConv;
    setConversations((p) => p.map((c) => (c.id === before.id ? { ...c, document_ids: next } : c)));
    try {
      await updateConversation(before.id, { document_ids: next });
    } catch (err) {
      setConversations((p) => p.map((c) => (c.id === before.id ? before : c)));
      setScopeError(getErrorMessage(err, 'Gagal mengubah dokumen percakapan.'));
    }
  };

  const send = async (text: string, resend = false) => {
    const query = text.trim();
    if (!query || sending) return;
    setSending(true);
    if (!resend) setInput('');
    setScopeError(null);

    let delivered = resend; // pesan user sudah tampil/terkirim

    try {
      let convId = activeId;
      if (!convId) {
        const created = await createConversation(draftScope);
        convId = created.id;
        justCreated.current = created.id;
        setConversations((p) => [created, ...p]);
        setActiveId(created.id);
        setPickerOpen(false);
        localStorage.setItem(ACTIVE_CONV_KEY, created.id);
      }

      if (!resend) {
        setMessages((p) => [
          ...p,
          { id: `tmp-${Date.now()}`, role: 'user', content: query, citations: [] },
        ]);
        delivered = true;
      }

      const res = await sendChat(query, convId);
      setMessages((p) => [
        ...p,
        {
          id: res.message_id ?? `a-${Date.now()}`,
          role: 'assistant',
          content: res.answer || 'Tidak ada respons dari server.',
          citations: res.citations || [],
        },
      ]);

      // Judul otomatis, urutan terbaru, dan scope yang sudah dibersihkan server
      listConversations().then(setConversations).catch(() => {});
    } catch (err) {
      // Tidak ada respons (timeout/koneksi putus) padahal pesan sudah dikirim: server
      // kemungkinan masih memproses dan jawabannya tetap tersimpan, jadi biarkan banner
      // "Muat ulang" yang tampil, bukan pesan error.
      if (!(delivered && isNoResponse(err))) {
        setMessages((p) => [
          ...p,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: getErrorMessage(err, 'Maaf, terjadi kesalahan saat menghubungi server AI.'),
            citations: [],
            isError: true,
          },
        ]);
      }
    } finally {
      setSending(false);
    }
  };

  const scopeLabel =
    scope.length === 0
      ? 'Semua dokumen'
      : scope.length === 1
      ? documents.find((d) => d.id === scope[0])?.file_name ?? '1 dokumen'
      : `${scope.length} dokumen`;

  if (loadingList) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400 gap-2 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Memuat percakapan...
      </div>
    );
  }

  if (listError) {
    return <p className="text-sm text-red-600 py-12 text-center">{listError}</p>;
  }

  const inputBlocked = sending || (isDraft && noDocuments);

  return (
    <div className="grid grid-cols-1 grid-rows-[auto_1fr] md:grid-cols-[240px_1fr] md:grid-rows-1 gap-4 h-[calc(100dvh-9rem)] min-h-[520px]">
      <ConversationList
        conversations={conversations}
        activeId={activeId}
        onSelect={selectConv}
        onNew={newChat}
        onDelete={removeConv}
        disabled={sending}
      />

      <Card className="flex flex-col min-h-0 gap-0 py-0 overflow-hidden">
        {/* Header: judul + sumber dokumen */}
        <div className="flex items-center justify-between gap-3 border-b px-4 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <Bot className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="text-sm font-medium text-slate-900 truncate">
              {activeConv?.title ?? DEFAULT_TITLE}
            </span>
          </div>
          {isDraft ? (
            <span className="shrink-0 text-xs text-slate-500">Pilih dokumen, lalu ajukan pertanyaan</span>
          ) : (
            <button
              onClick={() => setPickerOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-full border bg-white px-3 py-1 text-xs text-slate-700 hover:border-indigo-300 max-w-[55%]"
            >
              <Files className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="truncate">{scopeLabel}</span>
              <ChevronDown className={cn('w-3.5 h-3.5 shrink-0 transition-transform', pickerOpen && 'rotate-180')} />
            </button>
          )}
        </div>

        {pickerVisible && (
          <DocumentPicker scope={scope} onChange={changeScope} disabled={sending} locked={locked} />
        )}

        {scopeError && (
          <p className="flex items-start gap-1.5 border-b bg-red-50 px-4 py-2 text-xs text-red-700">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {scopeError}
          </p>
        )}

        {/* Pesan */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loadingMsgs && messages.length === 0 && (
            <div className="flex justify-center py-8 text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          )}

          {!loadingMsgs && messages.length === 0 && (
            <div className="text-center py-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <p className="font-medium text-slate-900">Tanyakan apa saja seputar SOP</p>
                <p className="text-sm text-slate-500">
                  {noDocuments ? (
                    'Unggah PDF SOP lewat panel di atas untuk mulai bertanya.'
                  ) : (
                    <>
                      Sumber: <b>{scopeLabel}</b>. Setelah chat dimulai, dokumen tidak bisa dilepas, tapi bisa
                      ditambah.
                    </>
                  )}
                </p>
              </div>
              {!noDocuments && (
                <div className="flex flex-col items-center gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      disabled={sending}
                      className="text-sm rounded-full border bg-white px-4 py-1.5 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              {msg.role === 'assistant' && <Bot className="w-6 h-6 text-indigo-600 shrink-0 mt-1" />}

              <div
                className={cn(
                  'p-3 rounded-xl max-w-[85%]',
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : msg.isError
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-slate-100 text-slate-900'
                )}
              >
                {msg.role === 'assistant' ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      ol: ({ children }) => (
                        <ol className="list-decimal pl-5 my-2 space-y-1 text-sm">{children}</ol>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc pl-5 my-2 space-y-1 text-sm">{children}</ul>
                      ),
                      li: ({ children }) => <li className="pl-1 leading-relaxed">{children}</li>,
                      p: ({ children }) => (
                        <p className="mb-2 last:mb-0 text-sm leading-relaxed">{children}</p>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-bold text-slate-950">{children}</strong>
                      ),
                      // Penanda sumber [n] menjadi nomor kecil yang bisa diklik
                      a: ({ href, children }) => {
                        const m = href?.match(/^#cite-(\d+)$/);
                        if (m) {
                          const n = Number(m[1]);
                          const idx = msg.citations.findIndex((c, i) => (c.ref ?? i + 1) === n);
                          return (
                            <button
                              type="button"
                              onClick={() => idx >= 0 && setOpenCite({ msg: msg.id, idx })}
                              className="mx-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded bg-indigo-100 px-1 align-super text-[10px] font-semibold leading-none text-indigo-700 hover:bg-indigo-200"
                            >
                              {n}
                            </button>
                          );
                        }
                        return (
                          <a href={href} target="_blank" rel="noreferrer" className="text-indigo-600 underline">
                            {children}
                          </a>
                        );
                      },
                    }}
                  >
                    {(() => {
                      const md = normalizeMarkdown(msg.content);
                      return msg.citations.length > 0
                        ? md.replace(/\[(\d+)\]/g, '[$1](#cite-$1)')
                        : md;
                    })()}
                  </ReactMarkdown>
                ) : (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                )}

                {msg.citations.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-200 space-y-2">
                    <p className="text-xs font-medium text-slate-500">Sumber</p>

                    {groupCitations(msg.citations).map(([key, docName, items]) => (
                      <div key={key} className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-medium text-slate-700 break-all" title={docName}>
                          {docName}
                        </span>
                        {items.map(({ idx, cite, n }) => {
                          const open = openCite?.msg === msg.id && openCite.idx === idx;
                          return (
                            <Badge
                              key={idx}
                              variant="outline"
                              onClick={() => setOpenCite(open ? null : { msg: msg.id, idx })}
                              className={cn(
                                'cursor-pointer bg-white text-xs gap-1 hover:bg-indigo-50',
                                open ? 'border-indigo-500 text-indigo-700' : 'border-slate-300 text-slate-600'
                              )}
                            >
                              <BookOpen className="w-3 h-3" /> [{n}] Hal {cite.page_number}
                            </Badge>
                          );
                        })}
                      </div>
                    ))}

                    {openCite?.msg === msg.id && msg.citations[openCite.idx] && (
                      <div className="rounded-lg bg-white border p-3 space-y-1.5">
                        <p className="text-xs font-medium text-slate-700">
                          {msg.citations[openCite.idx].document_name} · Halaman{' '}
                          {msg.citations[openCite.idx].page_number}
                        </p>
                        <blockquote className="border-l-2 border-indigo-300 pl-3 text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                          {msg.citations[openCite.idx].source_text}
                        </blockquote>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {msg.role === 'user' && <User className="w-6 h-6 text-slate-500 shrink-0 mt-1" />}
            </div>
          ))}

          {sending && (
            <div className="flex gap-3 items-center text-slate-500 text-sm">
              <Bot className="w-6 h-6 text-indigo-600 animate-pulse" />
              <div className="flex items-center gap-2 bg-slate-100 p-3 rounded-xl">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                <span>AI sedang menganalisis SOP...</span>
              </div>
            </div>
          )}

          {interrupted && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <span>Jawaban belum diterima. Mungkin masih diproses atau permintaan terputus.</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={reloadMessages}>
                  Muat ulang
                </Button>
                <Button size="sm" variant="outline" onClick={() => send(last.content, true)}>
                  Kirim ulang
                </Button>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2 p-3 border-t">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isDraft && noDocuments
                ? 'Unggah PDF dulu lewat panel di atas'
                : 'Contoh: Bandingkan prosedur cuti dan reimbursement'
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) send(input);
            }}
            disabled={inputBlocked}
          />
          <Button onClick={() => send(input)} disabled={inputBlocked || !input.trim()}>
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </Card>
    </div>
  );
}