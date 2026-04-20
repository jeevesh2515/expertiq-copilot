"""
Expert ORM model for the relational database.

Stores expert profile data. Topics and publications are stored
as JSON-serialised strings in SQLite. The vector embeddings
live in ChromaDB separately.
"""

import json
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Expert(Base):
    """Expert profile stored in SQLite."""

    __tablename__ = "experts"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    company: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    industry: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    seniority: Mapped[str] = mapped_column(String(50), nullable=False)
    bio: Mapped[str] = mapped_column(Text, nullable=False)
    years_experience: Mapped[int] = mapped_column(Integer, nullable=False)
    availability: Mapped[str] = mapped_column(
        String(20), nullable=False, default="available"
    )
    hourly_rate: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # JSON-serialised lists stored as text columns
    _topics: Mapped[str] = mapped_column("topics", Text, nullable=False, default="[]")
    _publications: Mapped[str] = mapped_column(
        "publications", Text, nullable=False, default="[]"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    @property
    def topics(self) -> List[str]:
        """Deserialise topics JSON."""
        return json.loads(self._topics) if self._topics else []

    @topics.setter
    def topics(self, value: List[str]) -> None:
        """Serialise topics to JSON."""
        self._topics = json.dumps(value)

    @property
    def publications(self) -> List[str]:
        """Deserialise publications JSON."""
        return json.loads(self._publications) if self._publications else []

    @publications.setter
    def publications(self, value: List[str]) -> None:
        """Serialise publications to JSON."""
        self._publications = json.dumps(value)

    def to_embedding_text(self) -> str:
        """
        Generate a rich text representation for vector embedding.

        Combines name, title, company, industry, topics, and bio
        into a single string that captures the full expert profile.
        """
        topics_str = ", ".join(self.topics)
        return (
            f"{self.name} — {self.title} at {self.company}. "
            f"Industry: {self.industry}. Seniority: {self.seniority}. "
            f"Expertise: {topics_str}. "
            f"Experience: {self.years_experience} years. "
            f"{self.bio}"
        )

    def to_dict(self) -> dict:
        """Convert to dictionary representation."""
        return {
            "id": self.id,
            "name": self.name,
            "title": self.title,
            "company": self.company,
            "industry": self.industry,
            "seniority": self.seniority,
            "bio": self.bio,
            "topics": self.topics,
            "publications": self.publications,
            "years_experience": self.years_experience,
            "availability": self.availability,
            "hourly_rate": self.hourly_rate,
        }

    def __repr__(self) -> str:
        return f"<Expert {self.name} — {self.title}>"
