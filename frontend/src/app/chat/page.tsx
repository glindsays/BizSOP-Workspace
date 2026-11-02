'use client';

import { ChatInterface } from '@/components/ChatInterface';
import { RequireDocument } from '@/components/RequireDocument';

export default function ChatPage() {
  return (
    <RequireDocument>{(doc) => <ChatInterface key={doc.id} doc={doc} />}</RequireDocument>
  );
}