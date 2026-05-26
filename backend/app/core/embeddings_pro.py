"""
Production-grade embedding service with batching, caching, and memory optimization.

Features:
- Batch processing for efficient GPU/CPU utilization
- Query result caching with LRU eviction
- Lazy model loading
- Fallback mechanisms
- Token usage tracking
"""

import logging
from functools import lru_cache
from typing import List, Optional, Dict, Any
import numpy as np
from cachetools import TTLCache, cached

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Cache embedding results for 24 hours (reduce redundant computations)
EMBEDDING_CACHE_SIZE = 10000
EMBEDDING_CACHE_TTL = 86400  # 24 hours in seconds


class ProductionEmbeddingService:
    """Production-grade embedding service with caching and batching."""

    def __init__(self, model_name: Optional[str] = None) -> None:
        """Initialize with lazy loading and caching."""
        self.model_name = model_name or settings.EMBEDDING_MODEL
        self._model = None
        self._embedding_cache = TTLCache(
            maxsize=EMBEDDING_CACHE_SIZE,
            ttl=EMBEDDING_CACHE_TTL
        )
        self.embeddings_generated = 0
        self.cache_hits = 0
        logger.info(
            f"ProductionEmbeddingService initialized with model: {self.model_name}"
        )

    @property
    def model(self):
        """Lazy-load the embedding model only when needed."""
        if self._model is None:
            logger.info(f"Loading embedding model: {self.model_name}...")
            try:
                from fastembed import TextEmbedding
                self._model = TextEmbedding(model_name=self.model_name)
                logger.info("✓ Embedding model loaded (FastEmbed ONNX)")
            except Exception as e:
                logger.error(f"Failed to load embedding model: {e}")
                raise
        return self._model

    @cached(cache={})
    def _get_cache_key(self, text: str) -> str:
        """Generate a deterministic cache key for text."""
        return hash(text)

    def embed_text(self, text: str) -> List[float]:
        """
        Generate embedding for a single text with caching.

        Args:
            text: Input text to embed

        Returns:
            Embedding vector as list of floats
        """
        if not text or not isinstance(text, str):
            return []

        # Check cache first
        cache_key = hash(text)
        if cache_key in self._embedding_cache:
            self.cache_hits += 1
            return self._embedding_cache[cache_key]

        # Generate embedding
        try:
            embeddings = list(self.model.embed(text))
            if embeddings:
                result = embeddings[0].tolist() if isinstance(embeddings[0], np.ndarray) else embeddings[0]
                self._embedding_cache[cache_key] = result
                self.embeddings_generated += 1
                return result
            return []
        except Exception as e:
            logger.error(f"Embedding generation failed for text: {e}")
            return []

    def embed_batch(
        self,
        texts: List[str],
        batch_size: int = 32,
    ) -> List[List[float]]:
        """
        Generate embeddings for multiple texts efficiently.

        Implements batching to reduce memory overhead and improve throughput.

        Args:
            texts: List of texts to embed
            batch_size: Number of texts to process per batch

        Returns:
            List of embedding vectors
        """
        if not texts:
            return []

        results = []
        cached_count = 0

        # Try cache first
        uncached_texts = []
        cache_indices = []

        for i, text in enumerate(texts):
            cache_key = hash(text)
            if cache_key in self._embedding_cache:
                results.append((i, self._embedding_cache[cache_key]))
                cached_count += 1
            else:
                uncached_texts.append(text)
                cache_indices.append(i)

        if cached_count > 0:
            self.cache_hits += cached_count
            logger.debug(f"Cache hit: {cached_count}/{len(texts)} texts")

        # Process uncached texts in batches
        if uncached_texts:
            for batch_start in range(0, len(uncached_texts), batch_size):
                batch_end = min(batch_start + batch_size, len(uncached_texts))
                batch = uncached_texts[batch_start:batch_end]

                try:
                    embeddings = self.model.embed(batch)
                    for idx, (text_idx, embedding) in enumerate(
                        zip(
                            cache_indices[batch_start:batch_end],
                            embeddings
                        )
                    ):
                        emb_list = (
                            embedding.tolist()
                            if isinstance(embedding, np.ndarray)
                            else embedding
                        )
                        cache_key = hash(uncached_texts[batch_start + idx])
                        self._embedding_cache[cache_key] = emb_list
                        results.append((text_idx, emb_list))
                        self.embeddings_generated += 1

                except Exception as e:
                    logger.error(f"Batch embedding failed: {e}")
                    # Add empty embeddings for failed batch
                    for text_idx in cache_indices[batch_start:batch_end]:
                        results.append((text_idx, []))

        # Sort results back to original order
        results.sort(key=lambda x: x[0])
        return [emb for _, emb in results]

    def get_metrics(self) -> Dict[str, Any]:
        """Return service metrics for monitoring."""
        return {
            "embeddings_generated": self.embeddings_generated,
            "cache_hits": self.cache_hits,
            "cache_size": len(self._embedding_cache),
            "cache_hit_rate": (
                self.cache_hits / (self.cache_hits + self.embeddings_generated)
                if (self.cache_hits + self.embeddings_generated) > 0
                else 0
            ),
        }


@lru_cache(maxsize=1)
def get_production_embedding_service() -> ProductionEmbeddingService:
    """Get singleton instance of production embedding service."""
    return ProductionEmbeddingService()
