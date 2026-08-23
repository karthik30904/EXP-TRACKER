from __future__ import annotations

from app.core.config import settings
from app.core.logging import get_logger
from app.repositories.base import ExpenseRepository
from app.repositories.memory import expense_repository as memory_expense_repository

logger = get_logger(__name__)


def _build_database_repository() -> ExpenseRepository | None:
    if not settings.database_url:
        return None

    try:
        from sqlalchemy import inspect
        from app.db.session import get_engine
        from app.repositories.sqlalchemy import create_sqlalchemy_repository
    except ModuleNotFoundError:
        logger.warning("sqlalchemy_unavailable_falling_back_to_memory")
        return None

    engine = get_engine()
    if engine is not None:
        try:
            columns = {column["name"] for column in inspect(engine).get_columns("expenses")}
            if "transaction_date" in columns:
                from app.repositories.legacy_postgres import LegacyPostgresExpenseRepository

                logger.info("using_legacy_expenses_repository")
                return LegacyPostgresExpenseRepository()
        except Exception:
            logger.warning("database_schema_inspection_failed")

    repository = create_sqlalchemy_repository(settings.database_url)
    if repository is None:
        logger.warning("database_repository_unavailable_falling_back_to_memory")
    return repository


def get_expense_repository() -> ExpenseRepository:
    if settings.use_database:
        repository = _build_database_repository()
        if repository is not None:
            return repository
    return memory_expense_repository


expense_repository = get_expense_repository()

