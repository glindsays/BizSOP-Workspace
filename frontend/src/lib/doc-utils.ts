import type { DocumentItem } from '@/lib/api';

// Key localStorage untuk "buka chat baru yang terfokus ke satu dokumen"
export const NEW_CHAT_KEY = 'bizsop:new-chat-doc';

// Dokumen lama tanpa field status dianggap siap
export const isDocReady = (d: DocumentItem) => !d.status || d.status === 'ready';
export const isDocFailed = (d: DocumentItem) => d.status === 'failed';

// Filter dokumen berdasarkan nama file (tidak peka huruf besar/kecil)
export function filterDocuments(docs: DocumentItem[], query: string): DocumentItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return docs;
  return docs.filter((d) => d.file_name.toLowerCase().includes(q));
}

// Hapus data lokal (cache flowchart & progres checklist) milik satu dokumen
export function clearDocumentCaches(id: string) {
  try {
    localStorage.removeItem(`bizsop:flow:${id}`);
    localStorage.removeItem(`bizsop:checklist:${id}`);
  } catch {
    // penyimpanan tidak tersedia: abaikan
  }
}