"""
LangChain RAG pipeline for grounding LLM responses in expert data.

Retrieves relevant document chunks from ChromaDB and injects them
into the LLM's context window, preventing hallucination.
"""

import logging
from typing import Any, Dict, List, Optional

from app.config import get_settings
from app.core.vector_store import get_vector_store

logger = logging.getLogger(__name__)
settings = get_settings()


class RAGPipeline:
    """Retrieval-Augmented Generation pipeline for expert data."""

    def __init__(self) -> None:
        """Initialise the RAG pipeline."""
        self._vector_store = get_vector_store()

    def retrieve_context(
        self,
        query: str,
        expert_ids: Optional[List[str]] = None,
        top_k: int = 10,
    ) -> str:
        """
        Retrieve relevant document chunks and format as context string.

        Args:
            query: The search query.
            expert_ids: Optional list of expert IDs to filter context.
            top_k: Number of chunks to retrieve.

        Returns:
            Formatted context string for LLM injection.
        """
        # Search document collection for relevant chunks
        filters = None
        if expert_ids:
            filters = {"expert_id": {"$in": expert_ids}}

        results = self._vector_store.search_documents(
            query=query,
            top_k=top_k,
            filters=filters,
        )

        if not results:
            # Fall back to expert profile search
            expert_results = self._vector_store.search_experts(
                query=query,
                top_k=top_k,
            )
            context_parts = []
            for r in expert_results:
                context_parts.append(
                    f"Expert Profile: {r.get('document', '')}"
                )
            return "\n\n---\n\n".join(context_parts)

        context_parts = []
        seen_parent_ids = set()
        for chunk in results:
            parent_id = chunk.get("metadata", {}).get("parent_id")
            if parent_id:
                if parent_id in seen_parent_ids:
                    continue
                seen_parent_ids.add(parent_id)
                
            content = chunk.get("metadata", {}).get("parent_text") or chunk["content"]
            source_type = chunk.get("metadata", {}).get("source_type", "document")
            expert_name = chunk.get("metadata", {}).get("expert_name", "Unknown")
            context_parts.append(
                f"[{source_type.upper()} — {expert_name}]\n{content}"
            )

        return "\n\n---\n\n".join(context_parts)

    def build_expert_context(
        self,
        experts: List[Dict[str, Any]],
        query: str,
    ) -> str:
        """
        Build a comprehensive context string from expert profiles
        and retrieved documents.

        Args:
            experts: List of expert data dicts.
            query: Original search query.

        Returns:
            Formatted context for LLM.
        """
        parts = []

        # Add expert profile summaries
        for i, expert in enumerate(experts[:10], 1):
            topics = ", ".join(expert.get("topics", []))
            pubs = "; ".join(expert.get("publications", [])[:3])
            part = (
                f"[Expert {i}] {expert.get('name', 'Unknown')}\n"
                f"Title: {expert.get('title', 'N/A')}\n"
                f"Company: {expert.get('company', 'N/A')}\n"
                f"Industry: {expert.get('industry', 'N/A')}\n"
                f"Seniority: {expert.get('seniority', 'N/A')}\n"
                f"Experience: {expert.get('years_experience', 'N/A')} years\n"
                f"Topics: {topics}\n"
                f"Key Publications: {pubs}\n"
                f"Bio: {expert.get('bio', 'N/A')}"
            )
            parts.append(part)

        # Add retrieved document context
        doc_context = self.retrieve_context(
            query=query,
            expert_ids=[e.get("id", "") for e in experts[:10]],
            top_k=5,
        )
        if doc_context:
            parts.append(f"\n[ADDITIONAL CONTEXT]\n{doc_context}")

        separator = "\n\n" + "=" * 60 + "\n\n"
        return separator.join(parts)


# Singleton
_rag_pipeline: Optional[RAGPipeline] = None


def get_rag_pipeline() -> RAGPipeline:
    """Get or create the singleton RAG pipeline."""
    global _rag_pipeline
    if _rag_pipeline is None:
        _rag_pipeline = RAGPipeline()
    return _rag_pipeline


def seed_document_chunks(db) -> int:
    """
    Dynamically extract, chunk, and embed expert publications and biographies
    into ChromaDB for rich RAG context grounding.
    """
    from app.core.vector_store import get_vector_store
    vs = get_vector_store()
    
    # Check if already seeded to avoid redundant embedding generation
    try:
        if vs.get_document_count() > 0:
            return 0
    except Exception as count_err:
        logger.warning(f"Could not check document collection count, proceeding with seed: {count_err}")

    from app.models.expert import Expert
    experts = db.query(Expert).all()
    chunk_ids = []
    chunks = []
    metadatas = []

    for expert in experts:
        # 1. Chunk and index biography
        bio_chunk_id = f"doc_{expert.id}_bio"
        bio_text = f"Expert Biography for {expert.name} ({expert.title} at {expert.company}):\n{expert.bio}"
        chunk_ids.append(bio_chunk_id)
        chunks.append(bio_text)
        metadatas.append({
            "expert_id": expert.id,
            "expert_name": expert.name,
            "source_type": "biography"
        })

        # 2. Chunk and index publications
        for idx, pub in enumerate(expert.publications):
            pub_chunk_id = f"doc_{expert.id}_pub_{idx}"
            pub_text = f"Research Publication by {expert.name} ({expert.title} at {expert.company}):\n'{pub}'"
            chunk_ids.append(pub_chunk_id)
            chunks.append(pub_text)
            metadatas.append({
                "expert_id": expert.id,
                "expert_name": expert.name,
                "source_type": "publication"
            })

    if chunk_ids:
        try:
            vs.add_document_chunks(chunk_ids, chunks, metadatas)
            return len(chunk_ids)
        except Exception as e:
            logger.error(f"Failed to seed RAG document collection: {e}")
            raise
    return 0

