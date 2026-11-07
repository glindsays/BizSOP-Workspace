from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.core.database import supabase

router = APIRouter()

# Catatan: memakai `def` (bukan `async def`) karena memanggil Supabase secara sinkron,
# supaya dijalankan di thread pool dan tidak memblokir request lain.

class ConversationCreate(BaseModel):
    title: str = "Chat Baru"
    document_ids: List[str] = Field(default_factory=list, description="Kosong = semua dokumen")

class ConversationUpdate(BaseModel):
    title: Optional[str] = None
    document_ids: Optional[List[str]] = None

class ConversationOut(BaseModel):
    id: str
    title: str
    document_ids: List[str]
    created_at: datetime
    updated_at: datetime

class MessageOut(BaseModel):
    id: str
    role: str
    content: str
    citations: List[dict] = Field(default_factory=list)
    created_at: datetime

@router.get("/api/conversations", response_model=List[ConversationOut])
def list_conversations():
    try:
        res = supabase.table("conversations").select("*").order("updated_at", desc=True).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/conversations", response_model=ConversationOut)
def create_conversation(body: ConversationCreate):
    try:
        res = supabase.table("conversations").insert({
            "title": body.title,
            "document_ids": body.document_ids,
        }).execute()
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/api/conversations/{conversation_id}", response_model=ConversationOut)
def update_conversation(conversation_id: str, body: ConversationUpdate):
    changes = body.model_dump(exclude_none=True)
    if not changes:
        raise HTTPException(status_code=400, detail="Tidak ada perubahan.")
    try:
        res = supabase.table("conversations").update(changes).eq("id", conversation_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    if not res.data:
        raise HTTPException(status_code=404, detail="Percakapan tidak ditemukan.")
    return res.data[0]

@router.delete("/api/conversations/{conversation_id}")
def delete_conversation(conversation_id: str):
    try:
        supabase.table("conversations").delete().eq("id", conversation_id).execute()
        return {"status": "deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/conversations/{conversation_id}/messages", response_model=List[MessageOut])
def list_messages(conversation_id: str):
    try:
        res = supabase.table("messages") \
            .select("id, role, content, citations, created_at") \
            .eq("conversation_id", conversation_id) \
            .order("created_at") \
            .execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))