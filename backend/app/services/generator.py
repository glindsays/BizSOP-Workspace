import json
from app.core.database import gemini_client
from google.genai import types

def generate_flowchart_and_checklist(sop_text: str):
    """Memanggil Gemini Flash untuk mengonversi teks SOP menjadi Mermaid dan Checklist."""
    
    system_instruction = """Anda adalah Business Analyst ahli.
    Ubah teks prosedur Standar Operasional Prosedur (SOP) berikut menjadi format terstruktur.
    
    ATURAN KETAT MERMAID.JS:
    1. Arah diagram WAJIB menggunakan 'graph TD' atau 'graph LR'.
    2. Semua teks di dalam node WAJIB dibungkus dengan tanda kutip ganda untuk menghindari syntax error (Contoh Benar: A["Mulai Proses"] --> B["Validasi HR"]).
    3. Jangan sertakan format blockquote markdown (```mermaid) pada nilai JSON. Kembalikan raw string saja.

    ATURAN KETAT CHECKLIST:
    1. Buat daftar berurutan (step-by-step) dari prosedur yang ada.
    2. Identifikasi siapa (role/aktor) yang bertanggung jawab pada tiap langkah.

    SKEMA JSON WAJIB:
    {
      "mermaid_code": "graph TD\\nA[\"Mulai\"] --> B[\"Proses\"]",
      "checklist": [
        {
          "id": "step-1",
          "step_number": 1,
          "title": "Judul tugas singkat",
          "description": "Deskripsi detail dari langkah kerja",
          "role": "Jabatan/Aktor (misal: HR Admin)"
        }
      ]
    }"""

    response = gemini_client.models.generate_content(
        model='gemini-3.5-flash-lite',
        contents=f"Teks SOP untuk diproses:\n{sop_text}",
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            system_instruction=system_instruction,
            temperature=0.1 # 
        )
    )
    
    return json.loads(response.text)