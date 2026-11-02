'use client';

import React from 'react';
import Link from 'next/link';
import { FileUp, Loader2, AlertCircle } from 'lucide-react';
import { useApp } from '@/lib/app-context';
import { DocumentItem } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';

export function RequireDocument({
  children,
}: {
  children: (doc: DocumentItem) => React.ReactNode;
}) {
  const { activeDoc, loading, error, refresh } = useApp();

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

  if (!activeDoc) {
    return (
      <Card>
        <CardContent className="py-16 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <FileUp className="w-6 h-6" />
          </div>
          <div>
            <p className="font-medium text-slate-900">Belum ada dokumen SOP</p>
            <p className="text-sm text-slate-500">Unggah dokumen PDF terlebih dahulu untuk mulai.</p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Ke halaman Dokumen
          </Link>
        </CardContent>
      </Card>
    );
  }

  return <>{children(activeDoc)}</>;
}