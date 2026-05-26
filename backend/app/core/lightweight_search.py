"""
Lightweight local search engine for expert discovery.

This module replaces the heavyweight embedding/vector-store startup path
with a zero-download, zero-ML-index fallback that runs comfortably on a
typical laptop. It keeps the same search contract used by the API while
using deterministic token and phrase scoring over the local SQLite data.

No network calls, no ML models — pure in-memory text scoring.
"""

from __future__ import annotations

import logging
import re
from collections import Counter
from dataclasses import dataclass
from functools import lru_cache
from math import sqrt
from typing import Any, Dict, Iterable, List, Optional

from app.database import SessionLocal
from app.models.expert import Expert

logger = logging.getLogger(__name__)

TOKEN_RE = re.compile(r"[a-z0-9]+")
STOP_WORDS = {
    "a",
    "an",
    "and",
    "are",
    "at",
    "by",
    "for",
    "from",
    "has",
    "have",
    "in",
    "into",
    "is",
    "of",
    "on",
    "or",
    "that",
    "the",
    "their",
    "to",
    "with",
}


def _normalise_token(token: str) -> str:
    token = token.lower().strip()
    for suffix in ("ing", "ers", "ies", "ied", "ed", "es", "s"):
        if len(token) > 4 and token.endswith(suffix):
            return token[: -len(suffix)]
    return token


def _tokenise(text: str) -> List[str]:
    tokens = [_normalise_token(match.group(0)) for match in TOKEN_RE.finditer(text.lower())]
    return [token for token in tokens if token and token not in STOP_WORDS]


def _stringify_expert(expert: Dict[str, Any]) -> Dict[str, str]:
    topics = ", ".join(expert.get("topics", []))
    publications = " ".join(expert.get("publications", []))
    return {
        "name": expert.get("name", ""),
        "title": expert.get("title", ""),
        "company": expert.get("company", ""),
        "industry": expert.get("industry", ""),
        "seniority": expert.get("seniority", ""),
        "bio": expert.get("bio", ""),
        "topics": topics,
        "publications": publications,
        "full_text": " ".join(
            [
                expert.get("name", ""),
                expert.get("title", ""),
                expert.get("company", ""),
                expert.get("industry", ""),
                expert.get("seniority", ""),
                topics,
                publications,
                expert.get("bio", ""),
            ]
        ),
    }


@dataclass
class IndexedExpert:
    expert: Dict[str, Any]
    fields: Dict[str, str]
    tokens: Counter[str]
    field_tokens: Dict[str, set[str]]


class LightweightSearchEngine:
    """Deterministic in-memory ranking over the local expert dataset."""

    def __init__(self) -> None:
        self._experts: List[IndexedExpert] = []
        self._expert_by_id: Dict[str, IndexedExpert] = {}

    def refresh(self, experts: Iterable[Dict[str, Any]]) -> None:
        indexed: List[IndexedExpert] = []
        by_id: Dict[str, IndexedExpert] = {}

        for expert in experts:
            fields = _stringify_expert(expert)
            full_tokens = Counter(_tokenise(fields["full_text"]))
            field_tokens = {
                key: set(_tokenise(value))
                for key, value in fields.items()
                if key != "full_text"
            }
            item = IndexedExpert(
                expert=expert,
                fields=fields,
                tokens=full_tokens,
                field_tokens=field_tokens,
            )
            indexed.append(item)
            by_id[expert["id"]] = item

        self._experts = indexed
        self._expert_by_id = by_id
        logger.info("Lightweight search index refreshed with %s experts.", len(indexed))

    def ensure_loaded(self) -> None:
        if self._experts:
            return

        db = SessionLocal()
        try:
            experts = [expert.to_dict() for expert in db.query(Expert).all()]
            self.refresh(experts)
        finally:
            db.close()

    def get_expert(self, expert_id: str) -> Optional[Dict[str, Any]]:
        self.ensure_loaded()
        indexed = self._expert_by_id.get(expert_id)
        return indexed.expert if indexed else None

    def search(
        self,
        query: str,
        top_k: int = 20,
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        self.ensure_loaded()
        query_tokens = set(_tokenise(query))
        if not query_tokens:
            return []

        candidates: List[Dict[str, Any]] = []

        for indexed in self._experts:
            if not self._matches_filters(indexed.expert, filters):
                continue

            score, reasoning = self._score(indexed, query, query_tokens)
            if score <= 0:
                continue

            candidates.append(
                {
                    "id": indexed.expert["id"],
                    "document": indexed.fields["full_text"],
                    "metadata": self._metadata(indexed.expert),
                    "distance": round(max(0.0, 1 - score / 100), 4),
                    "similarity_score": round(score, 2),
                    "local_reasoning": reasoning,
                }
            )

        candidates.sort(
            key=lambda item: (
                item["similarity_score"],
                item["metadata"].get("years_experience", 0),
            ),
            reverse=True,
        )
        return candidates[:top_k]

    def _matches_filters(
        self,
        expert: Dict[str, Any],
        filters: Optional[Dict[str, Any]],
    ) -> bool:
        if not filters:
            return True

        for key, value in filters.items():
            if value in (None, ""):
                continue
            expert_value = str(expert.get(key, "")).strip().lower()
            if expert_value != str(value).strip().lower():
                return False
        return True

    def _score(
        self,
        indexed: IndexedExpert,
        raw_query: str,
        query_tokens: set[str],
    ) -> tuple[float, str]:
        overlap = query_tokens & set(indexed.tokens.keys())
        coverage = len(overlap) / max(1, len(query_tokens))

        weighted_hits = 0.0
        weighted_total = 0.0
        field_weights = {
            "topics": 3.4,
            "industry": 3.0,
            "title": 2.8,
            "company": 2.0,
            "seniority": 1.8,
            "bio": 1.2,
            "publications": 1.1,
            "name": 1.0,
        }

        hit_fields: List[str] = []
        for field_name, weight in field_weights.items():
            tokens = indexed.field_tokens.get(field_name, set())
            if not tokens:
                continue
            field_overlap = query_tokens & tokens
            weighted_total += weight
            if field_overlap:
                weighted_hits += weight * (len(field_overlap) / max(1, len(query_tokens)))
                hit_fields.append(field_name)

        dense_bonus = min(12.0, sqrt(sum(indexed.tokens[token] for token in overlap)) * 3)
        phrase_bonus = 0.0
        compact_query = " ".join(_tokenise(raw_query))
        if compact_query and compact_query in " ".join(_tokenise(indexed.fields["full_text"])):
            phrase_bonus += 18.0

        if any(token in indexed.field_tokens.get("topics", set()) for token in query_tokens):
            phrase_bonus += 12.0
        if any(token in indexed.field_tokens.get("industry", set()) for token in query_tokens):
            phrase_bonus += 8.0

        score = (coverage * 55.0) + ((weighted_hits / max(1.0, weighted_total)) * 35.0) + dense_bonus + phrase_bonus
        score = max(0.0, min(99.0, score))

        matched_labels = ", ".join(hit_fields[:3]) if hit_fields else "bio"
        reasoning = (
            f"Strong local match across {matched_labels}; "
            f"matched {len(overlap)} of {len(query_tokens)} key query terms."
        )
        return score, reasoning

    def _metadata(self, expert: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "name": expert.get("name", ""),
            "title": expert.get("title", ""),
            "company": expert.get("company", ""),
            "industry": expert.get("industry", ""),
            "seniority": expert.get("seniority", ""),
            "topics": ", ".join(expert.get("topics", [])),
            "years_experience": str(expert.get("years_experience", 0)),
            "availability": expert.get("availability", ""),
            "bio": expert.get("bio", "")[:500],
            "publications": "; ".join(expert.get("publications", [])[:3]),
        }


@lru_cache()
def get_lightweight_search_engine() -> LightweightSearchEngine:
    return LightweightSearchEngine()
