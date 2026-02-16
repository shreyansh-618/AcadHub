from typing import List, Dict, Optional
import logging
from app.config.database import get_db
from app.services.embedding import embedding_service
from app.models.schemas import SearchResult
from numpy import ndarray
import numpy as np
import time

logger = logging.getLogger(__name__)

class SearchService:
    """Service for semantic search on academic resources"""
    
    async def search(
        self,
        query: str,
        limit: int = 10,
        offset: int = 0,
        filters: Optional[Dict] = None
    ) -> tuple[List[SearchResult], int, float]:
        """
        Perform semantic search
        Returns: (results, total_count, processing_time)
        """
        start_time = time.time()
        
        try:
            db = get_db()
            
            # Get embedding for the query
            query_embedding = embedding_service.get_embedding(query)
            
            # Build filter query
            filter_query = {}
            if filters:
                if "department" in filters:
                    filter_query["department"] = filters["department"]
                if "subject" in filters:
                    filter_query["subject"] = filters["subject"]
                if "category" in filters:
                    filter_query["category"] = filters["category"]
                if "semester" in filters:
                    filter_query["semester"] = filters["semester"]
            
            # Get all embeddings from database that match filters
            embeddings_collection = db.embeddings
            matching_docs = await embeddings_collection.find(
                {"resourceId": {"$exists": True}, **filter_query}
            ).to_list(None)
            
            if not matching_docs:
                return [], 0, time.time() - start_time
            
            # Calculate similarity scores
            results_with_scores = []
            for doc in matching_docs:
                embedding = doc.get("embedding", [])
                if embedding:
                    score = embedding_service.similarity(query_embedding, embedding)
                    results_with_scores.append((doc, score))
            
            # Sort by score descending
            results_with_scores.sort(key=lambda x: x[1], reverse=True)
            
            # Get total count
            total = len(results_with_scores)
            
            # Apply pagination
            paginated_results = results_with_scores[offset:offset + limit]
            
            # Fetch full resource details
            resources_collection = db.resources
            search_results = []
            for doc, score in paginated_results:
                resource = await resources_collection.find_one(
                    {"_id": doc["resourceId"]}
                )
                if resource:
                    search_results.append(SearchResult(
                        id=str(resource["_id"]),
                        title=resource.get("title", ""),
                        description=resource.get("description"),
                        score=float(score),
                        resource_type=resource.get("type", ""),
                        category=resource.get("category", ""),
                        department=resource.get("department", ""),
                        subject=resource.get("subject", ""),
                    ))
            
            processing_time = time.time() - start_time
            return search_results, total, processing_time
            
        except Exception as e:
            logger.error(f"Search error: {e}")
            raise
    
    async def index_resource(
        self,
        resource_id: str,
        title: str,
        description: str,
        content: str,
        **kwargs
    ) -> bool:
        """Index a resource for semantic search"""
        try:
            db = get_db()
            
            # Create combined text for embedding
            text = f"{title} {description} {content}"
            
            # Get embedding
            embedding = embedding_service.get_embedding(text)
            
            # Store in MongoDB
            embeddings_collection = db.embeddings
            await embeddings_collection.update_one(
                {"resourceId": resource_id},
                {
                    "$set": {
                        "resourceId": resource_id,
                        "content": text,
                        "embedding": embedding,
                        "metadata": kwargs,
                        "updatedAt": time.time(),
                    }
                },
                upsert=True
            )
            
            logger.info(f"Indexed resource: {resource_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error indexing resource: {e}")
            raise
    
    async def delete_index(self, resource_id: str) -> bool:
        """Delete a resource from the index"""
        try:
            db = get_db()
            embeddings_collection = db.embeddings
            await embeddings_collection.delete_one({"resourceId": resource_id})
            logger.info(f"Deleted index for resource: {resource_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting index: {e}")
            raise

# Global instance
search_service = SearchService()
