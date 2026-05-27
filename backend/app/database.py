"""
SQLAlchemy database engine and session management.

Uses SQLite for simplicity. The session factory provides
request-scoped database sessions via FastAPI dependency injection.
"""

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings

import sys
settings = get_settings()

db_url = settings.DATABASE_URL
# During automated pytest sessions, if the default CHANGE_ME template is active,
# we fall back to standard local passwordless credentials to run tests securely.
if "pytest" in sys.modules and db_url == "postgresql://postgres:CHANGE_ME@localhost:5432/expertiq":
    db_url = "postgresql://postgres@localhost:5432/expertiq"

# SQLite needs check_same_thread=False for FastAPI's async context
connect_args = {}
if db_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    db_url,
    connect_args=connect_args,
    echo=False,
)

# Enable WAL mode for SQLite (better concurrent read performance)
if db_url.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, _connection_record):
        """Enable WAL mode and foreign keys for SQLite."""
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""
    pass


def get_db() -> Session:
    """
    FastAPI dependency that provides a database session.

    Yields a session and ensures it is closed after the request.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create all tables defined by ORM models."""
    # Import all models here to register them with Base
    import app.models
    Base.metadata.create_all(bind=engine)
