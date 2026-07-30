import os
import shutil
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, Form
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.db_models import Document, DocumentChunk, RAGSettingsModel
from app.models.schemas import DocumentResponse, DocumentRenameRequest
from app.rag.pipeline import RAGPipeline
from app.rag.chroma_client import vector_store
from app.utils.config import settings
from app.services.llm_service import llm_service

router = APIRouter(prefix="/api/documents", tags=["documents"])

ALLOWED_EXTENSIONS = {"pdf", "docx", "doc", "txt", "md", "markdown"}

def get_rag_settings(db: Session) -> RAGSettingsModel:
    st = db.query(RAGSettingsModel).first()
    if not st:
        st = RAGSettingsModel()
        db.add(st)
        db.commit()
        db.refresh(st)
    return st

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is empty.")

    ext = file.filename.split(".")[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '.{ext}'. Allowed formats: PDF, DOCX, TXT, MD."
        )

    # Read content & check size limit (25 MB)
    file_bytes = await file.read()
    file_size = len(file_bytes)
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if file_size > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum upload size of {settings.MAX_UPLOAD_SIZE_MB}MB."
        )

    if file_size == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # Save to disk
    doc_id = str(uuid.uuid4())
    safe_filename = file.filename.replace(" ", "_")
    saved_filename = f"{doc_id}_{safe_filename}"
    filepath = os.path.join(settings.UPLOADS_DIR, saved_filename)

    with open(filepath, "wb") as f:
        f.write(file_bytes)

    # Save record to Database with initial status 'uploading'
    doc = Document(
        id=doc_id,
        filename=file.filename,
        filepath=filepath,
        filetype=ext,
        filesize=file_size,
        status="uploading"
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Fetch RAG chunk settings
    rag_st = get_rag_settings(db)

    # Trigger background ingestion pipeline: Extracting -> Chunking -> Embedding -> Completed
    background_tasks.add_task(
        RAGPipeline.process_document,
        db=db,
        doc_id=doc_id,
        chunk_size=rag_st.chunk_size,
        chunk_overlap=rag_st.chunk_overlap
    )

    return doc

@router.get("", response_model=List[DocumentResponse])
def list_documents(db: Session = Depends(get_db)):
    docs = db.query(Document).order_by(Document.created_at.desc()).all()
    return docs

@router.get("/{doc_id}", response_model=DocumentResponse)
def get_document(doc_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    return doc

@router.delete("/{doc_id}")
def delete_document(doc_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    # Delete from ChromaDB vector store
    vector_store.delete_document_chunks(doc_id)

    # Delete local file
    if os.path.exists(doc.filepath):
        try:
            os.remove(doc.filepath)
        except Exception:
            pass

    # Delete DB record (cascades to DocumentChunk)
    db.delete(doc)
    db.commit()

    return {"message": "Document deleted successfully", "id": doc_id}

@router.patch("/{doc_id}/rename", response_model=DocumentResponse)
def rename_document(doc_id: str, req: DocumentRenameRequest, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    if not req.filename.strip():
        raise HTTPException(status_code=400, detail="Filename cannot be empty.")

    doc.filename = req.filename.strip()
    db.commit()
    db.refresh(doc)
    return doc

@router.get("/{doc_id}/summary")
def get_document_summary(doc_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    if doc.summary:
        return {"summary": doc.summary}

    # Generate summary on the fly if missing
    chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == doc_id).order_by(DocumentChunk.chunk_index).limit(10).all()
    text = "\n".join([c.content for c in chunks])
    if not text:
        return {"summary": "No text content available to summarize."}

    summary = llm_service.generate_document_summary(text)
    doc.summary = summary
    db.commit()

    return {"summary": summary}
