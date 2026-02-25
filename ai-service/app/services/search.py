from typing import List, Dict, Optional
import logging
from app.config.database import get_db
from app.services.embedding import embedding_service
from app.models.schemas import SearchResult
from bson import ObjectId
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
                {"resourceId": {"$exists": True}, **filter_query},
                {"resourceId": 1, "embedding": 1}
            ).to_list(None)
            
            logger.info(f"Found {len(matching_docs)} matching documents")
            
            if not matching_docs:
                return [], 0, time.time() - start_time
            
            # Calculate similarity scores in a vectorized pass for better performance.
            valid_docs = []
            valid_vectors = []
            for doc in matching_docs:
                embedding = doc.get("embedding", [])
                if not embedding:
                    continue
                valid_docs.append(doc)
                valid_vectors.append(embedding)

            if not valid_docs:
                return [], 0, time.time() - start_time

            docs_matrix = np.asarray(valid_vectors, dtype=np.float32)
            query_vector = np.asarray(query_embedding, dtype=np.float32)

            doc_norms = np.linalg.norm(docs_matrix, axis=1)
            query_norm = np.linalg.norm(query_vector)

            # Protect against division by zero.
            if query_norm == 0:
                return [], 0, time.time() - start_time

            denom = doc_norms * query_norm
            denom = np.where(denom == 0, 1e-12, denom)

            scores = np.dot(docs_matrix, query_vector) / denom
            results_with_scores = list(zip(valid_docs, scores.tolist()))
            
            logger.info(f"Calculated similarity scores for {len(results_with_scores)} documents")
            
            # Sort by score descending
            results_with_scores.sort(key=lambda x: x[1], reverse=True)
            
            # Get total count
            total = len(results_with_scores)
            
            # Apply pagination
            paginated_results = results_with_scores[offset:offset + limit]
            
            logger.info(f"Paginated to {len(paginated_results)} results (offset: {offset}, limit: {limit})")
            
            # Fetch full resource details in one query (avoid N+1 lookups).
            resources_collection = db.resources
            object_ids = []
            for doc, _ in paginated_results:
                resource_id = doc.get("resourceId")
                if isinstance(resource_id, ObjectId):
                    object_ids.append(resource_id)
                else:
                    try:
                        object_ids.append(ObjectId(str(resource_id)))
                    except Exception:
                        logger.warning(f"Invalid resourceId in embeddings index: {resource_id}")

            resources = await resources_collection.find(
                {"_id": {"$in": object_ids}}
            ).to_list(None)
            resources_by_id = {str(resource["_id"]): resource for resource in resources}

            search_results = []
            for doc, score in paginated_results:
                resource_key = str(doc.get("resourceId"))
                resource = resources_by_id.get(resource_key)
                if resource:
                    created_at = resource.get("createdAt")
                    search_results.append(SearchResult(
                        id=str(resource["_id"]),
                        title=resource.get("title", ""),
                        description=resource.get("description"),
                        score=float(score),
                        resource_type=resource.get("type", ""),
                        category=resource.get("category", ""),
                        department=resource.get("department", ""),
                        subject=resource.get("subject", ""),
                        semester=resource.get("semester"),
                        created_at=created_at.isoformat() if created_at else None,
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
            normalized_resource_id = resource_id
            index_filter = {"resourceId": resource_id}
            try:
                object_id = ObjectId(str(resource_id))
                normalized_resource_id = object_id
                index_filter = {"$or": [{"resourceId": resource_id}, {"resourceId": object_id}]}
            except Exception:
                pass

            result = await embeddings_collection.update_one(
                index_filter,
                {
                    "$set": {
                        "resourceId": normalized_resource_id,
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
            delete_filter = {"resourceId": resource_id}
            try:
                object_id = ObjectId(str(resource_id))
                delete_filter = {"$or": [{"resourceId": resource_id}, {"resourceId": object_id}]}
            except Exception:
                pass

            await embeddings_collection.delete_many(delete_filter)
            logger.info(f"Deleted index for resource: {resource_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting index: {e}")
            raise

# Global instance
search_service = SearchService()
