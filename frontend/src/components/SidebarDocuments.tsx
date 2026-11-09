'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  GitFork,
  Loader2,
  MessageSquare,
  SearchX,
  Trash2,
} from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { DocumentSearch } from '@/components/DocumentSearch';
import { useApp } from '@/lib/app-context';
import { NEW_CHAT_KEY, filterDocuments, isDocFailed, isDocReady } from '@/lib/doc-utils';
import { deleteDocument, getErrorMessage } from '@/lib/api'; // Pastikan path ini sesuai dengan file api.ts Anda
import { cn } from '@/lib/utils';

const MySwal = withReactContent(Swal);
const OPEN_KEY = 'bizsop:sidebar-docs-open';
const RECENT_LIMIT = 5; // jumlah dokumen terbaru saat tidak mencari
const SEARCH_LIMIT = 30; // batas hasil pencarian di sidebar

// Kartu dokumen aktif: ringkas, satu baris nama + tombol ikon pintasan + tombol hapus
export function ActiveDocumentCard() {
  const { activeDoc, refresh } = useApp();
  const pathname = usePathname();
  const router = useRouter();

  if (!activeDoc) return null;

  const ready = isDocReady(activeDoc);
  const failed = isDocFailed(activeDoc);
  const processing = activeDoc.status === 'processing';

  const open = (path: string) => {
    if (path === '/chat') localStorage.setItem(NEW_CHAT_KEY, activeDoc.id);
    router.push(path);
  };

  const iconBtn =
    'flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-indigo-200 bg-white text-indigo-600 transition-colors hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white';

  return (
    <div className="mx-2 mb-2 shrink-0 rounded-lg border border-indigo-200 bg-indigo-50/60 px-3 py-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-500">Dokumen aktif</p>
        
      </div>

      <div className="mt-1 flex items-center gap-2">
        <FileText className="h-4 w-4 shrink-0 text-indigo-600" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900" title={activeDoc.file_name}>
          {activeDoc.file_name}
        </span>
        {pathname !== '/chat' && (
          <button
            type="button"
            className={iconBtn}
            disabled={!ready}
            title={ready ? 'Tanya AI dengan dokumen ini' : 'Dokumen belum siap untuk ditanya'}
            onClick={() => open('/chat')}
          >
            <MessageSquare className="h-3.5 w-3.5" />
          </button>
        )}
        {pathname !== '/flowchart' && (
          <button
            type="button"
            className={iconBtn}
            disabled={failed}
            title={failed ? 'Dokumen gagal diindeks' : 'Buka Flowchart dokumen ini'}
            onClick={() => open('/flowchart')}
          >
            <GitFork className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {processing && (
        <p className="mt-1 flex items-center gap-1 text-[11px] text-amber-700">
          <Loader2 className="h-3 w-3 animate-spin" /> Sedang diindeks, chat aktif setelah selesai
        </p>
      )}
      {failed && (
        <p className="mt-1 flex items-center gap-1 text-[11px] text-red-600">
          <AlertCircle className="h-3 w-3 shrink-0" /> Gagal diindeks. Hapus lalu unggah ulang.
        </p>
      )}
    </div>
  );
}

// Bagian "Dokumen SOP" di sidebar: bisa di-collapse, punya search, scroll, dan tombol hapus pada tiap item
export function SidebarDocuments() {
  const { documents, activeDoc, setActiveId, refresh, loading } = useApp();
  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState('');

  // Ingat status buka/tutup
  useEffect(() => {
    if (localStorage.getItem(OPEN_KEY) === '0') setOpen(false);
  }, []);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    localStorage.setItem(OPEN_KEY, next ? '1' : '0');
  };

  const removeDoc = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Mencegah agar baris dokumen tidak ikut terpilih saat tombol hapus diklik

    const result = await MySwal.fire({
      title: 'Hapus Dokumen?',
      text: `Apakah Anda yakin ingin menghapus "${name}" beserta seluruh potongan teksnya?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, hapus!',
      cancelButtonText: 'Batal',
      customClass: {
        popup: 'rounded-xl',
        confirmButton: 'px-4 py-2 text-sm font-medium rounded-lg',
        cancelButton: 'px-4 py-2 text-sm font-medium rounded-lg',
      },
    });

    if (!result.isConfirmed) return;

    try {
      await deleteDocument(id);
      await refresh();

      MySwal.fire({
        title: 'Berhasil!',
        text: `Dokumen "${name}" telah dihapus.`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err) {
      MySwal.fire({
        title: 'Gagal Hapus',
        text: getErrorMessage(err, 'Gagal menghapus dokumen.'),
        icon: 'error',
        confirmButtonColor: '#6366f1',
      });
    }
  };

  const searching = query.trim() !== '';
  const matches = useMemo(() => filterDocuments(documents, query), [documents, query]);
  const shown = searching ? matches.slice(0, SEARCH_LIMIT) : documents.slice(0, RECENT_LIMIT);
  const hidden = (searching ? matches.length : documents.length) - shown.length;

  const showSearch = documents.length > RECENT_LIMIT || searching;

  return (
    <div className={cn('flex min-h-0 flex-col border-t', open && 'flex-1')}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex shrink-0 items-center gap-1.5 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400 hover:text-slate-600"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        Dokumen SOP
        <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium normal-case text-slate-500">
          {documents.length}
        </span>
      </button>

      {open && (
        <>
          {showSearch && (
            <div className="shrink-0 px-2 pb-2">
              <DocumentSearch value={query} onChange={setQuery} />
            </div>
          )}

          <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
            {loading && documents.length === 0 && (
              <p className="px-2 text-xs text-slate-400">Memuat dokumen...</p>
            )}

            {!loading && documents.length === 0 && (
              <p className="px-2 text-xs text-slate-400">
                Belum ada dokumen.{' '}
                <Link href="/" className="text-indigo-600 hover:underline">
                  Unggah SOP
                </Link>
              </p>
            )}

            {searching && matches.length === 0 && (
              <div className="flex flex-col items-center gap-1 px-2 py-6 text-center text-xs text-slate-400">
                <SearchX className="h-5 w-5" />
                Tidak ada dokumen yang cocok dengan &quot;{query}&quot;.
              </div>
            )}

            {shown.map((doc) => {
              const active = doc.id === activeDoc?.id;
              const processing = doc.status === 'processing';
              const failed = isDocFailed(doc);
              return (
                <div
                  key={doc.id}
                  onClick={() => setActiveId(doc.id)}
                  title={`${doc.file_name} — ${new Date(doc.created_at).toLocaleString('id-ID')}${
                    failed && doc.error_message ? `\n${doc.error_message}` : ''
                  }`}
                  className={cn(
                    'group flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors cursor-pointer',
                    active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-100'
                  )}
                >
                  {processing ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-amber-600" />
                  ) : failed ? (
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                  ) : (
                    <FileText className={cn('h-4 w-4 shrink-0', active ? 'text-indigo-600' : 'text-slate-400')} />
                  )}
                  
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] leading-tight">{doc.file_name}</span>
                    <span
                      className={cn(
                        'block text-[10px] leading-tight',
                        processing ? 'text-amber-600' : failed ? 'text-red-500' : 'text-slate-400'
                      )}
                    >
                      {processing
                        ? 'Mengindeks...'
                        : failed
                        ? 'Gagal diindeks'
                        : new Date(doc.created_at).toLocaleDateString('id-ID')}
                    </span>
                  </span>

                  <div className="flex items-center gap-1">
                    {active && <Check className="h-4 w-4 shrink-0 text-indigo-600" />}
                    
                    {/* Tombol Hapus (Muncul saat di-hover pada baris dokumen) */}
                    <button
                      type="button"
                      onClick={(e) => removeDoc(doc.id, doc.file_name, e)}
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 hover:bg-red-100 text-slate-400 hover:text-red-600 rounded transition-all"
                      title="Hapus SOP"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </button>
                  </div>
                </div>
              );
            })}

            {hidden > 0 && (
              <Link
                href="/"
                className="block rounded-lg px-3 py-2 text-center text-xs font-medium text-indigo-600 hover:bg-indigo-50"
              >
                {searching
                  ? `+${hidden} hasil lainnya, lihat di halaman Dokumen`
                  : `Lihat semua (${documents.length})`}
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  );
}