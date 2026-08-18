from collections import defaultdict
from datetime import UTC, date, datetime
from decimal import Decimal
from uuid import UUID, uuid4

from app.repositories.base import ExpenseRepository
from app.schemas.expense import ExpenseCategory, ExpenseCreate, ExpenseUpdate

# Default user for Phase 1 (no auth yet)
DEFAULT_USER_ID = UUID("00000000-0000-0000-0000-000000000001")


def _seed_expenses() -> list[dict]:
    now = datetime.now(UTC)
    return [
        {
            "id": UUID("11111111-1111-1111-1111-111111111111"),
            "amount": Decimal("45.50"),
            "description": "Grocery shopping at Whole Foods",
            "category": ExpenseCategory.FOOD,
            "date": date(2026, 8, 15),
            "user_id": DEFAULT_USER_ID,
            "created_at": now,
            "updated_at": now,
        },
        {
            "id": UUID("22222222-2222-2222-2222-222222222222"),
            "amount": Decimal("12.00"),
            "description": "Uber ride to office",
            "category": ExpenseCategory.TRANSPORT,
            "date": date(2026, 8, 16),
            "user_id": DEFAULT_USER_ID,
            "created_at": now,
            "updated_at": now,
        },
        {
            "id": UUID("33333333-3333-3333-3333-333333333333"),
            "amount": Decimal("89.99"),
            "description": "Netflix + Spotify subscription",
            "category": ExpenseCategory.ENTERTAINMENT,
            "date": date(2026, 8, 1),
            "user_id": DEFAULT_USER_ID,
            "created_at": now,
            "updated_at": now,
        },
        {
            "id": UUID("44444444-4444-4444-4444-444444444444"),
            "amount": Decimal("250.00"),
            "description": "Electricity bill",
            "category": ExpenseCategory.BILLS,
            "date": date(2026, 8, 10),
            "user_id": DEFAULT_USER_ID,
            "created_at": now,
            "updated_at": now,
        },
        {
            "id": UUID("55555555-5555-5555-5555-555555555555"),
            "amount": Decimal("35.00"),
            "description": "Coffee with friends",
            "category": ExpenseCategory.FOOD,
            "date": date(2026, 8, 17),
            "user_id": DEFAULT_USER_ID,
            "created_at": now,
            "updated_at": now,
        },
    ]


class InMemoryExpenseRepository(ExpenseRepository):
    def __init__(self) -> None:
        self._store: list[dict] = _seed_expenses()

    def list_expenses(
        self,
        *,
        user_id: UUID | None = None,
        category: ExpenseCategory | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> list[dict]:
        results = self._store

        if user_id is not None:
            results = [e for e in results if e["user_id"] == user_id]

        if category is not None:
            results = [e for e in results if e["category"] == category]

        if start_date is not None:
            results = [e for e in results if e["date"] >= start_date]

        if end_date is not None:
            results = [e for e in results if e["date"] <= end_date]

        return sorted(results, key=lambda e: e["date"], reverse=True)

    def get_expense(self, expense_id: UUID) -> dict | None:
        for expense in self._store:
            if expense["id"] == expense_id:
                return expense
        return None

    def create_expense(self, data: ExpenseCreate, user_id: UUID) -> dict:
        now = datetime.now(UTC)
        expense = {
            "id": uuid4(),
            "amount": data.amount,
            "description": data.description,
            "category": data.category,
            "date": data.date,
            "user_id": user_id,
            "created_at": now,
            "updated_at": now,
        }
        self._store.append(expense)
        return expense

    def update_expense(self, expense_id: UUID, data: ExpenseUpdate) -> dict | None:
        expense = self.get_expense(expense_id)
        if expense is None:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            expense[key] = value
        expense["updated_at"] = datetime.now(UTC)
        return expense

    def delete_expense(self, expense_id: UUID) -> bool:
        for i, expense in enumerate(self._store):
            if expense["id"] == expense_id:
                self._store.pop(i)
                return True
        return False

    def get_summary(
        self,
        *,
        user_id: UUID | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> dict:
        expenses = self.list_expenses(
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
        )

        by_category: dict[ExpenseCategory, dict] = defaultdict(
            lambda: {"total": Decimal("0"), "count": 0}
        )
        total_amount = Decimal("0")

        for expense in expenses:
            cat = expense["category"]
            by_category[cat]["total"] += expense["amount"]
            by_category[cat]["count"] += 1
            total_amount += expense["amount"]

        return {
            "total_amount": total_amount,
            "expense_count": len(expenses),
            "by_category": [
                {"category": cat, "total": data["total"], "count": data["count"]}
                for cat, data in sorted(by_category.items(), key=lambda x: x[1]["total"], reverse=True)
            ],
            "period_start": start_date,
            "period_end": end_date,
        }


# Singleton for Phase 1
expense_repository = InMemoryExpenseRepository()
