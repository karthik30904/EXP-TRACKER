from __future__ import annotations

from fastapi import APIRouter, Depends, status

from app.deps import get_current_user, require_role
from app.schemas.auth import TokenResponse, UserLogin, UserRegister, UserResponse, UserRole
from app.services.auth import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(data: UserRegister) -> TokenResponse:
    """Register a new user account and return a JWT access token."""
    return auth_service.register(data)


@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin) -> TokenResponse:
    """Authenticate with email and password and return a JWT access token."""
    return auth_service.login(data)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: UserResponse = Depends(get_current_user)) -> UserResponse:
    """Get profile of the currently authenticated user."""
    return current_user


@router.get("/users", response_model=list[UserResponse], dependencies=[Depends(require_role([UserRole.ADMIN]))])
def list_users() -> list[UserResponse]:
    """List all registered users (Admin only)."""
    from app.repositories.user import get_user_repository
    repo = get_user_repository()
    return [UserResponse.model_validate(u) for u in repo.list_users()]
