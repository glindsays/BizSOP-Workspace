import json
import re

from google.genai import types

from app.services.rag_engine import generate_with_fallback

MAX_SOP_CHARS = 300_000  # batas teks yang dikirim ke AI (sekitar 75 ribu token)
MAX_STEPS = 60           # batas langkah checklist

SYSTEM_INSTRUCTION = """Anda adalah Business Analyst ahli.
Ubah teks prosedur Standar Operasional Prosedur (SOP) berikut menjadi format terstruktur.
Tulis semua teks dalam bahasa yang sama dengan dokumen.

ATURAN KETAT MERMAID.JS:
1. Baris pertama WAJIB 'graph TD' atau 'graph LR'.
2. ID node hanya huruf dan angka tanpa spasi (contoh: A, B, C1). Teks node WAJIB dibungkus tanda kutip ganda: A["Mulai Proses"]. Node keputusan: C{"Disetujui?"}.
3. DILARANG memakai tanda kutip ganda di dalam teks node. Pakai kutip tunggal atau hilangkan.
4. Label pada garis ditulis seperti ini: A -->|"Ya"| B.
5. Tulis satu hubungan per baris, dipisah baris baru yang sebenarnya.
6. Jangan sertakan format blockquote markdown (```mermaid) pada nilai JSON. Kembalikan raw string saja.
7. Jaga diagram tetap ringkas (sekitar 25 node). Untuk SOP panjang, gabungkan langkah kecil.

ATURAN KETAT CHECKLIST:
1. Buat daftar berurutan (step-by-step) dari prosedur yang ada, urutannya sama dengan diagram.
2. Identifikasi siapa (role/aktor) yang bertanggung jawab pada tiap langkah.

SKEMA JSON WAJIB:
{
  "mermaid_code": "graph TD\\nA[\\"Mulai\\"] --> B[\\"Proses\\"]",
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


def _clean_mermaid(code) -> str:
    code = (code or "").strip()
    code = re.sub(r"^```(?:mermaid)?\s*", "", code, flags=re.IGNORECASE)
    code = re.sub(r"\s*```$", "", code).strip()
    # AI kadang meng-escape ganda: ada "\n" harfiah tanpa baris baru sebenarnya
    if "\n" not in code and "\\n" in code:
        code = code.replace("\\n", "\n")
    return code


def _normalize_checklist(items) -> list:
    """Pastikan tiap langkah punya semua field, id unik, dan nomor berurutan."""
    if not isinstance(items, list):
        return []
    result = []
    for raw in items:
        if len(result) >= MAX_STEPS:
            break
        if not isinstance(raw, dict):
            continue
        title = str(raw.get("title") or "").strip()
        if not title:
            continue
        n = len(result) + 1
        result.append({
            "id": f"step-{n}",
            "step_number": n,
            "title": title,
            "description": str(raw.get("description") or "").strip(),
            "role": str(raw.get("role") or "").strip(),
        })
    return result


def generate_flowchart_and_checklist(sop_text: str):
    """Memanggil Gemini (dengan fallback model) untuk mengonversi teks SOP menjadi Mermaid dan Checklist."""
    truncated = len(sop_text) > MAX_SOP_CHARS
    if truncated:
        sop_text = sop_text[:MAX_SOP_CHARS]

    contents = f"Teks SOP untuk diproses:\n{sop_text}"
    if truncated:
        contents += "\n\n(Catatan: teks dipotong karena terlalu panjang. Proses bagian yang tersedia.)"

    response = generate_with_fallback(
        contents=contents,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            system_instruction=SYSTEM_INSTRUCTION,
            temperature=0.1,
        ),
        max_seconds=90,
    )

    raw = (response.text or "").strip()
    if not raw:
        raise ValueError("AI mengembalikan respons kosong. Coba generate ulang.")

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        raise ValueError("AI mengembalikan format yang tidak valid. Coba generate ulang.") from e

    if isinstance(data, list) and data:
        data = data[0]
    if not isinstance(data, dict):
        raise ValueError("AI mengembalikan struktur yang tidak dikenali. Coba generate ulang.")

    return {
        "mermaid_code": _clean_mermaid(data.get("mermaid_code")),
        "checklist": _normalize_checklist(data.get("checklist")),
    }