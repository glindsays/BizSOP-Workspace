'use client';

import { ChatInterface } from '@/components/ChatInterface';
import { RequireDocument } from '@/components/RequireDocument';

export default function ChatPage() {
  return <RequireDocument>{() => <ChatInterface />}</RequireDocument>;
}