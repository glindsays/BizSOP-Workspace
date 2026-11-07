'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { FileText, MessageSquare, GitFork, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { PdfUploader } from '@/components/PdfUploader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useApp } from '@/lib/app-context';
import { deleteDocument, getErrorMessage } from '@/lib/api';

const MySwal = withReactContent(Swal);

export default function DocumentsPage() {
  const router = useRouter();
  const { documents, activeDoc, setActiveId, loading, error, refresh } = useApp();

  const go = (id: string, path: string) => {
    setActiveId(id);
    // Tombol "Tanya AI" membuka chat baru yang langsung terfokus ke dokumen ini
    if (path === '/chat') localStorage.setItem('bizsop:new-chat-doc', id);
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
            <p>1. Unggah PDF SOP, lalu sistem mengindeksnya.</p>
            <p>2. Tanyakan prosedur lewat chat dan dapatkan jawaban dengan rujukan halaman.</p>
            <p>3. Ubah SOP menjadi flowchart interaktif dan checklist tugas.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="lg:col-span-3 self-start">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" /> Daftar Dokumen
            <span className="text-xs font-normal text-slate-400">({documents.length})</span>
          </CardTitle>
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
            <p className="text-sm text-slate-400 text-center py-10">
              Belum ada dokumen. Unggah SOP pertamamu di sebelah kiri.
            </p>
          )}

          {documents.map((doc) => {
            const active = doc.id === activeDoc?.id;
            return (
              <div
                key={doc.id}
                className={`flex flex-wrap items-center gap-3 rounded-lg border p-3 ${
                  active ? 'border-indigo-300 bg-indigo-50/50' : 'bg-white'
                }`}
              >
                <FileText className="w-5 h-5 text-slate-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 truncate">{doc.file_name}</p>
                  <p className="text-xs text-slate-400">
                    Diunggah {new Date(doc.created_at).toLocaleString('id-ID')}
                  </p>
                </div>
                {active && <Badge className="bg-indigo-600">Aktif</Badge>}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => go(doc.id, '/chat')}>
                    <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Tanya AI
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => go(doc.id, '/flowchart')}>
                    <GitFork className="w-3.5 h-3.5 mr-1.5" /> Flowchart
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(doc.id, doc.file_name)} title="Hapus">
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}