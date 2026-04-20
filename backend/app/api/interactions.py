"""
Interactions API — bookmarks and search history.
"""

import logging
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.expert import Expert
from app.models.interaction import Bookmark, SearchHistory
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Interactions"])


@router.post("/bookmarks/{expert_id}", status_code=status.HTTP_201_CREATED)
async def add_bookmark(
    expert_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Bookmark an expert profile."""
    # Check if expert exists
    expert = db.get(Expert, expert_id)
    if not expert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Expert not found"
        )

    # Check if already bookmarked
    stmt = select(Bookmark).where(
        Bookmark.user_id == current_user.id, Bookmark.expert_id == expert_id
    )
    existing = db.execute(stmt).scalar_one_or_none()
    if existing:
        return {"message": "Already bookmarked"}

    bookmark = Bookmark(user_id=current_user.id, expert_id=expert_id)
    db.add(bookmark)
    db.commit()
    return {"message": "Bookmarked successfully"}


@router.delete("/bookmarks/{expert_id}")
async def remove_bookmark(
    expert_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a bookmark."""
    stmt = delete(Bookmark).where(
        Bookmark.user_id == current_user.id, Bookmark.expert_id == expert_id
    )
    result = db.execute(stmt)
    db.commit()

    if result.rowcount == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Bookmark not found"
        )

    return {"message": "Bookmark removed"}


@router.get("/bookmarks")
async def list_bookmarks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List bookmarked experts."""
    stmt = (
        select(Expert)
        .join(Bookmark, (Expert.id == Bookmark.expert_id))
        .where(Bookmark.user_id == current_user.id)
        .order_by(Bookmark.created_at.desc())
    )
    experts = db.execute(stmt).scalars().all()
    return {"experts": [e.to_dict() for e in experts]}


@router.get("/history")
async def list_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List search history."""
    stmt = (
        select(SearchHistory)
        .where(SearchHistory.user_id == current_user.id)
        .order_by(SearchHistory.created_at.desc())
        .limit(50)
    )
    history = db.execute(stmt).scalars().all()
    return {
        "history": [
            {
                "id": h.id,
                "query": h.query_text,
                "result_count": h.result_count,
                "processing_time_ms": h.processing_time_ms,
                "created_at": h.created_at,
            }
            for h in history
        ]
    }
