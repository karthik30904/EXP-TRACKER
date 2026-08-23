"""Create users table for Phase 3 authentication and RBAC.

Revision ID: 0002_phase3_users_and_auth
Revises: 0001_phase2_initial_expenses
Create Date: 2026-08-23
"""

from alembic import op
import sqlalchemy as sa

revision = "0002_phase3_users_and_auth"
down_revision = "0001_phase2_initial_expenses"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("email", sa.String(length=255), unique=True, index=True, nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=100), nullable=True),
        sa.Column(
            "role",
            sa.Enum("user", "admin", name="user_role"),
            nullable=False,
            server_default="user",
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("users")
    sa.Enum(name="user_role").drop(op.get_bind(), checkfirst=False)
