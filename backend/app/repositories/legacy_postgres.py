"""Adapter for the user's pre-existing `expenses` table.

The legacy table has integer IDs and a `transaction_date` timestamp instead of
the Phase 2 schema.
"""
from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID, NAMESPACE_URL, uuid5

from sqlalchemy import text

from app.db.session import get_session_factory
from app.repositories.memory import DEFAULT_USER_ID
from app.schemas.expense import ExpenseCategory, ExpenseCreate, ExpenseUpdate


def _to_uuid(value: Any) -> UUID:
    return value if isinstance(value, UUID) else UUID(str(value))


def _api_id(database_id: int) -> UUID:
    return uuid5(NAMESPACE_URL, f"expense-tracker-legacy/{database_id}")


def _category(value: str) -> ExpenseCategory:
    normalized = value.strip().lower()
    if "food" in normalized or "grocery" in normalized:
        return ExpenseCategory.FOOD
    if "transport" in normalized or "taxi" in normalized:
        return ExpenseCategory.TRANSPORT
    if "entertain" in normalized:
        return ExpenseCategory.ENTERTAINMENT
    if "shop" in normalized or "accessor" in normalized:
        return ExpenseCategory.SHOPPING
    if "utilit" in normalized or "bill" in normalized:
        return ExpenseCategory.BILLS
    if "health" in normalized:
        return ExpenseCategory.HEALTH
    return ExpenseCategory.OTHER


class LegacyPostgresExpenseRepository:
    def __init__(self) -> None:
        self._init_schema()

    def _session(self):
        session_factory = get_session_factory()
        if session_factory is None:
            raise RuntimeError("Database session is not available")
        return session_factory()

    def _init_schema(self) -> None:
        try:
            with self._session() as session:
                session.execute(
                    text("ALTER TABLE expenses ADD COLUMN IF NOT EXISTS user_id VARCHAR(36) DEFAULT '00000000-0000-0000-0000-000000000001'")
                )
                session.commit()
        except Exception:
            pass

    def _rows(self) -> list[dict]:
        with self._session() as session:
            rows = session.execute(
                text("SELECT id, amount, description, category, transaction_date, user_id FROM expenses ORDER BY transaction_date DESC, id DESC")
            ).mappings()
            return [self._to_expense(dict(row)) for row in rows]

    def _database_id(self, expense_id: UUID) -> int | None:
        with self._session() as session:
            rows = session.execute(text("SELECT id FROM expenses")).mappings()
            return next((row["id"] for row in rows if _api_id(row["id"]) == expense_id), None)

    @staticmethod
    def _to_expense(row: dict) -> dict:
        transaction_date = row["transaction_date"]
        occurred_at = transaction_date if isinstance(transaction_date, datetime) else datetime.combine(transaction_date, datetime.min.time())
        raw_user_id = row.get("user_id") or DEFAULT_USER_ID
        return {
            "id": _api_id(row["id"]),
            "amount": Decimal(row["amount"]),
            "description": row["description"] or "Untitled expense",
            "category": _category(row["category"]),
            "date": occurred_at.date(),
            "user_id": _to_uuid(raw_user_id),
            "created_at": occurred_at,
            "updated_at": occurred_at,
        }

    def list_expenses(
        self,
        *,
        user_id: UUID | None = None,
        category: ExpenseCategory | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> list[dict]:
        rows = self._rows()
        if user_id is not None:
            norm_uid = _to_uuid(user_id)
            rows = [row for row in rows if row["user_id"] == norm_uid]
        if category is not None:
            rows = [row for row in rows if row["category"] == category]
        if start_date is not None:
            rows = [row for row in rows if row["date"] >= start_date]
        if end_date is not None:
            rows = [row for row in rows if row["date"] <= end_date]
        return rows

    def get_expense(self, expense_id: UUID) -> dict | None:
        return next((row for row in self._rows() if row["id"] == expense_id), None)

    def create_expense(self, data: ExpenseCreate, user_id: UUID) -> dict:
        with self._session() as session:
            row = session.execute(
                text(
                    "INSERT INTO expenses (amount, description, category, transaction_date, user_id) "
                    "VALUES (:amount, :description, :category, :transaction_date, :user_id) "
                    "RETURNING id, amount, description, category, transaction_date, user_id"
                ),
                {
                    "amount": data.amount,
                    "description": data.description,
                    "category": data.category.value,
                    "transaction_date": data.date,
                    "user_id": str(user_id),
                },
            ).mappings().one()
            session.commit()
            return self._to_expense(dict(row))

    def update_expense(self, expense_id: UUID, data: ExpenseUpdate) -> dict | None:
        database_id = self._database_id(expense_id)
        if database_id is None:
            return None
        values = data.model_dump(exclude_unset=True)
        if not values:
            return self.get_expense(expense_id)
        if "category" in values:
            values["category"] = values["category"].value
        if "date" in values:
            values["transaction_date"] = values.pop("date")
        assignments = ", ".join(f"{column} = :{column}" for column in values)
        values["id"] = database_id
        with self._session() as session:
            row = session.execute(
                text(
                    f"UPDATE expenses SET {assignments} WHERE id = :id "
                    "RETURNING id, amount, description, category, transaction_date, user_id"
                ),
                values,
            ).mappings().one_or_none()
            session.commit()
            return self._to_expense(dict(row)) if row is not None else None

    def delete_expense(self, expense_id: UUID) -> bool:
        database_id = self._database_id(expense_id)
        if database_id is None:
            return False
        with self._session() as session:
            result = session.execute(text("DELETE FROM expenses WHERE id = :id"), {"id": database_id})
            session.commit()
            return result.rowcount == 1

    def get_summary(
        self,
        *,
        user_id: UUID | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> dict:
        rows = self.list_expenses(user_id=user_id, start_date=start_date, end_date=end_date)
        by_category: dict[ExpenseCategory, dict] = defaultdict(lambda: {"total": Decimal("0"), "count": 0})
        for row in rows:
            by_category[row["category"]]["total"] += row["amount"]
            by_category[row["category"]]["count"] += 1
        return {
            "total_amount": sum((row["amount"] for row in rows), Decimal("0")),
            "expense_count": len(rows),
            "by_category": [
                {"category": category, "total": values["total"], "count": values["count"]}
                for category, values in sorted(by_category.items(), key=lambda item: item[1]["total"], reverse=True)
            ],
            "period_start": start_date,
            "period_end": end_date,
        }
