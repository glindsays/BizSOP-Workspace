'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Conversation } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  disabled?: boolean;
}

export function ConversationList({ conversations, activeId, onSelect, onNew, onDelete, disabled }: Props) {
  return (
    <Card className="min-h-0 max-h-48 md:max-h-none gap-0 py-0 overflow-hidden flex flex-col">
      <div className="p-2 border-b">
        <Button className="w-full" size="sm" onClick={onNew} disabled={disabled}>
          <Plus className="w-4 h-4 mr-1.5" /> Chat Baru
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {conversations.length === 0 && (
          <p className="px-2 py-4 text-xs text-slate-400 text-center">Belum ada percakapan.</p>
        )}
        {conversations.map((c) => {
          const active = c.id === activeId;
          return (
            <div
              key={c.id}
              className={cn(
                'group flex items-center rounded-lg',
                active ? 'bg-indigo-50' : 'hover:bg-slate-100'
              )}
            >
              <button
                onClick={() => onSelect(c.id)}
                disabled={disabled}
                className="flex-1 min-w-0 text-left px-3 py-2 disabled:opacity-60"
              >
                <span
                  className={cn(
                    'block text-sm truncate',
                    active ? 'font-medium text-indigo-700' : 'text-slate-800'
                  )}
                >
                  {c.title}
                </span>
                <span className="block text-[11px] text-slate-400">
                  {new Date(c.updated_at).toLocaleDateString('id-ID')} ·{' '}
                  {c.document_ids.length === 0 ? 'Semua dokumen' : `${c.document_ids.length} dokumen`}
                </span>
              </button>
              <button
                onClick={() => onDelete(c.id)}
                disabled={disabled}
                title="Hapus percakapan"
                className="p-2 text-slate-400 hover:text-red-600 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}