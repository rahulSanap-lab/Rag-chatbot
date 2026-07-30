from typing import List
from app.utils.config import settings
import logging

logger = logging.getLogger(__name__)

class EmbeddingService:
    _instance = None
    _st_model = None

    def __init__(self, provider: str = None, model_name: str = None):
        self.provider = provider or settings.EMBEDDING_PROVIDER
        self.model_name = model_name or settings.EMBEDDING_MODEL_NAME

    def _get_st_model(self):
        if EmbeddingService._st_model is None:
            try:
                from sentence_transformers import SentenceTransformer
                logger.info(f"Loading SentenceTransformer model: {self.model_name}")
                EmbeddingService._st_model = SentenceTransformer(self.model_name)
            except Exception as e:
                logger.error(f"Error loading SentenceTransformer: {e}")
                raise RuntimeError(f"Could not load sentence transformer model: {e}")
        return EmbeddingService._st_model

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []
        
        if self.provider == "gemini" and settings.GEMINI_API_KEY:
            try:
                from google import genai
                client = genai.Client(api_key=settings.GEMINI_API_KEY)
                embeddings = []
                for text in texts:
                    res = client.models.embed_content(
                        model="text-embedding-004",
                        contents=text
                    )
                    embeddings.append(res.embedding.values)
                return embeddings
            except Exception as e:
                logger.warning(f"Gemini embedding failed ({e}); falling back to SentenceTransformers.")
        
        # Local SentenceTransformers default
        st_model = self._get_st_model()
        vectors = st_model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
        return vectors.tolist()

    def embed_query(self, query: str) -> List[float]:
        results = self.embed_documents([query])
        return results[0] if results else []

embedding_service = EmbeddingService()
