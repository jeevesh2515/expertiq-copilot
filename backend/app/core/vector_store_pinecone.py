"""
Pinecone vector store implementation for expert profile embeddings.

Provides alternate retrieval backend with indexing, caching, and semantic search
leveraging the official Pinecone serverless cloud architecture.
"""

import json
import logging
from functools import lru_cache
from typing import Any, Dict, List, Optional

from cachetools import TTLCache
from langsmith import traceable
from pinecone import Pinecone, ServerlessSpec

from app.config import get_settings
from app.core.embeddings import get_embedding_service

logger = logging.getLogger(__name__)
settings = get_settings()

# Query result caching: 1 hour TTL, 5000 unique queries
QUERY_CACHE_SIZE = 5000
QUERY_CACHE_TTL = 3600


class PineconeVectorStore:
    """Pinecone-backed vector store for semantic search and expert indexing."""

    def __init__(self) -> None:
        """Initialize Pinecone client and auto-create index if it does not exist."""
        if not settings.pinecone_available:
            logger.warning("Pinecone settings are not configured properly. Accessing Pinecone will fail.")
            self._client = None
            self._index = None
            self._embedding_service = None
            self._query_cache = TTLCache(maxsize=QUERY_CACHE_SIZE, ttl=QUERY_CACHE_TTL)
            return

        try:
            self._client = Pinecone(api_key=settings.PINECONE_API_KEY)
            self._embedding_service = get_embedding_service()
            self._query_cache = TTLCache(
                maxsize=QUERY_CACHE_SIZE,
                ttl=QUERY_CACHE_TTL
            )
            self.query_count = 0
            self.cache_hits = 0

            # Auto-create serverless index if it doesn't exist
            existing_indexes = [idx.name for idx in self._client.list_indexes()]
            if settings.PINECONE_INDEX_NAME not in existing_indexes:
                logger.info(f"Creating Pinecone index: {settings.PINECONE_INDEX_NAME}...")
                self._client.create_index(
                    name=settings.PINECONE_INDEX_NAME,
                    dimension=self._embedding_service.dimension,  # 384 for all-MiniLM-L6-v2
                    metric="cosine",
                    spec=ServerlessSpec(
                        cloud=settings.PINECONE_CLOUD,
                        region=settings.PINECONE_REGION,
                    )
                )
                logger.info(f"✓ Pinecone index {settings.PINECONE_INDEX_NAME} created successfully.")
            
            self._index = self._client.Index(settings.PINECONE_INDEX_NAME)
            logger.info(f"PineconeVectorStore initialized for index: {settings.PINECONE_INDEX_NAME}")
        except Exception as e:
            logger.error(f"Failed to initialize Pinecone client: {e}", exc_info=True)
            self._client = None
            self._index = None
            raise

    def _get_cache_key(self, query: str, top_k: int, filters: Optional[Dict]) -> str:
        """Generate deterministic cache key for query results."""
        filter_str = json.dumps(filters, sort_keys=True) if filters else ""
        return f"{query}:{top_k}:{filter_str}"

    @traceable(run_type="retriever")
    def semantic_search(
        self,
        query: str,
        top_k: int = 10,
        filters: Optional[Dict[str, Any]] = None,
        threshold: float = 0.3,
    ) -> List[Dict[str, Any]]:
        """
        Perform semantic similarity search on Pinecone index.

        Args:
            query: Search query text
            top_k: Number of results to return
            filters: Pinecone metadata filters (MongoDB-like syntax)
            threshold: Minimum similarity score (0.0-1.0)

        Returns:
            List of search results in standard format compatible with other vector backends
        """
        if not query or not isinstance(query, str):
            return []

        if not self._index:
            raise ValueError("Pinecone client is not properly initialized. Check your configuration.")

        # Check cache
        cache_key = self._get_cache_key(query, top_k, filters)
        if cache_key in self._query_cache:
            self.cache_hits += 1
            logger.debug(f"Pinecone query cache hit for: {query[:50]}")
            return self._query_cache[cache_key]

        try:
            # Generate query embedding via our fastembed service
            query_embedding = self._embedding_service.embed_text(query)
            if not query_embedding:
                logger.warning(f"Failed to generate embedding for query: {query}")
                return []

            # Format filters for Pinecone if needed (e.g. mapping $in operators if they exist)
            pc_filters = self._format_filters(filters) if filters else None

            # Execute Pinecone query
            namespace = settings.PINECONE_NAMESPACE or None
            response = self._index.query(
                vector=query_embedding,
                top_k=top_k,
                include_metadata=True,
                filter=pc_filters,
                namespace=namespace
            )

            # Format results
            formatted_results = []
            for i, match in enumerate(response.matches):
                similarity = match.score  # Cosine score is already normalised 0 to 1
                metadata = match.metadata or {}

                # Create document search compatible content string if missing
                content = metadata.get("bio", "") or metadata.get("document", "")
                if not content:
                    # Synthesize from metadata fields
                    content = f"{metadata.get('name', '')} - {metadata.get('title', '')} at {metadata.get('company', '')}. Expertise: {metadata.get('topics', '')}"

                if similarity >= threshold:
                    formatted_results.append({
                        "id": match.id,
                        "content": content,
                        "page_content": content,
                        "type": "Document",
                        "metadata": metadata,
                        "similarity": round(similarity, 3),
                        "rank": i + 1,
                    })

            # Cache results
            self._query_cache[cache_key] = formatted_results
            self.query_count += 1

            return formatted_results

        except Exception as e:
            logger.error(f"Pinecone semantic search failed: {e}", exc_info=True)
            return []

    def _format_filters(self, filters: Dict[str, Any]) -> Dict[str, Any]:
        """
        Format filters from ChromaDB style to Pinecone style.
        
        ChromaDB uses {"$in": [...]} style which is fully compatible with Pinecone.
        If any simple equality operators are present, ensure they map properly.
        """
        formatted = {}
        for key, val in filters.items():
            if isinstance(val, dict):
                formatted[key] = val
            else:
                # Map simple equality
                formatted[key] = {"$eq": val}
        return formatted

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
            embedding_text: Full text to embed.
            metadata: Expert metadata for filtering.
        """
        if not self._index:
            raise ValueError("Pinecone client is not properly initialized. Check your configuration.")

        try:
            embedding = self._embedding_service.embed_text(embedding_text)
            
            # Ensure metadata has the content as a field for RAG reconstruction
            pc_metadata = {**metadata, "bio": metadata.get("bio", embedding_text)}
            
            namespace = settings.PINECONE_NAMESPACE or None
            self._index.upsert(
                vectors=[(expert_id, embedding, pc_metadata)],
                namespace=namespace
            )
            logger.info(f"Upserted expert {expert_id} to Pinecone.")
        except Exception as e:
            logger.error(f"Pinecone upsert_expert failed for {expert_id}: {e}", exc_info=True)
            raise

    def upsert_experts_batch(
        self,
        expert_ids: List[str],
        texts: List[str],
        metadatas: List[Dict[str, Any]],
        batch_size: int = 50,
    ) -> Dict[str, Any]:
        """
        Batch upsert multiple expert profile embeddings.

        Args:
            expert_ids: List of expert IDs.
            texts: List of embedding texts.
            metadatas: List of metadata dicts.
            batch_size: Number of documents per batch.
        """
        if not self._index:
            raise ValueError("Pinecone client is not properly initialized. Check your configuration.")

        if not expert_ids:
            return {"status": "skipped", "reason": "No experts provided"}

        try:
            # Batch embedding generation
            embeddings = self._embedding_service.embed_texts(texts, batch_size=batch_size)

            total_upserted = 0
            namespace = settings.PINECONE_NAMESPACE or None

            # Upsert to Pinecone in chunks
            for i in range(0, len(expert_ids), batch_size):
                batch_end = min(i + batch_size, len(expert_ids))
                
                batch_vectors = []
                for idx in range(i, batch_end):
                    meta = metadatas[idx]
                    # Ensure bio is included
                    pc_metadata = {**meta, "bio": meta.get("bio", texts[idx])}
                    batch_vectors.append((expert_ids[idx], embeddings[idx], pc_metadata))

                self._index.upsert(
                    vectors=batch_vectors,
                    namespace=namespace
                )
                total_upserted += len(batch_vectors)

            logger.info(f"✓ Batch upserted {total_upserted} expert profiles to Pinecone.")
            return {
                "status": "success",
                "total_upserted": total_upserted,
                "embeddings_generated": len([e for e in embeddings if e]),
            }

        except Exception as e:
            logger.error(f"Pinecone batch upsert failed: {e}", exc_info=True)
            return {"status": "failed", "error": str(e)}

    def delete_expert(self, expert_id: str) -> None:
        """Remove an expert embedding by ID."""
        if not self._index:
            raise ValueError("Pinecone client is not properly initialized.")

        try:
            namespace = settings.PINECONE_NAMESPACE or None
            self._index.delete(ids=[expert_id], namespace=namespace)
            logger.info(f"Deleted expert {expert_id} from Pinecone.")
        except Exception as e:
            logger.error(f"Pinecone delete failed for {expert_id}: {e}", exc_info=True)
            raise

    def get_expert_count(self) -> int:
        """Return the total number of vectors in the active namespace."""
        if not self._index:
            return 0
        try:
            stats = self._index.describe_index_stats()
            namespace = settings.PINECONE_NAMESPACE or ""
            namespaces = stats.get("namespaces", {})
            if namespace in namespaces:
                return namespaces[namespace].get("vector_count", 0)
            return stats.get("total_vector_count", 0)
        except Exception as e:
            logger.error(f"Failed to get Pinecone index stats: {e}")
            return 0

    def get_metrics(self) -> Dict[str, Any]:
        """Return search and cache statistics."""
        return {
            "query_count": self.query_count,
            "cache_hits": self.cache_hits,
            "cache_size": len(self._query_cache),
            "cache_hit_rate": (
                self.cache_hits / self.query_count
                if self.query_count > 0
                else 0
            ),
        }


# Singleton instance
_pinecone_vector_store: Optional[PineconeVectorStore] = None


def get_pinecone_vector_store() -> PineconeVectorStore:
    """Get or create the singleton PineconeVectorStore instance."""
    global _pinecone_vector_store
    if _pinecone_vector_store is None:
        _pinecone_vector_store = PineconeVectorStore()
    return _pinecone_vector_store
