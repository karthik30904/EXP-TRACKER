from __future__ import annotations

from fastapi import APIRouter, Depends, status

from app.deps import get_current_user
from app.schemas.auth import AuthUser, TokenResponse, UserCreate, UserLogin, UserResponse
from app.services.auth import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(data: UserCreate) -> TokenResponse:
    return auth_service.register(data)


@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin) -> TokenResponse:
    return auth_service.login(data)


@router.get("/me", response_model=UserResponse)
def me(current_user: AuthUser = Depends(get_current_user)) -> UserResponse:
    return auth_service.me(current_user)
