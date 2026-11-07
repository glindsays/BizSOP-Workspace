'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, MessageSquare, GitFork, Workflow } from 'lucide-react';
import { useApp } from '@/lib/app-context';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/', label: 'Dokumen', hint: 'Unggah & pilih SOP', icon: FileText },
  { href: '/chat', label: 'Tanya Jawab', hint: 'Chat dengan rujukan halaman', icon: MessageSquare },
  { href: '/flowchart', label: 'Flowchart & Checklist', hint: 'Visualisasi prosedur', icon: GitFork },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { documents, activeDoc, setActiveId } = useApp();
  const current = NAV.find((n) => n.href === pathname) ?? NAV[0];

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex w-72 shrink-0 flex-col border-r bg-white h-screen sticky top-0">
        <div className="flex items-center gap-2 px-5 h-16 border-b">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
            <Workflow className="w-4 h-4" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-slate-900">BizSOP Agent</p>
            <p className="text-[11px] text-slate-500">SOP Knowledge Assistant</p>
          </div>
        </div>

        <nav className="p-3 space-y-1">
          {NAV.map((item, i) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
                  active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
                )}
              >
                <span
                  className={cn(
                    'w-6 h-6 rounded-full text-xs font-semibold flex items-center justify-center shrink-0',
                    active ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
                  )}
                >
                  {i + 1}
                </span>
                <span className="leading-tight">
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className="block text-[11px] text-slate-400">{item.hint}</span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="px-5 pt-4 pb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Dokumen SOP
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
          {documents.length === 0 && (
            <p className="px-2 text-xs text-slate-400">Belum ada dokumen.</p>
          )}
          {documents.map((doc) => {
            const active = doc.id === activeDoc?.id;
            return (
              <button
                key={doc.id}
                onClick={() => setActiveId(doc.id)}
                className={cn(
                  'w-full text-left flex items-start gap-2 rounded-lg px-3 py-2 transition-colors',
                  active ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                )}
              >
                <FileText className="w-4 h-4 mt-0.5 shrink-0" />
                <span className="min-w-0">
                  <span className="block text-sm truncate">{doc.file_name}</span>
                  <span className={cn('block text-[11px]', active ? 'text-slate-300' : 'text-slate-400')}>
                    {new Date(doc.created_at).toLocaleDateString('id-ID')}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile nav */}
        <div className="md:hidden bg-white border-b px-4 pt-3">
          <p className="text-sm font-semibold text-slate-900 mb-2">BizSOP Agent</p>
          <div className="flex gap-1 overflow-x-auto pb-2">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium',
                  pathname === item.href ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Header */}
        <header className="h-16 bg-white border-b px-6 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-slate-900 truncate">{current.label}</h1>
            <p className="text-xs text-slate-500 truncate">{current.hint}</p>
          </div>
          {activeDoc && pathname !== '/chat' && (            <div className="hidden sm:flex items-center gap-2 min-w-0 rounded-full border bg-slate-50 pl-3 pr-1 py-1">
              <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="text-xs text-slate-700 truncate max-w-[220px]">{activeDoc.file_name}</span>
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Terindeks</Badge>
            </div>
          )}
        </header>

        <main className="flex-1 p-6">
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}