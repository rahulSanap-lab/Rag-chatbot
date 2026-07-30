from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import os
import logging

from app.database.connection import init_db
from app.utils.config import settings
from app.api import documents, chat, dashboard, settings as settings_api

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("ragchat_backend")

# Initialize database
init_db()

app = FastAPI(
    title="AI RAG Chatbot Backend API",
    description="Retrieval-Augmented Generation Chatbot powered by FastAPI, ChromaDB & Groq LLaMA 3.3",
    version="1.0.0"
)

# CORS Configuration
origins = [
    "https://rahulsanap-lab.github.io",
    "https://rag-chatbot-15m0.onrender.com",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.github\.io",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for uploads
os.makedirs(settings.UPLOADS_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOADS_DIR), name="uploads")

# Include Routers
app.include_router(documents.router)
app.include_router(chat.router)
app.include_router(dashboard.router)
app.include_router(settings_api.router)

@app.get("/health")
@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "service": "AI RAG Chatbot Backend",
        "llm_default": settings.DEFAULT_LLM_MODEL,
        "embedding_provider": settings.EMBEDDING_PROVIDER
    }

# Mount frontend build static files if present (for single service deployment)
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if os.path.exists(frontend_dist) and os.getenv("SERVE_FRONTEND", "").lower() == "true":
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": f"An internal server error occurred: {str(exc)}"}
    )

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
