from __future__ import annotations

from app.core.security import create_access_token, hash_password, verify_password
from app.repositories.factory import user_repository
from app.schemas.auth import AuthUser, TokenResponse, UserCreate, UserLogin, UserRole, UserResponse
from fastapi import HTTPException, status


class AuthService:
    def __init__(self, repository) -> None:
        self.repository = repository

    def _build_token_response(self, user: dict) -> TokenResponse:
        role = user["role"].value if hasattr(user["role"], "value") else str(user["role"])
        return TokenResponse(
            access_token=create_access_token(subject=str(user["id"]), role=role),
            user=UserResponse.model_validate(user),
        )

    def register(self, data: UserCreate) -> TokenResponse:
        email = data.email.lower().strip()
        if self.repository.get_user_by_email(email) is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered",
            )

        user = self.repository.create_user(
            UserCreate(email=email, full_name=data.full_name, password=data.password),
            hash_password(data.password),
            role=UserRole.USER,
        )
        return self._build_token_response(user)

    def login(self, data: UserLogin) -> TokenResponse:
        user = self.repository.get_user_by_email(data.email.lower().strip())
        if user is None or not verify_password(data.password, user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return self._build_token_response(user)

    def ensure_demo_accounts(self) -> None:
        ensure_demo_accounts = getattr(self.repository, "ensure_demo_accounts", None)
        if callable(ensure_demo_accounts):
            ensure_demo_accounts()

    def me(self, current_user: AuthUser) -> UserResponse:
        return UserResponse.model_validate(current_user)


auth_service = AuthService(user_repository)
