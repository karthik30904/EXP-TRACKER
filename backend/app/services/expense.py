from datetime import date
from uuid import UUID

from fastapi import HTTPException, status

from app.repositories.base import ExpenseRepository
from app.repositories.memory import DEFAULT_USER_ID, expense_repository
from app.schemas.expense import (
    CategorySummary,
    ExpenseCategory,
    ExpenseCreate,
    ExpenseResponse,
    ExpenseUpdate,
    SummaryResponse,
)


class ExpenseService:
    def __init__(self, repository: ExpenseRepository) -> None:
        self.repository = repository

    def list_expenses(
        self,
        *,
        user_id: UUID | None = None,
        category: ExpenseCategory | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> list[ExpenseResponse]:
        expenses = self.repository.list_expenses(
            user_id=user_id,
            category=category,
            start_date=start_date,
            end_date=end_date,
        )
        return [ExpenseResponse.model_validate(e) for e in expenses]

    def get_expense(self, expense_id: UUID) -> ExpenseResponse:
        expense = self.repository.get_expense(expense_id)
        if expense is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Expense {expense_id} not found",
            )
        return ExpenseResponse.model_validate(expense)

    def create_expense(self, data: ExpenseCreate, user_id: UUID | None = None) -> ExpenseResponse:
        expense = self.repository.create_expense(data, user_id or DEFAULT_USER_ID)
        return ExpenseResponse.model_validate(expense)

    def update_expense(self, expense_id: UUID, data: ExpenseUpdate) -> ExpenseResponse:
        expense = self.repository.update_expense(expense_id, data)
        if expense is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Expense {expense_id} not found",
            )
        return ExpenseResponse.model_validate(expense)

    def delete_expense(self, expense_id: UUID) -> None:
        deleted = self.repository.delete_expense(expense_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Expense {expense_id} not found",
            )

    def get_summary(
        self,
        *,
        user_id: UUID | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> SummaryResponse:
        summary = self.repository.get_summary(
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
        )
        return SummaryResponse(
            total_amount=summary["total_amount"],
            expense_count=summary["expense_count"],
            by_category=[CategorySummary(**c) for c in summary["by_category"]],
            period_start=summary["period_start"],
            period_end=summary["period_end"],
        )


expense_service = ExpenseService(expense_repository)
