"""
Pydantic schemas for Expert profiles.

Used for API request/response validation and serialisation.
"""

from typing import List, Optional

from pydantic import BaseModel, Field


class ExpertBase(BaseModel):
    """Base expert fields shared across schemas."""

    name: str = Field(..., min_length=1, max_length=255)
    title: str = Field(..., min_length=1, max_length=255)
    company: str = Field(..., min_length=1, max_length=255)
    industry: str = Field(..., min_length=1, max_length=100)
    seniority: str = Field(..., min_length=1, max_length=50)
    bio: str = Field(..., min_length=10)
    topics: List[str] = Field(default_factory=list)
    publications: List[str] = Field(default_factory=list)
    years_experience: int = Field(..., ge=0, le=60)
    availability: str = Field(default="available")
    hourly_rate: Optional[float] = Field(default=None, ge=0)


class ExpertCreate(ExpertBase):
    """Schema for creating a new expert."""
    pass


class ExpertProfile(ExpertBase):
    """Full expert profile response schema."""

    id: str
    match_score: Optional[float] = Field(
        default=None, description="Similarity/relevance score (0-100)"
    )
    ai_reasoning: Optional[str] = Field(
        default=None, description="LLM-generated relevance reasoning"
    )

    model_config = {"from_attributes": True}


class ExpertListResponse(BaseModel):
    """Paginated list of experts."""

    experts: List[ExpertProfile]
    total: int
    page: int
    page_size: int

    model_config = {"from_attributes": True}
