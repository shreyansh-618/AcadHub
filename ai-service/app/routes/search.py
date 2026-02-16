from fastapi import APIRouter, HTTPException, Query
from app.models.schemas import SearchQuery, SearchResponse, EmbeddingRequest, EmbeddingResponse
from app.services.search import search_service
from app.services.embedding import embedding_service
import logging
import time

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/search", tags=["search"])

@router.post("/semantic", response_model=SearchResponse)
async def semantic_search(
    query: SearchQuery,
):
    """
    Perform semantic search on academic resources
    """
    try:
        start_time = time.time()
        
        if not query.query.strip():
            raise HTTPException(status_code=400, detail="Query cannot be empty")
        
        # Perform search
        results, total, search_time = await search_service.search(
            query=query.query,
            limit=query.limit,
            offset=query.offset,
            filters=query.filters
        )
        
        return SearchResponse(
            results=results,
            total=total,
            page=(query.offset // query.limit) + 1 if query.limit > 0 else 1,
            limit=query.limit,
            query=query.query,
            processing_time=search_time,
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Search error: {e}")
        raise HTTPException(status_code=500, detail="Search failed")

@router.post("/embed", response_model=EmbeddingResponse)
async def get_embedding(request: EmbeddingRequest):
    """
    Get embedding for a text
    """
    try:
        if not request.text.strip():
            raise HTTPException(status_code=400, detail="Text cannot be empty")
        
        embedding_service.load_model()
        embedding = embedding_service.get_embedding(request.text)
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
async def index_resource(
    resource_id: str = Query(...),
    title: str = Query(...),
    description: str = Query(""),
    content: str = Query(""),
):
    """
    Index a resource for semantic search
    Called by backend when a new resource is uploaded
    """
    try:
        if not resource_id or not title or not content:
            raise HTTPException(status_code=400, detail="Missing required fields")
        
        success = await search_service.index_resource(
            resource_id=resource_id,
            title=title,
            description=description,
            content=content,
        )
        
        if success:
            return {"status": "indexed", "resource_id": resource_id}
        else:
            raise HTTPException(status_code=500, detail="Failed to index resource")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Indexing error: {e}")
        raise HTTPException(status_code=500, detail="Indexing failed")

@router.delete("/index/{resource_id}")
async def delete_index(resource_id: str):
    """
    Delete a resource from the index
    """
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
