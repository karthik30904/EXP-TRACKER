from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, status

from app.core.config import settings
from app.core.security import create_access_token, hash_password, verify_password
from app.repositories.user import get_user_repository
from app.schemas.auth import (
    MessageResponse,
    ResetPasswordRequest,
    SendOtpResponse,
    TokenResponse,
    UserLogin,
    UserProfileUpdate,
    UserRegister,
    UserResponse,
    UserRole,
    VerifyRegisterOtp,
)
from app.services.email import email_service
from app.services.otp import otp_service


class AuthService:
    def __init__(self) -> None:
        self.repository = get_user_repository()

    def send_registration_otp(self, email: str) -> SendOtpResponse:
        """Initiate user registration by dispatching an OTP to the given email."""
        norm_email = email.strip().lower()
        existing = self.repository.get_by_email(norm_email)
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"An account with email '{norm_email}' already exists. Please sign in instead.",
            )

        can_resend, remaining = otp_service.can_resend_otp(norm_email, "register")
        if not can_resend:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Please wait {remaining} seconds before requesting a new verification code.",
            )

        otp_code, ttl = otp_service.generate_otp(norm_email, "register")
        email_service.send_registration_otp(norm_email, otp_code, expire_minutes=ttl)

        dev_otp = otp_code if (settings.debug or not email_service.is_smtp_configured()) else None
        return SendOtpResponse(
            message=f"A 6-digit verification code has been sent to {norm_email}. Please enter it to complete registration.",
            email=norm_email,
            expire_minutes=ttl,
            dev_otp=dev_otp,
        )

    def verify_and_register(self, data: VerifyRegisterOtp) -> TokenResponse:
        """Verify the email OTP and create the new user account."""
        norm_email = data.email.strip().lower()
        is_valid, msg = otp_service.verify_otp(norm_email, "register", data.otp)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=msg,
            )

        existing = self.repository.get_by_email(norm_email)
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"An account with email '{norm_email}' already exists",
            )

        hashed = hash_password(data.password)
        created = self.repository.create_user(
            email=norm_email,
            hashed_password=hashed,
            full_name=data.full_name.strip() if data.full_name else None,
            role=UserRole.USER,
        )

        user_response = UserResponse.model_validate(created)
        access_token = create_access_token(
            data={
                "sub": str(created["id"]),
                "email": created["email"],
                "role": created["role"].value if isinstance(created["role"], UserRole) else str(created["role"]),
            }
        )
        return TokenResponse(access_token=access_token, user=user_response)

    def register(self, data: UserRegister) -> TokenResponse:
        """Legacy direct registration for automated test backward compatibility."""
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
            data={
                "sub": str(created["id"]),
                "email": created["email"],
                "role": created["role"].value if isinstance(created["role"], UserRole) else str(created["role"]),
            }
        )
        return TokenResponse(access_token=access_token, user=user_response)

    def login(self, data: UserLogin) -> TokenResponse:
        """Authenticate with email and password, enforcing failed login restrictions."""
        norm_email = data.email.strip().lower()

        # Check temporary account restriction / lockout
        is_locked, lock_msg = otp_service.is_login_locked(norm_email)
        if is_locked:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=lock_msg,
            )

        user = self.repository.get_by_email(norm_email)
        if user is None or not verify_password(data.password, user["hashed_password"]):
            failure_msg = otp_service.record_login_failure(norm_email)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=failure_msg,
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is deactivated",
            )

        # Clear login failures on success
        otp_service.record_login_success(norm_email)

        user_response = UserResponse.model_validate(user)
        access_token = create_access_token(
            data={
                "sub": str(user["id"]),
                "email": user["email"],
                "role": user["role"].value if isinstance(user["role"], UserRole) else str(user["role"]),
            }
        )
        return TokenResponse(access_token=access_token, user=user_response)

    def send_password_reset_otp(self, email: str) -> SendOtpResponse:
        """Send a password reset verification OTP if the user exists."""
        norm_email = email.strip().lower()
        user = self.repository.get_by_email(norm_email)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No account is registered with the email '{norm_email}'",
            )

        can_resend, remaining = otp_service.can_resend_otp(norm_email, "forgot_password")
        if not can_resend:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Please wait {remaining} seconds before requesting another reset code.",
            )

        otp_code, ttl = otp_service.generate_otp(norm_email, "forgot_password")
        email_service.send_password_reset_otp(norm_email, otp_code, expire_minutes=ttl)

        dev_otp = otp_code if (settings.debug or not email_service.is_smtp_configured()) else None
        return SendOtpResponse(
            message=f"A password reset code has been sent to {norm_email}. Please check your email.",
            email=norm_email,
            expire_minutes=ttl,
            dev_otp=dev_otp,
        )

    def reset_password_with_otp(self, data: ResetPasswordRequest) -> MessageResponse:
        """Verify OTP and update user's password."""
        norm_email = data.email.strip().lower()
        is_valid, msg = otp_service.verify_otp(norm_email, "forgot_password", data.otp)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=msg,
            )

        user = self.repository.get_by_email(norm_email)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        hashed = hash_password(data.new_password)
        self.repository.update_user_profile(user["id"], hashed_password=hashed)
        otp_service.record_login_success(norm_email)

        return MessageResponse(
            message="Password has been reset successfully! You can now sign in with your new password.",
            success=True,
        )

    def get_me(self, user_id: UUID) -> UserResponse:
        user = self.repository.get_by_id(user_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        return UserResponse.model_validate(user)

    def update_profile(self, user_id: UUID, data: UserProfileUpdate) -> UserResponse:
        user = self.repository.get_by_id(user_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        hashed_password = None
        if data.new_password:
            if not data.current_password or not verify_password(data.current_password, user["hashed_password"]):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Incorrect current password entered. Password change restricted.",
                )
            hashed_password = hash_password(data.new_password)

        updated = self.repository.update_user_profile(
            user_id,
            full_name=data.full_name.strip() if data.full_name is not None else None,
            hashed_password=hashed_password,
        )
        if updated is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        return UserResponse.model_validate(updated)


auth_service = AuthService()
