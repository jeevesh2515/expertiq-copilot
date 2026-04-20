"""
LangGraph multi-step AI agent for expert discovery.

Implements a 6-node StateGraph pipeline:
  1. QueryAnalyser — Parse query, extract intent, entities, domain
  2. VectorSearcher — ChromaDB semantic search (top 20)
  3. GraphExpander — NetworkX 2-hop traversal for adjacent experts
  4. Reranker — Groq LLM scores each candidate 1-10 with reasoning
  5. Summariser — Groq LLM generates executive summary of top 5
  6. ResponseBuilder — Formats final JSON response

Gracefully degrades if Groq API key is not configured — vector
search and graph results are still returned without LLM scoring.
"""

import json
import logging
import re
import time
from typing import Any, Dict, List, Optional, TypedDict

from app.config import get_settings
from app.core.knowledge_graph import get_knowledge_graph
from app.core.rag_pipeline import get_rag_pipeline
from app.core.vector_store import get_vector_store

logger = logging.getLogger(__name__)
settings = get_settings()


# ═══════════════════════════════════════
# STATE DEFINITION
# ═══════════════════════════════════════


class AgentState(TypedDict, total=False):
    """Typed state passed between agent nodes."""

    # Input
    query: str
    filters: Optional[Dict[str, Any]]
    top_k: int

    # QueryAnalyser output
    query_analysis: Dict[str, Any]

    # VectorSearcher output
    vector_results: List[Dict[str, Any]]

    # GraphExpander output
    graph_results: Dict[str, Any]
    graph_expert_ids: List[str]

    # Combined candidates
    candidates: List[Dict[str, Any]]

    # Reranker output
    ranked_candidates: List[Dict[str, Any]]

    # Summariser output
    executive_summary: Optional[str]

    # Final response
    response: Dict[str, Any]

    # Metadata
    processing_time_ms: float
    errors: List[str]


# ═══════════════════════════════════════
# GROQ LLM HELPER
# ═══════════════════════════════════════


def _call_groq(prompt: str, max_tokens: int = 2000) -> Optional[str]:
    """
    Call Groq API for LLM inference.

    Returns None if Groq is not configured or the call fails.
    """
    if not settings.groq_available:
        logger.warning("Groq API key not configured. Skipping LLM call.")
        return None

    try:
        from groq import Groq

        client = Groq(api_key=settings.GROQ_API_KEY)
        response = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an expert research analyst at a leading expert network. "
                        "You evaluate expert profiles for relevance to research queries. "
                        "Be precise, analytical, and data-driven in your assessments."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            max_tokens=max_tokens,
            temperature=0.3,
        )
        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"Groq API call failed: {e}")
        return None

async def _stream_groq(prompt: str, max_tokens: int = 2000):
    """
    Call Groq API for LLM inference (Streaming).
    """
    if not settings.groq_available:
        logger.warning("Groq API key not configured. Skipping LLM stream.")
        return

    try:
        from groq import AsyncGroq

        client = AsyncGroq(api_key=settings.GROQ_API_KEY)
        stream = await client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an expert research analyst at a leading expert network. "
                        "You evaluate expert profiles for relevance to research queries. "
                        "Be precise, analytical, and data-driven in your assessments."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            max_tokens=max_tokens,
            temperature=0.3,
            stream=True
        )
        async for chunk in stream:
            if chunk.choices[0].delta.content is not None:
                yield chunk.choices[0].delta.content
    except Exception as e:
        logger.error(f"Groq API stream failed: {e}")


# ═══════════════════════════════════════
# AGENT NODES
# ═══════════════════════════════════════


def query_analyser(state: AgentState) -> AgentState:
    """
    Node 1: Parse the user query to extract intent, entities, and domain.

    Uses keyword extraction and optional LLM analysis.
    """
    query = state["query"]
    start = time.time()

    # Basic keyword extraction (always available)
    words = query.lower().split()
    stop_words = {
        "find", "search", "looking", "for", "with", "who", "has",
        "experience", "in", "the", "a", "an", "and", "or", "of",
        "experts", "expert", "someone", "people", "professionals",
    }
    entities = [w for w in words if w not in stop_words and len(w) > 2]

    # Industry detection
    industry_keywords = {
        "fintech": "FinTech", "finance": "FinTech", "banking": "FinTech",
        "payment": "FinTech", "trading": "FinTech", "crypto": "FinTech",
        "health": "HealthTech", "medical": "HealthTech", "pharma": "HealthTech",
        "drug": "HealthTech", "clinical": "HealthTech", "genomics": "HealthTech",
        "climate": "Climate Tech", "carbon": "Climate Tech", "energy": "Climate Tech",
        "solar": "Climate Tech", "hydrogen": "Climate Tech", "sustainability": "Climate Tech",
        "education": "EdTech", "learning": "EdTech", "teaching": "EdTech",
        "edtech": "EdTech", "tutoring": "EdTech", "assessment": "EdTech",
        "regulation": "RegTech", "compliance": "RegTech", "regulatory": "RegTech",
        "regtech": "RegTech", "aml": "RegTech", "kyc": "RegTech",
    }

    detected_industries = set()
    for word in words:
        for keyword, industry in industry_keywords.items():
            if keyword in word:
                detected_industries.add(industry)

    analysis = {
        "original_query": query,
        "entities": entities,
        "detected_industries": list(detected_industries),
        "query_type": "expert_search",
    }

    # Optional LLM-powered analysis
    llm_result = _call_groq(
        f"""Analyse this expert search query and extract structured information.
Query: "{query}"

Return a JSON object with:
- "intent": brief description of what the user is looking for
- "key_topics": list of 3-5 specific topic areas
- "industries": list of relevant industries
- "seniority_preference": preferred seniority level or null
- "domain_context": brief context about the research domain

Return ONLY valid JSON, no other text.""",
        max_tokens=500,
    )

    if llm_result:
        try:
            # Extract JSON from response
            json_match = re.search(r"\{.*\}", llm_result, re.DOTALL)
            if json_match:
                llm_analysis = json.loads(json_match.group())
                analysis.update(llm_analysis)
        except (json.JSONDecodeError, AttributeError):
            logger.warning("Failed to parse LLM query analysis.")

    state["query_analysis"] = analysis
    return state


def vector_searcher(state: AgentState) -> AgentState:
    """
    Node 2: Semantic search using ChromaDB vector store.

    Retrieves top-k experts by cosine similarity.
    """
    query = state["query"]
    top_k = state.get("top_k", 20)
    filters = state.get("filters")

    vector_store = get_vector_store()

    # Build ChromaDB filters from user filters
    chroma_filters = None
    if filters:
        filter_conditions = []
        if "industry" in filters and filters["industry"]:
            filter_conditions.append({"industry": filters["industry"]})
        if "seniority" in filters and filters["seniority"]:
            filter_conditions.append({"seniority": filters["seniority"]})
        if "availability" in filters and filters["availability"]:
            filter_conditions.append({"availability": filters["availability"]})

        if len(filter_conditions) == 1:
            chroma_filters = filter_conditions[0]
        elif len(filter_conditions) > 1:
            chroma_filters = {"$and": filter_conditions}

    results = vector_store.search_experts(
        query=query,
        top_k=top_k,
        filters=chroma_filters,
    )

    state["vector_results"] = results
    return state


def graph_expander(state: AgentState) -> AgentState:
    """
    Node 3: Expand results using knowledge graph traversal.

    Takes entities from query analysis and performs 2-hop
    traversal to find contextually adjacent experts.
    """
    analysis = state.get("query_analysis", {})
    entities = analysis.get("entities", [])

    # Add LLM-extracted topics if available
    key_topics = analysis.get("key_topics", [])
    entities.extend(key_topics)

    # Add detected industries
    industries = analysis.get("detected_industries", [])
    entities.extend(industries)

    # Deduplicate
    entities = list(set(entities))

    kg = get_knowledge_graph()
    graph_data = kg.traverse(
        query_entities=entities,
        max_hops=2,
        max_results=20,
    )

    state["graph_results"] = graph_data
    state["graph_expert_ids"] = graph_data.get("expert_ids", [])

    # Merge vector results with graph-discovered experts
    vector_results = state.get("vector_results", [])
    vector_ids = {r["id"] for r in vector_results}

    # Combine: vector results + new graph-discovered experts
    candidates = []
    for vr in vector_results:
        candidate = {
            "id": vr["id"],
            "metadata": vr.get("metadata", {}),
            "document": vr.get("document", ""),
            "vector_score": vr.get("similarity_score", 0),
            "graph_discovered": vr["id"] in graph_data.get("expert_ids", []),
            "source": "vector",
        }
        candidates.append(candidate)

    # Add graph-only experts (not already in vector results)
    for expert_id in graph_data.get("expert_ids", []):
        if expert_id not in vector_ids:
            candidates.append({
                "id": expert_id,
                "metadata": {},
                "document": "",
                "vector_score": 0,
                "graph_discovered": True,
                "source": "graph",
            })

    state["candidates"] = candidates
    return state


def reranker(state: AgentState) -> AgentState:
    """
    Node 4: LLM-powered re-ranking of candidates.

    Calls Groq to score each candidate 1-10 with detailed reasoning.
    Falls back to vector scores if LLM is unavailable.
    """
    candidates = state.get("candidates", [])
    query = state["query"]

    if not candidates:
        state["ranked_candidates"] = []
        return state

    # Build context for LLM
    rag_pipeline = get_rag_pipeline()
    expert_summaries = []
    for i, c in enumerate(candidates[:15], 1):
        meta = c.get("metadata", {})
        name = meta.get("name", "Unknown")
        title = meta.get("title", "N/A")
        company = meta.get("company", "N/A")
        industry = meta.get("industry", "N/A")
        topics = meta.get("topics", "N/A")
        bio_preview = c.get("document", "")[:200]
        expert_summaries.append(
            f"{i}. {name} | {title} at {company} | {industry} | "
            f"Topics: {topics} | Bio: {bio_preview}..."
        )

    expert_text = "\n".join(expert_summaries)

    llm_result = _call_groq(
        f"""You are evaluating expert candidates for this research query:
"{query}"

Here are the candidates:
{expert_text}

For each candidate, provide a score from 1-10 and a brief reasoning (1-2 sentences).
Return a JSON array of objects with "index" (1-based), "score" (1-10), and "reasoning" fields.

Return ONLY valid JSON array, no other text.""",
        max_tokens=2000,
    )

    if llm_result:
        try:
            # Extract JSON array from response
            json_match = re.search(r"\[.*\]", llm_result, re.DOTALL)
            if json_match:
                rankings = json.loads(json_match.group())
                ranking_map = {r["index"]: r for r in rankings}

                for i, candidate in enumerate(candidates[:15], 1):
                    if i in ranking_map:
                        candidate["llm_score"] = ranking_map[i].get("score", 5)
                        candidate["ai_reasoning"] = ranking_map[i].get("reasoning", "")
                        # Combined score: weighted blend of vector + LLM
                        vector_weight = 0.4
                        llm_weight = 0.6
                        candidate["match_score"] = round(
                            (candidate.get("vector_score", 50) * vector_weight)
                            + (candidate["llm_score"] * 10 * llm_weight),
                            2,
                        )
        except (json.JSONDecodeError, AttributeError, KeyError) as e:
            logger.warning(f"Failed to parse LLM re-ranking: {e}")

    # Ensure all candidates have scores
    for candidate in candidates:
        if "match_score" not in candidate:
            candidate["match_score"] = candidate.get("vector_score", 50)
        if "llm_score" not in candidate:
            candidate["llm_score"] = None
        if "ai_reasoning" not in candidate:
            candidate["ai_reasoning"] = None

    # Sort by match_score descending
    ranked = sorted(candidates, key=lambda x: x.get("match_score", 0), reverse=True)
    state["ranked_candidates"] = ranked
    return state


def summariser(state: AgentState) -> AgentState:
    """
    Node 5: Generate executive summary of top candidates.

    Calls Groq to produce a 150-word executive summary
    of the top 5 experts and why they're relevant.
    """
    ranked = state.get("ranked_candidates", [])
    query = state["query"]

    if not ranked:
        state["executive_summary"] = None
        return state

    top_5 = ranked[:5]
    expert_details = []
    for i, c in enumerate(top_5, 1):
        meta = c.get("metadata", {})
        name = meta.get("name", "Unknown")
        title = meta.get("title", "N/A")
        company = meta.get("company", "N/A")
        score = c.get("match_score", 0)
        reasoning = c.get("ai_reasoning", "Strong domain match")
        expert_details.append(
            f"{i}. {name} ({title}, {company}) — Score: {score}/100 — {reasoning}"
        )

    details_text = "\n".join(expert_details)

    summary = _call_groq(
        f"""Write a 150-word executive summary for a research manager reviewing these expert recommendations.

Research Query: "{query}"

Top Recommended Experts:
{details_text}

The summary should:
1. Briefly restate the research need
2. Highlight why these specific experts are the best matches
3. Note any complementary expertise across the group
4. Suggest an optimal engagement strategy (e.g., which expert to consult first)

Write in professional, concise prose. Do not use bullet points. Do not exceed 150 words.""",
        max_tokens=400,
    )

    state["executive_summary"] = summary
    return state


def response_builder(state: AgentState) -> AgentState:
    """
    Node 6: Format the final response JSON.

    Assembles all pipeline outputs into the SearchResponse schema.
    """
    ranked = state.get("ranked_candidates", [])
    top_k = state.get("top_k", 10)

    # Build result items
    results = []
    for candidate in ranked[:top_k]:
        meta = candidate.get("metadata", {})

        # Parse topics from metadata
        topics = meta.get("topics", "")
        if isinstance(topics, str):
            topics = [t.strip() for t in topics.split(",") if t.strip()]

        # Parse publications
        publications = meta.get("publications", "")
        if isinstance(publications, str):
            publications = [p.strip() for p in publications.split(";") if p.strip()]

        result = {
            "id": candidate["id"],
            "name": meta.get("name", "Unknown"),
            "title": meta.get("title", "N/A"),
            "company": meta.get("company", "N/A"),
            "industry": meta.get("industry", "N/A"),
            "seniority": meta.get("seniority", "N/A"),
            "bio": meta.get("bio", candidate.get("document", "")[:300]),
            "topics": topics if isinstance(topics, list) else [],
            "publications": publications if isinstance(publications, list) else [],
            "years_experience": int(meta.get("years_experience", 0)),
            "availability": meta.get("availability", "unknown"),
            "match_score": round(candidate.get("match_score", 0), 2),
            "vector_score": round(candidate.get("vector_score", 0), 2),
            "graph_score": 10.0 if candidate.get("graph_discovered") else 0.0,
            "llm_score": candidate.get("llm_score"),
            "ai_reasoning": candidate.get("ai_reasoning"),
        }
        results.append(result)

    # Build graph visualisation data
    graph_results = state.get("graph_results", {})
    graph_data = None
    if graph_results.get("nodes"):
        graph_data = {
            "nodes": [
                {
                    "id": n["id"],
                    "label": n["label"],
                    "type": n["type"],
                }
                for n in graph_results.get("nodes", [])[:100]  # Limit for frontend
            ],
            "edges": [
                {
                    "source": e["source"],
                    "target": e["target"],
                    "relationship": e["relationship"],
                }
                for e in graph_results.get("edges", [])[:200]
            ],
        }

    state["response"] = {
        "query": state["query"],
        "total_results": len(results),
        "results": results,
        "executive_summary": state.get("executive_summary"),
        "graph_data": graph_data,
        "query_analysis": state.get("query_analysis"),
        "processing_time_ms": round(
            (time.time() * 1000) - state.get("_start_time", time.time() * 1000), 2
        ),
    }

    return state


# ═══════════════════════════════════════
# AGENT EXECUTOR
# ═══════════════════════════════════════


class ExpertDiscoveryAgent:
    """
    LangGraph-style agent for expert discovery.

    Executes the 6-node pipeline sequentially,
    passing typed state between nodes.
    """

    def __init__(self) -> None:
        """Initialise the agent with the node pipeline."""
        self.nodes = [
            ("QueryAnalyser", query_analyser),
            ("VectorSearcher", vector_searcher),
            ("GraphExpander", graph_expander),
            ("Reranker", reranker),
            ("Summariser", summariser),
            ("ResponseBuilder", response_builder),
        ]

    def run(
        self,
        query: str,
        filters: Optional[Dict[str, Any]] = None,
        top_k: int = 10,
    ) -> Dict[str, Any]:
        """
        Execute the full agent pipeline.

        Args:
            query: Natural language search query.
            filters: Optional filters (industry, seniority, availability).
            top_k: Number of results to return.

        Returns:
            Complete search response dict.
        """
        start_time = time.time() * 1000

        state: AgentState = {
            "query": query,
            "filters": filters,
            "top_k": top_k,
            "errors": [],
            "_start_time": start_time,
        }

        for node_name, node_fn in self.nodes:
            try:
                logger.info(f"Agent executing node: {node_name}")
                state = node_fn(state)
            except Exception as e:
                error_msg = f"Node {node_name} failed: {str(e)}"
                logger.error(error_msg, exc_info=True)
                state.setdefault("errors", []).append(error_msg)
                # Continue to next node — graceful degradation
                continue

        response = state.get("response", {})
        response["processing_time_ms"] = round(time.time() * 1000 - start_time, 2)
        return response

    async def stream_run(
        self,
        query: str,
        filters: Optional[Dict[str, Any]] = None,
        top_k: int = 10,
    ):
        """
        Execute the agent pipeline and stream the executive summary as SSE.
        Yields JSON events:
        - data: {"type": "results", "data": <SearchResponse without summary>}
        - data: {"type": "chunk", "text": "..."}
        - data: {"type": "done"}
        """
        start_time = time.time() * 1000

        state: AgentState = {
            "query": query,
            "filters": filters,
            "top_k": top_k,
            "errors": [],
            "_start_time": start_time,
        }

        # Run nodes 1-4 (Up to Reranker)
        for node_name, node_fn in self.nodes[:4]:
            try:
                state = node_fn(state)
            except Exception as e:
                error_msg = f"Node {node_name} failed: {str(e)}"
                logger.error(error_msg, exc_info=True)
                state.setdefault("errors", []).append(error_msg)
                
        # Run ResponseBuilder early without summary
        state["executive_summary"] = None
        state = response_builder(state)
        
        response = state.get("response", {})
        response["processing_time_ms"] = round(time.time() * 1000 - start_time, 2)
        
        yield f"data: {json.dumps({'type': 'results', 'data': response})}\n\n"

        # Now run stream generation derived from Summariser node
        ranked = state.get("ranked_candidates", [])
        if not ranked:
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
            return
            
        top_5 = ranked[:5]
        expert_details = []
        for i, c in enumerate(top_5, 1):
            meta = c.get("metadata", {})
            name = meta.get("name", "Unknown")
            title = meta.get("title", "N/A")
            company = meta.get("company", "N/A")
            score = c.get("match_score", 0)
            reasoning = c.get("ai_reasoning", "Strong domain match")
            expert_details.append(
                f"{i}. {name} ({title}, {company}) — Score: {score}/100 — {reasoning}"
            )

        details_text = "\n".join(expert_details)
        prompt = f'''Write a 150-word executive summary for a research manager reviewing these expert recommendations.

Research Query: "{query}"

Top Recommended Experts:
{details_text}

The summary should:
1. Briefly restate the research need
2. Highlight why these specific experts are the best matches
3. Note any complementary expertise across the group
4. Suggest an optimal engagement strategy (e.g., which expert to consult first)

Write in professional, concise prose. Do not use bullet points. Do not exceed 150 words.'''

        async for chunk in _stream_groq(prompt, max_tokens=400):
            yield f"data: {json.dumps({'type': 'chunk', 'text': chunk})}\n\n"
            
        yield f"data: {json.dumps({'type': 'done'})}\n\n"


# Singleton
_agent: Optional[ExpertDiscoveryAgent] = None


def get_agent() -> ExpertDiscoveryAgent:
    """Get or create the singleton agent."""
    global _agent
    if _agent is None:
        _agent = ExpertDiscoveryAgent()
    return _agent
