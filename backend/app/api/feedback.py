"""
API router for user search feedback logging.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.feedback import Feedback
from app.models.user import User
from app.schemas.feedback import FeedbackRequest, FeedbackResponse
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/api/search/feedback", tags=["Search Feedback"])


@router.post(
    "",
    response_model=FeedbackResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit feedback on search results",
)
async def submit_search_feedback(
    feedback_req: FeedbackRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FeedbackResponse:
    """
    Log user rating feedback (thumbs-up/down) on a search result expert.

    If a LangSmith run ID is provided, this automatically pushes feedback metrics
    to the specific search trace for live evaluation dashboards.
    """
    try:
        # 1. Log to database
        new_feedback = Feedback(
            query=feedback_req.query,
            expert_id=feedback_req.expert_id,
            score=feedback_req.score,
            comments=feedback_req.comments,
            langsmith_run_id=feedback_req.langsmith_run_id,
        )
        db.add(new_feedback)
        db.commit()
        db.refresh(new_feedback)

        # 2. Push to LangSmith for online evaluation (if run ID is present)
        if feedback_req.langsmith_run_id:
            try:
                from langsmith import Client as LSClient
                ls_client = LSClient()

                # Register user score directly associated with search run
                ls_client.create_feedback(
                    run_id=feedback_req.langsmith_run_id,
                    key="user-score",
                    score=float(feedback_req.score),
                    comment=feedback_req.comments,
                )
                logger.info(f"✓ Feedback metrics pushed to LangSmith for run: {feedback_req.langsmith_run_id}")
            except Exception as ls_err:
                # Graceful fallback to avoid RAG search interruptions due to tracing network drops
                logger.warning(f"⚠ LangSmith feedback registration deferred: {ls_err}")

        return FeedbackResponse(
            success=True,
            message="Feedback successfully recorded and attached to RAG tracing metrics.",
            feedback_id=new_feedback.id,
        )

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to record search feedback: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not register feedback. Please try again.",
        )
