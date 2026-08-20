from __future__ import annotations

from datetime import UTC, date, datetime
from decimal import Decimal
from uuid import UUID

from app.schemas.expense import ExpenseCategory

DEFAULT_USER_ID = UUID("00000000-0000-0000-0000-000000000001")
DEFAULT_ADMIN_ID = UUID("00000000-0000-0000-0000-000000000002")


def get_seed_expenses(now: datetime | None = None) -> list[dict]:
    current_time = now or datetime.now(UTC)
    return [
        {
            "id": UUID("11111111-1111-1111-1111-111111111111"),
            "amount": Decimal("45.50"),
            "description": "Grocery shopping at Whole Foods",
            "category": ExpenseCategory.FOOD,
            "date": date(2026, 8, 15),
            "user_id": DEFAULT_USER_ID,
            "created_at": current_time,
            "updated_at": current_time,
        },
        {
            "id": UUID("22222222-2222-2222-2222-222222222222"),
            "amount": Decimal("12.00"),
            "description": "Uber ride to office",
            "category": ExpenseCategory.TRANSPORT,
            "date": date(2026, 8, 16),
            "user_id": DEFAULT_USER_ID,
            "created_at": current_time,
            "updated_at": current_time,
        },
        {
            "id": UUID("33333333-3333-3333-3333-333333333333"),
            "amount": Decimal("89.99"),
            "description": "Netflix + Spotify subscription",
            "category": ExpenseCategory.ENTERTAINMENT,
            "date": date(2026, 8, 1),
            "user_id": DEFAULT_USER_ID,
            "created_at": current_time,
            "updated_at": current_time,
        },
        {
            "id": UUID("44444444-4444-4444-4444-444444444444"),
            "amount": Decimal("250.00"),
            "description": "Electricity bill",
            "category": ExpenseCategory.BILLS,
            "date": date(2026, 8, 10),
            "user_id": DEFAULT_USER_ID,
            "created_at": current_time,
            "updated_at": current_time,
        },
        {
            "id": UUID("55555555-5555-5555-5555-555555555555"),
            "amount": Decimal("35.00"),
            "description": "Coffee with friends",
            "category": ExpenseCategory.FOOD,
            "date": date(2026, 8, 17),
            "user_id": DEFAULT_USER_ID,
            "created_at": current_time,
            "updated_at": current_time,
        },
    ]


def get_demo_account_specs() -> list[dict[str, str]]:
    return [
        {
            "id": str(DEFAULT_ADMIN_ID),
            "email": "admin@example.com",
            "full_name": "Admin User",
            "password": "Admin123!",
            "role": "admin",
        },
        {
            "id": str(DEFAULT_USER_ID),
            "email": "user@example.com",
            "full_name": "Demo User",
            "password": "User123!",
            "role": "user",
        },
    ]
