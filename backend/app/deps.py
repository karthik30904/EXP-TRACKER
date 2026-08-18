from fastapi import Request

from app.repositories.memory import DEFAULT_USER_ID


def get_current_user_id() -> str:
    """Placeholder for Phase 3 auth. Returns default user for now."""
    return str(DEFAULT_USER_ID)


def get_request_id(request: Request) -> str:
    return getattr(request.state, "request_id", "unknown")
