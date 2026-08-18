from abc import ABC, abstractmethod
from datetime import date
from decimal import Decimal
from uuid import UUID

from app.schemas.expense import ExpenseCategory, ExpenseCreate, ExpenseUpdate


class ExpenseRepository(ABC):
    @abstractmethod
    def list_expenses(
        self,
        *,
        user_id: UUID | None = None,
        category: ExpenseCategory | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> list[dict]:
        pass

    @abstractmethod
    def get_expense(self, expense_id: UUID) -> dict | None:
        pass

    @abstractmethod
    def create_expense(self, data: ExpenseCreate, user_id: UUID) -> dict:
        pass

    @abstractmethod
    def update_expense(self, expense_id: UUID, data: ExpenseUpdate) -> dict | None:
        pass

    @abstractmethod
    def delete_expense(self, expense_id: UUID) -> bool:
        pass

    @abstractmethod
    def get_summary(
        self,
        *,
        user_id: UUID | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> dict:
        pass
