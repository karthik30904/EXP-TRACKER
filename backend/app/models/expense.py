from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from app.schemas.expense import ExpenseCategory

try:
    from sqlalchemy import Date, DateTime, Enum as SAEnum, Numeric, String, func
    from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
except ModuleNotFoundError:  # pragma: no cover - optional until dependencies are installed
    DeclarativeBase = object  # type: ignore[misc,assignment]
    Mapped = Any  # type: ignore[misc,assignment]
    mapped_column = None  # type: ignore[assignment]
    Date = DateTime = Numeric = String = SAEnum = func = None  # type: ignore[assignment]


class Base(DeclarativeBase):  # type: ignore[misc]
    pass


class Expense(Base):
    __tablename__ = "expenses"

    id: Mapped[UUID]
    amount: Mapped[Decimal]
    description: Mapped[str]
    category: Mapped[ExpenseCategory]
    date: Mapped[date]
    user_id: Mapped[UUID]
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]

    if mapped_column is not None:
        id = mapped_column(String(36), primary_key=True)
        amount = mapped_column(Numeric(12, 2), nullable=False)
        description = mapped_column(String(500), nullable=False)
        category = mapped_column(SAEnum(ExpenseCategory, name="expense_category"), nullable=False)
        date = mapped_column(Date, nullable=False)
        user_id = mapped_column(String(36), nullable=False, index=True)
        created_at = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
        updated_at = mapped_column(
            DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
        )

