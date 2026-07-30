import chromadb
from chromadb.config import Settings as ChromaSettings
from typing import List, Dict, Any, Optional
from app.utils.config import settings
from app.rag.embeddings import embedding_service
import logging

logger = logging.getLogger(__name__)

class VectorStore:
    def __init__(self):
        self.client = chromadb.PersistentClient(
            path=settings.CHROMA_DB_DIR,
            settings=ChromaSettings(anonymized_telemetry=False)
        )
        self.collection = self.client.get_or_create_collection(
            name="rag_documents",
            metadata={"hnsw:space": "cosine"}
        )

    def add_chunks(
        self,
        chunk_ids: List[str],
        texts: List[str],
        metadatas: List[Dict[str, Any]],
        embeddings: Optional[List[List[float]]] = None
    ):
        if not chunk_ids or not texts:
            return

        if embeddings is None:
            embeddings = embedding_service.embed_documents(texts)

        self.collection.add(
            ids=chunk_ids,
            documents=texts,
            metadatas=metadatas,
            embeddings=embeddings
        )
        logger.info(f"Added {len(chunk_ids)} chunks to ChromaDB collection.")

    def search_similar(
        self,
        query: str,
        top_k: int = 5,
        document_ids: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        query_embedding = embedding_service.embed_query(query)
        if not query_embedding:
            return []

        where_filter = None
        if document_ids and len(document_ids) > 0:
            if len(document_ids) == 1:
                where_filter = {"document_id": document_ids[0]}
            else:
                where_filter = {"document_id": {"$in": document_ids}}

        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where=where_filter,
            include=["documents", "metadatas", "distances"]
        )

        matches = []
        if results and "documents" in results and len(results["documents"]) > 0:
            docs = results["documents"][0]
            metas = results["metadatas"][0]
            distances = results["distances"][0]

            for doc, meta, dist in zip(docs, metas, distances):
                # Cosine similarity score = 1 - distance
                similarity_score = max(0.0, min(1.0, 1.0 - float(dist)))
                matches.append({
                    "content": doc,
                    "metadata": meta,
                    "distance": float(dist),
                    "score": round(similarity_score, 4)
                })

        # Sort by similarity score descending
        matches.sort(key=lambda x: x["score"], reverse=True)
        return matches

    def delete_document_chunks(self, document_id: str):
        try:
            self.collection.delete(where={"document_id": document_id})
            logger.info(f"Deleted chunks for document_id={document_id} from ChromaDB.")
        except Exception as e:
            logger.error(f"Error deleting ChromaDB chunks for document {document_id}: {e}")

vector_store = VectorStore()
