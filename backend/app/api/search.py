"""
Search API endpoint — the primary user-facing search interface.

POST /api/search triggers the full AI agent pipeline:
semantic search → graph expansion → LLM re-ranking → summary.
"""

import logging
import time
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.auth.dependencies import get_current_user
from app.config import get_settings
from app.core.agent import get_agent
from app.database import get_db
from app.models.interaction import SearchHistory
from app.models.user import User
from app.schemas.search import ErrorResponse, SearchRequest, SearchResponse
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/api", tags=["Search"])

# Rate limiter instance
limiter = Limiter(key_func=get_remote_address)


@router.post(
    "/search",
    response_model=SearchResponse,
    summary="AI-powered expert search",
    responses={
        429: {"model": ErrorResponse, "description": "Rate limit exceeded"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def search_experts(
    request: Request,
    search_request: SearchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Execute the multi-layer AI expert discovery pipeline.

    Pipeline layers:
    1. Semantic vector search (ChromaDB + sentence-transformers)
    2. Knowledge graph traversal (NetworkX, 2-hop expansion)
    3. LLM re-ranking and executive summary (Groq, if configured)

    Rate limited to 10 requests per minute per user.
    """
    start_time = time.time()

    try:
        agent = get_agent()
        response = agent.run(
            query=search_request.query,
            filters=search_request.filters,
            top_k=search_request.top_k,
        )

        response["processing_time_ms"] = round(
            (time.time() - start_time) * 1000, 2
        )

        # Record History
        try:
            import json
            history = SearchHistory(
                user_id=current_user.id,
                query_text=search_request.query,
                filters_json=json.dumps(search_request.filters) if search_request.filters else None,
                result_count=response.get("total_results", 0),
                processing_time_ms=response.get("processing_time_ms", 0)
            )
            db.add(history)
            db.commit()
        except Exception as he:
            logger.warning(f"Failed to record search history: {he}")

        return response

    except Exception as e:
        logger.error(f"Search failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Search pipeline encountered an error. Please try again.",
        )

@router.post(
    "/search/stream",
    summary="AI-powered expert search with streaming summary",
    responses={
        429: {"model": ErrorResponse, "description": "Rate limit exceeded"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def stream_search_experts(
    request: Request,
    search_request: SearchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Execute the multi-layer AI expert discovery pipeline and stream the
    executive summary back using Server-Sent Events (SSE).
    """
    try:
        from fastapi.responses import StreamingResponse
        agent = get_agent()
        async def wrapped_stream():
            import json
            async for event in agent.stream_run(
                query=search_request.query,
                filters=search_request.filters,
                top_k=search_request.top_k,
            ):
                yield event
                # Record once result payload is yielded
                if event.startswith('data: {"type": "results"'):
                    try:
                        payload = json.loads(event[6:])
                        results_data = payload.get("data", {})
                        h = SearchHistory(
                            user_id=current_user.id,
                            query_text=search_request.query,
                            filters_json=json.dumps(search_request.filters) if search_request.filters else None,
                            result_count=results_data.get("total_results", 0),
                            processing_time_ms=results_data.get("processing_time_ms", 0)
                        )
                        db.add(h)
                        db.commit()
                    except Exception as he:
                        logger.warning(f"Failed to record stream history: {he}")

        return StreamingResponse(
            wrapped_stream(),
            media_type="text/event-stream"
        )
    except Exception as e:
        logger.error(f"Streaming search failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Streaming pipeline encountered an error. Please try again.",
        )
