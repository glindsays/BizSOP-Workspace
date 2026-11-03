import json
from app.core.database import supabase, gemini_client
from google.genai import types

import time
from google.genai import errors

# Urutan prioritas: model pertama dicoba dulu, sisanya cadangan.
# Sesuaikan dengan nama model yang tersedia di akunmu.
MODEL_FALLBACKS = [
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
]

def generate_with_fallback(contents, config, models=MODEL_FALLBACKS, retries_per_model=2):
    """Coba tiap model berurutan. Retry singkat kalau overload, lalu pindah model."""
    last_error = None
    for model in models:
        for attempt in range(retries_per_model):
            try:
                response = gemini_client.models.generate_content(
                    model=model, contents=contents, config=config
                )
                print(f"[LLM] berhasil memakai {model}")
                return response
            except errors.APIError as e:
                last_error = e
                print(f"[LLM] {model} gagal (kode {e.code}), percobaan {attempt + 1}")
                if e.code == 404:
                    break  # nama model tidak ada, langsung ke model berikutnya
                if e.code in (429, 500, 503, 504):
                    if attempt < retries_per_model - 1:
                        time.sleep(2 ** attempt)  # jeda 1 detik, lalu 2 detik
                    continue
                raise  # 400/401/403: salah request atau kunci, model lain tidak membantu
    raise last_error

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
        response = generate_with_fallback(
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                system_instruction=system_instruction,
                temperature=0.2
            )
        )
        return json.loads(response.text)

    except Exception as e:
        import traceback
        traceback.print_exc()  # tampilkan error lengkap di terminal
        return {
            "answer": f"Terjadi kendala dalam memproses jawaban dari dokumen. ({type(e).__name__}: {str(e)[:200]})",
            "citations": []
        }