from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from app.services.rag_engine import retrieve_context, generate_rag_response
from app.core.database import supabase

router = APIRouter()

# --- Skema Pydantic ---
class ChatRequest(BaseModel):
    document_id: Optional[str] = Field(None, description="Opsional: Filter by document ID")
    query: str = Field(..., min_length=1, description="Pertanyaan user")

class Citation(BaseModel):
    page_number: int
    source_text: str
    document_name: str

class ChatResponse(BaseModel):
    answer: str
    citations: List[Citation]

# --- Endpoint API ---
@router.post("/api/chat", response_model=ChatResponse)
async def chat_with_document(request: ChatRequest):
    try:
        # 1. Cari potongan dokumen relevan via RPC Supabase
        retrieved_chunks = retrieve_context(request.query, request.document_id)
        
        # 2. Opsional: Dapatkan nama file asli dokumen (jika ditemukan chunk-nya)
        if retrieved_chunks and request.document_id:
            doc_query = supabase.table("documents").select("file_name").eq("id", request.document_id).execute()
            doc_name = doc_query.data[0]["file_name"] if doc_query.data else "SOP Internal"
        else:
            doc_name = "SOP Internal"

        # 3. Generate jawaban menggunakan Gemini Flash
        rag_output = generate_rag_response(request.query, retrieved_chunks)
        
        # 4. Tambahkan document_name ke setiap citation agar sesuai skema
        for cit in rag_output.get("citations", []):
            cit["document_name"] = doc_name

        return ChatResponse(
            answer=rag_output.get("answer", ""),
            citations=rag_output.get("citations", [])
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))