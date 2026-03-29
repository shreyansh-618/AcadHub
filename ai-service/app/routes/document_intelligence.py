from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import logging
from app.services.summarization import SummarizationService
from app.services.tagging import TaggingService

router = APIRouter(prefix="/document-intelligence", tags=["Document Intelligence"])
logger = logging.getLogger(__name__)

# Initialize services
summarization_service = SummarizationService()
tagging_service = TaggingService()


class SummarizationRequest(BaseModel):
    text: str
    max_length: Optional[int] = 150
    min_length: Optional[int] = 50


class TaggingRequest(BaseModel):
    text: str
    top_k: Optional[int] = 5


class BatchSummarizationRequest(BaseModel):
    texts: List[str]
    max_length: Optional[int] = 150
    min_length: Optional[int] = 50


# POST /ai/document-intelligence/summarize - Summarize text
@router.post("/summarize")
async def summarize_text(request: SummarizationRequest):
    """
    Summarize academic text using OpenAI GPT-3.5-turbo with fallback to BART.
    
    Args:
        text: Text to summarize
        max_length: Maximum summary length (tokens)
        min_length: Minimum summary length (tokens)
    
    Returns:
        Summary and key points
    """
    try:
        if not request.text or len(request.text.strip()) == 0:
            raise HTTPException(status_code=400, detail="Text cannot be empty")

        if len(request.text) > 50000:
            raise HTTPException(status_code=400, detail="Text too long (max 50000 characters)")

        logger.info("Summarizing text: %d characters", len(request.text))

        # Get summary from service
        result = await summarization_service.summarize(
            text=request.text,
            max_length=request.max_length,
            min_length=request.min_length,
        )

        return {
            "success": True,
            "summary": result["summary"],
            "keyPoints": result.get("key_points", []),
            "wordCount": len(result["summary"].split()),
            "processingTime": result.get("processing_time_ms", 0),
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error("Error summarizing text: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Summarization failed: {str(e)}") from e


# POST /ai/document-intelligence/batch-summarize - Summarize multiple texts
@router.post("/batch-summarize")
async def batch_summarize(request: BatchSummarizationRequest):
    """
    Summarize multiple texts (e.g., document chunks).
    
    Args:
        texts: List of texts to summarize
        max_length: Maximum summary length for each
        min_length: Minimum summary length for each
    
    Returns:
        List of summaries
    """
    try:
        if not request.texts or len(request.texts) == 0:
            raise HTTPException(status_code=400, detail="No texts provided")

        if len(request.texts) > 100:
            raise HTTPException(status_code=400, detail="Too many texts (max 100)")

        logger.info("Batch summarizing %d texts", len(request.texts))

        summaries = []
        for text in request.texts:
            result = await summarization_service.summarize(
                text=text,
                max_length=request.max_length,
                min_length=request.min_length,
            )
            summaries.append(result["summary"])

        # Merge summaries
        merged_summary = " ".join(summaries)

        return {
            "success": True,
            "summaries": summaries,
            "mergedSummary": merged_summary,
            "count": len(summaries),
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error("Error batch summarizing: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Batch summarization failed: {str(e)}") from e


# POST /ai/document-intelligence/tag - Extract and classify tags
@router.post("/tag")
async def extract_tags(request: TaggingRequest):
    """
    Extract keywords and classify them into academic topics.
    Uses zero-shot classification with BART-MNLI.
    
    Args:
        text: Text to extract tags from
        top_k: Number of top tags to return
    
    Returns:
        List of tags with confidence scores
    """
    try:
        if not request.text or len(request.text.strip()) == 0:
            raise HTTPException(status_code=400, detail="Text cannot be empty")

        if len(request.text) > 50000:
            raise HTTPException(status_code=400, detail="Text too long (max 50000 characters)")

        logger.info("Extracting tags from text: %d characters", len(request.text))

        # Get tags from service
        result = await tagging_service.extract_tags(
            text=request.text,
            top_k=request.top_k,
        )

        return {
            "success": True,
            "tags": result["tags"],
            "confidence_avg": result.get("confidence_avg", 0),
            "processingTime": result.get("processing_time_ms", 0),
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error("Error extracting tags: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Tag extraction failed: {str(e)}") from e


# POST /ai/document-intelligence/batch-tag - Extract tags from multiple texts
@router.post("/batch-tag")
async def batch_extract_tags(request: BaseModel):
    """
    Extract tags from multiple texts using batch processing.
    """
    try:
        request_data = request.dict() if hasattr(request, 'dict') else dict(request)
        texts = request_data.get("texts", [])
        top_k = request_data.get("top_k", 5)

        if not texts or len(texts) == 0:
            raise HTTPException(status_code=400, detail="No texts provided")

        if len(texts) > 100:
            raise HTTPException(status_code=400, detail="Too many texts (max 100)")

        logger.info("Batch tagging %d texts", len(texts))

        all_tags = []
        for i, text in enumerate(texts):
            result = await tagging_service.extract_tags(
                text=text,
                top_k=top_k,
            )
            all_tags.append({
                "index": i,
                "tags": result["tags"],
            })

        return {
            "success": True,
            "results": all_tags,
            "count": len(texts),
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error("Error batch tagging: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Batch tagging failed: {str(e)}") from e
