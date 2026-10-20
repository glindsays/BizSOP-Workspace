````markdown
# BizSOP Flow — Shared API Contracts & Data Types

This contract file bridges the data structures between the **FastAPI backend** (Pydantic v2 schemas) and the **Next.js frontend** (TypeScript interfaces).

All API endpoints must adhere strictly to these schemas.

---

## 1. Document Management (`/api/upload`)

### Endpoint Details

- **Method:** `POST`
- **Content-Type:** `multipart/form-data`
- **Description:** Uploads a PDF document, parses text page-by-page, generates vector embeddings, and stores chunks in Supabase.

### Pydantic v2 Schema (Backend)

```python
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class DocumentUploadResponse(BaseModel):
    document_id: str = Field(
        ...,
        description="UUID of the saved document"
    )

    file_name: str = Field(
        ...,
        description="Original filename of the uploaded PDF"
    )

    total_pages: int = Field(
        ...,
        description="Total pages extracted from the PDF"
    )

    total_chunks: int = Field(
        ...,
        description="Total chunks embedded and stored"
    )

    created_at: datetime = Field(
        default_factory=datetime.utcnow
    )
```
````

### TypeScript Interface (Frontend)

```typescript
export interface DocumentUploadResponse {
  documentId: string;
  fileName: string;
  totalPages: number;
  totalChunks: number;
  createdAt: string;
}
```

---

## 2. RAG Chat Engine (`/api/chat`)

### Endpoint Details

- **Method:** `POST`
- **Content-Type:** `application/json`
- **Description:** Submits a user query, performs vector search in Supabase `pgvector`, and generates a grounded response with page-level citations.

### Pydantic v2 Schema (Backend)

```python
from pydantic import BaseModel, Field
from typing import List, Optional


class ChatRequest(BaseModel):
    document_id: Optional[str] = Field(
        None,
        description="Optional document UUID filter"
    )

    query: str = Field(
        ...,
        min_length=1,
        description="User query about the SOP"
    )


class Citation(BaseModel):
    page_number: int = Field(
        ...,
        description="PDF page number source"
    )

    source_text: str = Field(
        ...,
        description="Snippet chunk text used for grounding"
    )

    document_name: str = Field(
        ...,
        description="Name of the source PDF document"
    )


class ChatResponse(BaseModel):
    answer: str = Field(
        ...,
        description="Grounding-enforced answer from Gemini"
    )

    citations: List[Citation] = Field(
        default_factory=list,
        description="Array of source citations"
    )
```

### TypeScript Interface (Frontend)

```typescript
export interface Citation {
  pageNumber: number;
  sourceText: string;
  documentName: string;
}

export interface ChatRequest {
  documentId?: string;
  query: string;
}

export interface ChatResponse {
  answer: string;
  citations: Citation[];
}
```

---

## 3. Flowchart & Checklist Generator (`/api/generate-flowchart`)

### Endpoint Details

- **Method:** `POST`
- **Content-Type:** `application/json`
- **Description:** Extracts procedures from the SOP text and generates valid Mermaid.js syntax along with an interactive task checklist using Gemini Structured Outputs.

### Pydantic v2 Schema (Backend)

```python
from pydantic import BaseModel, Field
from typing import List


class GenerateFlowchartRequest(BaseModel):
    document_id: str = Field(
        ...,
        description="UUID of the document to process"
    )


class TaskChecklistItem(BaseModel):
    id: str = Field(
        ...,
        description="Unique step identifier (e.g., 'step-1')"
    )

    step_number: int = Field(
        ...,
        description="Sequential order number"
    )

    title: str = Field(
        ...,
        description="Brief step title"
    )

    description: str = Field(
        ...,
        description="Detailed task explanation"
    )

    role: str = Field(
        ...,
        description="Responsible role/actor for this step"
    )


class FlowchartResponse(BaseModel):
    mermaid_code: str = Field(
        ...,
        description="Valid Mermaid.js syntax string (e.g., graph TD...)"
    )

    checklist: List[TaskChecklistItem] = Field(
        default_factory=list,
        description="Ordered checklist items"
    )
```

### TypeScript Interface (Frontend)

```typescript
export interface TaskChecklistItem {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  role: string;
}

export interface GenerateFlowchartRequest {
  documentId: string;
}

export interface FlowchartResponse {
  mermaidCode: string;
  checklist: TaskChecklistItem[];
}
```

---

# API Contract Summary

| Endpoint                  | Method | Request                    | Response                 |
| ------------------------- | ------ | -------------------------- | ------------------------ |
| `/api/upload`             | `POST` | Multipart Form Data        | `DocumentUploadResponse` |
| `/api/chat`               | `POST` | `ChatRequest`              | `ChatResponse`           |
| `/api/generate-flowchart` | `POST` | `GenerateFlowchartRequest` | `FlowchartResponse`      |

---

# Naming Convention

The backend uses **snake_case** naming, following Python conventions.

The frontend uses **camelCase** naming, following TypeScript/JavaScript conventions.

| Backend (Pydantic) | Frontend (TypeScript) |
| ------------------ | --------------------- |
| `document_id`      | `documentId`          |
| `file_name`        | `fileName`            |
| `total_pages`      | `totalPages`          |
| `total_chunks`     | `totalChunks`         |
| `created_at`       | `createdAt`           |
| `page_number`      | `pageNumber`          |
| `source_text`      | `sourceText`          |
| `document_name`    | `documentName`        |
| `step_number`      | `stepNumber`          |
| `mermaid_code`     | `mermaidCode`         |

---

# Data Flow Overview

```text
                    ┌──────────────────────┐
                    │     Next.js Frontend │
                    │     TypeScript       │
                    └──────────┬───────────┘
                               │
                               │ API Request
                               ▼
                    ┌──────────────────────┐
                    │     FastAPI Backend  │
                    │     Pydantic v2       │
                    └──────────┬───────────┘
                               │
                 ┌─────────────┼─────────────┐
                 │             │             │
                 ▼             ▼             ▼
            /api/upload    /api/chat    /api/generate-flowchart
                 │             │             │
                 ▼             ▼             ▼
             Supabase      pgvector       Gemini
                 │             │             │
                 └─────────────┼─────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   Structured API     │
                    │      Response        │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │     Next.js UI       │
                    └──────────────────────┘
```

```

```
