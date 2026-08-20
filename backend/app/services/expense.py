from datetime import date
from uuid import UUID

from fastapi import HTTPException, status

from app.repositories.base import ExpenseRepository
from app.repositories.factory import expense_repository
from app.repositories.seed_data import DEFAULT_USER_ID
from app.schemas.auth import AuthUser, UserRole
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

    def _resolve_user_scope(
        self,
        *,
        current_user: AuthUser | None = None,
        user_id: UUID | None = None,
    ) -> UUID | None:
        if current_user is None:
            return user_id
        if current_user.role == UserRole.ADMIN:
            return None
        return current_user.id

    def _assert_can_access(
        self,
        expense: dict,
        *,
        current_user: AuthUser | None = None,
    ) -> None:
        if current_user is None or current_user.role == UserRole.ADMIN:
            return
        if expense["user_id"] != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this expense",
            )

    def list_expenses(
        self,
        *,
        current_user: AuthUser | None = None,
        user_id: UUID | None = None,
        category: ExpenseCategory | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> list[ExpenseResponse]:
        scope_user_id = self._resolve_user_scope(current_user=current_user, user_id=user_id)
        expenses = self.repository.list_expenses(
            user_id=scope_user_id,
            category=category,
            start_date=start_date,
            end_date=end_date,
        )
        return [ExpenseResponse.model_validate(e) for e in expenses]

    def get_expense(self, expense_id: UUID, *, current_user: AuthUser | None = None) -> ExpenseResponse:
        expense = self.repository.get_expense(expense_id)
        if expense is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Expense {expense_id} not found",
            )
        self._assert_can_access(expense, current_user=current_user)
        return ExpenseResponse.model_validate(expense)

    def create_expense(
        self,
        data: ExpenseCreate,
        *,
        current_user: AuthUser | None = None,
        user_id: UUID | None = None,
    ) -> ExpenseResponse:
        resolved_user_id = current_user.id if current_user is not None else user_id or DEFAULT_USER_ID
        expense = self.repository.create_expense(data, resolved_user_id)
        return ExpenseResponse.model_validate(expense)

    def update_expense(
        self,
        expense_id: UUID,
        data: ExpenseUpdate,
        *,
        current_user: AuthUser | None = None,
    ) -> ExpenseResponse:
        existing = self.repository.get_expense(expense_id)
        if existing is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Expense {expense_id} not found",
            )
        self._assert_can_access(existing, current_user=current_user)
        expense = self.repository.update_expense(expense_id, data)
        if expense is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Expense {expense_id} not found",
            )
        return ExpenseResponse.model_validate(expense)

    def delete_expense(self, expense_id: UUID, *, current_user: AuthUser | None = None) -> None:
        existing = self.repository.get_expense(expense_id)
        if existing is not None:
            self._assert_can_access(existing, current_user=current_user)
        deleted = self.repository.delete_expense(expense_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Expense {expense_id} not found",
            )

    def get_summary(
        self,
        *,
        current_user: AuthUser | None = None,
        user_id: UUID | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> SummaryResponse:
        scope_user_id = self._resolve_user_scope(current_user=current_user, user_id=user_id)
        summary = self.repository.get_summary(
            user_id=scope_user_id,
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
