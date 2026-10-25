'use client';

import React, { useState } from 'react';
import { PdfUploader } from '@/components/PdfUploader';
import { ChatInterface } from '@/components/ChatInterface';
import { MermaidVisualizer } from '@/components/MermaidVisualizer';
import { TaskChecklist, TaskItem } from '@/components/TaskChecklist';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { GitFork, Sparkles, Loader2 } from 'lucide-react';

export default function Dashboard() {
  const [mermaidSyntax, setMermaidSyntax] = useState<string>('');
  const [checklist, setChecklist] = useState<TaskItem[]>([]);
  const [generating, setGenerating] = useState(false);

  const handleGenerateFlowchart = async () => {
    setGenerating(true);
    try {
      const res = await api.post('/generate-flowchart');
      setMermaidSyntax(res.data.mermaidCode);
      setChecklist(res.data.checklist);
    } catch (err) {
      console.error('Gagal membuat flowchart', err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-6 space-y-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">BizSOP Workspace</h1>
          <p className="text-sm text-slate-500">Platform AI Grounding & Interactive SOP Visualizer</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Row 1: Upload */}
        <PdfUploader />

        {/* Row 2: RAG Chat Assistant */}
        <ChatInterface />

        {/* Row 3: Generator Diagram & Checklist */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <GitFork className="w-5 h-5 text-indigo-600" /> Visualisasi Flowchart & Task Checklist
            </CardTitle>
            <Button onClick={handleGenerateFlowchart} disabled={generating} className="bg-indigo-600 hover:bg-indigo-700">
              {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Generasi Diagram dari SOP
            </Button>
          </CardHeader>
          <CardContent>
            {mermaidSyntax ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <MermaidVisualizer chart={mermaidSyntax} />
                </div>
                <div>
                  <TaskChecklist initialTasks={checklist} />
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 bg-white border border-dashed rounded-lg">
                Klik tombol di atas untuk membuat visualisasi Mermaid.js dan daftar tugas otomatis dari SOP.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}