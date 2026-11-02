import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
});

// ---- Types (sesuai kontrak Pydantic di backend) ----
export interface DocumentItem {
  id: string;
  file_name: string;
  created_at: string;
}

export interface UploadResult {
  document_id: string;
  file_name: string;
  total_pages: number;
  total_chunks: number;
  created_at: string;
}

export interface Citation {
  page_number: number;
  source_text: string;
  document_name?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  isError?: boolean;
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
    if (!err.response) return 'Tidak dapat terhubung ke server. Pastikan backend berjalan.';
  }
  return fallback;
}

export const listDocuments = async () =>
  (await api.get<DocumentItem[]>('/documents')).data;

export const uploadDocument = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return (await api.post<UploadResult>('/upload', formData)).data;
};

export const sendChat = async (query: string, documentId: string) =>
  (await api.post<{ answer: string; citations: Citation[] }>('/chat', {
    query,
    document_id: documentId,
  })).data;


export const generateFlowchart = async (documentId: string) =>
  (await api.post<FlowchartData>('/generate-flowchart', {
    document_id: documentId,
  })).data;

export const deleteDocument = async (id: string) => {
  await api.delete(`/documents/${id}`);
};