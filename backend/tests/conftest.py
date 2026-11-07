"""
Shared pytest fixtures for expertiq-copilot backend tests.

The module-level engine in app.database already uses StaticPool when pytest is detected.
This conftest.py manages the schema lifecycle once per session and truncates tables
AFTER each test for isolation — avoiding interference with the session-scoped schema fixture.
"""

import pytest
from sqlalchemy.pool import StaticPool
from sqlalchemy import text, inspect

from app.database import Base, engine, init_db


@pytest.fixture(scope="session", autouse=True)
def _session_schema():
    """Create all tables once at session start, drop at session end."""
    print(f"\n[DEBUG _session_schema SETUP] Engine URL: {engine.url}")
    print(f"[DEBUG _session_schema SETUP] Pool: {engine.pool}")
    assert "expertiq_test.db" in str(engine.url), f"Expected test DB, got {engine.url}"
    assert isinstance(engine.pool, StaticPool), f"Expected StaticPool, got {engine.pool.__class__}"
    # Use init_db() which also runs dynamic migrations (e.g., search_history.thread_id)
    print("[DEBUG _session_schema SETUP] Calling init_db()...")
    init_db()
    print("[DEBUG _session_schema SETUP] init_db() completed")
    from sqlalchemy import inspect
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"[DEBUG _session_schema SETUP] Tables after init_db: {tables}")
    yield
    print("[DEBUG _session_schema TEARDOWN] Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
    print("[DEBUG _session_schema TEARDOWN] Done")


@pytest.fixture(autouse=True)
def _truncate_tables_after():
    """Truncate all tables AFTER each test for isolation without dropping schema."""
    yield
    print(f"\n[DEBUG _truncate_tables_after TEARDOWN] Engine URL: {engine.url}")
    # Truncate AFTER each test to clean up for the next test
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    print(f"[DEBUG _truncate_tables_after TEARDOWN] Existing tables: {existing_tables}")
    with engine.connect() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            if table.name in existing_tables:
                conn.execute(text(f"DELETE FROM {table.name}"))
        conn.commit()