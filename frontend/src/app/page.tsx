'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, MessageSquare, GitFork, Loader2, AlertCircle, Trash2, SearchX } from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { PdfUploader } from '@/components/PdfUploader';
import { DocumentSearch } from '@/components/DocumentSearch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useApp } from '@/lib/app-context';
import { deleteDocument, getErrorMessage } from '@/lib/api';
import { NEW_CHAT_KEY, clearDocumentCaches, filterDocuments, isDocFailed, isDocReady } from '@/lib/doc-utils';
import { cn } from '@/lib/utils';

const MySwal = withReactContent(Swal);
const PAGE_SIZE = 15;

export default function DocumentsPage() {
  const router = useRouter();
  const { documents, activeDoc, setActiveId, loading, error, refresh } = useApp();
  const [query, setQuery] = useState('');
  const [visible, setVisible] = useState(PAGE_SIZE);

  const searching = query.trim() !== '';
  const filtered = useMemo(() => filterDocuments(documents, query), [documents, query]);
  const shown = filtered.slice(0, visible);
  const remaining = filtered.length - shown.length;

  const onSearch = (value: string) => {
    setQuery(value);
    setVisible(PAGE_SIZE);
  };

  const go = (id: string, path: string) => {
    setActiveId(id);
    // Tombol "Tanya AI" membuka chat baru yang langsung terfokus ke dokumen ini
    if (path === '/chat') localStorage.setItem(NEW_CHAT_KEY, id);
    router.push(path);
  };

  const remove = async (id: string, name: string) => {
    // 1. Dialog Konfirmasi Hapus
    const result = await MySwal.fire({
      title: 'Hapus Dokumen?',
      text: `Apakah Anda yakin ingin menghapus "${name}" beserta seluruh potongan teksnya?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444', // warna merah khas Tailwind (red-500)
      cancelButtonColor: '#64748b', // warna slate (slate-500)
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
      clearDocumentCaches(id); // buang cache flowchart & progres checklist dokumen ini
      await refresh();

      // 2. Alert Sukses
      MySwal.fire({
        title: 'Berhasil!',
        text: `Dokumen "${name}" telah dihapus.`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err) {
      // 3. Alert Gagal
      MySwal.fire({
        title: 'Gagal Hapus',
        text: getErrorMessage(err, 'Gagal menghapus dokumen.'),
        icon: 'error',
        confirmButtonColor: '#6366f1',
      });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <PdfUploader />
        <Card>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <p className="font-medium text-slate-900">Cara kerja</p>
            <p>1. Unggah PDF SOP (bisa dari halaman mana saja), lalu sistem mengindeksnya.</p>
            <p>2. Tanyakan prosedur lewat chat dan dapatkan jawaban dengan rujukan halaman.</p>
            <p>3. Ubah SOP menjadi flowchart interaktif dan checklist tugas.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="lg:col-span-3 self-start">
        <CardHeader>
          <div className="space-y-3">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" /> Daftar Dokumen
              <span className="text-xs font-normal text-slate-400">
                ({searching ? `${filtered.length} dari ${documents.length}` : documents.length})
              </span>
            </CardTitle>
            {documents.length > 0 && <DocumentSearch value={query} onChange={onSearch} />}
          </div>
        </CardHeader>

        <CardContent className="space-y-2">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-slate-400 py-6 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Memuat...
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 flex items-start gap-2 py-4">
              <AlertCircle className="w-4 h-4 mt-0.5" />
              <span>
                {error}{' '}
                <button className="underline" onClick={() => refresh()}>
                  Coba lagi
                </button>
              </span>
            </div>
          )}

          {!loading && !error && documents.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                <FileText className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-slate-900">Belum ada dokumen SOP</p>
              <p className="text-sm text-slate-500">
                Unggah PDF pertamamu di panel unggah, lalu dokumen akan muncul di sini.
              </p>
            </div>
          )}

          {documents.length > 0 && (
            <div className="max-h-[60dvh] space-y-2 overflow-y-auto pr-1">
              {searching && filtered.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <SearchX className="h-6 w-6 text-slate-400" />
                  <p className="text-sm text-slate-500">
                    Tidak ada dokumen yang cocok dengan &quot;{query}&quot;.
                  </p>
                  <Button size="sm" variant="outline" onClick={() => onSearch('')}>
                    Hapus pencarian
                  </Button>
                </div>
              )}

              {shown.map((doc) => {
                const active = doc.id === activeDoc?.id;
                const ready = isDocReady(doc);
                const failed = isDocFailed(doc);
                const processing = doc.status === 'processing';
                return (
                  <div
                    key={doc.id}
                    className={cn(
                      'flex flex-wrap items-center gap-3 rounded-lg border p-3 transition-colors',
                      failed
                        ? 'border-red-200 bg-red-50/40'
                        : active
                        ? 'border-indigo-300 bg-indigo-50/50'
                        : 'bg-white hover:border-slate-300'
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveId(doc.id)}
                      title="Jadikan dokumen aktif"
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <FileText className={cn('w-5 h-5 shrink-0', failed ? 'text-red-400' : 'text-slate-400')} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-900">
                          {doc.file_name}
                        </span>
                        <span className="block text-xs text-slate-400">
                          Diunggah {new Date(doc.created_at).toLocaleString('id-ID')}
                        </span>
                        {failed && (
                          <span className="mt-0.5 block text-xs text-red-600">
                            {doc.error_message || 'Pengindeksan gagal.'} Hapus lalu unggah ulang.
                          </span>
                        )}
                      </span>
                    </button>

                    {processing && (
                      <Badge className="gap-1 bg-amber-100 text-amber-700 hover:bg-amber-100">
                        <Loader2 className="h-3 w-3 animate-spin" /> Mengindeks
                      </Badge>
                    )}
                    {failed && <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Gagal</Badge>}
                    {active && ready && <Badge className="bg-indigo-600">Aktif</Badge>}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!ready}
                        title={ready ? undefined : 'Dokumen belum siap untuk ditanya'}
                        onClick={() => go(doc.id, '/chat')}
                      >
                        <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Tanya AI
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={failed}
                        title={failed ? 'Dokumen gagal diindeks' : undefined}
                        onClick={() => go(doc.id, '/flowchart')}
                      >
                        <GitFork className="w-3.5 h-3.5 mr-1.5" /> Flowchart
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => remove(doc.id, doc.file_name)}
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </Button>
                    </div>
                  </div>
                );
              })}

              {remaining > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setVisible((v) => v + PAGE_SIZE)}
                >
                  Tampilkan {Math.min(PAGE_SIZE, remaining)} lagi (sisa {remaining})
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}