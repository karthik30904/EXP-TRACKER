from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from app.deps import get_current_user
from app.schemas.auth import AuthUser
from app.schemas.expense import ExpenseCategory, ExpenseCreate, ExpenseResponse, ExpenseUpdate
from app.services.expense import expense_service

router = APIRouter(prefix="/expenses", tags=["expenses"])


@router.get("", response_model=list[ExpenseResponse])
def list_expenses(
    current_user: AuthUser = Depends(get_current_user),
    category: ExpenseCategory | None = Query(default=None, description="Filter by category"),
    start_date: date | None = Query(default=None, description="Filter expenses on or after this date"),
    end_date: date | None = Query(default=None, description="Filter expenses on or before this date"),
) -> list[ExpenseResponse]:
    """List all expenses with optional filters."""
    return expense_service.list_expenses(
        current_user=current_user,
        category=category,
        start_date=start_date,
        end_date=end_date,
    )


@router.post("", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_expense(data: ExpenseCreate, current_user: AuthUser = Depends(get_current_user)) -> ExpenseResponse:
    """Create a new expense."""
    return expense_service.create_expense(data, current_user=current_user)


@router.get("/{expense_id}", response_model=ExpenseResponse)
def get_expense(expense_id: UUID, current_user: AuthUser = Depends(get_current_user)) -> ExpenseResponse:
    """Get a single expense by ID."""
    return expense_service.get_expense(expense_id, current_user=current_user)


@router.patch("/{expense_id}", response_model=ExpenseResponse)
def update_expense(
    expense_id: UUID,
    data: ExpenseUpdate,
    current_user: AuthUser = Depends(get_current_user),
) -> ExpenseResponse:
    """Update an existing expense."""
    return expense_service.update_expense(expense_id, data, current_user=current_user)


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(expense_id: UUID, current_user: AuthUser = Depends(get_current_user)) -> None:
    """Delete an expense."""
    expense_service.delete_expense(expense_id, current_user=current_user)
