"""
Production-grade vector store with advanced indexing, caching, and semantic search.

Features:
- Efficient batch indexing
- Query result caching
- Metadata filtering
- Semantic similarity search
- Fallback mechanisms
- Performance metrics
"""

import json
import logging
from functools import lru_cache
from typing import Any, Dict, List, Optional, Tuple
import chromadb
from chromadb.config import Settings as ChromaSettings
from cachetools import TTLCache

from app.config import get_settings
from app.core.embeddings_pro import get_production_embedding_service

logger = logging.getLogger(__name__)
settings = get_settings()

# Query result caching: 1 hour TTL, 5000 unique queries
QUERY_CACHE_SIZE = 5000
QUERY_CACHE_TTL = 3600


class ProductionVectorStore:
    """Production-grade vector store for semantic search and expert indexing."""

    EXPERT_COLLECTION = "expert_profiles_v2"
    DOCUMENT_COLLECTION = "expert_documents_v2"

    def __init__(self) -> None:
        """Initialize ChromaDB with production settings."""
        self._client = chromadb.PersistentClient(
            path=settings.CHROMA_PERSIST_DIR,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        self._embedding_service = get_production_embedding_service()
        self._query_cache = TTLCache(
            maxsize=QUERY_CACHE_SIZE,
            ttl=QUERY_CACHE_TTL
        )
        self.query_count = 0
        self.cache_hits = 0
        logger.info(f"ProductionVectorStore initialized at {settings.CHROMA_PERSIST_DIR}")

    @property
    def expert_collection(self) -> chromadb.Collection:
        """Get or create expert profiles collection."""
        return self._client.get_or_create_collection(
            name=self.EXPERT_COLLECTION,
            metadata={
                "description": "Expert profile embeddings with semantic search",
                "version": "2.0",
            },
        )

    @property
    def document_collection(self) -> chromadb.Collection:
        """Get or create expert documents collection."""
        return self._client.get_or_create_collection(
            name=self.DOCUMENT_COLLECTION,
            metadata={
                "description": "Expert documents for RAG pipeline",
                "version": "2.0",
            },
        )

    def _get_cache_key(self, query: str, collection: str, top_k: int, filters: Optional[Dict]) -> str:
        """Generate deterministic cache key for query results."""
        filter_str = json.dumps(filters, sort_keys=True) if filters else ""
        return f"{query}:{collection}:{top_k}:{filter_str}"

    def semantic_search(
        self,
        query: str,
        collection_name: str = "expert_profiles_v2",
        top_k: int = 10,
        filters: Optional[Dict[str, Any]] = None,
        threshold: float = 0.3,
    ) -> List[Dict[str, Any]]:
        """
        Perform semantic search on expert profiles or documents.

        Args:
            query: Search query text
            collection_name: ChromaDB collection name
            top_k: Number of results to return
            filters: ChromaDB metadata filters
            threshold: Minimum similarity score (0.0-1.0)

        Returns:
            List of search results with metadata
        """
        if not query or not isinstance(query, str):
            return []

        # Check cache
        cache_key = self._get_cache_key(query, collection_name, top_k, filters)
        if cache_key in self._query_cache:
            self.cache_hits += 1
            logger.debug(f"Query cache hit for: {query[:50]}")
            return self._query_cache[cache_key]

        try:
            collection = (
                self.expert_collection
                if collection_name == self.EXPERT_COLLECTION
                else self.document_collection
            )

            # Generate query embedding
            query_embedding = self._embedding_service.embed_text(query)
            if not query_embedding:
                logger.warning(f"Failed to generate embedding for query: {query}")
                return []

            # Search with ChromaDB
            results = collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k,
                where=filters,
            )

            if not results or not results.get("documents"):
                return []

            # Format results with metadata and similarity scores
            formatted_results = []
            for i, (doc_id, doc, metadata, distance) in enumerate(
                zip(
                    results["ids"][0],
                    results["documents"][0],
                    results["metadatas"][0],
                    results["distances"][0],
                )
            ):
                # ChromaDB returns distance, convert to similarity (0-1)
                similarity = 1 - (distance / 2) if distance else 0

                if similarity >= threshold:
                    formatted_results.append({
                        "id": doc_id,
                        "content": doc,
                        "metadata": metadata,
                        "similarity": round(similarity, 3),
                        "rank": i + 1,
                    })

            # Cache results
            self._query_cache[cache_key] = formatted_results
            self.query_count += 1

            return formatted_results

        except Exception as e:
            logger.error(f"Semantic search failed: {e}", exc_info=True)
            return []

    def upsert_expert_profiles(
        self,
        experts: List[Dict[str, Any]],
        batch_size: int = 50,
    ) -> Dict[str, Any]:
        """
        Upsert expert profiles with efficient batching.

        Args:
            experts: List of expert profile dictionaries
            batch_size: Number of documents per batch

        Returns:
            Summary of upsert operation
        """
        if not experts:
            return {"status": "skipped", "reason": "No experts provided"}

        try:
            # Extract texts for batch embedding
            expert_ids = []
            texts = []
            metadatas = []

            for expert in experts:
                expert_id = expert.get("id") or expert.get("expert_id")
                if not expert_id:
                    continue

                # Create searchable text from expert profile
                profile_text = self._create_profile_text(expert)
                expert_ids.append(expert_id)
                texts.append(profile_text)
                metadatas.append({
                    "expert_id": expert_id,
                    "name": expert.get("name", "Unknown"),
                    "industry": expert.get("industry", ""),
                    "expertise": ",".join(expert.get("expertise", [])),
                    "source": "expert_profile",
                })

            # Batch embedding generation
            embeddings = self._embedding_service.embed_batch(texts, batch_size=batch_size)

            # Upsert to ChromaDB in batches
            total_upserted = 0
            for i in range(0, len(expert_ids), batch_size):
                batch_end = min(i + batch_size, len(expert_ids))
                batch_ids = expert_ids[i:batch_end]
                batch_docs = texts[i:batch_end]
                batch_embeddings = embeddings[i:batch_end]
                batch_metadatas = metadatas[i:batch_end]

                self.expert_collection.upsert(
                    ids=batch_ids,
                    documents=batch_docs,
                    embeddings=batch_embeddings,
                    metadatas=batch_metadatas,
                )
                total_upserted += len(batch_ids)

            logger.info(f"✓ Upserted {total_upserted} expert profiles")
            return {
                "status": "success",
                "total_upserted": total_upserted,
                "embeddings_generated": len([e for e in embeddings if e]),
            }

        except Exception as e:
            logger.error(f"Expert upsert failed: {e}", exc_info=True)
            return {"status": "failed", "error": str(e)}

    def _create_profile_text(self, expert: Dict[str, Any]) -> str:
        """Create searchable text from expert profile."""
        parts = [
            expert.get("name", ""),
            expert.get("title", ""),
            expert.get("industry", ""),
            " ".join(expert.get("expertise", [])),
            expert.get("bio", ""),
        ]
        return " ".join(p for p in parts if p)

    def get_metrics(self) -> Dict[str, Any]:
        """Return vector store metrics."""
        return {
            "query_count": self.query_count,
            "cache_hits": self.cache_hits,
            "cache_size": len(self._query_cache),
            "cache_hit_rate": (
                self.cache_hits / self.query_count
                if self.query_count > 0
                else 0
            ),
            "embedding_metrics": self._embedding_service.get_metrics(),
        }


@lru_cache(maxsize=1)
def get_production_vector_store() -> ProductionVectorStore:
    """Get singleton instance of production vector store."""
    return ProductionVectorStore()
