from __future__ import annotations

from collections import defaultdict
from datetime import UTC, date, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID, uuid4

from app.repositories.seed_data import get_seed_expenses
from app.schemas.expense import ExpenseCategory, ExpenseCreate, ExpenseUpdate

try:
    from sqlalchemy import select
except ModuleNotFoundError:  # pragma: no cover - optional until dependencies are installed
    select = None  # type: ignore[assignment]

try:
    from app.db.session import get_engine, get_session_factory
    from app.models.expense import Base, Expense
except ModuleNotFoundError:  # pragma: no cover - optional until dependencies are installed
    Base = None  # type: ignore[assignment]
    Expense = None  # type: ignore[assignment]
    get_engine = None  # type: ignore[assignment]
    get_session_factory = None  # type: ignore[assignment]


def _to_uuid(value: Any) -> UUID:
    return value if isinstance(value, UUID) else UUID(str(value))


class SQLAlchemyExpenseRepository:
    def __init__(self, database_url: str) -> None:
        self.database_url = database_url
        self._engine = get_engine() if get_engine is not None else None
        self._session_factory = get_session_factory() if get_session_factory is not None else None

    def is_ready(self) -> bool:
        return (
            self._engine is not None
            and self._session_factory is not None
            and Base is not None
            and select is not None
        )

    def _require_ready(self) -> None:
        if not self.is_ready():
            raise RuntimeError("SQLAlchemy database support is not available")

    def _to_model_dict(self, expense: Any) -> dict:
        return {
            "id": _to_uuid(expense.id),
            "amount": expense.amount,
            "description": expense.description,
            "category": expense.category,
            "date": expense.date,
            "user_id": _to_uuid(expense.user_id),
            "created_at": expense.created_at,
            "updated_at": expense.updated_at,
        }

    def list_expenses(
        self,
        *,
        user_id: UUID | None = None,
        category: ExpenseCategory | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> list[dict]:
        self._require_ready()
        with self._session_factory() as session:  # type: ignore[operator]
            query = select(Expense)  # type: ignore[operator]
            if user_id is not None:
                query = query.where(Expense.user_id == str(user_id))
            if category is not None:
                query = query.where(Expense.category == category)
            if start_date is not None:
                query = query.where(Expense.date >= start_date)
            if end_date is not None:
                query = query.where(Expense.date <= end_date)
            query = query.order_by(Expense.date.desc())
            results = session.execute(query).scalars().all()
            return [self._to_model_dict(expense) for expense in results]

    def get_expense(self, expense_id: UUID) -> dict | None:
        self._require_ready()
        with self._session_factory() as session:  # type: ignore[operator]
            expense = session.get(Expense, str(expense_id))
            return self._to_model_dict(expense) if expense is not None else None

    def create_expense(self, data: ExpenseCreate, user_id: UUID) -> dict:
        self._require_ready()
        now = datetime.now(UTC)
        expense = Expense(
            id=str(uuid4()),
            amount=data.amount,
            description=data.description,
            category=data.category,
            date=data.date,
            user_id=str(user_id),
            created_at=now,
            updated_at=now,
        )
        with self._session_factory() as session:  # type: ignore[operator]
            session.add(expense)
            session.commit()
            session.refresh(expense)
            return self._to_model_dict(expense)

    def update_expense(self, expense_id: UUID, data: ExpenseUpdate) -> dict | None:
        self._require_ready()
        update_data = data.model_dump(exclude_unset=True)
        with self._session_factory() as session:  # type: ignore[operator]
            expense = session.get(Expense, str(expense_id))
            if expense is None:
                return None
            for key, value in update_data.items():
                setattr(expense, key, value)
            expense.updated_at = datetime.now(UTC)
            session.commit()
            session.refresh(expense)
            return self._to_model_dict(expense)

    def delete_expense(self, expense_id: UUID) -> bool:
        self._require_ready()
        with self._session_factory() as session:  # type: ignore[operator]
            expense = session.get(Expense, str(expense_id))
            if expense is None:
                return False
            session.delete(expense)
            session.commit()
            return True

    def get_summary(
        self,
        *,
        user_id: UUID | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> dict:
        expenses = self.list_expenses(user_id=user_id, start_date=start_date, end_date=end_date)
        by_category: dict[ExpenseCategory, dict] = defaultdict(
            lambda: {"total": Decimal("0"), "count": 0}
        )
        total_amount = Decimal("0")

        for expense in expenses:
            category = expense["category"]
            by_category[category]["total"] += expense["amount"]
            by_category[category]["count"] += 1
            total_amount += expense["amount"]

        return {
            "total_amount": total_amount,
            "expense_count": len(expenses),
            "by_category": [
                {"category": category, "total": data["total"], "count": data["count"]}
                for category, data in sorted(by_category.items(), key=lambda item: item[1]["total"], reverse=True)
            ],
            "period_start": start_date,
            "period_end": end_date,
        }

    def ensure_seed_expenses(self) -> None:
        self._require_ready()
        with self._session_factory() as session:  # type: ignore[operator]
            existing = session.execute(select(Expense.id).limit(1)).first()
            if existing is not None:
                return

            for seed_expense in get_seed_expenses():
                session.add(
                    Expense(
                        id=str(seed_expense["id"]),
                        amount=seed_expense["amount"],
                        description=seed_expense["description"],
                        category=seed_expense["category"],
                        date=seed_expense["date"],
                        user_id=str(seed_expense["user_id"]),
                        created_at=seed_expense["created_at"],
                        updated_at=seed_expense["updated_at"],
                    )
                )
            session.commit()


def create_sqlalchemy_repository(database_url: str) -> SQLAlchemyExpenseRepository | None:
    repository = SQLAlchemyExpenseRepository(database_url)
    if not repository.is_ready():
        return None
    return repository
