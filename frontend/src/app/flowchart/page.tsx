'use client';

import React, { useState } from 'react';
import { GitFork, Sparkles, Loader2, AlertCircle, RefreshCw, Upload, FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MermaidVisualizer } from '@/components/MermaidVisualizer';
import { TaskChecklist } from '@/components/TaskChecklist';
import { PdfUploader } from '@/components/PdfUploader';
import { DocumentItem, FlowchartData, generateFlowchart, getErrorMessage } from '@/lib/api';
import { useApp } from '@/lib/app-context';

const flowKey = (id: string) => `bizsop:flow:${id}`;
const checklistKey = (id: string) => `bizsop:checklist:${id}`;

function loadCache(id: string): FlowchartData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(flowKey(id));
    return raw ? (JSON.parse(raw) as FlowchartData) : null;
  } catch {
    return null;
  }
}

function statusSuffix(d: DocumentItem) {
  if (d.status === 'processing') return ' (mengindeks)';
  if (d.status === 'failed') return ' (gagal)';
  return '';
}

function FlowchartWorkspace({ doc }: { doc: DocumentItem }) {
  const [data, setData] = useState<FlowchartData | null>(() => loadCache(doc.id));
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  // Dokumen lama tanpa field status dianggap siap
  const processing = doc.status === 'processing';
  const failed = doc.status === 'failed';
  const blocked = processing || failed;

  const handleGenerate = async () => {
    if (blocked) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await generateFlowchart(doc.id);
      localStorage.setItem(flowKey(doc.id), JSON.stringify(res));
      localStorage.removeItem(checklistKey(doc.id)); // progres lama tidak berlaku untuk hasil baru
      setData(res);
      setVersion((v) => v + 1);
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal menghasilkan flowchart dari SOP.'));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-sm">
              <GitFork className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="truncate">Flowchart &amp; checklist</span>
            </CardTitle>
            <p className="mt-1 truncate text-xs text-slate-500" title={doc.file_name}>
              Dibuat dari satu dokumen: {doc.file_name}
            </p>
          </div>
          <Button onClick={handleGenerate} disabled={generating || blocked} className="shrink-0">
            {generating || processing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : data ? (
              <RefreshCw className="w-4 h-4 mr-2" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            {generating
              ? 'Menyusun diagram...'
              : processing
              ? 'Dokumen sedang diindeks...'
              : data
              ? 'Generate Ulang'
              : 'Generate Diagram'}
          </Button>
        </CardHeader>
      </Card>

      {processing && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 flex items-start gap-2">
          <Loader2 className="w-4 h-4 mt-0.5 shrink-0 animate-spin" />
          Dokumen ini masih diindeks. Tombol akan aktif otomatis begitu selesai.
        </div>
      )}

      {failed && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Dokumen ini gagal diindeks{doc.error_message ? ` (${doc.error_message})` : ''}. Hapus lalu unggah
            ulang di halaman Dokumen.
          </span>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {data ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          <div className="lg:col-span-2">
            <MermaidVisualizer chart={data.mermaid_code} fileName={doc.file_name.replace(/\.pdf$/i, '')} />
          </div>
          <TaskChecklist key={version} steps={data.checklist} storageKey={checklistKey(doc.id)} />
        </div>
      ) : (
        !generating &&
        !blocked && (
          <div className="text-center py-16 text-slate-400 bg-white border border-dashed rounded-lg text-sm">
            Klik &quot;Generate Diagram&quot; untuk membuat flowchart dan checklist tugas otomatis dari SOP ini.
          </div>
        )
      )}

      {generating && !data && (
        <div className="text-center py-16 text-slate-500 bg-white border rounded-lg text-sm flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
          AI sedang membaca SOP dan menyusun alur. Proses ini bisa memakan waktu beberapa saat.
        </div>
      )}
    </div>
  );
}

export default function FlowchartPage() {
  const { documents, activeDoc, setActiveId, loading, error, refresh } = useApp();
  const [showUpload, setShowUpload] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400 gap-2 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Memuat dokumen...
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <p className="text-sm text-slate-700">{error}</p>
          <button onClick={() => refresh()} className="text-sm text-indigo-600 hover:underline">
            Coba lagi
          </button>
        </CardContent>
      </Card>
    );
  }

  // Belum ada dokumen: unggah langsung dari sini
  if (documents.length === 0) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <FileUp className="w-6 h-6" />
          </div>
          <p className="font-medium text-slate-900">Belum ada dokumen SOP</p>
          <p className="text-sm text-slate-500">Unggah PDF di bawah ini, lalu flowchart bisa langsung dibuat.</p>
        </div>
        <PdfUploader />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pemilih dokumen: mengubah dokumen aktif, jadi sidebar dan tab lain ikut sinkron */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3">
          <label htmlFor="flow-doc" className="text-sm font-medium text-slate-700">
            Dokumen SOP
          </label>
          <select
            id="flow-doc"
            value={activeDoc?.id ?? ''}
            onChange={(e) => setActiveId(e.target.value)}
            className="h-9 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {documents.map((d) => (
              <option key={d.id} value={d.id}>
                {d.file_name} · {new Date(d.created_at).toLocaleDateString('id-ID')}
                {statusSuffix(d)}
              </option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={() => setShowUpload((v) => !v)}>
            <Upload className="w-3.5 h-3.5 mr-1.5" /> {showUpload ? 'Tutup unggah' : 'Unggah PDF baru'}
          </Button>
        </CardContent>
      </Card>

      {showUpload && <PdfUploader />}

      {activeDoc && <FlowchartWorkspace key={activeDoc.id} doc={activeDoc} />}
    </div>
  );
}