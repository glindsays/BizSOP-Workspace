'use client';

import React, { useState } from 'react';
import { GitFork, Sparkles, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MermaidVisualizer } from '@/components/MermaidVisualizer';
import { TaskChecklist } from '@/components/TaskChecklist';
import { RequireDocument } from '@/components/RequireDocument';
import { DocumentItem, FlowchartData, generateFlowchart, getErrorMessage } from '@/lib/api';

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

function FlowchartWorkspace({ doc }: { doc: DocumentItem }) {
  const [data, setData] = useState<FlowchartData | null>(() => loadCache(doc.id));
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const handleGenerate = async () => {
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
          <CardTitle className="flex items-center gap-2 text-sm min-w-0">
            <GitFork className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="truncate">{doc.file_name}</span>
          </CardTitle>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : data ? (
              <RefreshCw className="w-4 h-4 mr-2" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            {generating ? 'Menyusun diagram...' : data ? 'Generate Ulang' : 'Generate Diagram dari SOP'}
          </Button>
        </CardHeader>
      </Card>

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
          <TaskChecklist
            key={version}
            steps={data.checklist}
            storageKey={checklistKey(doc.id)}
          />
        </div>
      ) : (
        !generating && (
          <div className="text-center py-16 text-slate-400 bg-white border border-dashed rounded-lg text-sm">
            Klik tombol di atas untuk membuat flowchart dan checklist tugas otomatis dari SOP ini.
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
  return (
    <RequireDocument>{(doc) => <FlowchartWorkspace key={doc.id} doc={doc} />}</RequireDocument>
  );
}