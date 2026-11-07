'use client';

import React, { useRef, useState } from 'react';
import { Upload, Loader2, AlertCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useApp } from '@/lib/app-context';
import { getErrorMessage, uploadDocument } from '@/lib/api';

interface Props {
  scope: string[]; // kosong = semua dokumen
  onChange: (next: string[]) => void;
  disabled?: boolean;
}

export function DocumentPicker({ scope, onChange, disabled }: Props) {
  const { documents, refresh } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allIds = documents.map((d) => d.id);
  const isAll = scope.length === 0;
  const isChecked = (id: string) => isAll || scope.includes(id);

  const toggle = (id: string) => {
    const current = isAll ? allIds : scope;
    let next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    if (next.length === 0) return; // minimal satu dokumen
    if (next.length === allIds.length) next = []; // semua terpilih = mode "semua"
    onChange(next);
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    if (!file.name.endsWith('.pdf')) {
      setError('Hanya file PDF (.pdf) yang didukung.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const res = await uploadDocument(file);
      await refresh(res.document_id);
      if (!isAll) onChange([...scope, res.document_id]); // mode "semua" otomatis ikut menyertakan
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal mengunggah dokumen.'));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="border-b bg-slate-50 p-3 space-y-2">
      <div className="max-h-44 overflow-y-auto space-y-1">
        <label className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-slate-900 hover:bg-white cursor-pointer">
          <Checkbox
            checked={isAll}
            onCheckedChange={() => !isAll && onChange([])}
            disabled={disabled}
          />
          Semua dokumen ({documents.length})
        </label>
        {documents.map((doc) => (
          <label
            key={doc.id}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-white cursor-pointer"
          >
            <Checkbox
              checked={isChecked(doc.id)}
              onCheckedChange={() => toggle(doc.id)}
              disabled={disabled}
            />
            <span className="truncate">{doc.file_name}</span>
          </label>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || disabled}
        >
          {uploading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Mengindeks...
            </>
          ) : (
            <>
              <Upload className="w-3.5 h-3.5 mr-1.5" /> Unggah PDF baru
            </>
          )}
        </Button>
        <span className="text-[11px] text-slate-400">Berlaku untuk pertanyaan berikutnya.</span>
      </div>

      {error && (
        <p className="text-xs text-red-600 flex items-start gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}