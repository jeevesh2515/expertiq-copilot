"""
Tests for the search feedback API.
"""

import pytest
from fastapi.testclient import TestClient
from app.database import Base, engine
from app.main import app


@pytest.fixture(autouse=True)
def setup_db():
    """Create tables before each test, drop after."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    """FastAPI test client."""
    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture
def auth_headers(client: TestClient) -> dict:
    """Register a user and return auth headers."""
    resp = client.post(
        "/auth/register",
        json={
            "email": "feedbacker@example.com",
            "password": "SecureP@ss123",
            "full_name": "Feedback User",
        },
    )
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def seed_expert(client: TestClient, auth_headers: dict) -> str:
    """Create an expert profile in the db and return its ID."""
    from app.database import SessionLocal
    from app.models.expert import Expert
    
    db = SessionLocal()
    try:
        expert = Expert(
            id="12345678-1234-5678-1234-567812345678",
            name="Dr. Test Expert",
            title="Principal AI Researcher",
            company="Test Labs",
            industry="Climate Tech",
            seniority="Senior",
            bio="A test expert profile to validate feedback logs.",
            years_experience=10,
            availability="available",
        )
        db.add(expert)
        db.commit()
        db.refresh(expert)
        return expert.id
    finally:
        db.close()


class TestFeedbackEndpoint:
    """Tests for POST /api/search/feedback."""

    def test_submit_feedback_unauthenticated(self, client: TestClient) -> None:
        """Submitting feedback without auth returns 403."""
        response = client.post(
            "/api/search/feedback",
            json={
                "query": "FinTech compliance expert",
                "expert_id": "12345678-1234-5678-1234-567812345678",
                "score": 1,
                "comments": "Great match!",
            },
        )
        assert response.status_code == 403

    def test_submit_feedback_with_auth(
        self, client: TestClient, auth_headers: dict, seed_expert: str
    ) -> None:
        """Authenticated feedback submission returns 201."""
        response = client.post(
            "/api/search/feedback",
            json={
                "query": "FinTech compliance expert",
                "expert_id": seed_expert,
                "score": 1,
                "comments": "Great match!",
                "langsmith_run_id": "some-run-id-uuid",
            },
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert "feedback_id" in data

    def test_submit_feedback_invalid_score(
        self, client: TestClient, auth_headers: dict, seed_expert: str
    ) -> None:
        """Feedback with invalid score returns 422 validation error."""
        response = client.post(
            "/api/search/feedback",
            json={
                "query": "FinTech compliance expert",
                "expert_id": seed_expert,
                "score": 5,  # Score must be 1 or -1
                "comments": "Excellent",
            },
            headers=auth_headers,
        )
        assert response.status_code == 422
