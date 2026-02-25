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
            
            if db is None:
                logger.error("Database not initialized")
                return [], 0, time.time() - start_time
            
            # Get embedding for the query
            logger.info(f"Getting embedding for query: {query[:50]}...")
            query_embedding = embedding_service.get_embedding(query)
            logger.info(f"Query embedding generated successfully. Dimension: {len(query_embedding)}")
            
            # Build filter query
            filter_query = {}
            if filters:
                if "department" in filters:
                    filter_query["metadata.department"] = filters["department"]
                if "subject" in filters:
                    filter_query["metadata.subject"] = filters["subject"]
                if "category" in filters:
                    filter_query["metadata.category"] = filters["category"]
                if "semester" in filters:
                    filter_query["metadata.semester"] = filters["semester"]
            
            # Get all embeddings from database that match filters
            embeddings_collection = db.embeddings
            logger.info(f"Searching embeddings with filters: {filter_query}")
            matching_docs = await embeddings_collection.find(
                {"resourceId": {"$exists": True}, **filter_query}
            ).to_list(None)
            
            logger.info(f"Found {len(matching_docs)} matching documents")
            
            if not matching_docs:
                return [], 0, time.time() - start_time
            
            # Calculate similarity scores
            results_with_scores = []
            for doc in matching_docs:
                embedding = doc.get("embedding", [])
                if embedding:
                    score = embedding_service.similarity(query_embedding, embedding)
                    results_with_scores.append((doc, score))
            
            logger.info(f"Calculated similarity scores for {len(results_with_scores)} documents")
            
            # Sort by score descending
            results_with_scores.sort(key=lambda x: x[1], reverse=True)
            
            # Get total count
            total = len(results_with_scores)
            
            # Apply pagination
            paginated_results = results_with_scores[offset:offset + limit]
            
            logger.info(f"Paginated to {len(paginated_results)} results (offset: {offset}, limit: {limit})")
            
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
            logger.info(f"Search completed successfully. Results: {len(search_results)}, Time: {processing_time:.2f}s")
            return search_results, total, processing_time
            
        except Exception as e:
            logger.error(f"Search error: {e}", exc_info=True)
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
            
            if db is None:
                logger.error("Database not initialized, cannot index resource")
                return False
            
            # Create combined text for embedding
            text = f"{title} {description} {content}"
            
            logger.info(f"Indexing resource: {resource_id} - {title}")
            
            # Get embedding
            logger.info(f"Generating embedding for resource: {resource_id}")
            embedding = embedding_service.get_embedding(text)
            logger.info(f"Embedding generated successfully. Dimension: {len(embedding)}")
            
            # Store in MongoDB
            embeddings_collection = db.embeddings
            result = await embeddings_collection.update_one(
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
            
            logger.info(f"Successfully indexed resource: {resource_id}. Matched: {result.matched_count}, Modified: {result.modified_count}")
            return True
            
        except Exception as e:
            logger.error(f"Error indexing resource {resource_id}: {e}", exc_info=True)
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
