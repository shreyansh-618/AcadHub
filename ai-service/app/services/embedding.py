from typing import List
import logging
from app.config.settings import settings

logger = logging.getLogger(__name__)

class EmbeddingService:
    """Service for generating and managing embeddings"""
    
    def __init__(self):
        self.model = None
        self.model_name = settings.model_name
        
    def load_model(self):
        """Load the embedding model"""
        try:
            if self.model is None:
                logger.info("Loading model: %s", self.model_name)
                from sentence_transformers import SentenceTransformer
                self.model = SentenceTransformer(self.model_name)
                logger.info("Model loaded successfully. Dimension: %s", self.model.get_sentence_embedding_dimension())
        except Exception as e:
            logger.error("Error loading model: %s", str(e))
            raise
    
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
