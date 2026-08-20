"""Create users table and link expenses to owners.

Revision ID: 0002_phase3_users_and_rbac
Revises: 0001_phase2_initial_expenses
Create Date: 2026-08-20
"""

from alembic import op
import sqlalchemy as sa
from datetime import UTC, datetime

from app.core.security import hash_password
from app.repositories.seed_data import DEFAULT_ADMIN_ID, DEFAULT_USER_ID

revision = "0002_phase3_users_and_rbac"
down_revision = "0001_phase2_initial_expenses"
branch_labels = None
depends_on = None


def upgrade() -> None:
    user_role = sa.Enum("user", "admin", name="user_role")
    user_role.create(op.get_bind(), checkfirst=True)
    seed_now = datetime.now(UTC)

    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False, unique=True),
        sa.Column("full_name", sa.String(length=120), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", user_role, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.bulk_insert(
        sa.table(
            "users",
            sa.column("id", sa.String(length=36)),
            sa.column("email", sa.String(length=255)),
            sa.column("full_name", sa.String(length=120)),
            sa.column("password_hash", sa.String(length=255)),
            sa.column("role", user_role),
            sa.column("created_at", sa.DateTime(timezone=True)),
            sa.column("updated_at", sa.DateTime(timezone=True)),
        ),
        [
            {
                "id": str(DEFAULT_ADMIN_ID),
                "email": "admin@example.com",
                "full_name": "Admin User",
                "password_hash": hash_password("Admin123!"),
                "role": "admin",
                "created_at": seed_now,
                "updated_at": seed_now,
            },
            {
                "id": str(DEFAULT_USER_ID),
                "email": "user@example.com",
                "full_name": "Demo User",
                "password_hash": hash_password("User123!"),
                "role": "user",
                "created_at": seed_now,
                "updated_at": seed_now,
            },
        ],
    )

    op.create_foreign_key(
        "fk_expenses_user_id_users",
        "expenses",
        "users",
        ["user_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_expenses_user_id_users", "expenses", type_="foreignkey")
    op.drop_table("users")
    op.execute("DROP TYPE IF EXISTS user_role")
