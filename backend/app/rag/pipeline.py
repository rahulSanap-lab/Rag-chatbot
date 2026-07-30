import os
import uuid
import logging
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session

from app.models.db_models import Document, DocumentChunk, RAGSettingsModel
from app.services.extractor import DocumentExtractor
from app.rag.chroma_client import vector_store
from app.services.llm_service import llm_service
from app.utils.config import settings

logger = logging.getLogger(__name__)

class RAGPipeline:
    @staticmethod
    def chunk_text_with_pages(
        pages_content: List[Tuple[int, str]],
        chunk_size: int = 800,
        chunk_overlap: int = 150
    ) -> List[Dict[str, Any]]:
        """
        Splits text into chunks while preserving page mapping.
        Returns a list of dicts: {"chunk_index": int, "page_number": int, "content": str}
        """
        chunks = []
        chunk_index = 0

        for page_num, text in pages_content:
            if not text.strip():
                continue
            
            # Simple word/char windowing chunker
            words = text.split()
            if not words:
                continue

            # Estimate ~5 chars per word for chunk_size in characters
            words_per_chunk = max(20, chunk_size // 5)
            overlap_words = max(5, chunk_overlap // 5)
            step = max(1, words_per_chunk - overlap_words)

            for i in range(0, len(words), step):
                chunk_words = words[i : i + words_per_chunk]
                chunk_text = " ".join(chunk_words)
                if len(chunk_text.strip()) > 10:
                    chunks.append({
                        "chunk_index": chunk_index,
                        "page_number": page_num,
                        "content": chunk_text.strip()
                    })
                    chunk_index += 1

        return chunks

    @staticmethod
    def process_document(
        db: Session,
        doc_id: str,
        chunk_size: int = 800,
        chunk_overlap: int = 150
    ) -> bool:
        """
        Executes document ingestion stages:
        Extracting -> Chunking -> Embedding -> Completed
        """
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if not doc:
            logger.error(f"Document {doc_id} not found.")
            return False

        try:
            # Stage 1: Extracting
            doc.status = "extracting"
            db.commit()
            
            pages_content, total_pages = DocumentExtractor.extract_text_by_pages(doc.filepath, doc.filetype)
            doc.page_count = total_pages
            
            if not pages_content:
                doc.status = "failed"
                doc.error_message = "No extractable text content found in document."
                db.commit()
                return False

            # Stage 2: Chunking
            doc.status = "chunking"
            db.commit()
            
            chunks_data = RAGPipeline.chunk_text_with_pages(
                pages_content,
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap
            )

            if not chunks_data:
                doc.status = "failed"
                doc.error_message = "Failed to create chunks from document content."
                db.commit()
                return False

            # Save chunks to Database
            db_chunks = []
            chroma_ids = []
            chroma_texts = []
            chroma_metadatas = []

            for item in chunks_data:
                chunk_id = str(uuid.uuid4())
                db_chunk = DocumentChunk(
                    id=chunk_id,
                    document_id=doc.id,
                    chunk_index=item["chunk_index"],
                    page_number=item["page_number"],
                    content=item["content"]
                )
                db_chunks.append(db_chunk)

                chroma_ids.append(chunk_id)
                chroma_texts.append(item["content"])
                chroma_metadatas.append({
                    "document_id": doc.id,
                    "document_name": doc.filename,
                    "chunk_index": item["chunk_index"],
                    "page_number": item["page_number"]
                })

            db.add_all(db_chunks)
            db.commit()

            # Stage 3: Generating Embeddings & Storing in ChromaDB
            doc.status = "embedding"
            db.commit()

            vector_store.add_chunks(
                chunk_ids=chroma_ids,
                texts=chroma_texts,
                metadatas=chroma_metadatas
            )

            # Stage 4: Completed
            doc.status = "completed"
            
            # Generate brief summary in background if possible
            full_text = "\n".join([text for _, text in pages_content[:5]])
            try:
                doc.summary = llm_service.generate_document_summary(full_text)
            except Exception:
                doc.summary = f"Document containing {total_pages} page(s) and {len(chunks_data)} text chunk(s)."

            db.commit()
            logger.info(f"Successfully processed document {doc.filename} (ID: {doc.id}).")
            return True

        except Exception as e:
            logger.error(f"Error processing document {doc_id}: {e}")
            doc.status = "failed"
            doc.error_message = str(e)
            db.commit()
            return False

    @staticmethod
    def query_rag(
        db: Session,
        query: str,
        document_ids: Optional[List[str]] = None,
        rag_settings: Optional[RAGSettingsModel] = None
    ) -> Dict[str, Any]:
        """
        Executes query RAG workflow:
        1. Embed question & search vector store
        2. Format retrieved Top-K chunks as context
        3. Query Gemini LLM with strict system prompt
        4. Return response with detailed sources, confidence score, and follow-ups
        """
        top_k = rag_settings.top_k if rag_settings else settings.DEFAULT_TOP_K
        model_name = rag_settings.llm_model if rag_settings else settings.DEFAULT_LLM_MODEL
        temperature = rag_settings.temperature if rag_settings else settings.DEFAULT_TEMPERATURE
        max_tokens = rag_settings.max_tokens if rag_settings else settings.DEFAULT_MAX_TOKENS

        matches = vector_store.search_similar(
            query=query,
            top_k=top_k,
            document_ids=document_ids
        )

        if not matches:
            return {
                "answer": "I couldn't find that information in the uploaded documents.",
                "sources": [],
                "confidence_score": 0.0,
                "followup_questions": [
                    "What documents are currently uploaded?",
                    "Can you summarize the available files?",
                    "How do I upload a document?"
                ]
            }

        # Calculate average confidence score from Top-K matches
        top_scores = [m["score"] for m in matches]
        overall_confidence = round(sum(top_scores) / len(top_scores), 4)

        # Build context string
        context_parts = []
        sources = []

        for idx, match in enumerate(matches, 1):
            meta = match["metadata"]
            doc_name = meta.get("document_name", "Unknown Document")
            page_num = meta.get("page_number", 1)
            doc_id = meta.get("document_id", "")
            content = match["content"]

            context_parts.append(f"[Source {idx}: {doc_name}, Page {page_num}]\n{content}\n")

            # Extract exact paragraph matching key terms for highlight
            paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]
            exact_paragraph = paragraphs[0] if paragraphs else content

            sources.append({
                "document_id": doc_id,
                "document_name": doc_name,
                "page_number": page_num,
                "snippet": content[:300] + ("..." if len(content) > 300 else ""),
                "exact_paragraph": exact_paragraph,
                "score": match["score"]
            })

        formatted_context = "\n---\n".join(context_parts)

        # Query Gemini
        answer = llm_service.generate_response(
            prompt=query,
            context=formatted_context,
            model_name=model_name,
            temperature=temperature,
            max_tokens=max_tokens
        )

        # Generate follow-up suggestions
        try:
            followups = llm_service.generate_followup_questions(query, answer)
        except Exception:
            followups = ["Can you tell me more about this topic?"]

        return {
            "answer": answer,
            "sources": sources,
            "confidence_score": overall_confidence,
            "followup_questions": followups
        }
