'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, CheckCircle2, Loader2, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadResult, getErrorMessage, uploadDocument } from '@/lib/api';
import { useApp } from '@/lib/app-context';
import { NEW_CHAT_KEY } from '@/lib/doc-utils';
import { cn } from '@/lib/utils';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // samakan dengan batas di backend (10 MB)

type Status = 'queued' | 'duplicate' | 'uploading' | 'done' | 'error';

interface UploadItem {
  key: number;
  file: File;
  status: Status;
  error?: string;
  result?: UploadResult;
}

const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(2);

export function PdfUploader() {
  const router = useRouter();
  const { documents, refresh, setActiveId } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const nextKey = useRef(1);

  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastId, setLastId] = useState<string | null>(null);

  const update = (key: number, patch: Partial<UploadItem>) =>
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));

  const addFiles = (list?: FileList | File[] | null) => {
    if (!list || list.length === 0) return;
    const existingNames = new Set(documents.map((d) => d.file_name.toLowerCase()));

    setItems((prev) => {
      const seen = new Set(prev.map((p) => `${p.file.name.toLowerCase()}|${p.file.size}`));
      const added: UploadItem[] = [];

      for (const file of Array.from(list)) {
        const sig = `${file.name.toLowerCase()}|${file.size}`;
        if (seen.has(sig)) continue; // file yang sama sudah ada di antrean
        seen.add(sig);

        const item: UploadItem = { key: nextKey.current++, file, status: 'queued' };
        if (!file.name.toLowerCase().endsWith('.pdf')) {
          item.status = 'error';
          item.error = 'Hanya file PDF (.pdf) yang didukung.';
        } else if (file.size > MAX_FILE_SIZE) {
          item.status = 'error';
          item.error = `Ukuran ${mb(file.size)} MB melebihi batas 10 MB.`;
        } else if (existingNames.has(file.name.toLowerCase())) {
          item.status = 'duplicate';
        }
        added.push(item);
      }
      return [...prev, ...added];
    });
  };

  const removeItem = (key: number) => setItems((prev) => prev.filter((it) => it.key !== key));

  const queued = items.filter((it) => it.status === 'queued');
  const doneCount = items.filter((it) => it.status === 'done').length;

  const handleUpload = async () => {
    const queue = items.filter((it) => it.status === 'queued');
    if (queue.length === 0 || loading) return;

    setLoading(true);
    let lastSuccess: string | null = null;

    // Berurutan: satu file gagal tidak menghentikan file lain
    for (const it of queue) {
      update(it.key, { status: 'uploading', error: undefined });
      try {
        const res = await uploadDocument(it.file);
        update(it.key, { status: 'done', result: res });
        lastSuccess = res.document_id;
        await refresh(res.document_id); // daftar dokumen langsung ikut bertambah
      } catch (err) {
        update(it.key, { status: 'error', error: getErrorMessage(err, 'Gagal mengunggah dokumen.') });
      }
    }

    if (lastSuccess) setLastId(lastSuccess);
    setLoading(false);
  };

  const clearList = () => {
    setItems([]);
    setLastId(null);
  };

  const openChat = () => {
    if (lastId) {
      setActiveId(lastId);
      localStorage.setItem(NEW_CHAT_KEY, lastId); // chat baru terfokus ke dokumen terakhir
    }
    router.push('/chat');
  };

  const openFlowchart = () => {
    if (lastId) setActiveId(lastId);
    router.push('/flowchart');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5 text-indigo-600" /> Unggah Dokumen SOP
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          onClick={() => !loading && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (!loading) addFiles(e.dataTransfer.files);
          }}
          className={cn(
            'cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors',
            dragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50',
            loading && 'opacity-50 cursor-not-allowed'
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = ''; // supaya file yang sama bisa dipilih ulang
            }}
          />
          <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
          <p className="text-sm font-medium text-slate-700">
            Tarik satu atau beberapa PDF ke sini, atau klik untuk memilih
          </p>
          <p className="text-xs text-slate-400 mt-1">Maksimal 10 MB per file</p>
        </div>

        {items.length > 0 && (
          <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
            {items.map((it) => (
              <div
                key={it.key}
                className={cn(
                  'flex items-start gap-2 rounded-lg border px-3 py-2 text-sm',
                  it.status === 'error' && 'border-red-200 bg-red-50',
                  it.status === 'duplicate' && 'border-amber-200 bg-amber-50',
                  it.status === 'done' && 'border-emerald-200 bg-emerald-50',
                  (it.status === 'queued' || it.status === 'uploading') && 'bg-slate-50'
                )}
              >
                <span className="mt-0.5 shrink-0">
                  {it.status === 'uploading' && <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />}
                  {it.status === 'done' && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                  {it.status === 'error' && <AlertCircle className="h-4 w-4 text-red-600" />}
                  {it.status === 'duplicate' && <AlertCircle className="h-4 w-4 text-amber-600" />}
                  {it.status === 'queued' && <FileText className="h-4 w-4 text-slate-500" />}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-800" title={it.file.name}>
                    {it.file.name}
                    <span className="ml-2 text-xs font-normal text-slate-400">{mb(it.file.size)} MB</span>
                  </p>
                  <p
                    className={cn(
                      'text-xs',
                      it.status === 'error' && 'text-red-600',
                      it.status === 'duplicate' && 'text-amber-700',
                      it.status === 'done' && 'text-emerald-700',
                      (it.status === 'queued' || it.status === 'uploading') && 'text-slate-500'
                    )}
                  >
                    {it.status === 'queued' && 'Menunggu diunggah'}
                    {it.status === 'uploading' && 'Mengunggah & membaca dokumen...'}
                    {it.status === 'duplicate' && 'Nama file sudah ada di daftar dokumen, dilewati.'}
                    {it.status === 'error' && it.error}
                    {it.status === 'done' &&
                      it.result &&
                      `Terunggah (${it.result.total_pages} halaman, ${it.result.total_chunks} potongan). Pengindeksan berjalan di latar belakang.`}
                  </p>
                  {it.status === 'duplicate' && !loading && (
                    <button
                      type="button"
                      className="mt-0.5 text-xs font-medium text-amber-800 underline"
                      onClick={() => update(it.key, { status: 'queued' })}
                    >
                      Tetap unggah
                    </button>
                  )}
                </div>

                {it.status !== 'uploading' && !loading && (
                  <button
                    type="button"
                    onClick={() => removeItem(it.key)}
                    aria-label="Hapus dari daftar"
                    className="mt-0.5 shrink-0 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={handleUpload} disabled={queued.length === 0 || loading} className="flex-1">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Mengunggah {doneCount} dari{' '}
                {doneCount + queued.length + items.filter((i) => i.status === 'uploading').length}...
              </>
            ) : queued.length > 1 ? (
              `Unggah ${queued.length} file`
            ) : (
              'Unggah SOP'
            )}
          </Button>
          {items.length > 0 && !loading && (
            <Button variant="outline" onClick={clearList}>
              Kosongkan
            </Button>
          )}
        </div>

        {doneCount > 0 && !loading && lastId && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-3">
            <p className="text-sm text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                <b>{doneCount} dokumen</b> terunggah. Pengindeksan berjalan di latar belakang, jadi dokumen baru
                bisa butuh beberapa saat sebelum jawabannya lengkap.
              </span>
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={openChat}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
              >
                Mulai Tanya Jawab
              </button>
              <button
                type="button"
                onClick={openFlowchart}
                className="rounded-lg border bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Buat Flowchart
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}