'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, MessageSquare, Pencil, Pin, PinOff, Plus, Trash2, X } from 'lucide-react';
import { Conversation } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onTogglePin: (id: string) => void;
  disabled?: boolean;
}

const MAX_TITLE = 80;

function scopeText(c: Conversation) {
  return c.document_ids.length === 0 ? 'semua dokumen' : `${c.document_ids.length} dokumen`;
}

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onRename,
  onTogglePin,
  disabled,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelled = useRef(false);

  useEffect(() => {
    if (editingId) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editingId]);

  const startEdit = (c: Conversation) => {
    cancelled.current = false;
    setEditingId(c.id);
    setDraft(c.title);
  };

  const commit = (c: Conversation) => {
    if (cancelled.current) return;
    setEditingId(null);
    const next = draft.trim();
    if (next && next !== c.title) onRename(c.id, next);
  };

  const cancel = () => {
    cancelled.current = true;
    setEditingId(null);
  };

  const pinned = conversations.filter((c) => c.pinned);
  const others = conversations.filter((c) => !c.pinned);

  const actionBtn =
    'flex h-6 w-6 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40';

  const renderItem = (c: Conversation) => {
    const active = c.id === activeId;
    const editing = c.id === editingId;

    return (
      <div
        key={c.id}
        role="button"
        tabIndex={0}
        onClick={() => !editing && !disabled && onSelect(c.id)}
        onKeyDown={(e) => {
          if (!editing && !disabled && (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
            e.preventDefault();
            onSelect(c.id);
          }
        }}
        className={cn(
          'group flex items-center gap-2 rounded-lg px-3 py-2 transition-colors',
          editing ? 'cursor-default' : 'cursor-pointer',
          active ? 'bg-indigo-50' : 'hover:bg-slate-50',
          disabled && 'opacity-70'
        )}
      >
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <input
                ref={inputRef}
                value={draft}
                maxLength={MAX_TITLE}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) commit(c);
                  if (e.key === 'Escape') cancel();
                }}
                onBlur={() => commit(c)}
                className="h-7 min-w-0 flex-1 rounded border border-indigo-300 bg-white px-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="button"
                className={actionBtn}
                title="Simpan"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => commit(c)}
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className={actionBtn}
                title="Batal"
                onMouseDown={(e) => e.preventDefault()}
                onClick={cancel}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <>
              <p
                className={cn(
                  'flex items-center gap-1 truncate text-sm',
                  active ? 'font-medium text-indigo-700' : 'text-slate-800'
                )}
                title={c.title}
              >
                {c.pinned && <Pin className="h-3 w-3 shrink-0 fill-indigo-500 text-indigo-500" />}
                <span className="truncate">{c.title}</span>
              </p>
              <p className="truncate text-[11px] text-slate-400">
                {new Date(c.updated_at).toLocaleDateString('id-ID')} · {scopeText(c)}
              </p>
            </>
          )}
        </div>

        {!editing && (
          <div
            className="flex shrink-0 items-center gap-0.5 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className={actionBtn}
              disabled={disabled}
              title={c.pinned ? 'Lepas sematan' : 'Sematkan di atas'}
              onClick={() => onTogglePin(c.id)}
            >
              {c.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              className={actionBtn}
              disabled={disabled}
              title="Ubah nama"
              onClick={() => startEdit(c)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className={cn(actionBtn, 'hover:text-red-600')}
              disabled={disabled}
              title="Hapus percakapan"
              onClick={() => onDelete(c.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex min-h-0 max-h-56 flex-col rounded-xl border bg-white md:max-h-none">
      <div className="shrink-0 p-3">
        <button
          type="button"
          onClick={onNew}
          disabled={disabled}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
        >
          <Plus className="h-4 w-4" /> Chat Baru
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
        {conversations.length === 0 && (
          <div className="flex flex-col items-center gap-1 px-2 py-8 text-center text-xs text-slate-400">
            <MessageSquare className="h-5 w-5" />
            Belum ada percakapan.
          </div>
        )}

        {pinned.length > 0 && (
          <p className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Disematkan
          </p>
        )}
        {pinned.map(renderItem)}

        {pinned.length > 0 && others.length > 0 && (
          <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Riwayat
          </p>
        )}
        {others.map(renderItem)}
      </div>
    </div>
  );
}