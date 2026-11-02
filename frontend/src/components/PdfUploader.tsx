'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { Upload, FileText, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadResult, getErrorMessage, uploadDocument } from '@/lib/api';
import { useApp } from '@/lib/app-context';
import { cn } from '@/lib/utils';

export function PdfUploader() {
  const { refresh } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);

  const pick = (f?: File | null) => {
    if (!f) return;
    if (!f.name.endsWith('.pdf')) {
      setError('Hanya file PDF (.pdf) yang didukung.');
      return;
    }
    setError(null);
    setResult(null);
    setFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const res = await uploadDocument(file);
      setResult(res);
      setFile(null);
      await refresh(res.document_id);
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal mengunggah dokumen.'));
    } finally {
      setLoading(false);
    }
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
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (!loading) pick(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            'cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors',
            dragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50',
            loading && 'opacity-50 cursor-not-allowed'
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => pick(e.target.files?.[0])}
          />
          <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
          <p className="text-sm font-medium text-slate-700">Tarik file PDF ke sini, atau klik untuk memilih</p>
          <p className="text-xs text-slate-400 mt-1">Dokumen akan diparsing dan diindeks otomatis</p>
        </div>

        {file && (
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 border px-3 py-2 text-sm text-slate-700">
            <FileText className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="truncate">{file.name}</span>
            <span className="ml-auto text-xs text-slate-400 shrink-0">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </span>
          </div>
        )}

        <Button onClick={handleUpload} disabled={!file || loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Memproses & mengindeks (mohon tunggu)...
            </>
          ) : (
            'Unggah & Indeks SOP'
          )}
        </Button>

        {error && (
          <p className="text-sm text-red-600 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
          </p>
        )}

        {result && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-3">
            <p className="text-sm text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                <b>{result.file_name}</b> berhasil diindeks ({result.total_pages} halaman, {result.total_chunks} potongan).
              </span>
            </p>
            <div className="flex gap-2">
              <Link
                href="/chat"
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
              >
                Mulai Tanya Jawab
              </Link>
              <Link
                href="/flowchart"
                className="rounded-lg border bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Buat Flowchart
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}