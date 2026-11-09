'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, MessageSquare, GitFork, Workflow } from 'lucide-react';
import { useApp } from '@/lib/app-context';
import { ActiveDocumentCard, SidebarDocuments } from '@/components/SidebarDocuments';
import { cn } from '@/lib/utils';

const NAV = [
  // { href: '/', label: 'Dokumen', hint: 'Unggah & pilih SOP', icon: FileText },
  { href: '/chat', label: 'Tanya Jawab', hint: 'Chat dengan rujukan halaman', icon: MessageSquare },
  { href: '/flowchart', label: 'Flowchart & Checklist', hint: 'Visualisasi prosedur', icon: GitFork },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { activeDoc } = useApp();
  const current = NAV.find((n) => n.href === pathname) ?? NAV[0];

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar desktop: menu utama tetap di atas, daftar dokumen punya scroll sendiri */}
      <aside className="hidden md:flex w-72 shrink-0 flex-col overflow-hidden border-r bg-white h-dvh sticky top-0">
        <div className="flex h-16 shrink-0 items-center gap-2 border-b px-5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
            <Workflow className="w-4 h-4" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-slate-900">BizSOP Agent</p>
            <p className="text-[11px] text-slate-500">SOP Knowledge Assistant</p>
          </div>
        </div>

        <nav className="shrink-0 space-y-0.5 p-2">
          {NAV.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.hint}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-lg border-l-2 px-3 py-2 transition-colors',
                  active
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-transparent text-slate-600 hover:bg-slate-100'
                )}
              >
                <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-indigo-600' : 'text-slate-400')} />
                <span className="truncate text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <ActiveDocumentCard />
        <SidebarDocuments />
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile nav */}
        <div className="md:hidden bg-white border-b px-4 pt-3">
          <p className="text-sm font-semibold text-slate-900 mb-2">BizSOP Agent</p>
          <div className="flex gap-1 overflow-x-auto pb-2">
            {NAV.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium',
                    pathname === item.href ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
          {activeDoc && (
            <p className="flex items-center gap-1.5 pb-2 text-[11px] text-slate-500">
              <FileText className="h-3 w-3 shrink-0" />
              <span className="truncate">
                Dokumen aktif: <b className="font-medium text-slate-700">{activeDoc.file_name}</b>
              </span>
            </p>
          )}
        </div>

        {/* Header */}
        <header className="h-16 bg-white border-b px-6 flex items-center">
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-slate-900 truncate">{current.label}</h1>
            <p className="text-xs text-slate-500 truncate">{current.hint}</p>
          </div>
        </header>

        <main className="flex-1 p-6">
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}