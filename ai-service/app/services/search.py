from typing import List, Dict, Optional
import logging
import asyncio
import json
from app.config.database import get_db
from app.services.embedding import embedding_service
from app.services.chunking import ChunkingService
from app.services.cache import TTLCache
from app.models.schemas import SearchResult
from bson import ObjectId
import numpy as np
import time
import re

logger = logging.getLogger(__name__)

class SearchService:
    """Service for semantic search on academic resources"""

    def __init__(self):
        self.chunking_service = ChunkingService()
        self.embedding_cache = TTLCache(ttl_seconds=900, max_items=256)
        self.search_cache = TTLCache(ttl_seconds=120, max_items=256)
    
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
            cache_key = json.dumps(
                {
                    "query": query,
                    "limit": limit,
                    "offset": offset,
                    "filters": filters or {},
                },
                sort_keys=True,
            )
            cached_result = self.search_cache.get(cache_key)
            if cached_result is not None:
                logger.info("Search cache hit for query: %s", query[:50])
                return cached_result

            db = get_db()
            
            if db is None:
                logger.error("Database not initialized")
                return [], 0, time.time() - start_time
            
            # Get embedding for the query
            logger.info(f"Getting embedding for query: {query[:50]}...")
            query_embedding = self.embedding_cache.get(query)
            if query_embedding is None:
                query_embedding = await asyncio.to_thread(embedding_service.get_embedding, query)
                self.embedding_cache.set(query, query_embedding)
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
                {
                    "resourceId": 1,
                    "embedding": 1,
                    "content": 1,
                    "pageNumber": 1,
                    "chunkIndex": 1,
                },
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
            
            resource_scores = {}
            for doc, score in results_with_scores:
                resource_key = str(doc.get("resourceId"))
                entry = resource_scores.setdefault(
                    resource_key,
                    {
                        "resourceId": doc.get("resourceId"),
                        "score": float(score),
                        "sourceCount": 0,
                        "bestChunk": doc,
                    },
                )
                entry["sourceCount"] += 1
                if float(score) > entry["score"]:
                    entry["score"] = float(score)
                    entry["bestChunk"] = doc

            aggregated_results = list(resource_scores.values())
            aggregated_results.sort(key=lambda x: x["score"], reverse=True)

            total = len(aggregated_results)
            paginated_results = aggregated_results[offset:offset + limit]

            logger.info(
                "Paginated to %d results (offset: %d, limit: %d)",
                len(paginated_results),
                offset,
                limit,
            )
            
            # Fetch full resource details in one query (avoid N+1 lookups).
            resources_collection = db.resources
            object_ids = []
            for item in paginated_results:
                resource_id = item.get("resourceId")
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
            for item in paginated_results:
                resource_key = str(item.get("resourceId"))
                resource = resources_by_id.get(resource_key)
                if resource:
                    created_at = resource.get("createdAt")
                    best_chunk = item.get("bestChunk") or {}
                    snippet = (best_chunk.get("content") or "").strip()
                    search_results.append(SearchResult(
                        id=str(resource["_id"]),
                        title=resource.get("title", ""),
                        description=resource.get("description"),
                        score=float(item.get("score", 0)),
                        resource_type=resource.get("type", ""),
                        category=resource.get("category", ""),
                        department=resource.get("department", ""),
                        subject=resource.get("subject", ""),
                        semester=resource.get("semester"),
                        created_at=created_at.isoformat() if created_at else None,
                        snippet=snippet[:220] if snippet else None,
                        page_number=best_chunk.get("pageNumber"),
                        source_count=int(item.get("sourceCount", 0)),
                    ))
            
            processing_time = time.time() - start_time
            logger.info(f"Search completed successfully. Results: {len(search_results)}, Time: {processing_time:.2f}s")
            result = (search_results, total, processing_time)
            self.search_cache.set(cache_key, result)
            return result
            
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
            
            logger.info(f"Indexing resource: {resource_id} - {title}")

            embeddings_collection = db.embeddings
            resources_collection = db.resources
            normalized_resource_id = resource_id
            index_filter = {"resourceId": resource_id}
            try:
                object_id = ObjectId(str(resource_id))
                normalized_resource_id = object_id
                index_filter = {"$or": [{"resourceId": resource_id}, {"resourceId": object_id}]}
            except Exception:
                pass

            chunk_sections = self._build_chunk_sections(title, description, content)
            chunks = []
            for section in chunk_sections:
                chunks.extend(
                    self.chunking_service.chunk_text(
                        section["text"],
                        page_number=section["page_number"],
                    )
                )

            if not chunks:
                combined_text = f"{title} {description} {content}".strip()
                chunks = self.chunking_service.chunk_text(combined_text, page_number=1)

            chunk_documents = []
            resource_chunks = []
            for chunk in chunks:
                embedding = chunk.get("embedding") or []
                if not embedding:
                    continue

                chunk_document = {
                    "resourceId": normalized_resource_id,
                    "title": title,
                    "description": description,
                    "content": chunk.get("text", ""),
                    "embedding": embedding,
                    "pageNumber": chunk.get("pageNumber", 1),
                    "chunkIndex": chunk.get("index", 0),
                    "tokenCount": chunk.get("tokenCount", 0),
                    "charCount": chunk.get("charCount", 0),
                    "metadata": kwargs,
                    "updatedAt": time.time(),
                }
                chunk_documents.append(chunk_document)
                resource_chunks.append(
                    {
                        "index": chunk_document["chunkIndex"],
                        "text": chunk_document["content"],
                        "pageNumber": chunk_document["pageNumber"],
                        "tokenCount": chunk_document["tokenCount"],
                        "charCount": chunk_document["charCount"],
                        "embedding": embedding,
                    }
                )

            if not chunk_documents:
                logger.warning("No chunk embeddings were generated for resource %s", resource_id)
                return False

            await embeddings_collection.delete_many(index_filter)
            await embeddings_collection.insert_many(chunk_documents)
            await resources_collection.update_one(
                {"_id": ObjectId(str(resource_id))},
                {
                    "$set": {
                        "chunks": resource_chunks,
                        "processingStatus": "chunked",
                    }
                },
            )

            logger.info(
                "Successfully indexed resource %s into %d chunks",
                resource_id,
                len(chunk_documents),
            )
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

    def _build_chunk_sections(
        self,
        title: str,
        description: str,
        content: str,
    ) -> List[Dict]:
        combined = f"{title}\n\n{description}\n\n{content}".strip()
        if not combined:
            return []

        marker_pattern = re.compile(
            r"(?=(?:slide|page)\s+\d+\s*:)",
            flags=re.IGNORECASE,
        )
        pieces = [piece.strip() for piece in marker_pattern.split(combined) if piece.strip()]
        sections = []

        for piece in pieces:
            match = re.match(r"(?:slide|page)\s+(\d+)\s*:\s*", piece, flags=re.IGNORECASE)
            page_number = int(match.group(1)) if match else 1
            cleaned_piece = re.sub(
                r"^(?:slide|page)\s+\d+\s*:\s*",
                "",
                piece,
                flags=re.IGNORECASE,
            ).strip()
            if cleaned_piece:
                sections.append({"page_number": page_number, "text": cleaned_piece})

        if sections:
            return sections

        return [{"page_number": 1, "text": combined}]

# Global instance
search_service = SearchService()
