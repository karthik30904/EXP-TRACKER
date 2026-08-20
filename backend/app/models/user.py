from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from app.db.base import Base
from app.schemas.auth import UserRole

try:
    from sqlalchemy import DateTime, Enum as SAEnum, String, func
    from sqlalchemy.orm import Mapped, mapped_column, relationship
except ModuleNotFoundError:  # pragma: no cover - optional until dependencies are installed
    Mapped = Any  # type: ignore[misc,assignment]
    mapped_column = relationship = None  # type: ignore[assignment]
    DateTime = String = SAEnum = func = None  # type: ignore[assignment]


class User(Base):
    __tablename__ = "users"

    id: Mapped[UUID]
    email: Mapped[str]
    full_name: Mapped[str]
    password_hash: Mapped[str]
    role: Mapped[UserRole]
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]

    if mapped_column is not None:
        id = mapped_column(String(36), primary_key=True)
        email = mapped_column(String(255), unique=True, nullable=False, index=True)
        full_name = mapped_column(String(120), nullable=False)
        password_hash = mapped_column(String(255), nullable=False)
        role = mapped_column(SAEnum(UserRole, name="user_role"), nullable=False)
        created_at = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
        updated_at = mapped_column(
            DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
        )

        if relationship is not None:
            expenses = relationship("Expense", back_populates="owner", cascade="all, delete-orphan")
