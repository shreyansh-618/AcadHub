from typing import List
import logging
import os
import threading
import time
from app.config.settings import settings
from app.services.runtime_state import runtime_state

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Service for generating and managing embeddings"""

    def __init__(self):
        self.model = None
        self.model_name = settings.model_name
        self._load_lock = threading.Lock()
        runtime_state.set_model_status("idle", model_name=self.model_name)

    def load_model(self, force: bool = False):
        """Load the embedding model"""
        with self._load_lock:
            if self.model is not None and not force:
                return self.model

            last_error = None
            for attempt in range(1, settings.model_load_retries + 1):
                try:
                    runtime_state.set_model_status("loading", model_name=self.model_name)
                    logger.info("Loading model: %s (attempt %s/%s)", self.model_name, attempt, settings.model_load_retries)
                    from sentence_transformers import SentenceTransformer

                    sentence_transformer_kwargs = {}
                    huggingface_token = settings.huggingface_token.strip()
                    if huggingface_token:
                        os.environ.setdefault("HUGGINGFACE_HUB_TOKEN", huggingface_token)
                        sentence_transformer_kwargs["token"] = huggingface_token

                    self.model = SentenceTransformer(
                        self.model_name,
                        **sentence_transformer_kwargs,
                    )
                    dimension = self.model.get_sentence_embedding_dimension()
                    runtime_state.set_model_status(
                        "ready",
                        model_name=self.model_name,
                        dimension=dimension,
                    )
                    logger.info("Model loaded successfully. Dimension: %s", dimension)
                    return self.model
                except Exception as e:
                    last_error = e
                    self.model = None
                    runtime_state.set_model_status(
                        "failed",
                        model_name=self.model_name,
                        error=str(e),
                    )
                    logger.error("Error loading model: %s", str(e))
                    if attempt < settings.model_load_retries:
                        delay = settings.model_load_retry_base_delay_seconds * (2 ** (attempt - 1))
                        logger.warning("Retrying model load in %.2fs", delay)
                        time.sleep(delay)

            raise last_error

    def ensure_model_loaded(self):
        if self.model is None:
            self.load_model()
        return self.model

    def warmup(self) -> None:
        """Warm the model so the first real request is not slow."""
        model = self.ensure_model_loaded()
        model.encode(settings.model_warmup_text, convert_to_tensor=False)
        logger.info("Embedding model warmup completed")

    def get_embedding(self, text: str) -> List[float]:
        """Get embedding for a single text"""
        if self.model is None:
            self.load_model()

        embedding = self.model.encode(text, convert_to_tensor=False)
        return embedding.tolist()

    def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Get embeddings for multiple texts"""
        if self.model is None:
            self.load_model()

        embeddings = self.model.encode(texts, convert_to_tensor=False)
        return [embedding.tolist() for embedding in embeddings]

    def get_dimension(self) -> int:
        """Get embedding dimension"""
        if self.model is None:
            self.load_model()
        return self.model.get_sentence_embedding_dimension()

    def encode(self, text: str) -> List[float]:
        """Alias for get_embedding - for compatibility"""
        return self.get_embedding(text)

    def similarity(self, embedding1: List[float], embedding2: List[float]) -> float:
        """Calculate cosine similarity between two embeddings"""
        import numpy as np

        try:
            from scipy.spatial.distance import cosine
            e1 = np.array(embedding1)
            e2 = np.array(embedding2)
            # Cosine similarity = 1 - cosine distance
            return float(1 - cosine(e1, e2))
        except ImportError:
            # Fallback: manual cosine similarity calculation
            e1 = np.array(embedding1, dtype=np.float32)
            e2 = np.array(embedding2, dtype=np.float32)

            dot_product = np.dot(e1, e2)
            norm_e1 = np.linalg.norm(e1)
            norm_e2 = np.linalg.norm(e2)

            if norm_e1 == 0 or norm_e2 == 0:
                return 0.0

            return float(dot_product / (norm_e1 * norm_e2))

# Global instance
embedding_service = EmbeddingService()
