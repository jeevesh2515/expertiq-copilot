"""
Expert CRUD API endpoints.

Provides listing, detail, and filtering for expert profiles.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.expert import Expert
from app.models.user import User
from app.schemas.expert import ExpertListResponse, ExpertProfile

router = APIRouter(prefix="/api/experts", tags=["Experts"])


@router.get(
    "",
    response_model=ExpertListResponse,
    summary="List experts with optional filters",
)
async def list_experts(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Results per page"),
    industry: Optional[str] = Query(None, description="Filter by industry"),
    seniority: Optional[str] = Query(None, description="Filter by seniority"),
    availability: Optional[str] = Query(None, description="Filter by availability"),
    search: Optional[str] = Query(None, description="Text search in name/company"),
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> ExpertListResponse:
    """
    List expert profiles with pagination and optional filters.

    Supports filtering by industry, seniority, availability,
    and free-text search across name and company.
    """
    query = db.query(Expert)

    # Apply filters
    if industry:
        query = query.filter(Expert.industry.ilike(f"%{industry}%"))
    if seniority:
        query = query.filter(Expert.seniority.ilike(f"%{seniority}%"))
    if availability:
        query = query.filter(Expert.availability == availability)
    if search:
        query = query.filter(
            (Expert.name.ilike(f"%{search}%"))
            | (Expert.company.ilike(f"%{search}%"))
        )

    total = query.count()
    experts = (
        query.order_by(Expert.name)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    expert_profiles = []
    for expert in experts:
        profile = ExpertProfile(
            id=expert.id,
            name=expert.name,
            title=expert.title,
            company=expert.company,
            industry=expert.industry,
            seniority=expert.seniority,
            bio=expert.bio,
            topics=expert.topics,
            publications=expert.publications,
            years_experience=expert.years_experience,
            availability=expert.availability,
            hourly_rate=expert.hourly_rate,
        )
        expert_profiles.append(profile)

    return ExpertListResponse(
        experts=expert_profiles,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/{expert_id}",
    response_model=ExpertProfile,
    summary="Get expert by ID",
)
async def get_expert(
    expert_id: str,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> ExpertProfile:
    """Retrieve a single expert profile by ID."""
    expert = db.query(Expert).filter(Expert.id == expert_id).first()
    if not expert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expert not found",
        )
    return ExpertProfile(
        id=expert.id,
        name=expert.name,
        title=expert.title,
        company=expert.company,
        industry=expert.industry,
        seniority=expert.seniority,
        bio=expert.bio,
        topics=expert.topics,
        publications=expert.publications,
        years_experience=expert.years_experience,
        availability=expert.availability,
        hourly_rate=expert.hourly_rate,
    )


@router.get(
    "/industries/list",
    response_model=List[str],
    summary="List all unique industries",
)
async def list_industries(
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> List[str]:
    """Return a distinct sorted list of all expert industries."""
    results = db.query(Expert.industry).distinct().order_by(Expert.industry).all()
    return [r[0] for r in results]
