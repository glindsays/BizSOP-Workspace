import json
from app.core.database import supabase, gemini_client
from google.genai import types

def retrieve_context(query: str, document_id: str = None):
    """Mencari potongan teks (chunks) paling relevan dari Supabase pgvector."""
    # 1. Ubah query user menjadi vektor (768 dimensi)
    emb_response = gemini_client.models.embed_content(
        model='gemini-embedding-001',
        contents=query,
        config=types.EmbedContentConfig(output_dimensionality=768)
    )
    query_embedding = emb_response.embeddings[0].values

    # 2. Panggil fungsi RPC Supabase 'match_document_chunks'
    rpc_params = {
        "query_embedding": query_embedding,
        "match_threshold": 0.3, # Sesuaikan sensitivitas kemiripan
        "match_count": 5,       # Ambil 5 referensi teratas
        "filter_document_id": document_id
    }
    
    response = supabase.rpc("match_document_chunks", rpc_params).execute()
    return response.data

def generate_rag_response(query: str, retrieved_chunks: list):
    """Memanggil Gemini Flash dengan konteks dan instruksi sitasi."""
    if not retrieved_chunks:
        return {
            "answer": "Info tidak ditemukan dalam dokumen SOP yang diunggah.",
            "citations": []
        }

    # Format teks konteks dari chunks yang berhasil ditarik
    context_text = ""
    for idx, chunk in enumerate(retrieved_chunks):
        page_num = chunk.get('page_number', 1)
        chunk_text = chunk.get('chunk_text', '')
        context_text += f"\n--- Referensi {idx+1} (Halaman {page_num}) ---\n{chunk_text}\n"
    
    # System Prompt yang Fleksibel Namun Tetap Grounded
    system_instruction = """Anda adalah asisten AI internal perusahaan yang bertugas menjelaskan dokumen SOP.
    ATURAN UTAMA:
    1. Jawab pertanyaan berdasarkan 'Konteks Dokumen' yang diberikan.
    2. Jika pengguna meminta ringkasan, gambaran umum, atau menanyakan cara kerja SOP, RANGKUM poin-poin penting dari konteks yang tersedia.
    3. Jika informasi benar-benar TIDAK ADA sama sekali di konteks, jawab persis: "Info tidak ditemukan dalam dokumen SOP yang diunggah."
    4. Sertakan kutipan halaman [Page X] pada akhir kalimat fakta utama jika memungkinkan.
    5. Respons WAJIB menggunakan format JSON dengan skema berikut:
    {
    "answer": "Jawaban komprehensif Anda beserta sitasi [Page X].",
    "citations": [
        {
        "page_number": 1,
        "source_text": "potongan kalimat atau konteks ringkas dari teks sumber",
        "document_name": "SOP Internal"
        }
    ]
    }"""

    prompt = f"Konteks Dokumen:\n{context_text}\n\nPertanyaan User: {query}"

    try:
        # Menggunakan nama model Gemini Flash yang valid
        response = gemini_client.models.generate_content(
            model='gemini-3.8-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                system_instruction=system_instruction,
                temperature=0.2 # Sedikit fleksi agar mampu merangkum teks
            )
        )
        
        # Parse hasil JSON dari teks respons
        return json.loads(response.text)

    except Exception as e:
        print(f"Error pada Gemini API / Parsing: {e}")
        # Fallback jika parsing JSON dari LLM gagal
        return {
            "answer": "Terjadi kendala dalam memproses jawaban dari dokumen.",
            "citations": []
        }