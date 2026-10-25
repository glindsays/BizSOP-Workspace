'use client';

import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';

export function PdfUploader({ onUploadSuccess }: { onUploadSuccess?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setStatus(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setStatus('SOP Berhasil diunggah dan di-index!');
      setFile(null);
      if (onUploadSuccess) onUploadSuccess();
    } catch (err) {
      setStatus('Gagal mengunggah dokumen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5 text-blue-600" /> Upload Dokumen SOP PDF
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          type="file"
          accept=".pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
        />

        {file && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <FileText className="w-4 h-4" /> {file.name}
          </div>
        )}

        <Button onClick={handleUpload} disabled={!file || loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Process & Ingesting Vector...
            </>
          ) : (
            'Unggah & Indeks SOP'
          )}
        </Button>

        {status && (
          <p className={`text-sm flex items-center gap-1 ${status.includes('Gagal') ? 'text-red-500' : 'text-green-600'}`}>
            <CheckCircle className="w-4 h-4" /> {status}
          </p>
        )}
      </CardContent>
    </Card>
  );
}