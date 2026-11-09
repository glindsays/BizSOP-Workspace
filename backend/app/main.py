from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import upload, chat, flowchart, conversations
from app.core.database import supabase


def _recover_stale_documents():
    """Task embedding berjalan di memori proses. Jika server restart, dokumen berstatus
    'processing' tidak akan pernah selesai, jadi tandai 'failed' agar user bisa menghapusnya.
    Asumsi: satu proses backend (tanpa banyak worker)."""
    try:
        stale = supabase.table("documents").select("id").eq("status", "processing").execute().data or []
        for d in stale:
            supabase.table("document_chunks").delete().eq("document_id", d["id"]).execute()
            supabase.table("documents").update({
                "status": "failed",
                "error_message": "Server dimulai ulang saat pengindeksan berlangsung. Hapus lalu unggah ulang.",
            }).eq("id", d["id"]).execute()
        if stale:
            print(f"[startup] {len(stale)} dokumen 'processing' yang tertinggal ditandai 'failed'.")
    except Exception as e:
        print(f"[startup] Pemulihan dokumen dilewati: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    _recover_stale_documents()
    yield


app = FastAPI(title="BizSOP Flow API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router)
app.include_router(chat.router)
app.include_router(flowchart.router)
app.include_router(conversations.router)

# Add this new block for the root URL
@app.get("/")
def read_root():
    return {"message": "Welcome to the BizSOP Flow API!"}

@app.get("/health")
async def health_check():
    return {"status": "ok", "project": "BizSOP Flow"}