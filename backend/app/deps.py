from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer

from app.core.security import decode_access_token
from app.repositories.factory import user_repository
from app.schemas.auth import AuthUser


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme)) -> AuthUser:
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise ValueError("Token is missing a subject")
        user = user_repository.get_user_by_id(UUID(str(user_id)))
        if user is None:
            raise ValueError("User not found")
        return AuthUser.model_validate(user)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


def get_current_user_id(current_user: AuthUser = Depends(get_current_user)) -> str:
    return str(current_user.id)


def get_request_id(request: Request) -> str:
    return getattr(request.state, "request_id", "unknown")
