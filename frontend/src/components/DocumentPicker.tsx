'use client';

import React, { useRef, useState } from 'react';
import { Upload, Loader2, AlertCircle, Lock } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useApp } from '@/lib/app-context';
import { DocumentItem, getErrorMessage, uploadDocument } from '@/lib/api';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // samakan dengan backend (10 MB)

interface Props {
  scope: string[]; // kosong = semua dokumen (data lama)
  onChange: (next: string[]) => void;
  disabled?: boolean;
  locked?: boolean; // percakapan sudah berjalan: dokumen terpakai tidak bisa dilepas, hanya ditambah
}

// Dokumen lama tanpa field status dianggap siap
const isReady = (d: DocumentItem) => !d.status || d.status === 'ready';

export function DocumentPicker({ scope, onChange, disabled, locked = false }: Props) {
  const { documents, refresh } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const readyDocs = documents.filter(isReady);
  const allIds = readyDocs.map((d) => d.id);
  const isAll = scope.length === 0;
  const isChecked = (id: string) => isAll || scope.includes(id);
  const isLockedDoc = (id: string) => locked && isChecked(id);

  const toggle = (id: string) => {
    if (isLockedDoc(id)) return;
    const current = isAll ? allIds : scope;
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    if (next.length === 0) return; // minimal satu dokumen
    onChange(next);
  };

  const handleFiles = async (list?: FileList | null) => {
    if (!list || list.length === 0) return;
    setUploading(true);
    setErrors([]);

    const problems: string[] = [];
    const uploadedIds: string[] = [];
    const knownNames = new Set(documents.map((d) => d.file_name.toLowerCase()));

    for (const file of Array.from(list)) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        problems.push(`${file.name}: hanya file PDF yang didukung.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        problems.push(`${file.name}: melebihi batas 10 MB.`);
        continue;
      }
      if (knownNames.has(file.name.toLowerCase())) {
        problems.push(`${file.name}: nama file sudah ada, dilewati.`);
        continue;
      }
      try {
        const res = await uploadDocument(file);
        uploadedIds.push(res.document_id);
        knownNames.add(file.name.toLowerCase());
        await refresh(); // tanpa selectId: dokumen aktif tidak diganti dari sini
      } catch (err) {
        problems.push(`${file.name}: ${getErrorMessage(err, 'gagal diunggah.')}`);
      }
    }

    // Dokumen baru langsung ikut jadi sumber chat ini
    // (percakapan lama bermode "semua" sudah otomatis menyertakannya)
    if (uploadedIds.length > 0 && !(locked && isAll)) {
      const base = isAll ? allIds : scope;
      onChange(Array.from(new Set([...base, ...uploadedIds])));
    }

    setErrors(problems);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="border-b bg-slate-50 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          {locked
            ? 'Dokumen yang sudah dipakai terkunci agar riwayat tetap konsisten. Anda masih bisa menambah dokumen lain.'
            : 'Pilih dokumen yang menjadi sumber jawaban chat ini.'}
        </p>
        {!locked && readyDocs.length > 1 && (
          <button
            type="button"
            onClick={() => onChange(allIds)}
            disabled={disabled}
            className="shrink-0 text-xs font-medium text-indigo-600 hover:underline disabled:opacity-50"
          >
            Pilih semua
          </button>
        )}
      </div>

      <div className="max-h-44 overflow-y-auto space-y-1">
        {documents.length === 0 && (
          <p className="px-2 py-3 text-center text-xs text-slate-400">
            Belum ada dokumen. Unggah PDF SOP untuk mulai bertanya.
          </p>
        )}

        {documents.map((doc) => {
          const ready = isReady(doc);
          const lockedDoc = isLockedDoc(doc.id);
          const interactive = ready && !lockedDoc;
          return (
            <label
              key={doc.id}
              className={
                interactive
                  ? 'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-white cursor-pointer'
                  : 'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-400 cursor-not-allowed'
              }
              title={doc.status === 'failed' ? doc.error_message ?? 'Pengindeksan gagal' : doc.file_name}
            >
              <Checkbox
                checked={ready && isChecked(doc.id)}
                onCheckedChange={() => interactive && toggle(doc.id)}
                disabled={disabled || !interactive}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{doc.file_name}</span>
                <span className="block text-[10px] text-slate-400">
                  {new Date(doc.created_at).toLocaleDateString('id-ID')}
                </span>
              </span>
              {lockedDoc && <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
              {doc.status === 'processing' && (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                  <Loader2 className="h-3 w-3 animate-spin" /> Mengindeks
                </span>
              )}
              {doc.status === 'failed' && (
                <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
                  Gagal
                </span>
              )}
            </label>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || disabled}
        >
          {uploading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Mengunggah...
            </>
          ) : (
            <>
              <Upload className="w-3.5 h-3.5 mr-1.5" /> Unggah PDF baru
            </>
          )}
        </Button>
        <span className="text-[11px] text-slate-400">Otomatis ditambahkan ke chat ini.</span>
      </div>

      {errors.length > 0 && (
        <div className="space-y-1">
          {errors.map((msg, i) => (
            <p key={i} className="text-xs text-red-600 flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {msg}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}