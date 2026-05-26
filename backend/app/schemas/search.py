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

    @field_validator("query")
    @classmethod
    def sanitize_query(cls, v: str) -> str:
        """Strip HTML tags and dangerous content from the query."""
        cleaned = bleach.clean(v, tags=[], strip=True)
        return cleaned.strip()


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


class ExpertResult(BaseModel):
    """A single expert result with AI scoring."""

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


class ErrorResponse(BaseModel):
    """Standard error response."""

    success: bool = False
    error: str
    detail: Optional[str] = None
