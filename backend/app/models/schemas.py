from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict
from datetime import datetime

class DocumentBase(BaseModel):
    filename: str
    filetype: str
    filesize: int

class DocumentResponse(DocumentBase):
    id: str
    page_count: int
    status: str
    error_message: Optional[str] = None
    summary: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class DocumentRenameRequest(BaseModel):
    filename: str

class SourceReference(BaseModel):
    document_id: str
    document_name: str
    page_number: int
    snippet: str
    exact_paragraph: Optional[str] = None
    score: float

class ChatQueryRequest(BaseModel):
    session_id: str
    message: str
    document_ids: Optional[List[str]] = None # Optional document filter

class ChatMessageResponse(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    sources: Optional[List[SourceReference]] = None
    confidence_score: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ChatSessionCreate(BaseModel):
    title: Optional[str] = "New Chat"

class ChatSessionRename(BaseModel):
    title: str

class ChatSessionResponse(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: Optional[int] = 0

    class Config:
        from_attributes = True

class ChatSessionDetailResponse(ChatSessionResponse):
    messages: List[ChatMessageResponse] = []

class DashboardStats(BaseModel):
    total_documents: int
    total_chats: int
    storage_used_bytes: int
    storage_used_formatted: str
    recent_documents: List[DocumentResponse]

class RAGSettingsSchema(BaseModel):
    llm_model: str = "llama-3.3-70b-versatile"
    temperature: float = 0.2
    max_tokens: int = 1024
    top_k: int = 5
    chunk_size: int = 800
    chunk_overlap: int = 150
    embedding_provider: str = "sentence-transformers"

    class Config:
        from_attributes = True
