import os
from dotenv import load_dotenv
from supabase import create_client, Client
from google import genai

# Memuat berkas .env
load_dotenv()

# Supabase Client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Gemini Client
# GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
# gemini_client = genai.Client(api_key=GEMINI_API_KEY)

keys_env = os.getenv("GEMINI_API_KEYS", "") or os.getenv("GEMINI_API_KEY", "")
GEMINI_API_KEYS = [k.strip() for k in keys_env.split(",") if k.strip()]

if not GEMINI_API_KEYS:
    raise ValueError("Tidak ada Gemini API Key yang ditemukan di file .env!")

_current_key_index = 0

def get_gemini_client() -> genai.Client:
    """Mengembalikan instance genai.Client dengan API Key yang berotasi otomatis."""
    global _current_key_index
    
    api_key = GEMINI_API_KEYS[_current_key_index]
    
    _current_key_index = (_current_key_index + 1) % len(GEMINI_API_KEYS)
    
    return genai.Client(api_key=api_key)