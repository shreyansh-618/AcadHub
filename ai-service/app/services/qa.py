import logging
import asyncio
from datetime import datetime
from typing import List, Optional, Dict, Tuple
from hashlib import md5
import os
import re
from openai import OpenAI, RateLimitError, APIError
import numpy as np
from bson import ObjectId

from app.services.embedding import embedding_service
from app.services.chunking import ChunkingService

logger = logging.getLogger(__name__)

FALLBACK_STOP_WORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "can",
    "did",
    "do",
    "does",
    "explain",
    "for",
    "from",
    "how",
    "i",
    "in",
    "is",
    "it",
    "me",
    "of",
    "on",
    "or",
    "please",
    "tell",
    "that",
    "the",
    "this",
    "to",
    "was",
    "what",
    "why",
    "with",
    "would",
    "you",
}


class RAGService:
    """
    Retrieval-Augmented Generation (RAG) Service for QA system.
    
    Pipeline:
    1. Convert question to embedding
    2. Vector search in MongoDB for relevant chunks
    3. Retrieve context from top chunks
    4. Create prompt with context
    5. Call OpenAI for answer generation
    6. Return answer with source citations
    """

    def __init__(self, db_client):
        self.db = db_client
        self.openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.chunking_service = ChunkingService()
        self.cache_ttl = 86400  # 24 hours
        self.max_retries = 3
        self.retry_delay = 2

    def _get_database(self):
        """Return connected motor database object."""
        return self.db

    async def generate_answer(
        self,
        question: str,
        resource_ids: Optional[List[str]] = None,
    ) -> Dict:
        """
        Generate an answer using RAG pipeline.
        
        Args:
            question: The user's question
            resource_ids: Optional list of specific resource IDs to search
            
        Returns:
            Dictionary with answer, sources, and metadata
        """
        try:
            # 1. Check cache first
            cached_result = await self._check_cache(question, resource_ids)
            if cached_result:
                logger.info(f"Cache hit for question: {question[:50]}")
                return cached_result

            logger.info(f"Generating answer for: {question[:100]}")

            started_at = datetime.now()

            # 2. Convert question to embedding
            question_embedding = embedding_service.encode(question)
            if question_embedding is None:
                raise ValueError("Failed to generate question embedding")

            # 3. Retrieve relevant chunks via vector search
            chunks_data = await self._vector_search(
                question_embedding=question_embedding,
                resource_ids=resource_ids,
                top_k=6,
            )

            if not chunks_data or len(chunks_data) == 0:
                processing_time = int((datetime.now() - started_at).total_seconds() * 1000)
                return {
                    "answer": "I couldn't find relevant information in the documents to answer your question. Please try with different documents or rephrase your question.",
                    "sources": [],
                    "confidence": 0.0,
                    "tokens_used": 0,
                    "processing_time": processing_time,
                    "answer_mode": "no_results",
                    "answer_label": "No Matching Content",
                    "source_count": 0,
                }

            # 4. Extract context and prepare sources
            context, sources = self._prepare_context_and_sources(chunks_data)
            confidence = self._calculate_confidence(chunks_data, sources)

            # 5. Generate answer using OpenAI
            answer_mode = "ai"
            answer_label = "AI Answer"
            try:
                answer = await self._call_openai(question, context)
            except (RateLimitError, APIError) as openai_error:
                logger.warning(
                    "Falling back to extractive QA because OpenAI is unavailable: %s",
                    str(openai_error),
                )
                answer = self._build_fallback_answer(question, chunks_data, sources)
                answer_mode = "document_fallback"
                answer_label = "Document-Based Answer"

            processing_time = int((datetime.now() - started_at).total_seconds() * 1000)
            result = {
                "answer": answer,
                "sources": sources,
                "confidence": confidence,
                "tokens_used": 0,  # Will be updated after API call
                "processing_time": processing_time,
                "answer_mode": answer_mode,
                "answer_label": answer_label,
                "source_count": len(sources),
            }

            # 6. Cache the result
            await self._cache_result(question, resource_ids, result)

            return result

        except Exception as e:
            logger.error(f"Error in generate_answer: {str(e)}", exc_info=True)
            raise

    async def _vector_search(
        self,
        question_embedding: List[float],
        resource_ids: Optional[List[str]] = None,
        top_k: int = 6,
    ) -> List[Dict]:
        """
        Perform vector similarity search over indexed embedding documents.
        Falls back to cosine similarity in application memory so QA works
        even if Atlas vector index is not configured.
        """
        try:
            db = self._get_database()
            embeddings_collection = db["embeddings"]
            resources_collection = db["resources"]

            filter_query = {"resourceId": {"$exists": True}}
            if resource_ids:
                object_ids = []
                for rid in resource_ids:
                    try:
                        object_ids.append(ObjectId(str(rid)))
                    except Exception:
                        continue
                if object_ids:
                    filter_query["resourceId"] = {"$in": object_ids}

            candidates = await embeddings_collection.find(
                filter_query,
                {
                    "resourceId": 1,
                    "embedding": 1,
                    "content": 1,
                    "pageNumber": 1,
                    "chunkIndex": 1,
                    "title": 1,
                    "description": 1,
                },
            ).to_list(None)

            if not candidates:
                return []

            valid_docs = []
            valid_vectors = []
            for doc in candidates:
                embedding = doc.get("embedding", [])
                if not embedding:
                    continue
                valid_docs.append(doc)
                valid_vectors.append(embedding)

            if not valid_docs:
                return []

            docs_matrix = np.asarray(valid_vectors, dtype=np.float32)
            query_vector = np.asarray(question_embedding, dtype=np.float32)
            doc_norms = np.linalg.norm(docs_matrix, axis=1)
            query_norm = np.linalg.norm(query_vector)
            if query_norm == 0:
                return []

            denom = doc_norms * query_norm
            denom = np.where(denom == 0, 1e-12, denom)
            scores = np.dot(docs_matrix, query_vector) / denom

            scored_docs = list(zip(valid_docs, scores.tolist()))
            scored_docs.sort(key=lambda item: item[1], reverse=True)
            scored_docs = scored_docs[: max(top_k, 1)]

            resource_object_ids = []
            for doc, _ in scored_docs:
                rid = doc.get("resourceId")
                if isinstance(rid, ObjectId):
                    resource_object_ids.append(rid)
                else:
                    try:
                        resource_object_ids.append(ObjectId(str(rid)))
                    except Exception:
                        continue

            resources = await resources_collection.find(
                {"_id": {"$in": resource_object_ids}},
                {"title": 1},
            ).to_list(None)
            resources_by_id = {str(resource["_id"]): resource for resource in resources}

            results = []
            for doc, score in scored_docs:
                rid = str(doc.get("resourceId"))
                resource = resources_by_id.get(rid)
                if not resource:
                    continue

                chunk_text = (doc.get("content") or "").strip()
                if not chunk_text:
                    continue

                results.append(
                    {
                        "_id": resource["_id"],
                        "resourceId": rid,
                        "title": resource.get("title", "Unknown"),
                        "score": float(score),
                        "text": chunk_text,
                        "pageNumber": doc.get("pageNumber", 1),
                        "chunkIndex": doc.get("chunkIndex", 0),
                    }
                )

            logger.info(f"Vector search returned {len(results)} chunks")
            return results

        except Exception as e:
            logger.error(f"Vector search error: {str(e)}")
            raise

    def _prepare_context_and_sources(self, chunks_data: List[Dict]) -> Tuple[str, List[Dict]]:
        """
        Extract context text and prepare source citations.
        
        Returns:
            (context_text, sources_list)
        """
        context_chunks = []
        sources = []

        for chunk in chunks_data[:6]:
            doc_id = str(chunk.get("_id"))
            title = chunk.get("title", "Unknown")
            relevance_score = float(chunk.get("score", 0.0))
            chunk_text = (chunk.get("text") or "").strip()
            page_num = chunk.get("pageNumber") or 1
            if not chunk_text:
                continue

            context_chunks.append(
                f"[Source {len(context_chunks) + 1} | {title} | Page {page_num}]\n{chunk_text}"
            )
            sources.append(
                {
                    "resourceId": doc_id,
                    "title": title,
                    "pageNumber": page_num,
                    "score": round(relevance_score, 3),
                    "relevanceScore": round(relevance_score, 3),
                    "snippet": self._build_snippet(chunk_text),
                }
            )

        context = "\n\n---\n\n".join(context_chunks)
        return context, sources

    def _build_fallback_answer(
        self,
        question: str,
        chunks_data: List[Dict],
        sources: List[Dict],
    ) -> str:
        """
        Create a clean document-based answer when the generative model is unavailable.
        """
        question_lower = question.lower()
        slide_match = re.search(r"(?:slide|page)\s*(\d+)", question_lower)
        requested_number = int(slide_match.group(1)) if slide_match else None

        question_terms = self._extract_question_terms(question)
        sentence_candidates = []

        for chunk in chunks_data:
            doc_score = float(chunk.get("score", 0.0))
            text = (chunk.get("text") or "").strip()
            if not text:
                continue

            sections = self._extract_candidate_sections(text, requested_number)
            for section in sections:
                for sentence in self._split_into_sentences(section):
                    cleaned_sentence = self._clean_fallback_sentence(sentence)
                    if len(cleaned_sentence) < 35:
                        continue

                    score = self._score_fallback_sentence(
                        cleaned_sentence,
                        question_terms,
                        requested_number,
                        doc_score,
                    )
                    if score <= 0:
                        continue

                    sentence_candidates.append((score, cleaned_sentence))

        if not sentence_candidates:
            return (
                "I found relevant document content, but I could not turn it into a clean "
                "fallback answer yet. Please try rephrasing the question or asking about a "
                "specific page, slide, or concept."
            )

        sentence_candidates.sort(key=lambda item: item[0], reverse=True)
        selected_sentences = []
        seen_signatures = set()

        for _, sentence in sentence_candidates:
            signature = sentence.lower()
            if signature in seen_signatures:
                continue

            seen_signatures.add(signature)
            selected_sentences.append(sentence)

            if len(selected_sentences) >= 3:
                break

        if not selected_sentences:
            return (
                "I found relevant document content, but I could not build a reliable answer "
                "from it in fallback mode."
            )

        answer_body = " ".join(selected_sentences)
        answer_body = re.sub(r"\s+", " ", answer_body).strip()
        if len(answer_body) > 520:
            answer_body = answer_body[:520].rsplit(" ", 1)[0] + "..."

        intro = "Answer based on the selected document"
        if requested_number is not None:
            intro += f" around slide/page {requested_number}"

        source_hint = ""
        if sources:
            first_source = sources[0]
            if first_source.get("pageNumber"):
                source_hint = f" Source: page/slide {first_source['pageNumber']}."

        return f"{intro}: {answer_body}{source_hint}"

    def _extract_question_terms(self, question: str) -> List[str]:
        terms = re.findall(r"[a-z0-9]{3,}", question.lower())
        return [term for term in terms if term not in FALLBACK_STOP_WORDS]

    def _extract_candidate_sections(
        self,
        text: str,
        requested_number: Optional[int],
    ) -> List[str]:
        normalized = re.sub(r"\s+", " ", text).strip()
        if not normalized:
            return []

        if requested_number is None:
            return [normalized]

        section_pattern = re.compile(
            rf"((?:slide|page)\s*{requested_number}\b.*?)(?=(?:slide|page)\s*\d+\b|$)",
            flags=re.IGNORECASE,
        )
        matches = [match.group(1).strip() for match in section_pattern.finditer(normalized)]
        if matches:
            return matches

        return [normalized]

    def _split_into_sentences(self, text: str) -> List[str]:
        normalized = re.sub(r"\s+", " ", text).strip()
        normalized = re.sub(r"([a-z])([A-Z])", r"\1. \2", normalized)
        normalized = re.sub(r"(Slide\s+\d+\s*:?)", r". \1", normalized, flags=re.IGNORECASE)
        normalized = re.sub(r"(Page\s+\d+\s*:?)", r". \1", normalized, flags=re.IGNORECASE)
        parts = re.split(r"(?<=[.!?])\s+|\s+[•:-]\s+|\.\s*(?=Slide\s+\d+)|\.\s*(?=Page\s+\d+)", normalized)
        return [part.strip(" .") for part in parts if part and part.strip(" .")]

    def _clean_fallback_sentence(self, sentence: str) -> str:
        cleaned = re.sub(r"\s+", " ", sentence).strip()
        cleaned = re.sub(r"^(?:slide|page)\s*\d+\s*:?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"^(?:question|answer)\s*:\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\b(?:module|chapter)\s*\d+\s*:?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*([,:;])\s*", r"\1 ", cleaned)
        cleaned = re.sub(r"\s{2,}", " ", cleaned).strip(" ,;:-")
        if cleaned and cleaned[-1] not in ".!?":
            cleaned += "."
        return cleaned

    def _score_fallback_sentence(
        self,
        sentence: str,
        question_terms: List[str],
        requested_number: Optional[int],
        doc_score: float,
    ) -> float:
        lower_sentence = sentence.lower()
        score = doc_score * 4

        if requested_number is not None:
            if f"slide {requested_number}" in lower_sentence or f"page {requested_number}" in lower_sentence:
                score += 3

        overlap = 0
        for term in question_terms:
            if term in lower_sentence:
                overlap += 1
                score += 1.4

        if overlap == 0 and question_terms:
            return 0

        if len(sentence) <= 220:
            score += 0.4
        if len(sentence) > 360:
            score -= 0.6

        return score

    async def _call_openai(self, question: str, context: str) -> str:
        """
        Call OpenAI API with RAG prompt and retry logic.
        """
        prompt = f"""Use only the provided academic content to answer the question.

Rules:
- Answer ONLY using provided content.
- Do not use outside knowledge.
- If the content is insufficient, say exactly that.
- Keep the answer concise and factual.
- When useful, mention the cited page numbers naturally.

ACADEMIC CONTENT:
{context}

USER QUESTION:
{question}

ANSWER:"""

        for attempt in range(self.max_retries):
            try:
                response = self.openai_client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {
                            "role": "system",
                            "content": "You are an academic tutor assistant. Answer only from the provided content and never invent facts.",
                        },
                        {
                            "role": "user",
                            "content": prompt,
                        },
                    ],
                    max_tokens=500,
                    temperature=0.2,
                    timeout=30,
                )

                answer = response.choices[0].message.content
                logger.info(f"OpenAI response successful. Tokens: {response.usage.total_tokens}")
                
                return answer

            except RateLimitError:
                if attempt < self.max_retries - 1:
                    wait_time = self.retry_delay ** (attempt + 1)
                    logger.warning(f"Rate limited. Retrying in {wait_time}s...")
                    await asyncio.sleep(wait_time)
                else:
                    raise
            except APIError as e:
                if attempt < self.max_retries - 1:
                    wait_time = self.retry_delay ** (attempt + 1)
                    logger.warning(f"API error: {e}. Retrying in {wait_time}s...")
                    await asyncio.sleep(wait_time)
                else:
                    raise

    def _build_snippet(self, text: str, max_length: int = 180) -> str:
        normalized = re.sub(r"\s+", " ", text).strip()
        if len(normalized) <= max_length:
            return normalized
        return normalized[:max_length].rsplit(" ", 1)[0] + "..."

    def _calculate_confidence(self, chunks_data: List[Dict], sources: List[Dict]) -> float:
        if not chunks_data or not sources:
            return 0.0

        scores = [max(0.0, min(1.0, float(chunk.get("score", 0.0)))) for chunk in chunks_data[:4]]
        if not scores:
            return 0.0

        average_score = sum(scores) / len(scores)
        source_bonus = min(len(sources), 4) * 0.06
        confidence = min(0.98, max(0.1, average_score + source_bonus))
        return round(confidence, 3)

    def _build_cache_key(
        self,
        question: str,
        resource_ids: Optional[List[str]] = None,
    ) -> str:
        normalized_resources = []
        if resource_ids:
            normalized_resources = sorted(str(resource_id) for resource_id in resource_ids if resource_id)

        cache_key = f"{question.lower().strip()}::{','.join(normalized_resources)}"
        return md5(cache_key.encode()).hexdigest()

    async def _check_cache(
        self,
        question: str,
        resource_ids: Optional[List[str]] = None,
    ) -> Optional[Dict]:
        """Check if an answer for this question is cached."""
        try:
            question_hash = self._build_cache_key(question, resource_ids)
            
            db = self._get_database()
            cache_collection = db["qa_cache"]
            
            cached = await cache_collection.find_one({"_id": question_hash})
            
            if cached and "result" in cached:
                # Check if cache is still valid (TTL)
                created_at = cached.get("timestamp", datetime.now())
                age = (datetime.now() - created_at).total_seconds()
                
                if age < self.cache_ttl:
                    return cached["result"]
                else:
                    # Remove expired cache
                    await cache_collection.delete_one({"_id": question_hash})
            
            return None

        except Exception as e:
            logger.warning(f"Error checking cache: {str(e)}")
            return None

    async def _cache_result(
        self,
        question: str,
        resource_ids: Optional[List[str]],
        result: Dict,
    ) -> None:
        """Cache the QA result."""
        try:
            question_hash = self._build_cache_key(question, resource_ids)
            
            db = self._get_database()
            cache_collection = db["qa_cache"]
            
            await cache_collection.update_one(
                {"_id": question_hash},
                {
                    "$set": {
                        "result": result,
                        "timestamp": datetime.now(),
                        "question": question,
                    }
                },
                upsert=True,
            )
            
            logger.info(f"Cached answer for: {question[:50]}")

        except Exception as e:
            logger.warning(f"Error caching result: {str(e)}")
            # Don't fail if caching fails

    async def store_interaction(
        self,
        user_id: str,
        question: str,
        answer: str,
        sources: List[Dict],
        processing_time: int,
        resource_ids: List[str] = None,
    ) -> None:
        """Store a QA interaction for tracking and analytics."""
        try:
            db = self._get_database()
            interactions_collection = db["qa_interactions"]
            
            interaction = {
                "userId": user_id,
                "question": question,
                "answer": answer,
                "sources": sources,
                "processingTime": processing_time,
                "resourceIds": resource_ids or [],
                "timestamp": datetime.now(),
                "rating": None,
            }
            
            result = await interactions_collection.insert_one(interaction)
            logger.info(f"Stored interaction: {result.inserted_id}")

        except Exception as e:
            logger.error(f"Error storing interaction: {str(e)}")
            # Don't raise - this is non-critical

    async def get_user_history(
        self,
        user_id: str,
        limit: int = 10,
    ) -> List[Dict]:
        """Retrieve a user's question history."""
        try:
            db = self._get_database()
            interactions_collection = db["qa_interactions"]
            
            interactions = await interactions_collection.find(
                {"userId": user_id}
            ).sort("timestamp", -1).limit(limit).to_list(length=limit)
            
            # Convert ObjectId to string for JSON serialization
            for interaction in interactions:
                interaction["_id"] = str(interaction["_id"])
                interaction["timestamp"] = interaction["timestamp"].isoformat()
            
            return interactions

        except Exception as e:
            logger.error(f"Error retrieving history: {str(e)}")
            return []

    async def rate_answer(
        self,
        question_id: str,
        user_id: str,
        rating: str,
    ) -> None:
        """Store user rating for an answer."""
        try:
            from bson import ObjectId
            
            db = self._get_database()
            interactions_collection = db["qa_interactions"]
            
            await interactions_collection.update_one(
                {"_id": ObjectId(question_id)},
                {
                    "$set": {
                        "rating": rating,
                        "ratedAt": datetime.now(),
                    }
                },
            )
            
            logger.info(f"Rating recorded: {rating}")

        except Exception as e:
            logger.error(f"Error rating answer: {str(e)}")
            # Don't fail

    async def clear_cache(self) -> None:
        """Clear all cached QA results."""
        try:
            db = self._get_database()
            cache_collection = db["qa_cache"]
            
            result = await cache_collection.delete_many({})
            logger.info(f"Cleared {result.deleted_count} cached items")

        except Exception as e:
            logger.error(f"Error clearing cache: {str(e)}")
            raise
