from sentence_transformers import SentenceTransformer
from typing import List
import logging
from numpy import ndarray
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
                logger.info(f"Loading model: {self.model_name}")
                self.model = SentenceTransformer(self.model_name)
                logger.info(f"Model loaded successfully. Dimension: {self.model.get_sentence_embedding_dimension()}")
        except Exception as e:
            logger.error(f"Error loading model: {e}")
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
    
    def similarity(self, embedding1: List[float], embedding2: List[float]) -> float:
        """Calculate cosine similarity between two embeddings"""
        from scipy.spatial.distance import cosine
        import numpy as np
        
        e1 = np.array(embedding1)
        e2 = np.array(embedding2)
        
        # Cosine similarity = 1 - cosine distance
        return 1 - cosine(e1, e2)

# Global instance
embedding_service = EmbeddingService()
