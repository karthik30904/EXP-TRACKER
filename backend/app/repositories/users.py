from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, Callable
from uuid import UUID, uuid4

from app.core.security import hash_password
from app.repositories.seed_data import DEFAULT_ADMIN_ID, DEFAULT_USER_ID, get_demo_account_specs
from app.schemas.auth import UserCreate, UserRole

try:
    from sqlalchemy import select
except ModuleNotFoundError:  # pragma: no cover - optional until dependencies are installed
    select = None  # type: ignore[assignment]

try:
    from app.db.session import get_engine, get_session_factory
    from app.models.user import Base, User
except ModuleNotFoundError:  # pragma: no cover - optional until dependencies are installed
    Base = None  # type: ignore[assignment]
    User = None  # type: ignore[assignment]
    get_engine = None  # type: ignore[assignment]
    get_session_factory = None  # type: ignore[assignment]


def _to_uuid(value: Any) -> UUID:
    return value if isinstance(value, UUID) else UUID(str(value))


class UserRepository:
    def get_user_by_email(self, email: str) -> dict | None:
        raise NotImplementedError

    def get_user_by_id(self, user_id: UUID) -> dict | None:
        raise NotImplementedError

    def create_user(
        self,
        data: UserCreate,
        password_hash: str,
        *,
        role: UserRole = UserRole.USER,
        user_id: UUID | None = None,
    ) -> dict:
        raise NotImplementedError

    def ensure_demo_accounts(self) -> None:
        raise NotImplementedError


class InMemoryUserRepository(UserRepository):
    def __init__(self) -> None:
        now = datetime.now(UTC)
        self._users: list[dict] = [
            {
                "id": DEFAULT_ADMIN_ID,
                "email": "admin@example.com",
                "full_name": "Admin User",
                "password_hash": hash_password("Admin123!"),
                "role": UserRole.ADMIN,
                "created_at": now,
                "updated_at": now,
            },
            {
                "id": DEFAULT_USER_ID,
                "email": "user@example.com",
                "full_name": "Demo User",
                "password_hash": hash_password("User123!"),
                "role": UserRole.USER,
                "created_at": now,
                "updated_at": now,
            },
        ]

    def _find_user(self, predicate: Callable[[dict], bool]) -> dict | None:
        for user in self._users:
            if predicate(user):
                return user
        return None

    def get_user_by_email(self, email: str) -> dict | None:
        return self._find_user(lambda user: user["email"].lower() == email.lower())

    def get_user_by_id(self, user_id: UUID) -> dict | None:
        return self._find_user(lambda user: user["id"] == user_id)

    def create_user(
        self,
        data: UserCreate,
        password_hash: str,
        *,
        role: UserRole = UserRole.USER,
        user_id: UUID | None = None,
    ) -> dict:
        now = datetime.now(UTC)
        user = {
            "id": user_id or uuid4(),
            "email": data.email.lower(),
            "full_name": data.full_name,
            "password_hash": password_hash,
            "role": role,
            "created_at": now,
            "updated_at": now,
        }
        self._users.append(user)
        return user

    def ensure_demo_accounts(self) -> None:
        for account in get_demo_account_specs():
            if self.get_user_by_email(account["email"]) is None:
                self.create_user(
                    UserCreate(
                        email=account["email"],
                        full_name=account["full_name"],
                        password=account["password"],
                    ),
                    hash_password(account["password"]),
                    role=UserRole(account["role"]),
                    user_id=UUID(account["id"]),
                )


class SQLAlchemyUserRepository(UserRepository):
    def __init__(self, database_url: str) -> None:
        self.database_url = database_url
        self._engine = get_engine() if get_engine is not None else None
        self._session_factory = get_session_factory() if get_session_factory is not None else None

    def is_ready(self) -> bool:
        return self._engine is not None and self._session_factory is not None and Base is not None and select is not None

    def _require_ready(self) -> None:
        if not self.is_ready():
            raise RuntimeError("SQLAlchemy user support is not available")

    def _to_model_dict(self, user: Any) -> dict:
        return {
            "id": _to_uuid(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "password_hash": user.password_hash,
            "role": user.role,
            "created_at": user.created_at,
            "updated_at": user.updated_at,
        }

    def get_user_by_email(self, email: str) -> dict | None:
        self._require_ready()
        with self._session_factory() as session:  # type: ignore[operator]
            statement = select(User).where(User.email == email.lower())  # type: ignore[operator]
            user = session.execute(statement).scalars().first()
            return self._to_model_dict(user) if user is not None else None

    def get_user_by_id(self, user_id: UUID) -> dict | None:
        self._require_ready()
        with self._session_factory() as session:  # type: ignore[operator]
            user = session.get(User, str(user_id))
            return self._to_model_dict(user) if user is not None else None

    def create_user(
        self,
        data: UserCreate,
        password_hash: str,
        *,
        role: UserRole = UserRole.USER,
        user_id: UUID | None = None,
    ) -> dict:
        self._require_ready()
        now = datetime.now(UTC)
        user = User(
            id=str(user_id or uuid4()),
            email=data.email.lower(),
            full_name=data.full_name,
            password_hash=password_hash,
            role=role,
            created_at=now,
            updated_at=now,
        )
        with self._session_factory() as session:  # type: ignore[operator]
            session.add(user)
            session.commit()
            session.refresh(user)
            return self._to_model_dict(user)

    def ensure_demo_accounts(self) -> None:
        self._require_ready()
        for account in get_demo_account_specs():
            if self.get_user_by_email(account["email"]) is None:
                self.create_user(
                    UserCreate(
                        email=account["email"],
                        full_name=account["full_name"],
                        password=account["password"],
                    ),
                    hash_password(account["password"]),
                    role=UserRole(account["role"]),
                    user_id=UUID(account["id"]),
                )


def create_sqlalchemy_user_repository(database_url: str) -> SQLAlchemyUserRepository | None:
    repository = SQLAlchemyUserRepository(database_url)
    if not repository.is_ready():
        return None
    return repository


user_repository = InMemoryUserRepository()
