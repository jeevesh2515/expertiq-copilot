"""
Tests for authentication endpoints.

Covers registration, login, token refresh, and protected routes.
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
def registered_user(client: TestClient) -> dict:
    """Register a user and return the token response."""
    response = client.post(
        "/auth/register",
        json={
            "email": "test@example.com",
            "password": "SecureP@ss123",
            "full_name": "Test User",
        },
    )
    assert response.status_code == 201
    return response.json()


class TestRegister:
    """Tests for POST /auth/register."""

    def test_register_success(self, client: TestClient) -> None:
        """Successful registration returns 201 and token pair."""
        response = client.post(
            "/auth/register",
            json={
                "email": "new@example.com",
                "password": "SecureP@ss123",
                "full_name": "New User",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    def test_register_duplicate_email(
        self, client: TestClient, registered_user: dict
    ) -> None:
        """Duplicate email returns 409 Conflict."""
        response = client.post(
            "/auth/register",
            json={
                "email": "test@example.com",
                "password": "AnotherP@ss123",
                "full_name": "Duplicate User",
            },
        )
        assert response.status_code == 409

    def test_register_weak_password(self, client: TestClient) -> None:
        """Password shorter than 8 chars returns 422."""
        response = client.post(
            "/auth/register",
            json={
                "email": "weak@example.com",
                "password": "short",
                "full_name": "Weak Pass User",
            },
        )
        assert response.status_code == 422

    def test_register_invalid_email(self, client: TestClient) -> None:
        """Invalid email format returns 422."""
        response = client.post(
            "/auth/register",
            json={
                "email": "not-an-email",
                "password": "SecureP@ss123",
                "full_name": "Bad Email",
            },
        )
        assert response.status_code == 422


class TestLogin:
    """Tests for POST /auth/login."""

    def test_login_success(
        self, client: TestClient, registered_user: dict
    ) -> None:
        """Correct credentials return 200 and token pair."""
        response = client.post(
            "/auth/login",
            json={
                "email": "test@example.com",
                "password": "SecureP@ss123",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    def test_login_wrong_password(
        self, client: TestClient, registered_user: dict
    ) -> None:
        """Wrong password returns 401."""
        response = client.post(
            "/auth/login",
            json={
                "email": "test@example.com",
                "password": "WrongPassword123",
            },
        )
        assert response.status_code == 401

    def test_login_nonexistent_user(self, client: TestClient) -> None:
        """Non-existent email returns 401."""
        response = client.post(
            "/auth/login",
            json={
                "email": "ghost@example.com",
                "password": "Whatever123",
            },
        )
        assert response.status_code == 401


class TestRefresh:
    """Tests for POST /auth/refresh."""

    def test_refresh_success(
        self, client: TestClient, registered_user: dict
    ) -> None:
        """Valid refresh token returns new token pair."""
        response = client.post(
            "/auth/refresh",
            json={"refresh_token": registered_user["refresh_token"]},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data

    def test_refresh_invalid_token(self, client: TestClient) -> None:
        """Invalid token returns 401."""
        response = client.post(
            "/auth/refresh",
            json={"refresh_token": "invalid.token.here"},
        )
        assert response.status_code == 401


class TestProtectedRoutes:
    """Tests for authenticated endpoints."""

    def test_get_me_authenticated(
        self, client: TestClient, registered_user: dict
    ) -> None:
        """Authenticated user can access /auth/me."""
        response = client.get(
            "/auth/me",
            headers={
                "Authorization": f"Bearer {registered_user['access_token']}"
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "test@example.com"
        assert data["full_name"] == "Test User"

    def test_get_me_unauthenticated(self, client: TestClient) -> None:
        """Unauthenticated request to /auth/me returns 403."""
        response = client.get("/auth/me")
        assert response.status_code == 403

    def test_get_me_invalid_token(self, client: TestClient) -> None:
        """Invalid token returns 401."""
        response = client.get(
            "/auth/me",
            headers={"Authorization": "Bearer invalid.token.here"},
        )
        assert response.status_code == 401
