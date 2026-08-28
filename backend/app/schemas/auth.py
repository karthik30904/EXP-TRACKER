from __future__ import annotations

from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserRole(str, Enum):
    USER = "user"
    ADMIN = "admin"


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, description="Password must be at least 6 characters")
    full_name: str | None = Field(default=None, max_length=100)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    full_name: str | None = None
    role: UserRole
    is_active: bool
    created_at: datetime


class UserProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, max_length=100)
    current_password: str | None = None
    new_password: str | None = Field(default=None, min_length=6, description="New password must be at least 6 characters")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class SendOtpRequest(BaseModel):
    email: EmailStr


class SendOtpResponse(BaseModel):
    message: str
    email: str
    expire_minutes: int
    dev_otp: str | None = None  # Included in debug mode or when SMTP is mock for seamless dev/testing


class VerifyRegisterOtp(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6, description="6-digit verification code")
    password: str = Field(min_length=6, description="Password must be at least 6 characters")
    full_name: str | None = Field(default=None, max_length=100)


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6, description="6-digit verification code")
    new_password: str = Field(min_length=6, description="New password must be at least 6 characters")


class MessageResponse(BaseModel):
    message: str
    success: bool = True

