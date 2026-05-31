"""
Pydantic schemas for the feedback API.
"""

from typing import Optional
from pydantic import BaseModel, Field, field_validator
import bleach


class FeedbackRequest(BaseModel):
    """Client payload to submit search result feedback."""

    query: str = Field(..., min_length=3, max_length=500, description="The query string that generated the search result")
    expert_id: str = Field(..., min_length=36, max_length=36, description="The ID of the expert profile being evaluated")
    score: int = Field(..., description="Rating score: 1 for thumbs-up, -1 for thumbs-down")
    comments: Optional[str] = Field(default=None, max_length=1000, description="Optional textual feedback comment")
    langsmith_run_id: Optional[str] = Field(default=None, max_length=255, description="Optional LangSmith trace/run ID")

    @field_validator("score")
    @classmethod
    def validate_score(cls, v: int) -> int:
        if v not in (1, -1):
            raise ValueError("Score must be either 1 (thumbs-up) or -1 (thumbs-down)")
        return v

    @field_validator("query", "comments")
    @classmethod
    def sanitize_strings(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        return bleach.clean(v, tags=[], strip=True).strip()


class FeedbackResponse(BaseModel):
    """API response envelope for feedback submission."""

    success: bool = True
    message: str = "Feedback logged successfully"
    feedback_id: int
