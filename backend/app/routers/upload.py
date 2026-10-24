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

@router.post("/api/upload", response_model=DocumentUploadResponse)
async def upload_document(
    background_tasks: BackgroundTasks, # Tambahkan parameter ini
    file: UploadFile = File(...)
):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Hanya file PDF yang didukung.")
        
    try:
        # 1. Simpan metadata
        doc_insert = supabase.table("documents").insert({
            "file_name": file.filename
        }).execute()
        document_id = doc_insert.data[0]["id"]
        
        # 2. Parsing dan Chunking
        file_bytes = await file.read()
        chunks = parse_and_chunk_pdf(file_bytes)
        
        # 3. Generate Embedding di Latar Belakang (Background Task)
        # Hapus "await" dan pindahkan ke background_tasks
        background_tasks.add_task(process_and_store_embeddings, document_id, chunks)
        
        total_pages = len(set(c["page_number"] for c in chunks))
        
        return DocumentUploadResponse(
            document_id=document_id,
            file_name=file.filename,
            total_pages=total_pages,
            total_chunks=len(chunks),
            created_at=datetime.utcnow()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))