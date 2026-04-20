"""
ChromaDB vector store for expert profile embeddings.

Handles CRUD operations on the vector database including
upserting expert profiles, semantic search, and document storage
for the RAG pipeline.
"""

import logging
from typing import Any, Dict, List, Optional, Tuple

import chromadb
from chromadb.config import Settings as ChromaSettings

from app.config import get_settings
from app.core.embeddings import get_embedding_service

logger = logging.getLogger(__name__)
settings = get_settings()


class VectorStore:
    """ChromaDB-backed vector store for expert embeddings and documents."""

    EXPERT_COLLECTION = "expert_profiles"
    DOCUMENT_COLLECTION = "expert_documents"

    def __init__(self) -> None:
        """Initialise ChromaDB client with persistent storage."""
        self._client = chromadb.PersistentClient(
            path=settings.CHROMA_PERSIST_DIR,
            settings=ChromaSettings(
                anonymized_telemetry=False,
            )
        )
        self._embedding_service = get_embedding_service()
        logger.info(f"VectorStore initialised at {settings.CHROMA_PERSIST_DIR}")

    @property
    def expert_collection(self) -> chromadb.Collection:
        """Get or create the expert profiles collection."""
        return self._client.get_or_create_collection(
            name=self.EXPERT_COLLECTION,
            metadata={"description": "Expert profile embeddings"},
        )

    @property
    def document_collection(self) -> chromadb.Collection:
        """Get or create the expert documents collection."""
        return self._client.get_or_create_collection(
            name=self.DOCUMENT_COLLECTION,
            metadata={"description": "Expert publications and bios as document chunks"},
        )

    def upsert_expert(
        self,
        expert_id: str,
        embedding_text: str,
        metadata: Dict[str, Any],
    ) -> None:
        """
        Upsert a single expert profile embedding.

        Args:
            expert_id: Unique expert identifier.
            embedding_text: Full text to embed (from Expert.to_embedding_text()).
            metadata: Expert metadata for filtering (name, industry, etc.).
        """
        embedding = self._embedding_service.embed_text(embedding_text)
        self.expert_collection.upsert(
            ids=[expert_id],
            embeddings=[embedding],
            documents=[embedding_text],
            metadatas=[metadata],
        )

    def upsert_experts_batch(
        self,
        expert_ids: List[str],
        texts: List[str],
        metadatas: List[Dict[str, Any]],
    ) -> None:
        """
        Batch upsert multiple expert profile embeddings.

        Args:
            expert_ids: List of expert IDs.
            texts: List of embedding texts.
            metadatas: List of metadata dicts.
        """
        embeddings = self._embedding_service.embed_texts(texts)
        self.expert_collection.upsert(
            ids=expert_ids,
            embeddings=embeddings,
            documents=texts,
            metadatas=metadatas,
        )
        logger.info(f"Upserted {len(expert_ids)} expert embeddings.")

    def add_document_chunks(
        self,
        chunk_ids: List[str],
        chunks: List[str],
        metadatas: List[Dict[str, Any]],
    ) -> None:
        """
        Add document chunks (bios, publications) for RAG retrieval.

        Args:
            chunk_ids: Unique IDs for each chunk.
            chunks: Text content of each chunk.
            metadatas: Metadata for filtering (expert_id, source_type, etc.).
        """
        embeddings = self._embedding_service.embed_texts(chunks)
        self.document_collection.upsert(
            ids=chunk_ids,
            embeddings=embeddings,
            documents=chunks,
            metadatas=metadatas,
        )
        logger.info(f"Added {len(chunk_ids)} document chunks.")

    def search_experts(
        self,
        query: str,
        top_k: int = 20,
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Semantic search for experts matching a query.

        Args:
            query: Natural language search query.
            top_k: Number of results to return.
            filters: Optional ChromaDB where clause for metadata filtering.

        Returns:
            List of dicts with id, document, metadata, and distance.
        """
        query_embedding = self._embedding_service.embed_text(query)

        search_kwargs: Dict[str, Any] = {
            "query_embeddings": [query_embedding],
            "n_results": min(top_k, self.expert_collection.count() or top_k),
        }
        if filters:
            search_kwargs["where"] = filters

        results = self.expert_collection.query(**search_kwargs)

        parsed_results = []
        if results and results["ids"] and results["ids"][0]:
            for i, doc_id in enumerate(results["ids"][0]):
                # Convert distance to similarity score (0-100)
                distance = results["distances"][0][i] if results["distances"] else 0
                similarity = max(0, (1 - distance / 2)) * 100  # Normalise to 0-100

                parsed_results.append({
                    "id": doc_id,
                    "document": results["documents"][0][i] if results["documents"] else "",
                    "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                    "distance": distance,
                    "similarity_score": round(similarity, 2),
                })

        return parsed_results

    def search_documents(
        self,
        query: str,
        top_k: int = 10,
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Search document chunks for RAG context retrieval.

        Args:
            query: Search query.
            top_k: Number of chunks to return.
            filters: Optional metadata filters.

        Returns:
            List of matching document chunks.
        """
        query_embedding = self._embedding_service.embed_text(query)

        search_kwargs: Dict[str, Any] = {
            "query_embeddings": [query_embedding],
            "n_results": min(top_k, self.document_collection.count() or top_k),
        }
        if filters:
            search_kwargs["where"] = filters

        results = self.document_collection.query(**search_kwargs)

        parsed = []
        if results and results["ids"] and results["ids"][0]:
            for i, doc_id in enumerate(results["ids"][0]):
                parsed.append({
                    "id": doc_id,
                    "content": results["documents"][0][i] if results["documents"] else "",
                    "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                })

        return parsed

    def get_expert_count(self) -> int:
        """Return the number of expert embeddings in the store."""
        return self.expert_collection.count()

    def get_document_count(self) -> int:
        """Return the number of document chunks in the store."""
        return self.document_collection.count()

    def delete_expert(self, expert_id: str) -> None:
        """Remove an expert embedding by ID."""
        self.expert_collection.delete(ids=[expert_id])

    def persist(self) -> None:
        """Persist the database to disk (no-op: PersistentClient auto-persists)."""
        logger.info("Vector store data is auto-persisted by PersistentClient.")


# Singleton instance
_vector_store: Optional[VectorStore] = None


def get_vector_store() -> VectorStore:
    """Get or create the singleton vector store instance."""
    global _vector_store
    if _vector_store is None:
        _vector_store = VectorStore()
    return _vector_store
