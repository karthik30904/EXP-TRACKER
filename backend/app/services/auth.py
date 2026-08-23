from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, status

from app.core.security import create_access_token, hash_password, verify_password
from app.repositories.user import get_user_repository
from app.schemas.auth import TokenResponse, UserLogin, UserRegister, UserResponse, UserRole


class AuthService:
    def __init__(self) -> None:
        self.repository = get_user_repository()

    def register(self, data: UserRegister) -> TokenResponse:
        existing = self.repository.get_by_email(data.email)
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"An account with email '{data.email}' already exists",
            )

        hashed = hash_password(data.password)
        created = self.repository.create_user(
            email=data.email,
            hashed_password=hashed,
            full_name=data.full_name,
            role=UserRole.USER,
        )

        user_response = UserResponse.model_validate(created)
        access_token = create_access_token(
            data={"sub": str(created["id"]), "email": created["email"], "role": created["role"].value if isinstance(created["role"], UserRole) else str(created["role"])}
        )
        return TokenResponse(access_token=access_token, user=user_response)

    def login(self, data: UserLogin) -> TokenResponse:
        user = self.repository.get_by_email(data.email)
        if user is None or not verify_password(data.password, user["hashed_password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is deactivated",
            )

        user_response = UserResponse.model_validate(user)
        access_token = create_access_token(
            data={"sub": str(user["id"]), "email": user["email"], "role": user["role"].value if isinstance(user["role"], UserRole) else str(user["role"])}
        )
        return TokenResponse(access_token=access_token, user=user_response)

    def get_me(self, user_id: UUID) -> UserResponse:
        user = self.repository.get_by_id(user_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        return UserResponse.model_validate(user)


auth_service = AuthService()
