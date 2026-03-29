from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional
import logging
from app.services.qa import RAGService
import os
from datetime import datetime

router = APIRouter(prefix="/qa", tags=["QA"])
logger = logging.getLogger(__name__)

# Initialize RAG service
rag_service = None


# Pydantic models
class QuestionRequest(BaseModel):
    question: str
    resource_ids: Optional[List[str]] = None


class QAInteractionRequest(BaseModel):
    userId: str
    question: str
    answer: str
    sources: List[dict]
    processingTime: int
    resourceIds: List[str] = []


class RatingRequest(BaseModel):
    question_id: str
    user_id: str
    rating: str  # "helpful" or "not-helpful"


# Initialize RAG service on startup
async def initialize_rag_service():
    global rag_service
    if rag_service is None:
        from app.config.database import db as database
        rag_service = RAGService(database)
        logger.info("RAG Service initialized")


# POST /ai/qa/answer - Main QA endpoint
@router.post("/answer")
async def answer_question(
    request: QuestionRequest,
):
    """
    Process a question and return an AI-generated answer with sources.
    Uses RAG (Retrieval-Augmented Generation) pipeline.
    """
    try:
        if not request.question or len(request.question.strip()) == 0:
            raise HTTPException(status_code=400, detail="Question cannot be empty")

        if len(request.question) > 500:
            raise HTTPException(status_code=400, detail="Question too long (max 500 characters)")

        logger.info(f"Processing question: {request.question[:100]}")

        # Get or initialize RAG service
        global rag_service
        if rag_service is None:
            await initialize_rag_service()

        # Generate answer using RAG pipeline
        result = await rag_service.generate_answer(
            question=request.question,
            resource_ids=request.resource_ids,
        )

        return {
            "answer": result["answer"],
            "sources": result["sources"],
            "confidence": result.get("confidence", 0),
            "tokens_used": result.get("tokens_used", 0),
            "processing_time_ms": result.get("processing_time", 0),
            "answer_mode": result.get("answer_mode", "ai"),
            "answer_label": result.get("answer_label", "AI Answer"),
            "source_count": result.get("source_count", len(result.get("sources", []))),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in answer_question: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Error generating answer. Please try again.",
        )


# POST /ai/qa/store-interaction - Store QA interaction
@router.post("/store-interaction")
async def store_interaction(
    request: QAInteractionRequest,
):
    """Store a QA interaction in the database for tracking and insights."""
    try:
        global rag_service
        if rag_service is None:
            await initialize_rag_service()

        await rag_service.store_interaction(
            user_id=request.userId,
            question=request.question,
            answer=request.answer,
            sources=request.sources,
            processing_time=request.processingTime,
            resource_ids=request.resourceIds,
        )

        return {"success": True, "message": "Interaction stored"}

    except Exception as e:
        logger.error(f"Error storing interaction: {str(e)}")
        # Don't fail - this is non-critical
        return {"success": False, "message": "Failed to store interaction"}


# GET /ai/qa/user-history - Get user's QA history
@router.get("/user-history")
async def get_user_history(
    user_id: str,
    limit: int = 10,
):
    """Retrieve a user's question history."""
    try:
        if limit > 50:
            limit = 50
        if limit < 1:
            limit = 10

        global rag_service
        if rag_service is None:
            await initialize_rag_service()

        interactions = await rag_service.get_user_history(user_id, limit)

        return {
            "user_id": user_id,
            "interactions": interactions,
        }

    except Exception as e:
        logger.error(f"Error retrieving history: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve history")


# POST /ai/qa/rate-answer - Rate an answer
@router.post("/rate-answer")
async def rate_answer(request: RatingRequest):
    """Store user rating for an answer."""
    try:
        if request.rating not in ["helpful", "not-helpful"]:
            raise HTTPException(
                status_code=400,
                detail='Rating must be "helpful" or "not-helpful"',
            )

        global rag_service
        if rag_service is None:
            await initialize_rag_service()

        await rag_service.rate_answer(
            question_id=request.question_id,
            user_id=request.user_id,
            rating=request.rating,
        )

        return {"success": True, "message": "Rating recorded"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rating answer: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to save rating")


# POST /ai/qa/clear-cache - Clear cached answers (admin)
@router.post("/clear-cache")
async def clear_cache(admin_key: str = None):
    """Clear all cached QA responses. Requires admin key."""
    try:
        if admin_key != os.getenv("ADMIN_KEY"):
            raise HTTPException(status_code=401, detail="Unauthorized")

        global rag_service
        if rag_service is None:
            from app.config.database import db as database
            await initialize_rag_service(database)

        await rag_service.clear_cache()

        return {"success": True, "message": "Cache cleared"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error clearing cache: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to clear cache")
