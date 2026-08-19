"""Create the expenses table.

Revision ID: 0001_phase2_initial_expenses
Revises:
Create Date: 2026-08-19
"""

from alembic import op
import sqlalchemy as sa

revision = "0001_phase2_initial_expenses"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "expenses",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=False),
        sa.Column(
            "category",
            sa.Enum(
                "food",
                "transport",
                "entertainment",
                "shopping",
                "bills",
                "health",
                "other",
                name="expense_category",
            ),
            nullable=False,
        ),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False, index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("expenses")
