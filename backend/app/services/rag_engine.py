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
    """Memanggil Gemini Flash dengan konteks dan instruksi ketat untuk sitasi."""
    if not retrieved_chunks:
        return {
            "answer": "Info tidak ditemukan dalam dokumen SOP yang diunggah.",
            "citations": []
        }

    # Format teks konteks dari chunks yang berhasil ditarik
    context_text = ""
    for idx, chunk in enumerate(retrieved_chunks):
        context_text += f"\n--- Referensi {idx+1} (Halaman {chunk['page_number']}) ---\n{chunk['chunk_text']}\n"
    
    # System Prompt Ketat (Grounding & Format JSON)
    system_instruction = """Anda adalah asisten AI internal perusahaan.
    ATURAN KETAT:
    1. Jawab pertanyaan HANYA berdasarkan 'Konteks Dokumen' yang diberikan.
    2. Jika jawaban tidak ada di konteks, JANGAN MENGARANG. Jawab persis dengan kalimat: "Info tidak ditemukan dalam dokumen SOP yang diunggah."
    3. Untuk setiap klaim faktual yang Anda tulis di jawaban, Anda WAJIB menyertakan kutipan inline dengan format [Page X].
    4. Respons Anda WAJIB menggunakan format JSON dengan skema berikut:
    {
      "answer": "Jawaban komprehensif Anda beserta sitasi [Page X] di akhir kalimat.",
      "citations": [
        {
          "page_number": angka halaman rujukan,
          "source_text": "potongan kalimat persis dari teks sumber sebagai bukti",
          "document_name": "Nama dokumen atau ID dari referensi"
        }
      ]
    }"""

    prompt = f"Konteks Dokumen:\n{context_text}\n\nPertanyaan User: {query}"

    # Panggil Gemini API (gemini-3.5-flash) dengan output JSON
    response = gemini_client.models.generate_content(
        model='gemini-3.5-flash-lite',
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            system_instruction=system_instruction,
            temperature=0.0 # Temperature 0 agar tidak halusinasi
        )
    )
    
    # Parse hasil JSON dari teks respons
    return json.loads(response.text)