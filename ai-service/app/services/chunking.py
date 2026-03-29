import logging
import re
from typing import List, Tuple
from app.services.embedding import embedding_service

logger = logging.getLogger(__name__)


class ChunkingService:
    """
    Service for splitting text into chunks optimized for RAG.
    
    Strategy:
    - Target: 600 tokens per chunk
    - Overlap: 50 tokens between chunks
    - Respects sentence boundaries when possible
    - Preserves structure and context
    """

    def __init__(self, target_tokens: int = 600, overlap_tokens: int = 50):
        self.target_tokens = target_tokens
        self.overlap_tokens = overlap_tokens
        self.tokenizer = embedding_service.tokenizer if hasattr(embedding_service, 'tokenizer') else None

    def chunk_text(self, text: str, page_number: int = 1) -> List[dict]:
        """
        Split text into semantic chunks with metadata.
        
        Args:
            text: Full text to chunk
            page_number: Page number for this text (for citation)
            
        Returns:
            List of chunk dictionaries with text, tokens, and metadata
        """
        try:
            if not text or len(text.strip()) == 0:
                logger.warning("Empty text provided for chunking")
                return []

            # Clean the text
            text = self._clean_text(text)

            # Split into sentences
            sentences = self._split_sentences(text)

            if len(sentences) == 0:
                logger.warning("No sentences extracted from text")
                return []

            # Group sentences into chunks
            chunks = self._create_chunks(sentences, page_number)

            logger.info(f"Created {len(chunks)} chunks from {len(sentences)} sentences")
            return chunks

        except Exception as e:
            logger.error(f"Error chunking text: {str(e)}")
            return []

    def _clean_text(self, text: str) -> str:
        """Clean and normalize text."""
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        # Remove control characters
        text = ''.join(char for char in text if ord(char) >= 32 or char in '\n\t')
        # Remove multiple newlines
        text = re.sub(r'\n{3,}', '\n\n', text)
        # Strip leading/trailing whitespace
        text = text.strip()
        
        return text

    def _split_sentences(self, text: str) -> List[str]:
        """
        Split text into sentences while preserving structure.
        """
        # Split on period, question mark, exclamation but preserve them
        sentence_pattern = r'([.!?]+)'
        
        # Split while keeping delimiters
        parts = re.split(sentence_pattern, text)
        
        sentences = []
        for i in range(0, len(parts) - 1, 2):
            sentence = parts[i] + parts[i + 1] if i + 1 < len(parts) else parts[i]
            sentence = sentence.strip()
            
            if len(sentence) > 10:  # Skip very short sentences
                sentences.append(sentence)
        
        # Handle last part if it doesn't end with punctuation
        if len(parts) % 2 == 1:
            last_part = parts[-1].strip()
            if len(last_part) > 10:
                sentences.append(last_part)
        
        return sentences

    def _create_chunks(self, sentences: List[str], page_number: int) -> List[dict]:
        """
        Create chunks from sentences with overlap strategy.
        """
        chunks = []
        current_chunk_sentences = []
        current_chunk_text = ""
        chunk_index = 0

        for sentence in sentences:
            # Estimate tokens (rough approximation: 1 token per 4 characters)
            sentence_tokens = max(1, len(sentence) // 4)
            current_tokens = len(current_chunk_text) // 4

            # Add sentence if it won't exceed target
            if current_tokens + sentence_tokens <= self.target_tokens:
                current_chunk_sentences.append(sentence)
                current_chunk_text += " " + sentence
            else:
                # Save current chunk if it has content
                if current_chunk_text.strip():
                    chunk = self._create_chunk_dict(
                        current_chunk_text.strip(),
                        chunk_index,
                        page_number,
                    )
                    chunks.append(chunk)
                    chunk_index += 1

                    # Create overlap: reuse last 50% of sentences for next chunk
                    overlap_sentences = current_chunk_sentences[-2:] if len(current_chunk_sentences) > 2 else current_chunk_sentences
                    current_chunk_text = " ".join(overlap_sentences)
                    current_chunk_sentences = overlap_sentences

                # Add new sentence
                current_chunk_sentences.append(sentence)
                current_chunk_text += " " + sentence

        # Save last chunk
        if current_chunk_text.strip():
            chunk = self._create_chunk_dict(
                current_chunk_text.strip(),
                chunk_index,
                page_number,
            )
            chunks.append(chunk)

        return chunks

    def _create_chunk_dict(self, text: str, index: int, page_number: int) -> dict:
        """Create a chunk dictionary with metadata."""
        # Estimate token count (1 token ≈ 4 characters)
        token_count = max(1, len(text) // 4)

        # Generate embedding
        try:
            embedding = embedding_service.encode(text)
            embedding_list = embedding.tolist() if hasattr(embedding, 'tolist') else embedding
        except Exception as e:
            logger.warning(f"Failed to generate embedding for chunk {index}: {str(e)}")
            embedding_list = []

        return {
            "index": index,
            "text": text,
            "embedding": embedding_list,
            "pageNumber": page_number,
            "tokenCount": token_count,
            "charCount": len(text),
        }

    def chunk_pdf_text(self, pdf_text: str, total_pages: int = None) -> List[dict]:
        """
        Chunk text extracted from a PDF, tracking page numbers.
        
        Assumes pdf_text includes page break markers like "[PAGE 1]" or similar.
        """
        # Simple approach: chunk entire text, assign page numbers sequentially
        # For more accuracy, implement proper page tracking during extraction
        
        return self.chunk_text(pdf_text, page_number=1)

    def get_chunk_statistics(self, chunks: List[dict]) -> dict:
        """Get statistics about chunks."""
        if not chunks:
            return {
                "total_chunks": 0,
                "total_tokens": 0,
                "avg_tokens_per_chunk": 0,
                "min_chunk_tokens": 0,
                "max_chunk_tokens": 0,
            }

        token_counts = [c.get("tokenCount", 0) for c in chunks]
        
        return {
            "total_chunks": len(chunks),
            "total_tokens": sum(token_counts),
            "avg_tokens_per_chunk": sum(token_counts) // len(chunks) if chunks else 0,
            "min_chunk_tokens": min(token_counts),
            "max_chunk_tokens": max(token_counts),
        }
