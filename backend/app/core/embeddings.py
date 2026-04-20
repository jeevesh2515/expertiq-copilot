"""
Sentence-transformers embedding wrapper.

Provides a singleton embedding model that generates
384-dimensional vectors from text using all-MiniLM-L6-v2.
Runs entirely locally — no API costs.
"""

import logging
from functools import lru_cache
from typing import List

import numpy as np
from sentence_transformers import SentenceTransformer

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class EmbeddingService:
    """Manages the sentence-transformers model lifecycle."""

    def __init__(self, model_name: str = None) -> None:
        """
        Initialise the embedding model.

        Args:
            model_name: HuggingFace model identifier. Defaults to config value.
        """
        self.model_name = model_name or settings.EMBEDDING_MODEL
        self._model: SentenceTransformer | None = None
        logger.info(f"EmbeddingService initialised with model: {self.model_name}")

    @property
    def model(self) -> SentenceTransformer:
        """Lazy-load the sentence-transformers model."""
        if self._model is None:
            logger.info(f"Loading embedding model: {self.model_name}...")
            self._model = SentenceTransformer(self.model_name)
            logger.info(
                f"Model loaded. Embedding dimension: {self._model.get_sentence_embedding_dimension()}"
            )
        return self._model

    def embed_text(self, text: str) -> List[float]:
        """
        Generate an embedding vector for a single text string.

        Args:
            text: Input text to embed.

        Returns:
            List of floats representing the embedding vector.
        """
        embedding = self.model.encode(text, normalize_embeddings=True)
        return embedding.tolist()

    def embed_texts(self, texts: List[str], batch_size: int = 32) -> List[List[float]]:
        """
        Generate embedding vectors for a batch of texts.

        Args:
            texts: List of input texts.
            batch_size: Number of texts to process at once.

        Returns:
            List of embedding vectors.
        """
        embeddings = self.model.encode(
            texts,
            batch_size=batch_size,
            normalize_embeddings=True,
            show_progress_bar=len(texts) > 100,
        )
        return embeddings.tolist()

    def similarity(self, text_a: str, text_b: str) -> float:
        """
        Compute cosine similarity between two texts.

        Args:
            text_a: First text.
            text_b: Second text.

        Returns:
            Cosine similarity score between -1 and 1.
        """
        embeddings = self.model.encode(
            [text_a, text_b], normalize_embeddings=True
        )
        similarity = np.dot(embeddings[0], embeddings[1])
        return float(similarity)

    @property
    def dimension(self) -> int:
        """Get the embedding dimension of the loaded model."""
        return self.model.get_sentence_embedding_dimension()


@lru_cache()
def get_embedding_service() -> EmbeddingService:
    """Get the singleton embedding service."""
    return EmbeddingService()
