# import time

# from google.genai import types

# from app.core.database import supabase, gemini_client

# EMBED_MODEL = "gemini-embedding-001"
# EMBED_DIM = 768
# EMBED_BATCH = 20    # jumlah teks per panggilan Gemini
# INSERT_BATCH = 50   # jumlah baris per insert Supabase
# MAX_RETRIES = 4


# def _embed_batch(texts: list) -> list:
#     """Embed beberapa teks sekaligus, dengan retry (backoff 1s, 2s, 4s)."""
#     for attempt in range(MAX_RETRIES):
#         try:
#             response = gemini_client.models.embed_content(
#                 model=EMBED_MODEL,
#                 contents=texts,
#                 config=types.EmbedContentConfig(output_dimensionality=EMBED_DIM),
#             )
#             vectors = [e.values for e in response.embeddings]
#             if len(vectors) != len(texts):
#                 raise ValueError(
#                     f"Jumlah embedding ({len(vectors)}) tidak sama dengan jumlah teks ({len(texts)})."
#                 )
#             return vectors
#         except Exception:
#             if attempt == MAX_RETRIES - 1:
#                 raise
#             time.sleep(2 ** attempt)


# def process_and_store_embeddings(document_id: str, chunks: list):
#     rows = []
#     for start in range(0, len(chunks), EMBED_BATCH):
#         batch = chunks[start:start + EMBED_BATCH]
#         vectors = _embed_batch([c["chunk_text"] for c in batch])
#         for chunk, vector in zip(batch, vectors):
#             rows.append({
#                 "document_id": document_id,
#                 "page_number": chunk["page_number"],
#                 "chunk_text": chunk["chunk_text"],
#                 "embedding": vector,
#             })

#     for start in range(0, len(rows), INSERT_BATCH):
#         supabase.table("document_chunks").insert(rows[start:start + INSERT_BATCH]).execute()



import time

from google.genai import types

from app.core.database import supabase, get_gemini_client

EMBED_MODEL = "gemini-embedding-001"
EMBED_DIM = 768
EMBED_BATCH = 20    # jumlah teks per panggilan Gemini
INSERT_BATCH = 50   # jumlah baris per insert Supabase
MAX_RETRIES = 4


def _embed_batch(texts: list) -> list:
    """Embed beberapa teks sekaligus, dengan retry (backoff 1s, 2s, 4s)."""
    for attempt in range(MAX_RETRIES):
        try:
            # Ambil client baru dengan API key yang berotasi otomatis setiap pemanggilan
            client = get_gemini_client()
            
            response = client.models.embed_content(
                model=EMBED_MODEL,
                contents=texts,
                config=types.EmbedContentConfig(output_dimensionality=EMBED_DIM),
            )
            vectors = [e.values for e in response.embeddings]
            if len(vectors) != len(texts):
                raise ValueError(
                    f"Jumlah embedding ({len(vectors)}) tidak sama dengan jumlah teks ({len(texts)})."
                )
            return vectors
        except Exception:
            if attempt == MAX_RETRIES - 1:
                raise
            time.sleep(2 ** attempt)


def process_and_store_embeddings(document_id: str, chunks: list):
    rows = []
    for start in range(0, len(chunks), EMBED_BATCH):
        batch = chunks[start:start + EMBED_BATCH]
        vectors = _embed_batch([c["chunk_text"] for c in batch])
        for chunk, vector in zip(batch, vectors):
            rows.append({
                "document_id": document_id,
                "page_number": chunk["page_number"],
                "chunk_text": chunk["chunk_text"],
                "embedding": vector,
            })

    for start in range(0, len(rows), INSERT_BATCH):
        supabase.table("document_chunks").insert(rows[start:start + INSERT_BATCH]).execute()