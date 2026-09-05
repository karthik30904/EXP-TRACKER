from datetime import date as Date
from datetime import datetime
from decimal import Decimal
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ExpenseCategory(str, Enum):
    FOOD = "food"
    TRANSPORT = "transport"
    ENTERTAINMENT = "entertainment"
    SHOPPING = "shopping"
    BILLS = "bills"
    HEALTH = "health"
    OTHER = "other"


class ExpenseCreate(BaseModel):
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    description: str = Field(..., min_length=1, max_length=500)
    category: ExpenseCategory
    date: Date


class ExpenseUpdate(BaseModel):
    amount: Decimal | None = Field(default=None, gt=0, decimal_places=2)
    description: str | None = Field(default=None, min_length=1, max_length=500)
    category: ExpenseCategory | None = None
    date: Date | None = None


class ExpenseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    amount: Decimal
    description: str
    category: ExpenseCategory
    date: Date
    user_id: UUID
    created_at: datetime
    updated_at: datetime


class CategorySummary(BaseModel):
    category: ExpenseCategory
    total: Decimal
    count: int


class SummaryResponse(BaseModel):
    total_amount: Decimal
    expense_count: int
    by_category: list[CategorySummary]
    period_start: Date | None = None
    period_end: Date | None = None


class InsightItem(BaseModel):
    id: str
    type: str  # "warning" | "opportunity" | "positive" | "recurring" | "projection"
    title: str
    description: str
    metric: str | None = None
    category: ExpenseCategory | None = None
    action_label: str | None = None
    action_type: str | None = None


class InsightsResponse(BaseModel):
    safe_daily_spend: Decimal
    projected_month_end_spend: Decimal
    remaining_days: int
    remaining_budget: Decimal
    monthly_budget: Decimal
    burn_rate_status: str  # "optimal" | "high_velocity" | "critical" | "under_budget"
    needs_percent: int
    wants_percent: int
    savings_buffer_percent: int
    recommendations: list[InsightItem]

