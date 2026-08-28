from __future__ import annotations

from fastapi import APIRouter, Depends, status

from app.deps import get_current_user, require_role
from app.schemas.auth import (
    MessageResponse,
    ResetPasswordRequest,
    SendOtpRequest,
    SendOtpResponse,
    TokenResponse,
    UserLogin,
    UserProfileUpdate,
    UserRegister,
    UserResponse,
    UserRole,
    VerifyRegisterOtp,
)
from app.services.auth import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register/send-otp", response_model=SendOtpResponse)
def send_register_otp(data: SendOtpRequest) -> SendOtpResponse:
    """Send an email verification code (OTP) to start account registration."""
    return auth_service.send_registration_otp(data.email)


@router.post("/register/verify", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def verify_and_register(data: VerifyRegisterOtp) -> TokenResponse:
    """Verify email OTP and create the user account."""
    return auth_service.verify_and_register(data)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(data: UserRegister) -> TokenResponse:
    """Register a new user account directly (legacy / API compatibility)."""
    return auth_service.register(data)


@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin) -> TokenResponse:
    """Authenticate with email and password, tracking incorrect attempts."""
    return auth_service.login(data)


@router.post("/forgot-password/send-otp", response_model=SendOtpResponse)
def send_forgot_password_otp(data: SendOtpRequest) -> SendOtpResponse:
    """Send a password reset verification code (OTP) to the registered email."""
    return auth_service.send_password_reset_otp(data.email)


@router.post("/forgot-password/reset", response_model=MessageResponse)
def reset_password(data: ResetPasswordRequest) -> MessageResponse:
    """Verify reset OTP and update to a new password."""
    return auth_service.reset_password_with_otp(data)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: UserResponse = Depends(get_current_user)) -> UserResponse:
    """Get profile of the currently authenticated user."""
    return current_user


@router.patch("/profile", response_model=UserResponse)
def update_profile(
    data: UserProfileUpdate,
    current_user: UserResponse = Depends(get_current_user),
) -> UserResponse:
    """Update profile or change password for the authenticated user."""
    return auth_service.update_profile(current_user.id, data)


@router.get("/users", response_model=list[UserResponse], dependencies=[Depends(require_role([UserRole.ADMIN]))])
def list_users() -> list[UserResponse]:
    """List all registered users (Admin only)."""
    from app.repositories.user import get_user_repository
    repo = get_user_repository()
    return [UserResponse.model_validate(u) for u in repo.list_users()]
