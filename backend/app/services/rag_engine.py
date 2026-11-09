# import json
# from app.core.database import supabase, gemini_client
# from google.genai import types

# import time
# from google.genai import errors

# # Urutan prioritas: model pertama dicoba dulu, sisanya cadangan.
# # Sesuaikan dengan nama model yang tersedia di akunmu.
# MODEL_FALLBACKS = [
#     "gemini-3.8-flash",
#     "gemini-3.7-flash",
#     "gemini-3.5-flash",
#     "gemini-3.5-flash-lite",
#     "gemini-3.1-flash-lite",
# ]

# def generate_with_fallback(contents, config, models=MODEL_FALLBACKS, max_seconds=50):
#     """Coba tiap model berurutan. Model yang overload/kena limit langsung dilewati
#     (mengulang model yang sedang overload jarang membantu). Berhenti mencoba model
#     baru bila total waktu melewati max_seconds supaya request tidak menggantung."""
#     deadline = time.monotonic() + max_seconds
#     last_error = None
#     for model in models:
#         if time.monotonic() > deadline:
#             break
#         try:
#             response = gemini_client.models.generate_content(
#                 model=model, contents=contents, config=config
#             )
#             print(f"[LLM] berhasil memakai {model}")
#             return response
#         except errors.APIError as e:
#             last_error = e
#             print(f"[LLM] {model} gagal (kode {e.code}), lanjut ke model berikutnya")
#             if e.code in (400, 401, 403):
#                 raise  # salah request atau kunci, model lain tidak membantu
#         except Exception as e:  # timeout / koneksi putus
#             last_error = e
#             print(f"[LLM] {model} error ({type(e).__name__}), lanjut ke model berikutnya")
#     if last_error:
#         raise last_error
#     raise TimeoutError("Semua model AI tidak merespons tepat waktu.")

# def _embed_query(query: str):
#     """Ubah query user menjadi vektor (768 dimensi)."""
#     emb_response = gemini_client.models.embed_content(
#         model='gemini-embedding-001',
#         contents=query,
#         config=types.EmbedContentConfig(output_dimensionality=768)
#     )
#     return emb_response.embeddings[0].values

# def _match_chunks(query_embedding, document_id=None, match_count: int = 5):
#     rpc_params = {
#         "query_embedding": query_embedding,
#         "match_threshold": 0.3,  # Sesuaikan sensitivitas kemiripan
#         "match_count": match_count,
#         "filter_document_id": document_id
#     }
#     response = supabase.rpc("match_document_chunks", rpc_params).execute()
#     return response.data or []

# def retrieve_context(query: str, document_ids=None, match_count: int = 5):
#     """Mencari potongan teks (chunks) paling relevan dari Supabase pgvector.

#     `document_ids` bisa berupa:
#     - None / list kosong -> cari di seluruh dokumen
#     - string satu UUID   -> cari di satu dokumen (kompatibel dengan versi lama)
#     - list UUID          -> cari di tiap dokumen lalu gabungkan hasil terbaik
#     """
#     query_embedding = _embed_query(query)

#     if isinstance(document_ids, str):
#         document_ids = [document_ids]
#     document_ids = [d for d in (document_ids or []) if d]

#     # Tanpa filter: satu panggilan RPC saja
#     if not document_ids:
#         return _match_chunks(query_embedding, None, match_count)

#     # Satu dokumen: sama seperti sebelumnya
#     if len(document_ids) == 1:
#         chunks = _match_chunks(query_embedding, document_ids[0], match_count)
#         for c in chunks:
#             c.setdefault("document_id", document_ids[0])
#         return chunks

#     # Banyak dokumen: RPC per dokumen (fungsi SQL hanya menerima satu filter),
#     # lalu ambil chunk paling mirip dari gabungan semuanya.
#     merged = []
#     for doc_id in document_ids:
#         for c in _match_chunks(query_embedding, doc_id, match_count):
#             c.setdefault("document_id", doc_id)
#             merged.append(c)

#     merged.sort(key=lambda c: c.get("similarity") or 0, reverse=True)
#     return merged[:match_count * 2]

# def rewrite_query(query: str, history: list) -> str:
#     """Ubah pertanyaan lanjutan ('yang kedua?') jadi pertanyaan mandiri untuk pencarian vektor."""
#     if not history:
#         return query
#     transcript = "\n".join(
#         f"{'User' if m['role'] == 'user' else 'Asisten'}: {m['content'][:500]}"
#         for m in history[-6:]
#     )
#     prompt = (
#         "Tulis ulang 'Pertanyaan Terbaru' menjadi satu pertanyaan mandiri yang bisa dipahami tanpa riwayat, "
#         "dengan menyertakan topik/istilah penting dari riwayat bila pertanyaan itu merujuknya. "
#         "Jika sudah mandiri, kembalikan apa adanya. Balas HANYA dengan pertanyaannya.\n\n"
#         f"Riwayat:\n{transcript}\n\nPertanyaan Terbaru: {query}"
#     )
#     try:
#         response = generate_with_fallback(
#             contents=prompt,
#             config=types.GenerateContentConfig(temperature=0),
#             models=MODEL_FALLBACKS[-2:],  # model ringan, satu kali coba
#             max_seconds=1,
#         )
#         return (response.text or "").strip() or query
#     except Exception as e:
#         print(f"[rewrite_query] gagal, pakai query asli: {e}")
#         return query

# def generate_rag_response(query: str, retrieved_chunks: list, history: list = None):
#     """Memanggil Gemini Flash dengan konteks. Sumber ditandai lewat nomor referensi [R1], [R2], ...
#     yang nanti diubah server menjadi daftar kutipan lengkap."""
#     if not retrieved_chunks:
#         return {"answer": "Info tidak ditemukan dalam dokumen SOP yang diunggah."}

#     # Format teks konteks dari chunks yang berhasil ditarik
#     context_text = ""
#     for idx, chunk in enumerate(retrieved_chunks):
#         page_num = chunk.get('page_number', 1)
#         doc_name = chunk.get('document_name', 'SOP')
#         chunk_text = chunk.get('chunk_text', '')
#         context_text += f"\n--- [R{idx+1}] Dokumen: {doc_name}, Halaman {page_num} ---\n{chunk_text}\n"

#     system_instruction = """Anda adalah asisten AI internal perusahaan yang bertugas menjelaskan dokumen SOP.

#     ATURAN ISI:
#     1. Jawab HANYA berdasarkan 'Konteks Dokumen'. 'Riwayat Percakapan' (jika ada) hanya untuk memahami maksud pertanyaan, bukan sumber fakta.
#     2. Jika pengguna meminta ringkasan, gambaran umum, atau cara kerja SOP, RANGKUM poin-poin penting dari konteks.
#     3. Jika informasi benar-benar TIDAK ADA di konteks, jawab persis: "Info tidak ditemukan dalam dokumen SOP yang diunggah." (tanpa penanda sumber).
#     4. Konteks bisa berasal dari BEBERAPA dokumen. Kelompokkan jawaban per dokumen.

#     ATURAN SUMBER:
#     5. Akhiri setiap poin atau kalimat fakta dengan penanda sumber memakai NOMOR REFERENSI dari header konteks, contoh: [R1] atau [R2][R5]. Satu penanda per nomor, jangan digabung dengan koma.
#     6. JANGAN menulis "[Page X]", nomor halaman, atau nama file di dalam penanda. Hanya pakai nomor yang benar-benar ada di header konteks.

#     ATURAN FORMAT (Markdown, wajib rapi):
#     7. Judul tiap dokumen ditulis di barisnya sendiri dengan format **Nama Dokumen**, diikuti baris kosong.
#     8. Poin-poin memakai "- " di awal baris, satu poin per baris. Jangan memakai "*" sebagai bullet.
#     9. Langkah berurutan memakai "1. ", "2. ", dst. Jangan menomori judul dokumen.
#     10. Sub-poin diindentasi 4 spasi.
#     11. Beri baris kosong antara judul, paragraf, dan daftar.
#     12. Teks tebal ditulis **seperti ini** (tanpa spasi di dalam tanda), dan beri spasi atau tanda baca di sekitarnya.

#     FORMAT RESPONS: JSON dengan satu field:
#     {"answer": "jawaban Markdown lengkap beserta penanda sumber [R1]"}"""

#     history_text = ""
#     if history:
#         lines = [
#             f"{'User' if m['role'] == 'user' else 'Asisten'}: {m['content'][:500]}"
#             for m in history[-6:]
#         ]
#         history_text = "Riwayat Percakapan:\n" + "\n".join(lines) + "\n\n"

#     prompt = f"{history_text}Konteks Dokumen:\n{context_text}\n\nPertanyaan User: {query}"

#     try:
#         response = generate_with_fallback(
#             contents=prompt,
#             config=types.GenerateContentConfig(
#                 response_mime_type="application/json",
#                 system_instruction=system_instruction,
#                 temperature=0.2
#             )
#         )
#         data = json.loads(response.text)
#         if isinstance(data, list) and data:
#             data = data[0]
#         return data if isinstance(data, dict) else {"answer": str(data)}

#     except Exception as e:
#         import traceback
#         traceback.print_exc()  # tampilkan error lengkap di terminal
#         return {
#             "answer": f"Terjadi kendala dalam memproses jawaban dari dokumen. ({type(e).__name__}: {str(e)[:200]})"
#         }


import json
from app.core.database import supabase, get_gemini_client
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

def generate_with_fallback(contents, config, models=MODEL_FALLBACKS, max_seconds=50):
    """Coba tiap model berurutan. Model yang overload/kena limit langsung dilewati
    (mengulang model yang sedang overload jarang membantu). Berhenti mencoba model
    baru bila total waktu melewati max_seconds supaya request tidak menggantung."""
    deadline = time.monotonic() + max_seconds
    last_error = None
    for model in models:
        if time.monotonic() > deadline:
            break
        try:
            # Ambil client baru dengan API key yang berotasi otomatis
            client = get_gemini_client()
            
            response = client.models.generate_content(
                model=model, contents=contents, config=config
            )
            print(f"[LLM] berhasil memakai {model}")
            return response
        except errors.APIError as e:
            last_error = e
            print(f"[LLM] {model} gagal (kode {e.code}), lanjut ke model berikutnya")
            if e.code in (400, 401, 403):
                raise  # salah request atau kunci, model lain tidak membantu
        except Exception as e:  # timeout / koneksi putus
            last_error = e
            print(f"[LLM] {model} error ({type(e).__name__}), lanjut ke model berikutnya")
    if last_error:
        raise last_error
    raise TimeoutError("Semua model AI tidak merespons tepat waktu.")

def _embed_query(query: str):
    """Ubah query user menjadi vektor (768 dimensi)."""
    # Ambil client baru dengan API key yang berotasi otomatis
    client = get_gemini_client()
    
    emb_response = client.models.embed_content(
        model='gemini-embedding-001',
        contents=query,
        config=types.EmbedContentConfig(output_dimensionality=768)
    )
    return emb_response.embeddings[0].values

def _match_chunks(query_embedding, document_id=None, match_count: int = 5):
    rpc_params = {
        "query_embedding": query_embedding,
        "match_threshold": 0.3,  # Sesuaikan sensitivitas kemiripan
        "match_count": match_count,
        "filter_document_id": document_id
    }
    response = supabase.rpc("match_document_chunks", rpc_params).execute()
    return response.data or []

def retrieve_context(query: str, document_ids=None, match_count: int = 5):
    """Mencari potongan teks (chunks) paling relevan dari Supabase pgvector.

    `document_ids` bisa berupa:
    - None / list kosong -> cari di seluruh dokumen
    - string satu UUID    -> cari di satu dokumen (kompatibel dengan versi lama)
    - list UUID           -> cari di tiap dokumen lalu gabungkan hasil terbaik
    """
    query_embedding = _embed_query(query)

    if isinstance(document_ids, str):
        document_ids = [document_ids]
    document_ids = [d for d in (document_ids or []) if d]

    # Tanpa filter: satu panggilan RPC saja
    if not document_ids:
        return _match_chunks(query_embedding, None, match_count)

    # Satu dokumen: sama seperti sebelumnya
    if len(document_ids) == 1:
        chunks = _match_chunks(query_embedding, document_ids[0], match_count)
        for c in chunks:
            c.setdefault("document_id", document_ids[0])
        return chunks

    # Banyak dokumen: RPC per dokumen (fungsi SQL hanya menerima satu filter),
    # lalu ambil chunk paling mirip dari gabungan semuanya.
    merged = []
    for doc_id in document_ids:
        for c in _match_chunks(query_embedding, doc_id, match_count):
            c.setdefault("document_id", doc_id)
            merged.append(c)

    merged.sort(key=lambda c: c.get("similarity") or 0, reverse=True)
    return merged[:match_count * 2]

def rewrite_query(query: str, history: list) -> str:
    """Ubah pertanyaan lanjutan ('yang kedua?') jadi pertanyaan mandiri untuk pencarian vektor."""
    if not history:
        return query
    transcript = "\n".join(
        f"{'User' if m['role'] == 'user' else 'Asisten'}: {m['content'][:500]}"
        for m in history[-6:]
    )
    prompt = (
        "Tulis ulang 'Pertanyaan Terbaru' menjadi satu pertanyaan mandiri yang bisa dipahami tanpa riwayat, "
        "dengan menyertakan topik/istilah penting dari riwayat bila pertanyaan itu merujuknya. "
        "Jika sudah mandiri, kembalikan apa adanya. Balas HANYA dengan pertanyaannya.\n\n"
        f"Riwayat:\n{transcript}\n\nPertanyaan Terbaru: {query}"
    )
    try:
        response = generate_with_fallback(
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0),
            models=MODEL_FALLBACKS[-2:],  # model ringan, satu kali coba
            max_seconds=1,
        )
        return (response.text or "").strip() or query
    except Exception as e:
        print(f"[rewrite_query] gagal, pakai query asli: {e}")
        return query

def generate_rag_response(query: str, retrieved_chunks: list, history: list = None):
    """Memanggil Gemini Flash dengan konteks. Sumber ditandai lewat nomor referensi [R1], [R2], ...
    yang nanti diubah server menjadi daftar kutipan lengkap."""
    if not retrieved_chunks:
        return {"answer": "Info tidak ditemukan dalam dokumen SOP yang diunggah."}

    # Format teks konteks dari chunks yang berhasil ditarik
    context_text = ""
    for idx, chunk in enumerate(retrieved_chunks):
        page_num = chunk.get('page_number', 1)
        doc_name = chunk.get('document_name', 'SOP')
        chunk_text = chunk.get('chunk_text', '')
        context_text += f"\n--- [R{idx+1}] Dokumen: {doc_name}, Halaman {page_num} ---\n{chunk_text}\n"

    system_instruction = """Anda adalah asisten AI internal perusahaan yang bertugas menjelaskan dokumen SOP.

    ATURAN ISI:
    1. Jawab HANYA berdasarkan 'Konteks Dokumen'. 'Riwayat Percakapan' (jika ada) hanya untuk memahami maksud pertanyaan, bukan sumber fakta.
    2. Jika pengguna meminta ringkasan, gambaran umum, atau cara kerja SOP, RANGKUM poin-poin penting dari konteks.
    3. Jika informasi benar-benar TIDAK ADA di konteks, jawab persis: "Info tidak ditemukan dalam dokumen SOP yang diunggah." (tanpa penanda sumber).
    4. Konteks bisa berasal dari BEBERAPA dokumen. Kelompokkan jawaban per dokumen.

    ATURAN SUMBER:
    5. Akhiri setiap poin atau kalimat fakta dengan penanda sumber memakai NOMOR REFERENSI dari header konteks, contoh: [R1] atau [R2][R5]. Satu penanda per nomor, jangan digabung dengan koma.
    6. JANGAN menulis "[Page X]", nomor halaman, atau nama file di dalam penanda. Hanya pakai nomor yang benar-benar ada di header konteks.

    ATURAN FORMAT (Markdown, wajib rapi):
    7. Judul tiap dokumen ditulis di barisnya sendiri dengan format **Nama Dokumen**, diikuti baris kosong.
    8. Poin-poin memakai "- " di awal baris, satu poin per baris. Jangan memakai "*" sebagai bullet.
    9. Langkah berurutan memakai "1. ", "2. ", dst. Jangan menomori judul dokumen.
    10. Sub-poin diindentasi 4 spasi.
    11. Beri baris kosong antara judul, paragraf, dan daftar.
    12. Teks tebal ditulis **seperti ini** (tanpa spasi di dalam tanda), dan beri spasi atau tanda baca di sekitarnya.

    FORMAT RESPONS: JSON dengan satu field:
    {"answer": "jawaban Markdown lengkap beserta penanda sumber [R1]"}"""

    history_text = ""
    if history:
        lines = [
            f"{'User' if m['role'] == 'user' else 'Asisten'}: {m['content'][:500]}"
            for m in history[-6:]
        ]
        history_text = "Riwayat Percakapan:\n" + "\n".join(lines) + "\n\n"

    prompt = f"{history_text}Konteks Dokumen:\n{context_text}\n\nPertanyaan User: {query}"

    try:
        response = generate_with_fallback(
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                system_instruction=system_instruction,
                temperature=0.2
            )
        )
        data = json.loads(response.text)
        if isinstance(data, list) and data:
            data = data[0]
        return data if isinstance(data, dict) else {"answer": str(data)}

    except Exception as e:
        import traceback
        traceback.print_exc()  # tampilkan error lengkap di terminal
        return {
            "answer": f"Terjadi kendala dalam memproses jawaban dari dokumen. ({type(e).__name__}: {str(e)[:200]})"
        }