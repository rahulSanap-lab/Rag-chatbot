from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.models.db_models import Document, ChatSession
from app.models.schemas import DashboardStats, DocumentResponse
from typing import List

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

def format_bytes(size: int) -> str:
    if size < 1024:
        return f"{size} B"
    elif size < 1024 * 1024:
        return f"{size / 1024:.1f} KB"
    elif size < 1024 * 1024 * 1024:
        return f"{size / (1024 * 1024):.2f} MB"
    else:
        return f"{size / (1024 * 1024 * 1024):.2f} GB"

@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db)):
    total_docs = db.query(Document).count()
    total_chats = db.query(ChatSession).count()
    
    docs = db.query(Document).all()
    storage_bytes = sum([d.filesize for d in docs if d.filesize])
    
    recent_docs = db.query(Document).order_by(Document.created_at.desc()).limit(5).all()

    return DashboardStats(
        total_documents=total_docs,
        total_chats=total_chats,
        storage_used_bytes=storage_bytes,
        storage_used_formatted=format_bytes(storage_bytes),
        recent_documents=[DocumentResponse.model_validate(d) for d in recent_docs]
    )
