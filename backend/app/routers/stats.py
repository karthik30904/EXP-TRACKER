from datetime import date

from fastapi import APIRouter, Query

from app.schemas.expense import SummaryResponse
from app.services.expense import expense_service

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/summary", response_model=SummaryResponse)
def get_summary(
    start_date: date | None = Query(default=None, description="Summary start date"),
    end_date: date | None = Query(default=None, description="Summary end date"),
) -> SummaryResponse:
    """Get expense summary with totals and category breakdown."""
    return expense_service.get_summary(start_date=start_date, end_date=end_date)
