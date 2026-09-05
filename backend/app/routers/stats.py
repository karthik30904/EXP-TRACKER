from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from decimal import Decimal

from app.deps import get_current_user
from app.schemas.auth import UserResponse
from app.schemas.expense import InsightsResponse, SummaryResponse
from app.services.expense import expense_service
from app.services.insights import insights_service

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/summary", response_model=SummaryResponse)
def get_summary(
    start_date: date | None = Query(default=None, description="Summary start date"),
    end_date: date | None = Query(default=None, description="Summary end date"),
    user_id: UUID | None = Query(default=None, description="Filter by user ID (Admin only)"),
    current_user: UserResponse = Depends(get_current_user),
) -> SummaryResponse:
    """Get expense summary with totals and category breakdown for the current user (or all/filtered for admins)."""
    return expense_service.get_summary(
        current_user=current_user,
        user_id=user_id,
        start_date=start_date,
        end_date=end_date,
    )


@router.get("/insights", response_model=InsightsResponse)
def get_insights(
    monthly_budget: Decimal = Query(default=Decimal("50000.00"), description="Monthly target budget limit"),
    user_id: UUID | None = Query(default=None, description="Filter by user ID (Admin only)"),
    current_user: UserResponse = Depends(get_current_user),
) -> InsightsResponse:
    """Get AI-driven smart financial insights, safe daily spend, projections, and recommendations."""
    expenses = expense_service.list_expenses(current_user=current_user, user_id=user_id)
    return insights_service.analyze(expenses=expenses, monthly_budget=monthly_budget)

