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
        for chunk in results:
            source_type = chunk.get("metadata", {}).get("source_type", "document")
            expert_name = chunk.get("metadata", {}).get("expert_name", "Unknown")
            context_parts.append(
                f"[{source_type.upper()} — {expert_name}]\n{chunk['content']}"
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
