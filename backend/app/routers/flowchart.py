from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List
from app.services.generator import generate_flowchart_and_checklist
from app.core.database import supabase

router = APIRouter()

# --- Skema Pydantic ---
class GenerateFlowchartRequest(BaseModel):
    document_id: str = Field(..., description="UUID dokumen SOP di Supabase")

class TaskChecklistItem(BaseModel):
    id: str = Field(..., description="Unique step identifier (e.g., 'step-1')")
    step_number: int = Field(..., description="Sequential order number")
    title: str = Field(..., description="Brief step title")
    description: str = Field(..., description="Detailed task explanation")
    role: str = Field(..., description="Responsible role/actor for this step")

class FlowchartResponse(BaseModel):
    mermaid_code: str = Field(..., description="Valid Mermaid.js syntax string")
    checklist: List[TaskChecklistItem] = Field(default_factory=list, description="Ordered checklist items")

# --- Endpoint API ---
@router.post("/api/generate-flowchart", response_model=FlowchartResponse)
async def generate_flowchart(request: GenerateFlowchartRequest):
    try:
        # 1. Ambil seluruh potongan teks (chunks) dari dokumen terkait di Supabase
        chunks_query = supabase.table("document_chunks") \
            .select("chunk_text") \
            .eq("document_id", request.document_id) \
            .order("page_number") \
            .execute()
            
        if not chunks_query.data:
            raise HTTPException(status_code=404, detail="Dokumen tidak ditemukan atau belum diproses.")

        # 2. Satukan potongan teks menjadi satu konteks utuh
        full_sop_text = "\n".join([chunk["chunk_text"] for chunk in chunks_query.data])

        # 3. Generate Mermaid & Checklist menggunakan Gemini
        genai_output = generate_flowchart_and_checklist(full_sop_text)

        # 4. Kembalikan data sesuai kontrak FlowchartResponse
        return FlowchartResponse(
            mermaid_code=genai_output.get("mermaid_code", ""),
            checklist=genai_output.get("checklist", [])
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))