import re
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from app.services.rag_engine import retrieve_context, generate_rag_response, rewrite_query
from app.core.database import supabase

router = APIRouter()

DEFAULT_TITLE = "Chat Baru"
MSG_DELETED = "Dokumen yang dipilih sudah tidak tersedia. Pilih dokumen lain lewat tombol di kanan atas."
MSG_INDEXING = "Dokumen yang dipilih masih diproses (indexing). Coba tanyakan lagi dalam beberapa saat."
MSG_FAILED = "Dokumen yang dipilih gagal diindeks. Hapus lalu unggah ulang dokumen tersebut, atau pilih dokumen lain."
NOT_FOUND_PREFIX = "Info tidak ditemukan"

# Penanda sumber dari AI: [R3], [R2][R5], atau [R2, R5]
REF_PATTERN = re.compile(r"\[R(\d+(?:\s*,\s*R?\d+)*)\]")

# --- Skema Pydantic ---
class ChatRequest(BaseModel):
    conversation_id: Optional[str] = Field(None, description="Jika diisi, scope dokumen & riwayat diambil dari percakapan ini")
    document_id: Optional[str] = Field(None, description="Opsional: satu document ID (kompatibel versi lama)")
    document_ids: Optional[List[str]] = Field(None, description="Opsional: daftar document ID (dipakai bila tanpa conversation_id)")
    query: str = Field(..., min_length=1, description="Pertanyaan user")

    def selected_ids(self) -> List[str]:
        """Gabungkan document_id dan document_ids, buang duplikat, jaga urutan."""
        raw = list(self.document_ids or [])
        if self.document_id:
            raw.append(self.document_id)
        seen = set()
        ids = []
        for i in raw:
            if i and i not in seen:
                seen.add(i)
                ids.append(i)
        return ids

class Citation(BaseModel):
    ref: Optional[int] = None
    page_number: int
    source_text: str
    document_name: str
    document_id: Optional[str] = None

class ChatResponse(BaseModel):
    answer: str
    citations: List[Citation]
    message_id: Optional[str] = None
    conversation_title: Optional[str] = None

def _has_chunks(doc_ids: List[str]) -> bool:
    res = supabase.table("document_chunks").select("id").in_("document_id", doc_ids).limit(1).execute()
    return bool(res.data)

def _build_citations(answer: str, chunks: list):
    """Ubah penanda [R#] di jawaban jadi nomor kutipan berurutan [1], [2], ... dan
    bangun daftar kutipan (unik per dokumen + halaman) dari chunk yang benar-benar dirujuk.
    Kunci memakai document_id, bukan nama file, karena nama file bisa kembar."""
    citations: List[dict] = []
    key_to_num: dict = {}

    def cite_for(chunk) -> int:
        doc_key = chunk.get("document_id") or chunk.get("document_name")
        key = (doc_key, chunk.get("page_number"))
        if key not in key_to_num:
            text = (chunk.get("chunk_text") or "").strip()
            citations.append({
                "ref": len(citations) + 1,
                "page_number": int(chunk.get("page_number") or 1),
                "source_text": text if len(text) <= 500 else text[:497] + "…",
                "document_name": chunk.get("document_name") or "SOP Internal",
                "document_id": chunk.get("document_id"),
            })
            key_to_num[key] = len(citations)
        return key_to_num[key]

    def renumber(match):
        nums = []
        for n in re.findall(r"\d+", match.group(1)):
            i = int(n)
            if 1 <= i <= len(chunks):
                num = cite_for(chunks[i - 1])
                if num not in nums:
                    nums.append(num)
        return "".join(f"[{n}]" for n in nums)

    new_answer = REF_PATTERN.sub(renumber, answer)

    # AI lupa menandai sumber: pakai chunk paling relevan sebagai rujukan
    if not citations:
        for c in chunks[:3]:
            cite_for(c)

    return new_answer, citations

def _is_ready(doc: dict) -> bool:
    # Dokumen lama tanpa kolom status dianggap siap
    return doc.get("status") in (None, "ready")

# --- Endpoint API ---
# `def` (bukan `async def`): memanggil Supabase/Gemini secara sinkron, jadi dijalankan di
# thread pool dan tidak memblokir request lain.
@router.post("/api/chat", response_model=ChatResponse)
def chat_with_document(request: ChatRequest):
    try:
        doc_ids = request.selected_ids()
        history = []
        conv = None

        # 0. Muat percakapan (scope dokumen + riwayat terakhir)
        if request.conversation_id:
            conv_q = supabase.table("conversations").select("*") \
                .eq("id", request.conversation_id).execute()
            if not conv_q.data:
                raise HTTPException(status_code=404, detail="Percakapan tidak ditemukan.")
            conv = conv_q.data[0]
            doc_ids = conv.get("document_ids") or []

            hist_q = supabase.table("messages").select("role, content") \
                .eq("conversation_id", conv["id"]) \
                .order("created_at", desc=True).limit(8).execute()
            history = list(reversed(hist_q.data or []))

            # Simpan pesan user lebih dulu
            supabase.table("messages").insert({
                "conversation_id": conv["id"],
                "role": "user",
                "content": request.query,
            }).execute()

        # 1. Petakan document_id -> nama file & status; buang dokumen yang sudah dihapus
        name_by_id = {}
        premade_answer = None
        skipped_notes: List[str] = []  # dokumen yang tidak ikut dicari (belum siap / gagal)

        if doc_ids:
            doc_query = supabase.table("documents") \
                .select("id, file_name, status").in_("id", doc_ids).execute()
            rows = doc_query.data or []
            name_by_id = {d["id"]: d["file_name"] for d in rows}
            existing = [i for i in doc_ids if i in name_by_id]

            if not existing:
                premade_answer = MSG_DELETED
            else:
                if len(existing) != len(doc_ids) and conv:
                    # bersihkan scope percakapan dari dokumen yang sudah terhapus
                    supabase.table("conversations").update({"document_ids": existing}) \
                        .eq("id", conv["id"]).execute()

                by_id = {d["id"]: d for d in rows}
                ready_ids = [i for i in existing if _is_ready(by_id[i])]
                processing = [by_id[i]["file_name"] for i in existing if by_id[i].get("status") == "processing"]
                failed = [by_id[i]["file_name"] for i in existing if by_id[i].get("status") == "failed"]

                if not ready_ids:
                    premade_answer = MSG_INDEXING if processing else MSG_FAILED
                else:
                    doc_ids = ready_ids
                    if processing:
                        skipped_notes.append("masih diindeks dan belum dipakai: " + ", ".join(processing))
                    if failed:
                        skipped_notes.append("gagal diindeks dan tidak dipakai: " + ", ".join(failed))

        # 2. Retrieval + generasi jawaban
        retrieved_chunks = []
        if premade_answer:
            rag_output = {"answer": premade_answer}
        else:
            search_query = rewrite_query(request.query, history)
            retrieved_chunks = retrieve_context(search_query, doc_ids)
            print(f"Query: {request.query} | Search: {search_query} | Doc IDs: {doc_ids or 'semua'} | Chunks Found: {len(retrieved_chunks)}")

            if not retrieved_chunks and doc_ids and not _has_chunks(doc_ids):
                # Dokumen siap tapi belum punya chunk (data lama / tidak konsisten)
                rag_output = {"answer": MSG_INDEXING}
            else:
                # Mode "semua dokumen": ambil nama dari chunk yang terpakai
                if not doc_ids:
                    chunk_doc_ids = list({c.get("document_id") for c in retrieved_chunks if c.get("document_id")})
                    if chunk_doc_ids:
                        dq = supabase.table("documents").select("id, file_name").in_("id", chunk_doc_ids).execute()
                        name_by_id = {d["id"]: d["file_name"] for d in (dq.data or [])}

                fallback = next(iter(name_by_id.values()), "SOP Internal")
                for chunk in retrieved_chunks:
                    chunk["document_name"] = name_by_id.get(chunk.get("document_id"), fallback)

                rag_output = generate_rag_response(request.query, retrieved_chunks, history)

        # 3. Bangun daftar kutipan dari nomor referensi yang dipakai AI
        answer = rag_output.get("answer") or "Maaf, tidak dapat menghasilkan jawaban."
        citations = []
        if retrieved_chunks and not answer.strip().startswith(NOT_FOUND_PREFIX):
            answer, citations = _build_citations(answer, retrieved_chunks)

        # Catatan bila ada dokumen terpilih yang tidak ikut dicari
        if skipped_notes and not premade_answer:
            answer = answer.rstrip() + "\n\n_Catatan: " + "; ".join(skipped_notes) + "._"

        # 4. Simpan jawaban + perbarui judul/urutan percakapan
        message_id = None
        new_title = None
        if conv:
            saved = supabase.table("messages").insert({
                "conversation_id": conv["id"],
                "role": "assistant",
                "content": answer,
                "citations": citations,
            }).execute()
            message_id = saved.data[0]["id"]

            changes = {"updated_at": datetime.now(timezone.utc).isoformat()}
            if conv.get("title") == DEFAULT_TITLE:
                q = request.query.strip()
                new_title = q if len(q) <= 60 else q[:57] + "…"
                changes["title"] = new_title
            supabase.table("conversations").update(changes).eq("id", conv["id"]).execute()

        return ChatResponse(
            answer=answer,
            citations=citations,
            message_id=message_id,
            conversation_title=new_title,
        )

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error in chat endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))