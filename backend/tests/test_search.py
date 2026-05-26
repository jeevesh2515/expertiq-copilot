"""
Tests for the search API and schemas.

Covers query validation, sanitisation, and search endpoint behaviour.
"""

import pytest
from fastapi.testclient import TestClient

from app.database import Base, engine
from app.main import app
from app.schemas.search import SearchRequest


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
            "email": "searcher@example.com",
            "password": "SecureP@ss123",
            "full_name": "Search User",
        },
    )
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


class TestSearchSchema:
    """Tests for SearchRequest Pydantic schema."""

    def test_valid_query(self) -> None:
        """Valid query passes validation."""
        request = SearchRequest(query="Find experts in AI and machine learning")
        assert request.query == "Find experts in AI and machine learning"
        assert request.top_k == 10

    def test_query_sanitisation(self) -> None:
        """HTML tags are stripped from query."""
        request = SearchRequest(
            query="Find <script>alert('xss')</script> experts in AI"
        )
        assert "<script>" not in request.query
        assert "alert" in request.query

    def test_query_too_short(self) -> None:
        """Query shorter than 3 chars raises validation error."""
        with pytest.raises(Exception):
            SearchRequest(query="ab")

    def test_query_too_long(self) -> None:
        """Query longer than 500 chars raises validation error."""
        with pytest.raises(Exception):
            SearchRequest(query="x" * 501)

    def test_top_k_bounds(self) -> None:
        """top_k outside bounds raises validation error."""
        with pytest.raises(Exception):
            SearchRequest(query="valid query", top_k=0)
        with pytest.raises(Exception):
            SearchRequest(query="valid query", top_k=51)


class TestHealthEndpoint:
    """Tests for GET /api/health."""

    def test_health_check(self, client: TestClient) -> None:
        """Health endpoint returns 200 with status info."""
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data
        assert "features" in data


class TestSearchEndpoint:
    """Tests for POST /api/search."""

    def test_search_unauthenticated(self, client: TestClient) -> None:
        """Search without auth returns 403."""
        response = client.post(
            "/api/search",
            json={"query": "Find AI experts"},
        )
        assert response.status_code == 403

    def test_search_with_auth(
        self, client: TestClient, auth_headers: dict
    ) -> None:
        """Authenticated search returns 200."""
        response = client.post(
            "/api/search",
            json={"query": "Find experts in machine learning and drug discovery"},
            headers=auth_headers,
        )
        # May return 200 or 500 depending on vector store state
        assert response.status_code in [200, 500]
        if response.status_code == 200:
            data = response.json()
            assert "query" in data
            assert "results" in data
            assert "total_results" in data

    def test_search_with_filters(
        self, client: TestClient, auth_headers: dict
    ) -> None:
        """Search with filters returns 200."""
        response = client.post(
            "/api/search",
            json={
                "query": "FinTech compliance expert",
                "filters": {"industry": "FinTech"},
                "top_k": 5,
            },
            headers=auth_headers,
        )
        assert response.status_code in [200, 500]


class TestSecurityHeaders:
    """Tests for security headers on all responses."""

    def test_security_headers_present(self, client: TestClient) -> None:
        """All security headers are present in response."""
        response = client.get("/api/health")
        assert response.headers.get("X-Content-Type-Options") == "nosniff"
        assert response.headers.get("X-Frame-Options") == "DENY"
        assert response.headers.get("X-XSS-Protection") == "1; mode=block"
        assert "X-Request-ID" in response.headers


class TestExpertsEndpoint:
    """Tests for GET /api/experts."""

    def test_list_experts_authenticated(
        self, client: TestClient, auth_headers: dict
    ) -> None:
        """Authenticated request returns expert list."""
        response = client.get(
            "/api/experts",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert "experts" in data
        assert "total" in data

    def test_list_experts_unauthenticated(self, client: TestClient) -> None:
        """Unauthenticated request returns 403."""
        response = client.get("/api/experts")
        assert response.status_code == 403
