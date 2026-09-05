"""Seed the database with sample users and expenses.

Run with:
    uv run python seed_db.py

Safe to run repeatedly: it only inserts when records are missing.
"""
from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import get_engine, get_session_factory
from app.models.expense import Base, Expense
from app.models.user import User
from app.repositories.seed_data import DEFAULT_ADMIN_ID, DEFAULT_USER_ID, get_seed_expenses
from app.schemas.auth import UserRole



def seed() -> None:
    if not settings.database_url:
        raise SystemExit("DATABASE_URL is not set; cannot seed the database.")

    engine = get_engine()
    if engine is not None:
        Base.metadata.create_all(bind=engine)

    session_factory = get_session_factory()
    if session_factory is None:
        raise SystemExit("Database session is not available (check DATABASE_URL).")

    now = datetime.now(UTC)
    with session_factory() as session:
        # 1. Seed Demo User
        existing_user = session.query(User).filter(User.email == "user@example.com").first()
        if existing_user is None:
            demo_user = User(
                id=str(DEFAULT_USER_ID),
                email="user@example.com",
                hashed_password=hash_password("User123!"),
                full_name="Demo User",
                role=UserRole.USER,
                is_active=True,
                created_at=now,
                updated_at=now,
            )
            session.add(demo_user)
            print("Seeded demo user: user@example.com (Password: User123!)")

        # 2. Seed Demo Admin
        existing_admin = session.query(User).filter(User.email == "admin@example.com").first()
        if existing_admin is None:
            demo_admin = User(
                id=str(DEFAULT_ADMIN_ID),
                email="admin@example.com",
                hashed_password=hash_password("Admin123!"),
                full_name="Demo Admin",
                role=UserRole.ADMIN,
                is_active=True,
                created_at=now,
                updated_at=now,
            )
            session.add(demo_admin)
            print("Seeded demo admin: admin@example.com (Password: Admin123!)")

        # 3. Seed Expenses if empty
        from sqlalchemy import text
        try:
            exp_count = session.execute(text("SELECT count(*) FROM expenses")).scalar() or 0
            if exp_count == 0:
                seeds = get_seed_expenses(now)
                for item in seeds:
                    session.add(
                        Expense(
                            id=str(item["id"]),
                            amount=item["amount"],
                            description=item["description"],
                            category=item["category"],
                            date=item["date"],
                            user_id=str(DEFAULT_USER_ID),
                            created_at=now,
                            updated_at=now,
                        )
                    )
                print(f"Seeded {len(seeds)} sample expenses into the database.")
        except Exception as e:
            print(f"Expenses table check/seed notice: {e}")

        session.commit()
    print("Database seeding completed.")


if __name__ == "__main__":
    seed()
