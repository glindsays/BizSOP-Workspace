'use client';

import React, { useState } from 'react';
import { Send, BookOpen, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChatMessage, api } from '@/lib/api';

// Definisikan tipe sitasi yang selaras dengan backend (page_number & source_text)
interface Citation {
  page_number: number;
  source_text: string;
  document_name?: string;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);

 const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Ubah dari 'question: input' menjadi 'query: input' agar sesuai dengan backend
      const res = await api.post('/chat', { query: input });
      
      const botMsg: ChatMessage = {
        role: 'assistant',
        content: res.data.answer,
        citations: res.data.citations,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (error) {
      console.error("Chat API Error:", error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Maaf, terjadi kesalahan saat menghubungi server AI.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Box Chat Utama */}
      <Card className="lg:col-span-2 h-[600px] flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-600" /> SOP AI Assistant (RAG Chat)
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-between overflow-hidden">
          <div className="overflow-y-auto space-y-4 pr-2 flex-1">
            {messages.length === 0 && (
              <p className="text-center text-slate-400 text-sm py-10">
                Tanyakan sesuatu seputar dokumen SOP yang telah diunggah...
              </p>
            )}
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && <Bot className="w-6 h-6 text-blue-600 shrink-0 mt-1" />}
                <div className={`p-3 rounded-lg max-w-[80%] ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-900'}`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                  {/* Sitasi Badge */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-slate-200 flex flex-wrap gap-2">
                      <span className="text-xs text-slate-500 font-medium">Sumber:</span>
                      {msg.citations.map((cite: any, i: number) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="cursor-pointer bg-white hover:bg-blue-50 text-blue-700 border-blue-300 text-xs flex items-center gap-1"
                          onClick={() => setSelectedCitation(cite)}
                        >
                          <BookOpen className="w-3 h-3" /> Hal {cite.page_number}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                {msg.role === 'user' && <User className="w-6 h-6 text-slate-600 shrink-0 mt-1" />}
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-4">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Contoh: Bagaimana prosedur mengajukan cuti tahunan?"
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <Button onClick={handleSend} disabled={loading}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Box Detail Sitasi PDF */}
      <Card className="h-[600px] overflow-hidden">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-600" /> Detail Kutipan Rujukan
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedCitation ? (
            <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between">
                <Badge className="bg-blue-600">Halaman {selectedCitation.page_number}</Badge>
                {selectedCitation.document_name && (
                  <span className="text-xs text-slate-500 font-medium">{selectedCitation.document_name}</span>
                )}
              </div>
              <p className="text-xs text-slate-700 italic leading-relaxed">
                &quot;{selectedCitation.source_text}&quot;
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-400">
              Klik pada badge halaman rujukan di dalam pesan bot untuk melihat potongan kutipan asli dari SOP.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}