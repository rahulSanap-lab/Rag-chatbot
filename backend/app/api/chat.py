import json
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.db_models import ChatSession, ChatMessage, RAGSettingsModel
from app.models.schemas import (
    ChatSessionCreate, ChatSessionRename, ChatSessionResponse,
    ChatSessionDetailResponse, ChatQueryRequest, ChatMessageResponse
)
from app.rag.pipeline import RAGPipeline
from app.services.pdf_export import PDFExporter

router = APIRouter(prefix="/api/chat", tags=["chat"])
logger = logging.getLogger(__name__)

def get_rag_settings(db: Session) -> RAGSettingsModel:
    st = db.query(RAGSettingsModel).first()
    if not st:
        st = RAGSettingsModel()
        db.add(st)
        db.commit()
        db.refresh(st)
    return st

@router.post("/sessions", response_model=ChatSessionResponse)
def create_session(req: Optional[ChatSessionCreate] = None, db: Session = Depends(get_db)):
    title = req.title if (req and req.title) else "New Chat"
    session = ChatSession(title=title)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

@router.get("/sessions", response_model=List[ChatSessionResponse])
def list_sessions(db: Session = Depends(get_db)):
    sessions = db.query(ChatSession).order_by(ChatSession.updated_at.desc()).all()
    result = []
    for s in sessions:
        msg_count = db.query(ChatMessage).filter(ChatMessage.session_id == s.id).count()
        result.append(ChatSessionResponse(
            id=s.id,
            title=s.title,
            created_at=s.created_at,
            updated_at=s.updated_at,
            message_count=msg_count
        ))
    return result

@router.get("/sessions/{session_id}", response_model=ChatSessionDetailResponse)
def get_session_detail(session_id: str, db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found.")
    
    messages = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at.asc()).all()
    return ChatSessionDetailResponse(
        id=session.id,
        title=session.title,
        created_at=session.created_at,
        updated_at=session.updated_at,
        message_count=len(messages),
        messages=messages
    )

@router.patch("/sessions/{session_id}", response_model=ChatSessionResponse)
def rename_session(session_id: str, req: ChatSessionRename, db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found.")
    
    session.title = req.title.strip() or "Untitled Chat"
    db.commit()
    db.refresh(session)
    return session

@router.delete("/sessions/{session_id}")
def delete_session(session_id: str, db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found.")
    
    db.delete(session)
    db.commit()
    return {"message": "Chat session deleted successfully", "id": session_id}

@router.post("/query")
def query_rag_chat(req: ChatQueryRequest, db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter(ChatSession.id == req.session_id).first()
    if not session:
        # Create session automatically if missing
        session = ChatSession(id=req.session_id, title=req.message[:30] or "New Chat")
        db.add(session)
        db.commit()

    # Save User message
    user_msg = ChatMessage(
        session_id=session.id,
        role="user",
        content=req.message
    )
    db.add(user_msg)
    db.commit()

    # Auto-update session title if it was 'New Chat'
    if session.title == "New Chat" or not session.title:
        session.title = req.message[:35] + ("..." if len(req.message) > 35 else "")

    # Execute RAG Pipeline
    rag_st = get_rag_settings(db)
    result = RAGPipeline.query_rag(
        db=db,
        query=req.message,
        document_ids=req.document_ids,
        rag_settings=rag_st
    )

    # Save Assistant message
    assistant_msg = ChatMessage(
        session_id=session.id,
        role="assistant",
        content=result["answer"],
        sources=result["sources"],
        confidence_score=result["confidence_score"]
    )
    db.add(assistant_msg)
    db.commit()

    return {
        "user_message": user_msg,
        "assistant_message": assistant_msg,
        "followup_questions": result.get("followup_questions", [])
    }

@router.post("/stream")
async def stream_rag_chat(req: ChatQueryRequest, db: Session = Depends(get_db)):
    """Server-Sent Events (SSE) streaming endpoint for AI response."""
    session = db.query(ChatSession).filter(ChatSession.id == req.session_id).first()
    if not session:
        session = ChatSession(id=req.session_id, title=req.message[:35] or "New Chat")
        db.add(session)
        db.commit()

    # Save user message
    user_msg = ChatMessage(session_id=session.id, role="user", content=req.message)
    db.add(user_msg)
    db.commit()

    if session.title == "New Chat" or not session.title:
        session.title = req.message[:35] + ("..." if len(req.message) > 35 else "")
        db.commit()

    async def event_generator():
        try:
            rag_st = get_rag_settings(db)
            result = RAGPipeline.query_rag(
                db=db,
                query=req.message,
                document_ids=req.document_ids,
                rag_settings=rag_st
            )

            # Save Assistant message
            assistant_msg = ChatMessage(
                session_id=session.id,
                role="assistant",
                content=result["answer"],
                sources=result["sources"],
                confidence_score=result["confidence_score"]
            )
            db.add(assistant_msg)
            db.commit()

            # First send metadata (sources, confidence, followups)
            meta_payload = {
                "type": "meta",
                "message_id": assistant_msg.id,
                "sources": result["sources"],
                "confidence_score": result["confidence_score"],
                "followup_questions": result.get("followup_questions", [])
            }
            yield f"data: {json.dumps(meta_payload)}\n\n"

            # Stream words/chunks of full answer
            answer = result["answer"]
            chunk_words = answer.split(" ")
            for i in range(0, len(chunk_words), 3):
                sub_text = " ".join(chunk_words[i:i+3]) + " "
                token_payload = {"type": "token", "content": sub_text}
                yield f"data: {json.dumps(token_payload)}\n\n"

            yield f"data: {json.dumps({'type': 'done'})}\n\n"
        except Exception as err:
            logger.error(f"Error in stream_rag_chat: {err}")
            err_text = f"⚠️ Error: {str(err)}"
            meta_payload = {
                "type": "meta",
                "sources": [],
                "confidence_score": 0.0,
                "followup_questions": []
            }
            yield f"data: {json.dumps(meta_payload)}\n\n"
            token_payload = {"type": "token", "content": err_text}
            yield f"data: {json.dumps(token_payload)}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.get("/sessions/{session_id}/export-pdf")
def export_chat_pdf(session_id: str, db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found.")

    messages = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at.asc()).all()
    msg_dicts = [{"role": m.role, "content": m.content, "sources": m.sources} for m in messages]

    pdf_buffer = PDFExporter.export_chat_session(session.title, msg_dicts)
    filename = f"chat_{session.title.replace(' ', '_')}.pdf"

    return Response(
        content=pdf_buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
