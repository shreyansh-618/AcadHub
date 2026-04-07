import logging
from typing import List, Dict
import time
from openai import OpenAI
from transformers import pipeline

from app.config.settings import settings

logger = logging.getLogger(__name__)


class SummarizationService:
    """Service for document summarization using OpenAI with BART fallback"""

    def __init__(self):
        self.openai_client = None
        self.bart_pipeline = None
        self.use_openai = bool(settings.openai_api_key)

        if self.use_openai:
            self.openai_client = OpenAI(api_key=settings.openai_api_key)
            logger.info("OpenAI summarization enabled")
        else:
            logger.info("Using local BART summarizer (free alternative)")

    async def summarize(
        self,
        text: str,
        max_length: int = 150,
        min_length: int = 50,
    ) -> Dict:
        """
        Summarize text using OpenAI (preferred) or BART (fallback).
        
        Args:
            text: Text to summarize
            max_length: Maximum summary length
            min_length: Minimum summary length
        
        Returns:
            Dictionary with summary and key points
        """
        try:
            start_time = time.time()

            if self.use_openai:
                result = await self._summarize_openai(text, max_length)
            else:
                result = await self._summarize_bart(text, max_length, min_length)

            # Extract key points
            key_points = self._extract_key_points(result["summary"])

            processing_time = (time.time() - start_time) * 1000  # Convert to ms

            return {
                "summary": result["summary"],
                "key_points": key_points,
                "processing_time_ms": processing_time,
            }
        except Exception as e:
            logger.error(f"Error in summarization: {e}")
            raise

    async def _summarize_openai(self, text: str, max_length: int) -> Dict:
        """Summarize using OpenAI GPT-3.5-turbo"""
        try:
            # Split text into chunks if too long
            chunk_size = 4000
            if len(text) > chunk_size:
                chunks = [text[i : i + chunk_size] for i in range(0, len(text), chunk_size)]
                summaries = []

                for chunk in chunks:
                    response = self.openai_client.chat.completions.create(
                        model="gpt-3.5-turbo",
                        messages=[
                            {
                                "role": "system",
                                "content": "You are an academic tutor. Summarize this content in 2-3 sentences.",
                            },
                            {"role": "user", "content": chunk},
                        ],
                        max_tokens=max_length,
                        temperature=settings.openai_temperature,
                        timeout=settings.request_timeout_seconds,
                    )
                    summaries.append(response.choices[0].message.content)

                return {"summary": " ".join(summaries)}
            else:
                response = self.openai_client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {
                            "role": "system",
                            "content": "You are an academic tutor. Summarize this content concisely.",
                        },
                        {"role": "user", "content": text},
                    ],
                    max_tokens=max_length,
                    temperature=settings.openai_temperature,
                    timeout=settings.request_timeout_seconds,
                )

                return {"summary": response.choices[0].message.content}
        except Exception as e:
            logger.error(f"OpenAI summarization error: {e}")
            # Fallback to BART
            return await self._summarize_bart(text, max_length, 50)

    async def _summarize_bart(
        self, text: str, max_length: int, min_length: int
    ) -> Dict:
        """Summarize using BART (free, local)"""
        try:
            # Load BART if not already loaded
            if self.bart_pipeline is None:
                logger.info("Loading BART summarization model...")
                self.bart_pipeline = pipeline(
                    "summarization", model="facebook/bart-large-cnn"
                )

            # Split into chunks suitable for BART
            chunk_size = 1024
            chunks = [text[i : i + chunk_size] for i in range(0, len(text), chunk_size)]
            summaries = []

            for chunk in chunks:
                if len(chunk.split()) < 50:
                    continue

                summary = self.bart_pipeline(
                    chunk,
                    max_length=max_length,
                    min_length=min_length,
                    do_sample=False,
                )
                summaries.append(summary[0]["summary_text"])

            final_summary = " ".join(summaries) if summaries else text[:500]
            return {"summary": final_summary}
        except Exception as e:
            logger.error(f"BART summarization error: {e}")
            # Last resort: return first 500 characters
            return {"summary": text[:500]}

    def _extract_key_points(self, summary: str) -> List[str]:
        """Extract key points from summary by splitting on periods"""
        points = [p.strip() for p in summary.split(".") if p.strip()]
        return points[:5]  # Return top 5 key points
