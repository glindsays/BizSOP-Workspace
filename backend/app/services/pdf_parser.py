import fitz  # PyMuPDF
from typing import List, Dict

def parse_and_chunk_pdf(file_bytes: bytes, chunk_size: int = 800, overlap: int = 100) -> List[Dict]:
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    chunks = []
    
    for page_num in range(len(doc)):
        text = doc[page_num].get_text("text").strip()
        if not text:
            continue
            
        # Basic chunking dengan overlap
        start = 0
        while start < len(text):
            end = start + chunk_size
            chunk_text = text[start:end]
            
            chunks.append({
                "page_number": page_num + 1,
                "chunk_text": chunk_text
            })
            
            start += (chunk_size - overlap)
            
    return chunks