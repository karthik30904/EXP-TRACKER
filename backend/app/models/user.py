from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from app.models.expense import Base
from app.schemas.auth import UserRole

try:
    from sqlalchemy import Boolean, DateTime, Enum as SAEnum, String, func
    from sqlalchemy.orm import Mapped, mapped_column
except ModuleNotFoundError:  # pragma: no cover
    Mapped = Any  # type: ignore[misc,assignment]
    mapped_column = None  # type: ignore[assignment]
    Boolean = DateTime = String = SAEnum = func = None  # type: ignore[assignment]


class User(Base):
    __tablename__ = "users"

    id: Mapped[UUID]
    email: Mapped[str]
    hashed_password: Mapped[str]
    full_name: Mapped[str | None]
    role: Mapped[UserRole]
    is_active: Mapped[bool]
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]

    if mapped_column is not None:
        id = mapped_column(String(36), primary_key=True)
        email = mapped_column(String(255), unique=True, index=True, nullable=False)
        hashed_password = mapped_column(String(255), nullable=False)
        full_name = mapped_column(String(100), nullable=True)
        role = mapped_column(SAEnum(UserRole, name="user_role"), nullable=False, default=UserRole.USER)
        is_active = mapped_column(Boolean, nullable=False, default=True)
        created_at = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
        updated_at = mapped_column(
            DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
        )
