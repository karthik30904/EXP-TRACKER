import unittest
from uuid import UUID

from fastapi import HTTPException

from app.schemas.auth import AuthUser, UserCreate, UserLogin
from app.main import health_check
from app.repositories.memory import InMemoryExpenseRepository
from app.repositories.users import InMemoryUserRepository
from app.schemas.expense import ExpenseCategory, ExpenseCreate, ExpenseUpdate
from app.services.auth import AuthService
from app.services.expense import ExpenseService, expense_service


class ExpenseTrackerBackendTests(unittest.TestCase):
    def setUp(self) -> None:
        self.repository = InMemoryExpenseRepository()
        self.user_repository = InMemoryUserRepository()
        self.service = ExpenseService(self.repository)
        self.auth_service = AuthService(self.user_repository)
        expense_service.repository = self.repository

    def test_health_check_reports_healthy(self) -> None:
        self.assertEqual(
            health_check(),
            {"status": "healthy", "storage": "memory", "database_ready": False},
        )

    def test_seed_expenses_are_listed_newest_first(self) -> None:
        expenses = self.service.list_expenses()
        self.assertEqual(len(expenses), 5)
        self.assertEqual(expenses[0].description, "Coffee with friends")

    def test_create_update_get_and_delete_expense(self) -> None:
        created = self.service.create_expense(
            ExpenseCreate(
                amount="25.00",
                description="Team lunch",
                category=ExpenseCategory.FOOD,
                date="2026-08-19",
            )
        )
        expense_id = created.id
        self.assertIsInstance(expense_id, UUID)
        self.assertEqual(created.description, "Team lunch")

        fetched = self.service.get_expense(expense_id)
        self.assertEqual(fetched.id, expense_id)

        updated = self.service.update_expense(
            expense_id,
            ExpenseUpdate(description="Updated team lunch"),
        )
        self.assertEqual(updated.description, "Updated team lunch")

        self.service.delete_expense(expense_id)

        with self.assertRaises(HTTPException) as ctx:
            self.service.get_expense(expense_id)

        self.assertEqual(ctx.exception.status_code, 404)

    def test_summary_reflects_new_expense(self) -> None:
        self.service.create_expense(
            ExpenseCreate(
                amount="300.00",
                description="Quarterly supplies",
                category=ExpenseCategory.SHOPPING,
                date="2026-08-19",
            )
        )

        summary = self.service.get_summary()
        self.assertEqual(summary.expense_count, 6)
        self.assertEqual(summary.by_category[0].category, ExpenseCategory.SHOPPING)

    def test_login_returns_token_for_seeded_user(self) -> None:
        result = self.auth_service.login(UserLogin(email="user@example.com", password="User123!"))

        self.assertEqual(result.user.email, "user@example.com")
        self.assertEqual(result.user.role.value, "user")
        self.assertTrue(result.access_token)

    def test_rbac_blocks_cross_user_access(self) -> None:
        registered = self.auth_service.register(
            UserCreate(email="guest@example.com", full_name="Guest User", password="Guestpass123!")
        )
        guest_user = AuthUser.model_validate(registered.user.model_dump())
        admin_user = AuthUser.model_validate(self.user_repository.get_user_by_email("admin@example.com"))
        other_user = AuthUser.model_validate(self.user_repository.get_user_by_email("user@example.com"))

        created = self.service.create_expense(
            ExpenseCreate(
                amount="42.00",
                description="Guest lunch",
                category=ExpenseCategory.FOOD,
                date="2026-08-19",
            ),
            current_user=guest_user,
        )

        self.assertEqual(self.service.get_expense(created.id, current_user=admin_user).id, created.id)

        with self.assertRaises(HTTPException) as ctx:
            self.service.get_expense(created.id, current_user=other_user)

        self.assertEqual(ctx.exception.status_code, 403)


if __name__ == "__main__":
    unittest.main()
