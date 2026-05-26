"""
Production-grade LLM-powered semantic search with query understanding and ranking.

Features:
- Query expansion and understanding with LLM
- Multi-stage ranking (semantic + relevance)
- Fallback to lightweight search
- Token optimization
- Structured responses with pydantic
"""

import logging
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import get_settings
from app.core.vector_store_pro import get_production_vector_store
from app.core.lightweight_search import get_lightweight_search_engine

logger = logging.getLogger(__name__)
settings = get_settings()


class QueryInsight(BaseModel):
    """Structured output from query analysis."""
    original_query: str
    expanded_keywords: List[str] = Field(default_factory=list)
    search_intent: str
    filters: Dict[str, Any] = Field(default_factory=dict)
    is_specific: bool = True


class ExpertMatch(BaseModel):
    """Structured expert match result."""
    expert_id: str
    name: str
    title: Optional[str] = None
    industry: Optional[str] = None
    relevance_score: float = Field(ge=0.0, le=1.0)
    match_reason: str
    expertise: List[str] = Field(default_factory=list)


class LLMSemanticSearch:
    """Production-grade LLM-powered semantic search engine."""

    def __init__(self) -> None:
        """Initialize LLM search with fallbacks."""
        self.vector_store = get_production_vector_store()
        self.lightweight_search = get_lightweight_search_engine()
        self.llm_available = bool(settings.GROQ_API_KEY)
        logger.info(
            f"LLMSemanticSearch initialized (LLM available: {self.llm_available})"
        )

    @retry(
        stop=stop_after_attempt(2),
        wait=wait_exponential(multiplier=1, min=2, max=10),
    )
    def _call_groq(self, prompt: str, temperature: float = 0.3) -> str:
        """Call Groq API with resilience."""
        try:
            from groq import Groq

            client = Groq(api_key=settings.GROQ_API_KEY)
            message = client.messages.create(
                model=settings.GROQ_MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=temperature,
                max_tokens=500,
            )
            return message.content[0].text
        except Exception as e:
            logger.error(f"Groq API call failed: {e}")
            raise

    def understand_query(self, query: str) -> QueryInsight:
        """
        Understand search query intent using LLM (optional).

        Falls back to keyword extraction if LLM unavailable.
        """
        if not self.llm_available:
            # Fallback: simple keyword extraction
            keywords = query.lower().split()
            return QueryInsight(
                original_query=query,
                expanded_keywords=keywords[:5],
                search_intent="general_search",
                is_specific=len(query) > 20,
            )

        try:
            prompt = f"""Analyze this expert search query and return JSON:
Query: "{query}"

Provide:
1. expanded_keywords: [list of search keywords to find similar experts]
2. search_intent: [what type of expert they're looking for]
3. is_specific: [true if very specific, false if broad]

Return ONLY valid JSON."""

            response = self._call_groq(prompt, temperature=0.2)

            # Parse response
            import json
            try:
                data = json.loads(response)
                return QueryInsight(
                    original_query=query,
                    expanded_keywords=data.get("expanded_keywords", [])[:5],
                    search_intent=data.get("search_intent", "general_search"),
                    is_specific=data.get("is_specific", True),
                )
            except json.JSONDecodeError:
                logger.warning(f"Failed to parse LLM response: {response}")
                return QueryInsight(
                    original_query=query,
                    expanded_keywords=query.split()[:5],
                    search_intent="general_search",
                    is_specific=len(query) > 20,
                )

        except Exception as e:
            logger.warning(f"Query understanding failed, using fallback: {e}")
            return QueryInsight(
                original_query=query,
                expanded_keywords=query.split()[:5],
                search_intent="general_search",
                is_specific=len(query) > 20,
            )

    def semantic_search(
        self,
        query: str,
        top_k: int = 10,
        use_llm_ranking: bool = True,
    ) -> List[ExpertMatch]:
        """
        Perform semantic search with optional LLM re-ranking.

        Pipeline:
        1. Vector DB semantic search
        2. Optional LLM-powered re-ranking
        3. Fallback to lightweight search
        """
        if not query:
            return []

        # Stage 1: Semantic search
        logger.info(f"Semantic search for: {query}")
        results = self.vector_store.semantic_search(
            query=query,
            collection_name=self.vector_store.EXPERT_COLLECTION,
            top_k=top_k * 2,  # Get more for re-ranking
            threshold=0.2,
        )

        if not results:
            # Fallback to lightweight search
            logger.info("No semantic results, falling back to lightweight search")
            results = self.lightweight_search.search(query, top_k=top_k)

        # Stage 2: Format and optionally re-rank with LLM
        experts = []
        for result in results[:top_k]:
            expert = ExpertMatch(
                expert_id=result.get("id", ""),
                name=result.get("metadata", {}).get("name", "Unknown"),
                industry=result.get("metadata", {}).get("industry", ""),
                relevance_score=result.get("similarity", 0.5),
                match_reason=f"Semantic match: {query}",
                expertise=result.get("metadata", {})
                    .get("expertise", "")
                    .split(","),
            )
            experts.append(expert)

        # Stage 3: LLM re-ranking (optional, for accuracy)
        if use_llm_ranking and self.llm_available and len(experts) > 3:
            experts = self._llm_rerank(query, experts)

        return experts

    def _llm_rerank(
        self,
        query: str,
        candidates: List[ExpertMatch],
    ) -> List[ExpertMatch]:
        """Re-rank candidates using LLM for better accuracy."""
        try:
            # Format candidates for LLM
            candidates_text = "\n".join(
                f"{i+1}. {c.name} ({c.industry}) - {c.match_reason}"
                for i, c in enumerate(candidates[:5])
            )

            prompt = f"""Given this expert search: "{query}"

Rank these candidates by relevance (best first):
{candidates_text}

Return ONLY a JSON list of expert names in order."""

            response = self._call_groq(prompt, temperature=0.1)

            # Parse and reorder
            import json
            try:
                ranked_names = json.loads(response)
                # Create ranking map
                rank_map = {name: i for i, name in enumerate(ranked_names)}
                # Sort candidates by rank
                candidates.sort(
                    key=lambda x: rank_map.get(x.name, len(candidates)),
                )
                # Update scores based on rank
                for i, candidate in enumerate(candidates):
                    candidate.relevance_score = max(
                        0.5,
                        candidate.relevance_score * (1 - i * 0.1),
                    )

                logger.info(f"LLM re-ranking complete: {len(candidates)} experts")
                return candidates

            except Exception as e:
                logger.warning(f"Failed to parse LLM ranking: {e}")
                return candidates

        except Exception as e:
            logger.warning(f"LLM re-ranking failed: {e}")
            return candidates

    def search_with_context(
        self,
        query: str,
        top_k: int = 10,
    ) -> Dict[str, Any]:
        """
        Perform complete search pipeline with context.

        Returns detailed information for API response.
        """
        # Understand query
        insight = self.understand_query(query)

        # Search
        experts = self.semantic_search(
            query=query,
            top_k=top_k,
            use_llm_ranking=self.llm_available,
        )

        return {
            "query": query,
            "query_insight": {
                "intent": insight.search_intent,
                "is_specific": insight.is_specific,
                "keywords": insight.expanded_keywords,
            },
            "results": [e.model_dump() for e in experts],
            "total_results": len(experts),
            "llm_ranking_applied": self.llm_available and len(experts) > 3,
        }


def get_llm_semantic_search() -> LLMSemanticSearch:
    """Get singleton LLM semantic search instance."""
    return LLMSemanticSearch()
