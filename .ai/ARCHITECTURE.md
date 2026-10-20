# BizSOP Flow — System Architecture & Engineering Rules

## 1. Stack & System Topography

### Tech Stack Specifications

- **Frontend**: Next.js 14+ (App Router, TypeScript Strict Mode), Tailwind CSS, Shadcn UI, `@mermaid-js/mermaid`.
- **Backend**: Python 3.11+, FastAPI (Async Endpoints), Pydantic v2, PyMuPDF (`fitz`), Google GenAI SDK.
- **Database & Vector Store**: Supabase PostgreSQL with `pgvector` extension.
- **AI Models**:
  - Embedding: `gemini-embedding-001` (768 dimensions).
  - Generative / RAG / JSON: `gemini-3.8-flash` with Structured Outputs.

---

## 2. Directory Layout & Module Responsibilities

```text
bizsop-flow/
├── .ai/
│   ├── ARCHITECTURE.md          # Architecture rules (this file)
│   └── CONTRACTS.md             # Shared API payload and DB schemas
├── .cursorrules                 # AI coding agent rules & guardrails
├── frontend/
│   ├── src/
│   │   ├── app/                 # Next.js App Router pages (/dashboard, /chat, /flowchart)
│   │   ├── components/
│   │   │   ├── ui/              # Shadcn UI primitive components
│   │   │   ├── flowchart/       # Mermaid.js dynamic client components
│   │   │   ├── chat/            # Citation-aware chat components
│   │   │   └── checklist/       # Interactive task checklist components
│   │   ├── lib/                 # Utility functions & API fetchers
│   │   └── types/               # TypeScript interfaces matching CONTRACTS.md
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py        # Environment variables & pydantic-settings
│   │   │   └── database.py      # Supabase client instantiation
│   │   ├── services/
│   │   │   ├── pdf_parser.py    # PyMuPDF text extraction & page-level chunking
│   │   │   ├── embedding.py     # Gemini embedding API integration
│   │   │   ├── rag_engine.py    # Vector search & citation prompt formatting
│   │   │   └── generator.py     # Gemini structured output for Mermaid & Checklist
│   │   ├── routers/
│   │   │   ├── upload.py        # POST /api/upload
│   │   │   ├── chat.py          # POST /api/chat
│   │   │   └── flowchart.py     # POST /api/generate-flowchart
│   │   └── main.py              # FastAPI app setup, CORS, route inclusions
│   └── requirements.txt
```

## 3. Database Schema & Vector RPC Specifications (Supabase SQL)

### SQL Definition (`schema.sql`)

AI agents must follow these exact table and function signatures when generating database queries or migrations:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents Table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document Chunks Table
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  page_number INT NOT NULL,
  chunk_text TEXT NOT NULL,
  embedding VECTOR(768),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vector Similarity Search RPC Function
CREATE OR REPLACE FUNCTION match_document_chunks (
  query_embedding VECTOR(768),
  match_threshold FLOAT,
  match_count INT,
  filter_document_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  page_number INT,
  chunk_text TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.page_number,
    dc.chunk_text,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  WHERE (filter_document_id IS NULL OR dc.document_id = filter_document_id)
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

## 4. Backend Implementation Rules

- **Async Endpoints**: All FastAPI endpoints in backend/app/routers/ must be asynchronous (async def).

- **Pydantic v2**: All request body validations and response models must use Pydantic v2 BaseModel.

- **PDF Ingestion & Chunking**:
  - Extract PDF text using PyMuPDF (fitz) page-by-page.
  - Maintain a strict 1-to-1 or N-to-1 mapping of text chunk to page_number metadata to ensure citation accuracy.
  - Target chunk size: ~500–800 characters with a 100-character overlap.

- **Gemini Integration**:
  - Use gemini-embedding-001 for vector embeddings (768 dimensions).
  - Use gemini-3.8-flash with response schema enforcement (response_mime_type="application/json")for flowchart and checklist generation.

## 5. AI Prompt & Generation Enforcement Rules

### Rule A: RAG System Prompt

When serving RAG requests (POST /api/chat), instruct Gemini Flash as follows:

- **Grounding Requirement**: Answer ONLY using the provided retrieved contexts.
- **Citation Format**: Every factual claim MUST end with an inline citation in the format [Page X] referencing page_number.
- **Out-of-Context Fallback**: If the query cannot be answered from the chunks, return: "Info tidak ditemukan dalam dokumen SOP yang diunggah."

### Rule B: Mermaid.js Syntax Strictness

When generating Mermaid flowcharts:

- **Direction**: Always use graph TD or graph LR.
- **Node Wrappers**: All node labels MUST be wrapped in double quotes to avoid syntax errors caused by special characters (), [], :, /, or -.
  Correct: A["Selesai Pengajuan (Form A)"] --> B["Approval Manager"]
  Incorrect: A[Selesai Pengajuan (Form A)] --> B[Approval Manager]
- **No Codeblock Formatting**: Return the raw Mermaid string or structure it inside a clean JSON schema field without extra backticks.

## 6. Frontend Integration Rules

- **Client-Side Rendering for Diagrams**: Mermaid rendering components MUST be loaded dynamically with ssr: false or encapsulated inside 'use client' hooks to avoid Server Components window is not defined errors.
- **Error Boundaries**: Wrap @mermaid-js/mermaid visualizers with a graceful fallback UI displaying: "Gagal merender diagram. Menampilkan teks prosedur terstruktur."
- **Citation Click Handlers**: Clicking on a [Page X] badge in the chat UI must automatically open or highlight the corresponding source snippet.
