"""
FastEmbed embedding wrapper.

Provides a singleton embedding model that generates
vectors from text using FastEmbed (ONNX runtime).
Runs entirely locally — highly memory-efficient, no API costs.

KEY DESIGN DECISION: Uses fastembed's ONNX runtime exclusively.
This avoids loading the ~500MB PyTorch sentence-transformers model,
reducing RAM usage by ~1GB compared to the previous approach.
"""

import logging
from functools import lru_cache
from typing import List, Optional

import numpy as np

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class EmbeddingService:
    """Manages the fastembed model lifecycle with lazy loading."""

    def __init__(self, model_name: Optional[str] = None) -> None:
        """
        Initialise the embedding model.

        Args:
            model_name: FastEmbed model identifier. Defaults to config value.
        """
        self.model_name = model_name or settings.EMBEDDING_MODEL
        # Normalise model name for fastembed
        if self.model_name == "all-MiniLM-L6-v2":
            self.model_name = "sentence-transformers/all-MiniLM-L6-v2"
        self._model = None
        logger.info(f"EmbeddingService initialised with model: {self.model_name}")

    @property
    def model(self):
        """Lazy-load the fastembed model on first use."""
        if self._model is None:
            logger.info(f"Loading fastembed model: {self.model_name}...")
            try:
                from fastembed import TextEmbedding
                self._model = TextEmbedding(model_name=self.model_name)
                logger.info("Model loaded successfully via FastEmbed (ONNX).")
            except Exception as e:
                logger.error(f"Failed to load fastembed model: {e}")
                raise
        return self._model

    def embed_text(self, text: str) -> List[float]:
        """
        Generate an embedding vector for a single text string.

        Args:
            text: Input text to embed.

        Returns:
            List of floats representing the embedding vector.
        """
        # FastEmbed returns an iterator of embeddings
        embedding = list(self.model.embed([text]))[0]
        # Ensure normalization
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm
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
        if not texts:
            return []
        embeddings_iter = self.model.embed(texts, batch_size=batch_size)
        results = []
        for emb in embeddings_iter:
            norm = np.linalg.norm(emb)
            if norm > 0:
                emb = emb / norm
            results.append(emb.tolist())
        return results

    def similarity(self, text_a: str, text_b: str) -> float:
        """
        Compute cosine similarity between two texts.

        Args:
            text_a: First text.
            text_b: Second text.

        Returns:
            Cosine similarity score between -1 and 1.
        """
        emb_a = np.array(self.embed_text(text_a))
        emb_b = np.array(self.embed_text(text_b))
        similarity = np.dot(emb_a, emb_b)
        return float(similarity)

    @property
    def dimension(self) -> int:
        """Get the embedding dimension of the loaded model."""
        # all-MiniLM-L6-v2 dimension is 384
        return 384


@lru_cache()
def get_embedding_service() -> EmbeddingService:
    """Get the singleton embedding service."""
    return EmbeddingService()
