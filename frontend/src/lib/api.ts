import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 180000,
});

// ---- Types (sesuai kontrak Pydantic di backend) ----
export type DocumentStatus = 'processing' | 'ready' | 'failed';

export interface DocumentItem {
  id: string;
  file_name: string;
  created_at: string;
  status?: DocumentStatus; // dokumen lama tanpa field ini dianggap 'ready'
  error_message?: string | null;
}

export interface UploadResult {
  document_id: string;
  file_name: string;
  total_pages: number;
  total_chunks: number;
  created_at: string;
}

export interface Citation {
  ref?: number;
  page_number: number;
  source_text: string;
  document_name?: string;
  document_id?: string; // kosong pada pesan lama
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: Citation[];
  isError?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  document_ids: string[]; // kosong = semua dokumen
  pinned?: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChecklistStep {
  id: string;
  step_number: number;
  title: string;
  description: string;
  role: string;
}

export interface FlowchartData {
  mermaid_code: string;
  checklist: ChecklistStep[];
}

// ---- Helpers ----
export function getErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (err.code === 'ECONNABORTED')
      return 'Server terlalu lama merespons. Prosesnya mungkin masih berjalan, coba muat ulang sebentar lagi.';
    if (!err.response) return 'Tidak dapat terhubung ke server. Pastikan backend berjalan.';
  }
  return fallback;
}

// True bila request tidak mendapat respons sama sekali (timeout / koneksi putus)
export function isNoResponse(err: unknown): boolean {
  return axios.isAxiosError(err) && !err.response;
}

// Dokumen
export const listDocuments = async () =>
  (await api.get<DocumentItem[]>('/documents')).data;

export const uploadDocument = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return (await api.post<UploadResult>('/upload', formData)).data;
};

export const deleteDocument = async (id: string) => {
  await api.delete(`/documents/${id}`);
};

// Percakapan
export const listConversations = async () =>
  (await api.get<Conversation[]>('/conversations')).data;

export const createConversation = async (documentIds: string[]) =>
  (await api.post<Conversation>('/conversations', { document_ids: documentIds })).data;

export const updateConversation = async (
  id: string,
  patch: { title?: string; document_ids?: string[]; pinned?: boolean }
) => (await api.patch<Conversation>(`/conversations/${id}`, patch)).data;

export const deleteConversation = async (id: string) => {
  await api.delete(`/conversations/${id}`);
};

export const getMessages = async (id: string) =>
  (await api.get<ChatMessage[]>(`/conversations/${id}/messages`)).data;

export const sendChat = async (query: string, conversationId: string) =>
  (await api.post<{
    answer: string;
    citations: Citation[];
    message_id?: string;
    conversation_title?: string;
  }>('/chat', { query, conversation_id: conversationId })).data;

// Flowchart
export const generateFlowchart = async (documentId: string) =>
  (await api.post<FlowchartData>('/generate-flowchart', {
    document_id: documentId,
  })).data;