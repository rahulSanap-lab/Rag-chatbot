from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.models.db_models import RAGSettingsModel
from app.models.schemas import RAGSettingsSchema

router = APIRouter(prefix="/api/settings", tags=["settings"])

def get_or_create_settings(db: Session) -> RAGSettingsModel:
    st = db.query(RAGSettingsModel).first()
    if not st:
        st = RAGSettingsModel()
        db.add(st)
        db.commit()
        db.refresh(st)
    return st

@router.get("", response_model=RAGSettingsSchema)
def get_settings(db: Session = Depends(get_db)):
    st = get_or_create_settings(db)
    return RAGSettingsSchema.model_validate(st)

@router.put("", response_model=RAGSettingsSchema)
def update_settings(req: RAGSettingsSchema, db: Session = Depends(get_db)):
    st = get_or_create_settings(db)
    
    st.llm_model = req.llm_model
    st.temperature = req.temperature
    st.max_tokens = req.max_tokens
    st.top_k = req.top_k
    st.chunk_size = req.chunk_size
    st.chunk_overlap = req.chunk_overlap
    st.embedding_provider = req.embedding_provider

    db.commit()
    db.refresh(st)
    return RAGSettingsSchema.model_validate(st)
