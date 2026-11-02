'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Send, BookOpen, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Citation, DocumentItem } from '@/lib/api';
import { useApp } from '@/lib/app-context';
import { cn } from '@/lib/utils';

const SUGGESTIONS = [
  'Apa saja langkah-langkah prosedur dalam dokumen ini?',
  'Siapa yang bertanggung jawab pada setiap tahap?',
  'Dokumen atau persyaratan apa yang perlu disiapkan?',
];

export function ChatInterface({ doc }: { doc: DocumentItem }) {
  const { chats, sendMessage, pending } = useApp();
  const messages = chats[doc.id] ?? [];
  const loading = !!pending[doc.id];
  const [input, setInput] = useState('');
  const [selected, setSelected] = useState<Citation | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const last = messages[messages.length - 1];
  const interrupted = !loading && last?.role === 'user';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, loading]);

  const send = (text: string) => {
    if (!text.trim() || loading) return;
    setInput('');
    sendMessage(doc.id, text);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100dvh-9rem)] min-h-[520px]">
      {/* Chat */}
      <Card className="lg:col-span-2 flex flex-col min-h-0 gap-0 py-0 overflow-hidden">
        <CardHeader className="border-b py-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Bot className="w-4 h-4 text-indigo-600" /> Asisten SOP
            <span className="text-xs font-normal text-slate-400 truncate">· {doc.file_name}</span>
          </CardTitle>
        </CardHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8 space-y-4">
              <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <p className="font-medium text-slate-900">Tanyakan apa saja seputar SOP ini</p>
                <p className="text-sm text-slate-500">Jawaban disertai rujukan halaman dokumen.</p>
              </div>
              <div className="flex flex-col items-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-sm rounded-full border bg-white px-4 py-1.5 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              {msg.role === 'assistant' && <Bot className="w-6 h-6 text-indigo-600 shrink-0 mt-1" />}

              <div
                className={cn(
                  'p-3 rounded-xl max-w-[85%]',
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : msg.isError
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-slate-100 text-slate-900'
                )}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-200 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">Sumber:</span>
                    {msg.citations.map((cite, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        onClick={() => setSelected(cite)}
                        className={cn(
                          'cursor-pointer bg-white text-xs gap-1 hover:bg-indigo-50',
                          selected === cite
                            ? 'border-indigo-500 text-indigo-700'
                            : 'border-slate-300 text-slate-600'
                        )}
                      >
                        <BookOpen className="w-3 h-3" /> [{i + 1}] Hal {cite.page_number}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {msg.role === 'user' && <User className="w-6 h-6 text-slate-500 shrink-0 mt-1" />}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 items-center text-slate-500 text-sm">
              <Bot className="w-6 h-6 text-indigo-600 animate-pulse" />
              <div className="flex items-center gap-2 bg-slate-100 p-3 rounded-xl">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                <span>AI sedang menganalisis SOP...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
            {interrupted && (
            <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <span>Permintaan ini terputus sebelum jawaban datang.</span>
              <Button size="sm" variant="outline" onClick={() => send(last.content)}>
                Kirim ulang
              </Button>
            </div>
          )}
        </div>

        <div className="flex gap-2 p-3 border-t">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Contoh: Bagaimana prosedur mengajukan cuti tahunan?"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) send(input);
            }}
            disabled={loading}
          />
          <Button onClick={() => send(input)} disabled={loading || !input.trim()}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </Card>

      {/* Panel kutipan */}
      <Card className="min-h-0 overflow-y-auto">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600" /> Kutipan Rujukan
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selected ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Badge className="bg-indigo-600">Halaman {selected.page_number}</Badge>
                {selected.document_name && (
                  <span className="text-xs text-slate-500 truncate">{selected.document_name}</span>
                )}
              </div>
              <blockquote className="border-l-2 border-indigo-300 pl-3 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {selected.source_text}
              </blockquote>
            </div>
          ) : (
            <p className="text-xs text-slate-400">
              Klik badge &quot;Hal&quot; pada jawaban AI untuk melihat potongan teks asli dari SOP.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}