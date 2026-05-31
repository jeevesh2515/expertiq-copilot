"""
Lightweight expert discovery agent.

The original project booted a vector database, downloaded an ONNX model,
and optionally called a remote LLM for every search. That made local demos
feel heavy and fragile. This agent keeps the same API contract but uses a
fast local ranking path by default, with remote LLM enrichment left as an
explicit opt-in.
"""

from __future__ import annotations

import json
import logging
import re
import time
from typing import Any, Dict, List, Optional, TypedDict

from app.config import get_settings
from app.core.lightweight_search import get_lightweight_search_engine
from langsmith import traceable


logger = logging.getLogger(__name__)
settings = get_settings()


class AgentState(TypedDict, total=False):
    query: str
    filters: Optional[Dict[str, Any]]
    top_k: int
    query_analysis: Dict[str, Any]
    vector_results: List[Dict[str, Any]]
    graph_results: Dict[str, Any]
    graph_expert_ids: List[str]
    candidates: List[Dict[str, Any]]
    ranked_candidates: List[Dict[str, Any]]
    executive_summary: Optional[str]
    response: Dict[str, Any]
    processing_time_ms: float
    errors: List[str]
    _start_time: float
    include_graph: bool


def _get_model_chain() -> List[str]:
    models = [settings.GROQ_MODEL]
    for fallback in settings.GROQ_MODEL_FALLBACKS:
        if fallback not in models:
            models.append(fallback)
    return models


def _call_groq(prompt: str, max_tokens: int = 2000, response_format: Optional[Dict[str, Any]] = None) -> Optional[str]:
    if not settings.groq_available:
        return None

    try:
        from groq import Groq
    except Exception as exc:  # pragma: no cover - optional dependency path
        logger.warning("Groq client unavailable, falling back to local mode: %s", exc)
        return None

    client = Groq(api_key=settings.GROQ_API_KEY)
    messages = [
        {
            "role": "system",
            "content": (
                "You are an expert research analyst evaluating expert profiles "
                "for relevance to a research request. Be concise and concrete."
            ),
        },
        {"role": "user", "content": prompt},
    ]

    for model in _get_model_chain():
        try:
            kwargs = {
                "model": model,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": 0.2,
            }
            if response_format:
                kwargs["response_format"] = response_format
                
            response = client.chat.completions.create(**kwargs)
            return response.choices[0].message.content
        except Exception as exc:  # pragma: no cover - network-dependent
            error_text = str(exc).lower()
            if "decommissioned" in error_text or "not found" in error_text:
                logger.warning("Groq model %s unavailable, trying fallback.", model)
                continue
            logger.warning("Groq call failed, continuing in local mode: %s", exc)
            return None

    return None


async def _stream_groq(prompt: str, max_tokens: int = 2000):
    if not settings.groq_available:
        return

    try:
        from groq import AsyncGroq
    except Exception as exc:  # pragma: no cover - optional dependency path
        logger.warning("Groq async client unavailable, falling back to local mode: %s", exc)
        return

    client = AsyncGroq(api_key=settings.GROQ_API_KEY)
    messages = [
        {
            "role": "system",
            "content": (
                "You are an expert research analyst evaluating expert profiles "
                "for relevance to a research request. Be concise and concrete."
            ),
        },
        {"role": "user", "content": prompt},
    ]

    for model in _get_model_chain():
        try:
            stream = await client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=0.2,
                stream=True,
            )
            async for chunk in stream:
                delta = chunk.choices[0].delta.content
                if delta:
                    yield delta
            return
        except Exception as exc:  # pragma: no cover - network-dependent
            error_text = str(exc).lower()
            if "decommissioned" in error_text or "not found" in error_text:
                logger.warning("Groq stream model %s unavailable, trying fallback.", model)
                continue
            logger.warning("Groq stream failed, continuing in local mode: %s", exc)
            return


def _tokenise_query(query: str) -> List[str]:
    return re.findall(r"[a-z0-9]+", query.lower())


def _local_reasoning(candidate: Dict[str, Any], query_analysis: Dict[str, Any]) -> str:
    meta = candidate.get("metadata", {})
    topics = {topic.strip().lower() for topic in str(meta.get("topics", "")).split(",") if topic.strip()}
    industries = {industry.lower() for industry in query_analysis.get("detected_industries", [])}
    query_terms = set(query_analysis.get("entities", []))

    matched_topics = sorted(topic for topic in topics if any(term in topic for term in query_terms))
    notes: List[str] = []

    if matched_topics:
        notes.append(f"direct topic overlap in {', '.join(matched_topics[:3])}")

    if meta.get("industry", "").lower() in industries:
        notes.append(f"strong {meta.get('industry')} industry fit")

    years_experience = int(meta.get("years_experience", 0) or 0)
    if years_experience >= 15:
        notes.append(f"{years_experience} years of senior operating experience")

    if candidate.get("graph_discovered"):
        notes.append("reinforced by related graph connections")

    if not notes:
        notes.append("relevant profile language and experience signals")

    return "Good match because of " + ", ".join(notes) + "."


def _local_summary(query: str, ranked: List[Dict[str, Any]]) -> str:
    if not ranked:
        return ""

    top_candidates = ranked[:3]
    names = []
    strengths = []
    for candidate in top_candidates:
        meta = candidate.get("metadata", {})
        names.append(meta.get("name", "Unknown"))
        if candidate.get("ai_reasoning"):
            strengths.append(candidate["ai_reasoning"])

    summary = (
        f'This search used the lightweight local retrieval engine to rank experts for "{query}". '
        f"Top matches include {', '.join(names)}. "
    )

    if strengths:
        summary += "They surfaced because " + " ".join(strengths[:2]) + " "

    summary += (
        "For a demo, this mode keeps latency low and avoids the model-download "
        "and vector-index overhead that was previously making startup unstable."
    )
    return summary.strip()


def _summary_chunks(summary: str, chunk_size: int = 120) -> List[str]:
    return [summary[i:i + chunk_size] for i in range(0, len(summary), chunk_size)] or [summary]


@traceable(name="QueryAnalyser")
def query_analyser(state: AgentState) -> AgentState:

    query = state["query"]
    words = _tokenise_query(query)

    stop_words = {
        "find",
        "search",
        "looking",
        "for",
        "with",
        "who",
        "has",
        "experience",
        "in",
        "the",
        "a",
        "an",
        "and",
        "or",
        "of",
        "experts",
        "expert",
        "someone",
        "people",
        "professionals",
    }
    entities = [word for word in words if word not in stop_words and len(word) > 2]

    industry_keywords = {
        "fintech": "FinTech",
        "finance": "FinTech",
        "banking": "FinTech",
        "payment": "FinTech",
        "trading": "FinTech",
        "crypto": "FinTech",
        "health": "HealthTech",
        "medical": "HealthTech",
        "pharma": "HealthTech",
        "drug": "HealthTech",
        "clinical": "HealthTech",
        "genomics": "HealthTech",
        "climate": "Climate Tech",
        "carbon": "Climate Tech",
        "energy": "Climate Tech",
        "solar": "Climate Tech",
        "hydrogen": "Climate Tech",
        "sustainability": "Climate Tech",
        "education": "EdTech",
        "learning": "EdTech",
        "teaching": "EdTech",
        "edtech": "EdTech",
        "tutoring": "EdTech",
        "assessment": "EdTech",
        "regulation": "RegTech",
        "compliance": "RegTech",
        "regulatory": "RegTech",
        "regtech": "RegTech",
        "aml": "RegTech",
        "kyc": "RegTech",
    }

    detected_industries = sorted(
        {industry for word in words for keyword, industry in industry_keywords.items() if keyword in word}
    )

    analysis: Dict[str, Any] = {
        "original_query": query,
        "entities": entities,
        "detected_industries": detected_industries,
        "query_type": "expert_search",
    }

    llm_result = _call_groq(
        f"""Analyse this expert search query, extract structured information, and generate query expansion parameters.
Query: "{query}"

Return a JSON object with:
- "intent": brief description of what the user is looking for
- "key_topics": list of 3-5 specific topic areas
- "industries": list of relevant industries
- "seniority_preference": preferred seniority level or null
- "domain_context": brief context about the research domain
- "hyde_bio": A short, hypothetical biography paragraph (4-5 sentences) of the perfect expert candidate. Write in professional third-person narrative style as if they are a real person with concrete experiences, publications, and skills matching the query. Do not add introductory/concluding text.
- "constraints": A sub-object containing:
    - "min_years_experience": integer or null (extract if query requests e.g. "15 years", "10+ years", or "senior operator" implying years)
    - "availability": string ("available" or null, e.g. if query requests "who is available" or "for hire")

Return ONLY valid JSON, no other text.""",
        max_tokens=1000,
    )

    if llm_result:
        try:
            json_match = re.search(r"\{.*\}", llm_result, re.DOTALL)
            if json_match:
                analysis.update(json.loads(json_match.group()))
        except (json.JSONDecodeError, AttributeError):
            logger.warning("Failed to parse LLM query analysis; using local analysis only.")

    # Resilient fallbacks for local/offline run contexts
    if "hyde_bio" not in analysis or not analysis["hyde_bio"]:
        analysis["hyde_bio"] = query
    if "constraints" not in analysis:
        # Check simple local regex heuristics for years of experience
        years_match = re.search(r"(\d+)\+?\s*years?", query)
        min_years = int(years_match.group(1)) if years_match else None
        availability = "available" if "available" in query.lower() or "hire" in query.lower() else None
        analysis["constraints"] = {
            "min_years_experience": min_years,
            "availability": availability
        }

    state["query_analysis"] = analysis
    return state


@traceable(name="VectorSearcher")
def vector_searcher(state: AgentState) -> AgentState:

    query = state["query"]
    
    # 1. HyDE Query Expansion: use the generated hypothetical bio if available
    hyde_bio = state.get("query_analysis", {}).get("hyde_bio", query)
    
    # 2. Self-Querying: Compile natural language constraints into database filters
    filters = {}
    if state.get("filters"):
        filters.update(state["filters"])
        
    constraints = state.get("query_analysis", {}).get("constraints", {})
    min_years = constraints.get("min_years_experience")
    if min_years is not None:
        filters["years_experience"] = {"$gte": min_years}
    avail = constraints.get("availability")
    if avail:
        filters["availability"] = avail
        
    # Clean up empty filters
    if not filters:
        filters = None

    top_k = max(state.get("top_k", 20) * 2, 12)
    vector_results = []

    # 3. Fetch dense vector results from active backend using HyDE biography
    if settings.SEARCH_BACKEND == "pinecone":
        try:
            from app.core.vector_store_pinecone import get_pinecone_vector_store
            pc_store = get_pinecone_vector_store()
            results = pc_store.semantic_search(query=hyde_bio, top_k=top_k, filters=filters)
            vector_results = [
                {
                    "id": r["id"],
                    "metadata": r.get("metadata", {}),
                    "document": r.get("content", ""),
                    "similarity_score": r.get("similarity", 0) * 100,
                    "local_reasoning": "Found via Pinecone vector search matching hypothetical bio.",
                }
                for r in results
            ]
        except Exception as exc:
            logger.warning("Pinecone search backend failed: %s", exc)

    elif settings.SEARCH_BACKEND == "pro":
        try:
            from app.core.llm_search import get_llm_semantic_search
            search_engine = get_llm_semantic_search()
            results = search_engine.vector_store.semantic_search(query=hyde_bio, top_k=top_k, filters=filters)
            vector_results = [
                {
                    "id": r["id"],
                    "metadata": r.get("metadata", {}),
                    "document": r.get("content", ""),
                    "similarity_score": r.get("similarity", 0) * 100,
                    "local_reasoning": "Found via local ChromaDB vector search matching hypothetical bio.",
                }
                for r in results
            ]
        except Exception as exc:
            logger.warning("Pro search backend unavailable: %s", exc)

    # 4. Fetch sparse keyword results from lightweight search engine
    search_engine = get_lightweight_search_engine()
    keyword_results = search_engine.search(query=query, top_k=top_k, filters=filters)

    # 3. Fuse dense vector and sparse keyword results linearly
    fused_results = {}

    # Map vector results
    for vr in vector_results:
        fused_results[vr["id"]] = {
            "id": vr["id"],
            "metadata": vr["metadata"],
            "document": vr["document"],
            "vector_score": vr["similarity_score"],
            "keyword_score": 0.0,
            "local_reasoning": vr["local_reasoning"]
        }

    # Map keyword results
    for kr in keyword_results:
        expert_id = kr["id"]
        if expert_id in fused_results:
            fused_results[expert_id]["keyword_score"] = kr["similarity_score"]
            # Enriched reasoning showing both semantic and keyword hits
            fused_results[expert_id]["local_reasoning"] = "Semantic match reinforced by precise keyword hits."
        else:
            fused_results[expert_id] = {
                "id": expert_id,
                "metadata": kr["metadata"],
                "document": kr["document"],
                "vector_score": 30.0, # Baseline fallback semantic score
                "keyword_score": kr["similarity_score"],
                "local_reasoning": "Found via lightweight keyword search."
            }

    # If both dense & sparse failed, keep empty
    final_results = []
    for item in fused_results.values():
        v_score = item["vector_score"]
        k_score = item["keyword_score"]

        # Calculate hybrid score: 60% vector + 40% keyword
        v_contrib = v_score * 0.6
        k_contrib = (max(30.0, k_score) if k_score == 0.0 else k_score) * 0.4

        item["similarity_score"] = round(v_contrib + k_contrib, 2)
        final_results.append(item)

    # Re-sort hybrid results by combined similarity score
    final_results.sort(key=lambda x: x["similarity_score"], reverse=True)
    state["vector_results"] = final_results[:top_k]
    return state


@traceable(name="GraphExpander")
def graph_expander(state: AgentState) -> AgentState:

    if not settings.ENABLE_KNOWLEDGE_GRAPH or not state.get("include_graph", False):
        state["graph_results"] = {"expert_ids": [], "nodes": [], "edges": []}
        state["graph_expert_ids"] = []
        state["candidates"] = [
            {
                "id": result["id"],
                "metadata": result.get("metadata", {}),
                "document": result.get("document", ""),
                "vector_score": result.get("similarity_score", 0),
                "graph_discovered": False,
                "source": "local-search",
                "local_reasoning": result.get("local_reasoning"),
            }
            for result in state.get("vector_results", [])
        ]
        return state

    analysis = state.get("query_analysis", {})
    entities = list(analysis.get("entities", []))
    entities.extend(analysis.get("key_topics", []))
    entities.extend(analysis.get("detected_industries", []))
    entities = sorted(set(entities))

    from app.core.knowledge_graph import get_knowledge_graph

    kg = get_knowledge_graph()
    graph_data = kg.traverse(
        query_entities=entities,
        max_hops=2,
        max_results=settings.GRAPH_MAX_TRAVERSAL_RESULTS,
    )

    state["graph_results"] = graph_data
    state["graph_expert_ids"] = graph_data.get("expert_ids", [])

    vector_results = state.get("vector_results", [])
    vector_ids = {result["id"] for result in vector_results}
    candidates: List[Dict[str, Any]] = []

    for result in vector_results:
        candidates.append(
            {
                "id": result["id"],
                "metadata": result.get("metadata", {}),
                "document": result.get("document", ""),
                "vector_score": result.get("similarity_score", 0),
                "graph_discovered": result["id"] in graph_data.get("expert_ids", []),
                "source": "local-search",
                "local_reasoning": result.get("local_reasoning"),
            }
        )

    search_engine = get_lightweight_search_engine()
    for expert_id in graph_data.get("expert_ids", []):
        if expert_id in vector_ids:
            continue

        expert = search_engine.get_expert(expert_id)
        if not expert:
            continue

        candidates.append(
            {
                "id": expert_id,
                "metadata": search_engine._metadata(expert),  # noqa: SLF001
                "document": _stringify_candidate_document(expert),
                "vector_score": 45.0,
                "graph_discovered": True,
                "source": "graph",
                "local_reasoning": "Surfaced from related industry, topic, or company graph links.",
            }
        )

    state["candidates"] = candidates
    return state


def _stringify_candidate_document(expert: Dict[str, Any]) -> str:
    topics = ", ".join(expert.get("topics", []))
    publications = "; ".join(expert.get("publications", [])[:3])
    return (
        f"{expert.get('name', '')} - {expert.get('title', '')} at {expert.get('company', '')}. "
        f"Industry: {expert.get('industry', '')}. Topics: {topics}. Publications: {publications}. "
        f"{expert.get('bio', '')}"
    )


@traceable(name="Reranker")
def reranker(state: AgentState) -> AgentState:

    candidates = state.get("candidates", [])
    query = state["query"]
    query_analysis = state.get("query_analysis", {})

    if not candidates:
        state["ranked_candidates"] = []
        return state

    from app.core.vector_store import get_vector_store
    vs = get_vector_store()

    # 1. Retrieve dynamic RAG grounding sources for each candidate
    for candidate in candidates:
        expert_id = candidate["id"]
        chunks = []
        try:
            chunks = vs.search_documents(query=query, top_k=3, filters={"expert_id": expert_id})
        except Exception as chunk_exc:
            logger.warning(f"Failed to retrieve dynamic chunks for expert {expert_id}: {chunk_exc}")

        if chunks:
            candidate["grounding_sources"] = [
                {
                    "content": chunk["content"],
                    "source_type": chunk["metadata"].get("source_type", "document"),
                    "score": chunk.get("score")
                }
                for chunk in chunks
            ]
        else:
            # Fallback to biography grounding
            bio = candidate.get("metadata", {}).get("bio") or candidate.get("document", "")
            candidate["grounding_sources"] = [
                {
                    "content": f"Biography context: {bio}",
                    "source_type": "biography",
                    "score": 1.0
                }
            ]

    # 2. Structured LLM Re-ranking using native JSON Mode
    llm_result: Optional[str] = None
    if settings.groq_available:
        expert_summaries = []
        for index, candidate in enumerate(candidates[:15], 1):
            meta = candidate.get("metadata", {})
            expert_summaries.append(
                f"{index}. {meta.get('name', 'Unknown')} | {meta.get('title', 'N/A')} at "
                f"{meta.get('company', 'N/A')} | {meta.get('industry', 'N/A')} | "
                f"Topics: {meta.get('topics', 'N/A')}"
            )

        prompt = f"""You are evaluating expert candidates for this research query:
"{query}"

Here are the candidates:
{chr(10).join(expert_summaries)}

Evaluate each expert candidate for absolute relevance to the query.
You must return a JSON object with a single key "rankings" containing a JSON array of objects.
Each object must have "index" (integer), "score" (number from 1 to 10), and "reasoning" (string).
Example format:
{{
  "rankings": [
    {{"index": 1, "score": 9.5, "reasoning": "Direct expertise in high-frequency trading."}}
  ]
}}
Return ONLY valid JSON."""

        llm_result = _call_groq(
            prompt,
            max_tokens=1200,
            response_format={"type": "json_object"}
        )

    ranking_map: Dict[int, Dict[str, Any]] = {}
    if llm_result:
        try:
            payload = json.loads(llm_result)
            rankings = payload.get("rankings", [])
            for item in rankings:
                idx = int(item["index"])
                ranking_map[idx] = item
        except Exception as parse_err:
            logger.warning(f"Failed to parse LLM structured reranking JSON: {parse_err}. Output: {llm_result}")

    for index, candidate in enumerate(candidates, 1):
        if index in ranking_map:
            llm_score = ranking_map[index].get("score", 6)
            reasoning = ranking_map[index].get("reasoning", "")
            match_score = (candidate.get("vector_score", 45) * 0.45) + (llm_score * 10 * 0.55)
        else:
            llm_score = round(max(4.5, min(9.7, candidate.get("vector_score", 0) / 11.0)), 1)
            reasoning = candidate.get("local_reasoning") or _local_reasoning(candidate, query_analysis)
            graph_bonus = 8.0 if candidate.get("graph_discovered") else 0.0
            experience_bonus = min(
                6.0,
                int(candidate.get("metadata", {}).get("years_experience", 0) or 0) / 4,
            )
            match_score = candidate.get("vector_score", 45) + graph_bonus + experience_bonus

        candidate["llm_score"] = llm_score
        candidate["ai_reasoning"] = reasoning
        candidate["match_score"] = round(max(0.0, min(99.5, match_score)), 2)

    state["ranked_candidates"] = sorted(
        candidates,
        key=lambda candidate: candidate.get("match_score", 0),
        reverse=True,
    )
    return state


@traceable(name="Summariser")
def summariser(state: AgentState) -> AgentState:

    ranked = state.get("ranked_candidates", [])
    query = state["query"]

    if not ranked:
        state["executive_summary"] = None
        return state

    if settings.groq_available:
        top_3 = ranked[:3]
        expert_details = []
        for index, candidate in enumerate(top_3, 1):
            meta = candidate.get("metadata", {})
            expert_details.append(
                f"{index}. {meta.get('name', 'Unknown')} ({meta.get('title', 'N/A')}, "
                f"{meta.get('company', 'N/A')}) - Match Score: {candidate.get('match_score', 0)}/100. "
                f"Reasoning: {candidate.get('ai_reasoning', 'Strong match')}"
            )

        summary = _call_groq(
            f"""You are a research analyst summarizing expert discovery results for a query: "{query}"
            
            Here are the top 3 ranked experts:
            {chr(10).join(expert_details)}
            
            Write a professional 100-word executive summary. 
            - Start by stating how well the top candidates match the query using their actual match scores.
            - Mention each of the top 3 experts by name and briefly why they are recommended.
            - Maintain absolute fidelity to the scores provided.
            - Do not mention experts not listed above.
            - Use a professional, concise tone. No bullet points.""",
            max_tokens=400,
        )
        if summary:
            state["executive_summary"] = summary
            return state

    state["executive_summary"] = _local_summary(query, ranked)
    return state


@traceable(name="ResponseBuilder")
def response_builder(state: AgentState) -> AgentState:

    ranked = state.get("ranked_candidates", [])
    top_k = state.get("top_k", 10)

    results = []
    for candidate in ranked[:top_k]:
        meta = candidate.get("metadata", {})
        topics = meta.get("topics", "")
        publications = meta.get("publications", "")

        if isinstance(topics, str):
            topics = [topic.strip() for topic in topics.split(",") if topic.strip()]
        if isinstance(publications, str):
            publications = [publication.strip() for publication in publications.split(";") if publication.strip()]

        results.append(
            {
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
                "grounding_sources": candidate.get("grounding_sources", []),
            }
        )

    graph_data = None
    if state.get("include_graph", False):
        nodes = []
        edges = []
        for candidate in ranked[:top_k]:
            meta = candidate.get("metadata", {})
            expert_id = candidate["id"]
            name = meta.get("name", "Unknown")
            industry = meta.get("industry", "Technology")
            company = meta.get("company", "Independent")
            topics = meta.get("topics", "")
            
            if isinstance(topics, str):
                topics = [t.strip() for t in topics.split(",") if t.strip()]
                
            nodes.append({"id": expert_id, "label": name, "type": "expert"})
            
            if industry and industry != "N/A":
                nodes.append({"id": f"ind_{industry}", "label": industry, "type": "industry"})
                edges.append({"source": expert_id, "target": f"ind_{industry}", "relationship": "works_in"})
                
            if company and company != "N/A":
                nodes.append({"id": f"comp_{company}", "label": company, "type": "company"})
                edges.append({"source": expert_id, "target": f"comp_{company}", "relationship": "works_at"})
                
            for t in (topics[:3] if isinstance(topics, list) else []):
                if t:
                    nodes.append({"id": f"topic_{t}", "label": t, "type": "topic"})
                    edges.append({"source": expert_id, "target": f"topic_{t}", "relationship": "specializes_in"})
                    
        unique_nodes = list({n["id"]: n for n in nodes}.values())
        graph_data = {
            "nodes": unique_nodes[:settings.GRAPH_MAX_RESPONSE_NODES],
            "edges": edges[:settings.GRAPH_MAX_RESPONSE_EDGES],
        }

    state["response"] = {
        "query": state["query"],
        "total_results": len(results),
        "results": results,
        "executive_summary": state.get("executive_summary"),
        "graph_data": graph_data,
        "query_analysis": state.get("query_analysis"),
        "processing_time_ms": round(
            (time.time() * 1000) - state.get("_start_time", time.time() * 1000),
            2,
        ),
    }
    return state


class ExpertDiscoveryAgent:
    def __init__(self) -> None:
        self.nodes = [
            ("QueryAnalyser", query_analyser),
            ("VectorSearcher", vector_searcher),
            ("GraphExpander", graph_expander),
            ("Reranker", reranker),
            ("Summariser", summariser),
            ("ResponseBuilder", response_builder),
        ]

    @traceable(name="ExpertDiscoveryAgent.run")
    def run(

        self,
        query: str,
        filters: Optional[Dict[str, Any]] = None,
        top_k: int = 10,
        include_graph: bool = False,
    ) -> Dict[str, Any]:
        start_time = time.time() * 1000
        state: AgentState = {
            "query": query,
            "filters": filters,
            "top_k": top_k,
            "errors": [],
            "_start_time": start_time,
            "include_graph": include_graph,
        }

        for node_name, node_fn in self.nodes:
            try:
                logger.info("Agent executing node: %s", node_name)
                state = node_fn(state)
            except Exception as exc:
                error_msg = f"Node {node_name} failed: {exc}"
                logger.error(error_msg, exc_info=True)
                state.setdefault("errors", []).append(error_msg)

        response = state.get("response", {})
        response["processing_time_ms"] = round(time.time() * 1000 - start_time, 2)
        return response

    @traceable(name="ExpertDiscoveryAgent.stream_run")
    async def stream_run(

        self,
        query: str,
        filters: Optional[Dict[str, Any]] = None,
        top_k: int = 10,
        include_graph: bool = False,
    ):
        start_time = time.time() * 1000
        state: AgentState = {
            "query": query,
            "filters": filters,
            "top_k": top_k,
            "errors": [],
            "_start_time": start_time,
            "include_graph": include_graph,
        }

        for node_name, node_fn in self.nodes[:4]:
            try:
                state = node_fn(state)
            except Exception as exc:
                error_msg = f"Node {node_name} failed: {exc}"
                logger.error(error_msg, exc_info=True)
                state.setdefault("errors", []).append(error_msg)

        state["executive_summary"] = None
        state = response_builder(state)

        response = state.get("response", {})
        response["processing_time_ms"] = round(time.time() * 1000 - start_time, 2)
        yield f"data: {json.dumps({'type': 'results', 'data': response})}\n\n"

        ranked = state.get("ranked_candidates", [])
        if not ranked:
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
            return

        if settings.groq_available:
            top_5 = ranked[:5]
            expert_details = []
            for index, candidate in enumerate(top_5, 1):
                meta = candidate.get("metadata", {})
                expert_details.append(
                    f"{index}. {meta.get('name', 'Unknown')} ({meta.get('title', 'N/A')}, "
                    f"{meta.get('company', 'N/A')}) - Score: {candidate.get('match_score', 0)}/100 - "
                    f"{candidate.get('ai_reasoning', 'Strong match')}"
                )

            prompt = f"""Write a 150-word executive summary for a research manager reviewing these expert recommendations.

Research Query: "{query}"

Top Recommended Experts:
{chr(10).join(expert_details)}

Write in professional, concise prose. Do not use bullet points. Do not exceed 150 words."""

            emitted = False
            async for chunk in _stream_groq(prompt, max_tokens=400):
                emitted = True
                yield f"data: {json.dumps({'type': 'chunk', 'text': chunk})}\n\n"
            if emitted:
                yield f"data: {json.dumps({'type': 'done'})}\n\n"
                return

        for chunk in _summary_chunks(_local_summary(query, ranked)):
            if chunk:
                yield f"data: {json.dumps({'type': 'chunk', 'text': chunk})}\n\n"

        yield f"data: {json.dumps({'type': 'done'})}\n\n"


_agent: Optional[ExpertDiscoveryAgent] = None


def get_agent() -> ExpertDiscoveryAgent:
    global _agent
    if _agent is None:
        _agent = ExpertDiscoveryAgent()
    return _agent
