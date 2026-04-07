from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import asyncio
import logging
from app.config.settings import settings
from app.utils.sanitize import sanitize_text

router = APIRouter(prefix="/embed", tags=["Embeddings"])
logger = logging.getLogger(__name__)


class EmbedTextRequest(BaseModel):
    text: str


class EmbedBatchRequest(BaseModel):
    texts: List[str]


# POST /ai/embed/text - Get embedding for a single text
@router.post("/text")
async def embed_text(request: EmbedTextRequest):
    """
    Get embedding for a single text.
    
    Args:
        text: Text to embed
    
    Returns:
        Embedding vector
    """
    try:
        normalized_text = sanitize_text(request.text, max_length=settings.max_input_length)
        if not normalized_text:
            raise HTTPException(status_code=400, detail="Text cannot be empty")

        logger.info(f"Embedding text: {len(normalized_text)} characters")

        from app.services.embedding import embedding_service
        embedding = await asyncio.to_thread(embedding_service.get_embedding, normalized_text)

        return {
            "success": True,
            "embedding": embedding,
            "dimension": len(embedding),
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error embedding text: {e}")
        raise HTTPException(status_code=500, detail=f"Embedding failed: {str(e)}")


# POST /ai/embed/batch - Get embeddings for multiple texts
@router.post("/batch")
async def embed_batch(request: EmbedBatchRequest):
    """
    Get embeddings for multiple texts.
    
    Args:
        texts: List of texts to embed
    
    Returns:
        List of embedding vectors
    """
    try:
        if not request.texts or len(request.texts) == 0:
            raise HTTPException(status_code=400, detail="No texts provided")

        if len(request.texts) > 100:
            raise HTTPException(status_code=400, detail="Too many texts (max 100)")

        normalized_texts = [
            sanitize_text(text, max_length=settings.max_input_length)
            for text in request.texts
            if sanitize_text(text, max_length=settings.max_input_length)
        ]
        if not normalized_texts:
            raise HTTPException(status_code=400, detail="No valid texts provided")

        logger.info(f"Embedding {len(normalized_texts)} texts batch")

        from app.services.embedding import embedding_service
        embeddings = await asyncio.to_thread(embedding_service.get_embeddings, normalized_texts)

        return {
            "success": True,
            "embeddings": embeddings,
            "count": len(embeddings),
            "dimension": len(embeddings[0]) if embeddings else 0,
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error embedding batch: {e}")
        raise HTTPException(status_code=500, detail=f"Batch embedding failed: {str(e)}")


# GET /ai/embed/dimension - Get embedding dimension
@router.get("/dimension")
async def get_dimension():
    """
    Get the embedding dimension.
    
    Returns:
        Embedding dimension
    """
    try:
        from app.services.embedding import embedding_service
        dimension = await asyncio.to_thread(embedding_service.get_dimension)
        return {
            "success": True,
            "dimension": dimension,
        }
    except Exception as e:
        logger.error(f"Error getting dimension: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get dimension: {str(e)}")
