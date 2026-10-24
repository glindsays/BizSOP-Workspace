from app.core.database import supabase, gemini_client
from google.genai import types  # Pastikan mengimpor modul types

def process_and_store_embeddings(document_id: str, chunks: list):
    for chunk in chunks:
        # Gunakan 'gemini-embedding-001' dan minta Gemini 
        # secara langsung mengeluarkan vektor 768 dimensi via parameter config
        response = gemini_client.models.embed_content(
            model='gemini-embedding-001',
            contents=chunk["chunk_text"],
            config=types.EmbedContentConfig(output_dimensionality=768)
        )
        
        # Ambil nilainya (API sekarang menjamin ukuran array persis 768)
        embedding_vector = response.embeddings[0].values
        
        # Simpan ke Supabase pgvector
        supabase.table("document_chunks").insert({
            "document_id": document_id,
            "page_number": chunk["page_number"],
            "chunk_text": chunk["chunk_text"],
            "embedding": embedding_vector
        }).execute()