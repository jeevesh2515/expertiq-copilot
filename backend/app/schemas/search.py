"""
Pydantic schemas for the search API.

Defines the search request, individual result items,
graph data, and the full search response envelope.
"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator
import bleach


class SearchRequest(BaseModel):
    """Incoming search query from the client."""

    query: str = Field(
        ...,
        min_length=3,
        max_length=500,
        description="Natural language search query",
        examples=["Find experts in semiconductor supply chain with buy-side banking experience"],
    )
    filters: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional filters: industry, seniority, availability",
    )
    top_k: int = Field(
        default=10,
        ge=1,
        le=50,
        description="Number of results to return",
    )
    include_graph: bool = Field(
        default=False,
        description="Include knowledge graph nodes and edges in the response",
    )
    thread_id: Optional[str] = Field(
        default=None,
        description="Optional conversation/session thread ID to group related searches in LangSmith",
    )

    @field_validator("query")
    @classmethod
    def sanitize_query(cls, v: str) -> str:
        """Strip HTML tags and dangerous content from the query."""
        cleaned = bleach.clean(v, tags=[], strip=True)
        return cleaned.strip()

    @field_validator("filters")
    @classmethod
    def sanitize_filters(cls, v: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Sanitize all values inside the filters dictionary to prevent injections."""
        if not v:
            return v
        sanitized = {}
        for key, value in v.items():
            clean_key = bleach.clean(str(key), tags=[], strip=True).strip()
            if not clean_key:
                continue
            if isinstance(value, str):
                sanitized[clean_key] = bleach.clean(value, tags=[], strip=True).strip()
            elif isinstance(value, list):
                sanitized[clean_key] = [
                    bleach.clean(str(item), tags=[], strip=True).strip() if isinstance(item, str) else item
                    for item in value
                ]
            elif isinstance(value, dict):
                sanitized[clean_key] = cls.sanitize_filters(value)
            else:
                sanitized[clean_key] = value
        return sanitized


class GraphNode(BaseModel):
    """A node in the knowledge graph visualisation."""

    id: str
    label: str
    type: str = Field(description="Node type: expert, company, industry, topic")
    metadata: Optional[Dict[str, Any]] = None


class GraphEdge(BaseModel):
    """An edge in the knowledge graph."""

    source: str
    target: str
    relationship: str


class GraphData(BaseModel):
    """Knowledge graph subgraph for visualisation."""

    nodes: List[GraphNode] = Field(default_factory=list)
    edges: List[GraphEdge] = Field(default_factory=list)


class GroundingSource(BaseModel):
    """A RAG document chunk that grounds an expert's match."""

    content: str
    source_type: str = Field(default="document", description="Type of document (e.g. publication, patent, biography)")
    score: Optional[float] = Field(default=None, description="Relevance score of this specific chunk")


class ExpertResult(BaseModel):
    """A single expert result with AI scoring and RAG source grounding."""

    id: str
    name: str
    title: str
    company: str
    industry: str
    seniority: str
    bio: str
    topics: List[str] = Field(default_factory=list)
    publications: List[str] = Field(default_factory=list)
    years_experience: int
    availability: str
    match_score: float = Field(
        description="Combined relevance score 0–100"
    )
    vector_score: Optional[float] = Field(
        default=None, description="Cosine similarity score"
    )
    graph_score: Optional[float] = Field(
        default=None, description="Knowledge graph relevance score"
    )
    llm_score: Optional[float] = Field(
        default=None, description="LLM re-ranking score 1-10"
    )
    ai_reasoning: Optional[str] = Field(
        default=None, description="LLM-generated reasoning for this match"
    )
    grounding_sources: List[GroundingSource] = Field(
        default_factory=list, description="Retrieved document chunks grounding this expert match"
    )


class SearchResponse(BaseModel):
    """Full search response envelope."""

    query: str
    total_results: int
    results: List[ExpertResult]
    executive_summary: Optional[str] = Field(
        default=None,
        description="LLM-generated executive summary of top candidates",
    )
    graph_data: Optional[GraphData] = Field(
        default=None,
        description="Knowledge graph subgraph for visualisation",
    )
    query_analysis: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Parsed query intent, entities, and domain",
    )
    processing_time_ms: Optional[float] = None
    request_id: Optional[str] = Field(
        default=None,
        description="Unique request tracing identifier matching search history"
    )
    thread_id: Optional[str] = Field(
        default=None,
        description="The conversation/session thread ID associated with this search sequence"
    )


class ErrorResponse(BaseModel):
    """Standard error response."""

    success: bool = False
    error: str
    detail: Optional[str] = None
