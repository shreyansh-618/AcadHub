from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.models.schemas import SearchQuery, SearchResponse, EmbeddingRequest, EmbeddingResponse
from app.services.search import search_service
from app.config.database import get_db
from app.config.settings import settings
from app.utils.sanitize import sanitize_text
import logging
import time

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/search", tags=["search"])


class IndexRequest(BaseModel):
    resource_id: str
    title: str
    description: str = ""
    content: str = ""
    department: str = ""
    subject: str = ""
    category: str = ""
    semester: Optional[int] = None


@router.post("/semantic", response_model=SearchResponse)
async def semantic_search(query: SearchQuery):
    """Perform semantic search on academic resources"""
    try:
        normalized_query = sanitize_text(query.query, max_length=settings.max_input_length)
        if not normalized_query:
            raise HTTPException(status_code=400, detail="Query cannot be empty")

        results, total, search_time = await search_service.search(
            query=normalized_query,
            limit=query.limit,
            offset=query.offset,
            filters=query.filters,
        )

        return SearchResponse(
            results=results,
            total=total,
            page=(query.offset // query.limit) + 1 if query.limit > 0 else 1,
            limit=query.limit,
            query=normalized_query,
            processing_time=search_time,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Search error: {e}")
        raise HTTPException(status_code=500, detail="Search failed")


@router.post("/embed", response_model=EmbeddingResponse)
async def get_embedding(request: EmbeddingRequest):
    """Get embedding for a text"""
    try:
        normalized_text = sanitize_text(request.text, max_length=settings.max_input_length)
        if not normalized_text:
            raise HTTPException(status_code=400, detail="Text cannot be empty")

        from app.services.embedding import embedding_service
        embedding_service.load_model()
        embedding = embedding_service.get_embedding(normalized_text)
        dimension = embedding_service.get_dimension()

        return EmbeddingResponse(
            embedding=embedding,
            dimension=dimension,
            model=embedding_service.model_name,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Embedding error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate embedding")


@router.post("/index")
async def index_resource(request: IndexRequest):
    """
    Index a single resource for semantic search.
    Called by backend when a new resource is uploaded.
    """
    try:
        if not request.resource_id or not request.title:
            raise HTTPException(
                status_code=400, detail="resource_id and title are required"
            )

        # Use title + description as content if content is empty
        content = request.content or f"{request.title} {request.description}"

        success = await search_service.index_resource(
            resource_id=request.resource_id,
            title=request.title,
            description=request.description,
            content=content,
            department=request.department,
            subject=request.subject,
            category=request.category,
            semester=request.semester,
        )

        if success:
            return {"status": "indexed", "resource_id": request.resource_id}
        else:
            raise HTTPException(status_code=500, detail="Failed to index resource")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Indexing error: {e}")
        raise HTTPException(status_code=500, detail="Indexing failed")


@router.post("/index-all")
async def index_all_resources():
    """
    Bulk-index ALL existing resources from the resources collection.
    Used to populate the embeddings collection for the first time.
    """
    try:
        db = get_db()
        resources_collection = db.resources

        resources = await resources_collection.find({}).to_list(None)

        if not resources:
            return {
                "status": "no_resources",
                "indexed": 0,
                "message": "No resources found in database",
            }

        indexed_count = 0
        errors = []

        for resource in resources:
            try:
                resource_id = str(resource["_id"])
                title = resource.get("title", "")
                description = resource.get("description", "")
                content = resource.get("extractedContent") or f"{title} {description}"

                success = await search_service.index_resource(
                    resource_id=resource_id,
                    title=title,
                    description=description,
                    content=content,
                    department=resource.get("department", ""),
                    subject=resource.get("subject", ""),
                    category=resource.get("category", ""),
                    semester=resource.get("semester"),
                )

                if success:
                    indexed_count += 1
                    logger.info(f"Indexed: {title} ({resource_id})")

            except Exception as e:
                errors.append(
                    {"resource_id": str(resource.get("_id")), "error": str(e)}
                )
                logger.error(f"Failed to index resource {resource.get('_id')}: {e}")

        return {
            "status": "completed",
            "total_resources": len(resources),
            "indexed": indexed_count,
            "errors": len(errors),
            "error_details": errors[:10] if errors else [],
        }

    except Exception as e:
        logger.error(f"Bulk indexing error: {e}")
        raise HTTPException(
            status_code=500, detail=f"Bulk indexing failed: {str(e)}"
        )


@router.delete("/index/{resource_id}")
async def delete_index(resource_id: str):
    """Delete a resource from the index"""
    try:
        success = await search_service.delete_index(resource_id)
        if success:
            return {"status": "deleted", "resource_id": resource_id}
        else:
            raise HTTPException(status_code=500, detail="Failed to delete index")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete index error: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete index")
