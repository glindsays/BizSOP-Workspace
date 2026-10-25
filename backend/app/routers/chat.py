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
        # 1. Ambil potongan teks relevan
        retrieved_chunks = retrieve_context(request.query, request.document_id)
        
        # Debugging log (bisa kamu lihat di terminal uvicorn)
        print(f"Query: {request.query} | Doc ID: {request.document_id} | Chunks Found: {len(retrieved_chunks)}")
        
        # 2. Ambil nama file asli berdasarkan document_id (jika ada)
        doc_name = "SOP Internal"
        if request.document_id:
            doc_query = supabase.table("documents").select("file_name").eq("id", request.document_id).execute()
            if doc_query.data and len(doc_query.data) > 0:
                doc_name = doc_query.data[0]["file_name"]

        # 3. Generate jawaban menggunakan AI (Gemini)
        rag_output = generate_rag_response(request.query, retrieved_chunks)
        
        # 4. Sisipkan nama dokumen ke setiap objek kutipan (citation)
        citations = []
        for cit in rag_output.get("citations", []):
            cit["document_name"] = doc_name
            citations.append(cit)

        return ChatResponse(
            answer=rag_output.get("answer", "Maaf, tidak dapat menghasilkan jawaban."),
            citations=citations
        )
        
    except Exception as e:
        print(f"Error in chat endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))