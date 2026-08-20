from __future__ import annotations

from functools import lru_cache
from typing import Any

from app.core.config import settings

try:
    from sqlalchemy import create_engine, text
    from sqlalchemy.engine import Engine
    from sqlalchemy.orm import sessionmaker
except ModuleNotFoundError:  # pragma: no cover - optional until dependencies are installed
    create_engine = None  # type: ignore[assignment]
    text = None  # type: ignore[assignment]
    Engine = Any  # type: ignore[misc,assignment]
    sessionmaker = None  # type: ignore[assignment]


@lru_cache(maxsize=1)
def get_engine() -> Engine | None:
    if create_engine is None or not settings.database_url:
        return None
    return create_engine(settings.database_url, pool_pre_ping=True, future=True)


@lru_cache(maxsize=1)
def get_session_factory() -> Any | None:
    engine = get_engine()
    if sessionmaker is None or engine is None:
        return None
    return sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def database_available() -> bool:
    return get_engine() is not None and get_session_factory() is not None


def ping_database() -> bool:
    engine = get_engine()
    if engine is None or text is None:
        return False

    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


def database_ready() -> bool:
    return database_available() and ping_database()
