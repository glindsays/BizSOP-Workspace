from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List
from app.services.generator import generate_flowchart_and_checklist
from app.core.database import supabase

router = APIRouter()

# --- Skema Pydantic ---
class GenerateFlowchartRequest(BaseModel):
    document_id: str = Field(..., min_length=1, description="UUID dokumen SOP di Supabase (wajib)")

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
# `def` (bukan `async def`): Supabase dan Gemini dipanggil secara sinkron, jadi harus berjalan di
# thread pool supaya request lain (chat, daftar dokumen) tidak ikut menunggu.
@router.post("/api/generate-flowchart", response_model=FlowchartResponse)
def generate_flowchart(request: GenerateFlowchartRequest):
    try:
        # 0. Pastikan dokumen ada dan sudah siap (document_id tidak pernah ditebak server)
        doc_q = supabase.table("documents") \
            .select("id, file_name, status") \
            .eq("id", request.document_id) \
            .execute()
        if not doc_q.data:
            raise HTTPException(status_code=404, detail="Dokumen tidak ditemukan. Mungkin sudah dihapus.")

        doc = doc_q.data[0]
        status = doc.get("status")  # dokumen lama tanpa status dianggap siap
        if status == "processing":
            raise HTTPException(
                status_code=409,
                detail="Dokumen masih diindeks. Coba lagi beberapa saat setelah statusnya selesai.",
            )
        if status == "failed":
            raise HTTPException(
                status_code=409,
                detail="Dokumen ini gagal diindeks. Hapus lalu unggah ulang dokumennya.",
            )

        # 1. Ambil seluruh potongan teks (chunks) dokumen dari Supabase
        chunks_query = supabase.table("document_chunks") \
            .select("chunk_text") \
            .eq("document_id", request.document_id) \
            .order("page_number") \
            .execute()

        if not chunks_query.data:
            raise HTTPException(status_code=404, detail="Dokumen belum memiliki potongan teks.")

        # 2. Satukan potongan teks menjadi satu konteks utuh
        full_sop_text = "\n".join([chunk["chunk_text"] for chunk in chunks_query.data])

        # 3. Generate Mermaid & Checklist menggunakan Gemini
        genai_output = generate_flowchart_and_checklist(full_sop_text)

        mermaid_code = (genai_output.get("mermaid_code") or "").strip()
        if not mermaid_code:
            raise HTTPException(
                status_code=502,
                detail="AI tidak menghasilkan diagram untuk dokumen ini. Coba generate ulang.",
            )

        # 4. Kembalikan data sesuai kontrak FlowchartResponse
        return FlowchartResponse(
            mermaid_code=mermaid_code,
            checklist=genai_output.get("checklist", []),
        )

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error Generate Flowchart: {e}")
        raise HTTPException(status_code=500, detail=str(e))