from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from app.services.pdf_parser import parse_and_chunk_pdf
from app.services.embedding import process_and_store_embeddings
from app.core.database import supabase
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

class DocumentUploadResponse(BaseModel):
    document_id: str
    file_name: str
    total_pages: int
    total_chunks: int
    created_at: datetime

class DocumentItem(BaseModel):
    id: str
    file_name: str
    created_at: datetime
    status: str = "ready"  # processing | ready | failed
    error_message: Optional[str] = None

# Batasan ukuran file maksimal (10 MB)
MAX_FILE_SIZE = 10 * 1024 * 1024

@router.get("/api/documents", response_model=List[DocumentItem])
def list_documents():
    try:
        res = supabase.table("documents") \
            .select("id, file_name, created_at, status, error_message") \
            .order("created_at", desc=True) \
            .execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def _delete_doc(doc_id: str):
    supabase.table("document_chunks").delete().eq("document_id", doc_id).execute()
    supabase.table("documents").delete().eq("id", doc_id).execute()

@router.delete("/api/documents/{document_id}")
def delete_document(document_id: str):
    try:
        _delete_doc(document_id)
        return {"deleted": document_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/documents/cleanup")
def cleanup_documents():
    """Hapus dokumen tanpa chunk dan duplikat nama file (sisakan yang terbaru).
    Dokumen yang masih diproses (status 'processing') tidak disentuh."""
    try:
        docs = supabase.table("documents") \
            .select("id, file_name, created_at, status") \
            .order("created_at", desc=True) \
            .execute().data

        kept_names = set()
        deleted = []
        for d in docs:  # urut dari terbaru
            if d.get("status") == "processing":
                continue
            has_chunks = bool(
                supabase.table("document_chunks")
                .select("id").eq("document_id", d["id"]).limit(1)
                .execute().data
            )
            if has_chunks and d["file_name"] not in kept_names:
                kept_names.add(d["file_name"])
            else:
                _delete_doc(d["id"])
                deleted.append(d["id"])

        return {"deleted_count": len(deleted), "kept": len(kept_names)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Worker background: embedding berat dijalankan setelah respons dikirim
def background_process_embeddings(document_id: str, chunks: List[dict]):
    try:
        process_and_store_embeddings(document_id, chunks)
        supabase.table("documents").update({
            "status": "ready",
            "error_message": None,
        }).eq("id", document_id).execute()
    except Exception as e:
        print(f"Gagal memproses embedding untuk dokumen {document_id}: {e}")
        try:
            # Buang chunk setengah jadi, tapi pertahankan dokumen agar user melihat statusnya
            supabase.table("document_chunks").delete().eq("document_id", document_id).execute()
            supabase.table("documents").update({
                "status": "failed",
                "error_message": str(e)[:500],
            }).eq("id", document_id).execute()
        except Exception as inner:
            print(f"Gagal menandai dokumen {document_id} sebagai failed: {inner}")


@router.post("/api/upload", response_model=DocumentUploadResponse)
def upload_document(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Hanya file PDF yang didukung.")

    document_id = None
    try:
        # 1. Baca bytes file
        file_bytes = file.file.read()

        # Validasi ukuran file
        if len(file_bytes) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="Ukuran file terlalu besar (maksimal 10MB).")

        # 2. Parsing dan chunking (cepat, untuk hitung halaman & chunk)
        chunks = parse_and_chunk_pdf(file_bytes)
        total_pages = len(set(c["page_number"] for c in chunks))
        total_chunks = len(chunks)

        # 3. Simpan metadata dengan status 'processing'
        doc_insert = supabase.table("documents").insert({
            "file_name": file.filename,
            "status": "processing",
        }).execute()
        document_id = doc_insert.data[0]["id"]
        created_at = doc_insert.data[0]["created_at"]

        # 4. Embedding berjalan di background, status berubah jadi 'ready' / 'failed'
        background_tasks.add_task(background_process_embeddings, document_id, chunks)

        # 5. Langsung kembalikan respons ke klien
        return DocumentUploadResponse(
            document_id=document_id,
            file_name=file.filename,
            total_pages=total_pages,
            total_chunks=total_chunks,
            created_at=created_at,
        )

    except HTTPException as he:
        if document_id:
            try:
                _delete_doc(document_id)
            except Exception:
                pass
        raise he
    except Exception as e:
        if document_id:
            try:
                _delete_doc(document_id)
            except Exception:
                pass
        raise HTTPException(status_code=500, detail=str(e))