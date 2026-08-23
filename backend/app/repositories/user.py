from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

from app.core.config import settings
from app.core.logging import get_logger
from app.core.security import hash_password
from app.schemas.auth import UserRole

logger = get_logger(__name__)

DEFAULT_USER_ID = UUID("00000000-0000-0000-0000-000000000001")
DEFAULT_ADMIN_ID = UUID("00000000-0000-0000-0000-000000000002")


def _to_uuid(value: Any) -> UUID:
    return value if isinstance(value, UUID) else UUID(str(value))


class MemoryUserRepository:
    def __init__(self) -> None:
        self._users: dict[UUID, dict] = {}
        self._seed()

    def _seed(self) -> None:
        now = datetime.now(UTC)
        user = {
            "id": DEFAULT_USER_ID,
            "email": "user@example.com",
            "hashed_password": hash_password("User123!"),
            "full_name": "Demo User",
            "role": UserRole.USER,
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        }
        admin = {
            "id": DEFAULT_ADMIN_ID,
            "email": "admin@example.com",
            "hashed_password": hash_password("Admin123!"),
            "full_name": "Demo Admin",
            "role": UserRole.ADMIN,
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        }
        self._users[DEFAULT_USER_ID] = user
        self._users[DEFAULT_ADMIN_ID] = admin

    def create_user(
        self,
        *,
        email: str,
        hashed_password: str,
        full_name: str | None = None,
        role: UserRole = UserRole.USER,
    ) -> dict:
        now = datetime.now(UTC)
        user_id = uuid4()
        user = {
            "id": user_id,
            "email": email.strip().lower(),
            "hashed_password": hashed_password,
            "full_name": full_name,
            "role": role,
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        }
        self._users[user_id] = user
        return user.copy()

    def get_by_email(self, email: str) -> dict | None:
        norm = email.strip().lower()
        for user in self._users.values():
            if user["email"].lower() == norm:
                return user.copy()
        return None

    def get_by_id(self, user_id: UUID) -> dict | None:
        user = self._users.get(_to_uuid(user_id))
        return user.copy() if user else None

    def list_users(self) -> list[dict]:
        return [user.copy() for user in self._users.values()]


class SQLAlchemyUserRepository:
    def __init__(self, database_url: str) -> None:
        self.database_url = database_url

    def _get_session(self):
        from app.db.session import get_session_factory
        factory = get_session_factory()
        if factory is None:
            raise RuntimeError("Database session factory is not available")
        return factory()

    def _to_dict(self, user_obj: Any) -> dict:
        return {
            "id": _to_uuid(user_obj.id),
            "email": user_obj.email,
            "hashed_password": user_obj.hashed_password,
            "full_name": user_obj.full_name,
            "role": UserRole(user_obj.role) if isinstance(user_obj.role, str) else user_obj.role,
            "is_active": user_obj.is_active,
            "created_at": user_obj.created_at,
            "updated_at": user_obj.updated_at,
        }

    def create_user(
        self,
        *,
        email: str,
        hashed_password: str,
        full_name: str | None = None,
        role: UserRole = UserRole.USER,
    ) -> dict:
        from app.models.user import User

        now = datetime.now(UTC)
        user_id = str(uuid4())
        user = User(
            id=user_id,
            email=email.strip().lower(),
            hashed_password=hashed_password,
            full_name=full_name,
            role=role,
            is_active=True,
            created_at=now,
            updated_at=now,
        )
        with self._get_session() as session:
            session.add(user)
            session.commit()
            session.refresh(user)
            return self._to_dict(user)

    def get_by_email(self, email: str) -> dict | None:
        from sqlalchemy import select
        from app.models.user import User

        norm = email.strip().lower()
        with self._get_session() as session:
            query = select(User).where(User.email == norm)
            user = session.execute(query).scalar_one_or_none()
            return self._to_dict(user) if user else None

    def get_by_id(self, user_id: UUID) -> dict | None:
        from app.models.user import User

        with self._get_session() as session:
            user = session.get(User, str(user_id))
            return self._to_dict(user) if user else None

    def list_users(self) -> list[dict]:
        from sqlalchemy import select
        from app.models.user import User

        with self._get_session() as session:
            query = select(User).order_by(User.created_at.asc())
            results = session.execute(query).scalars().all()
            return [self._to_dict(user) for user in results]


memory_user_repository = MemoryUserRepository()


def get_user_repository():
    if settings.use_database and settings.database_url:
        try:
            from app.db.session import database_ready
            if database_ready():
                return SQLAlchemyUserRepository(settings.database_url)
        except Exception:
            logger.warning("user_database_unavailable_falling_back_to_memory")
    return memory_user_repository


user_repository = get_user_repository()
