import logging
from typing import List, Dict
import time
import yake
from transformers import pipeline

logger = logging.getLogger(__name__)

# Define known academic tags
KNOWN_TAGS = [
    "DBMS",
    "Database",
    "SQL",
    "OOP",
    "Object-Oriented",
    "Networking",
    "Networks",
    "WebDevelopment",
    "Web Dev",
    "Frontend",
    "Backend",
    "JavaScript",
    "Python",
    "Java",
    "C++",
    "MachineLearning",
    "ML",
    "DeepLearning",
    "AI",
    "DataStructures",
    "Algorithms",
    "OperatingSystems",
    "OS",
    "CompilerDesign",
    "Compiler",
    "Math",
    "Mathematics",
    "Calculus",
    "LinearAlgebra",
    "Physics",
    "Chemistry",
    "Biology",
    "Statistics",
    "Probability",
    "DiscreteStructures",
    "GraphTheory",
    "DataScience",
    "BigData",
    "CloudComputing",
    "Cybersecurity",
    "Security",
    "SoftwareEngineering",
    "SystemDesign",
    "Testing",
    "DevOps",
    "Docker",
    "Kubernetes",
]


class TaggingService:
    """Service for automatic tagging of academic content"""

    def __init__(self):
        self.keyword_extractor = None
        self.zero_shot_classifier = None
        self.load_models()

    def load_models(self):
        """Load required models"""
        try:
            logger.info("Loading tagging models...")
            # For keyword extraction (YAKE doesn't need loading)
            # For zero-shot classification
            self.zero_shot_classifier = pipeline(
                "zero-shot-classification",
                model="facebook/bart-large-mnli",
                device=-1,  # CPU, use 0 for GPU
            )
            logger.info("Tagging models loaded successfully")
        except Exception as e:
            logger.error(f"Error loading tagging models: {e}")
            raise

    async def extract_tags(
        self,
        text: str,
        top_k: int = 5,
    ) -> Dict:
        """
        Extract and classify tags from text.
        
        Args:
            text: Text to extract tags from
            top_k: Number of top tags to return
        
        Returns:
            Dictionary with tags and confidence scores
        """
        try:
            start_time = time.time()

            # Step 1: Extract keywords using YAKE (no training needed)
            keywords = self._extract_keywords(text, top_k=10)
            logger.info(f"Extracted {len(keywords)} keywords: {keywords}")

            # Step 2: Map keywords to known tags using zero-shot classification
            extracted_tags = []

            for keyword in keywords:
                try:
                    result = self.zero_shot_classifier(
                        keyword, KNOWN_TAGS, multi_class=False
                    )

                    # Get top match if confidence is high
                    if result["scores"][0] > 0.5:  # Confidence threshold
                        extracted_tags.append({
                            "name": result["labels"][0],
                            "alias": keyword,
                            "confidence": float(result["scores"][0]),
                            "source": "auto",
                        })
                except Exception as e:
                    logger.warning(f"Error classifying keyword '{keyword}': {e}")
                    continue

            # Remove duplicates, keep highest confidence
            tag_dict = {}
            for tag in extracted_tags:
                key = tag["name"].lower()
                if key not in tag_dict or tag["confidence"] > tag_dict[key]["confidence"]:
                    tag_dict[key] = tag

            # Sort by confidence and limit to top_k
            final_tags = sorted(
                list(tag_dict.values()), key=lambda x: x["confidence"], reverse=True
            )[:top_k]

            processing_time = (time.time() - start_time) * 1000  # Convert to ms

            # Calculate average confidence
            avg_confidence = (
                sum(t["confidence"] for t in final_tags) / len(final_tags)
                if final_tags
                else 0
            )

            return {
                "tags": final_tags,
                "confidence_avg": avg_confidence,
                "processing_time_ms": processing_time,
            }
        except Exception as e:
            logger.error(f"Error in extract_tags: {e}")
            raise

    def _extract_keywords(self, text: str, top_k: int = 10) -> List[str]:
        """Extract keywords using YAKE algorithm"""
        try:
            # Extract keywords with YAKE
            keywords = yake.extract_keywords(
                text,
                top_k=top_k,
                stopwords=None,  # Use default stopwords
                language="en",
                max_ngram_size=3,
            )

            # Return just the keywords (first element of tuple)
            return [kw[0] for kw in keywords]
        except Exception as e:
            logger.error(f"Error extracting keywords: {e}")
            # Fallback: simple word frequency
            words = text.lower().split()
            from collections import Counter

            word_freq = Counter(words)
            return [word for word, _ in word_freq.most_common(top_k)]

    async def auto_tag_resource(
        self,
        resource_title: str,
        resource_description: str,
        resource_content: str,
        top_k: int = 5,
    ) -> Dict:
        """
        Automatically tag a resource using title, description, and content.
        
        Args:
            resource_title: Resource title
            resource_description: Resource description
            resource_content: Resource content
            top_k: Number of top tags
        
        Returns:
            Dictionary with tags
        """
        try:
            # Combine all text
            combined_text = f"{resource_title} {resource_description} {resource_content}"

            # Extract tags
            result = await self.extract_tags(combined_text, top_k)

            return result
        except Exception as e:
            logger.error(f"Error auto-tagging resource: {e}")
            raise

    def get_known_tags(self) -> List[str]:
        """Return list of known academic tags"""
        return KNOWN_TAGS

    def find_related_tags(self, tag_name: str) -> List[str]:
        """Find tags related to a given tag"""
        tag_lower = tag_name.lower()

        # Simple string matching
        related = [
            t for t in KNOWN_TAGS
            if tag_lower in t.lower() or t.lower() in tag_lower
        ]

        return related
