from fastapi import FastAPI
from app.routers import upload

app = FastAPI(title="BizSOP Flow API", version="1.0.0")

app.include_router(upload.router)

# Add this new block for the root URL
@app.get("/")
def read_root():
    return {"message": "Welcome to the BizSOP Flow API!"}

@app.get("/health")
async def health_check():
    return {"status": "ok", "project": "BizSOP Flow"}
