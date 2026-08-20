# Backend Core Logic

This backend uses FastAPI, Pydantic, SQLAlchemy, Alembic, and a small repository layer so the API stays stable while storage and auth change underneath it.

## The Tech Stack

- `FastAPI`: HTTP routing, validation, dependency injection, and OpenAPI docs
- `Pydantic`: request and response schemas
- `SQLAlchemy`: ORM layer for PostgreSQL and model mapping
- `Alembic`: schema migrations
- `PostgreSQL`: durable storage
- `structlog`: structured request and error logging
- `JWT`: signed login tokens

## Critical Files

- [`backend/app/main.py`](../backend/app/main.py): app startup, middleware, health check, and router registration
- [`backend/app/routers/expenses.py`](../backend/app/routers/expenses.py): expense CRUD routes
- [`backend/app/routers/stats.py`](../backend/app/routers/stats.py): summary route
- [`backend/app/routers/auth.py`](../backend/app/routers/auth.py): register, login, and `me`
- [`backend/app/services/expense.py`](../backend/app/services/expense.py): business rules and RBAC checks
- [`backend/app/services/auth.py`](../backend/app/services/auth.py): login, register, and token creation
- [`backend/app/repositories/memory.py`](../backend/app/repositories/memory.py): in-memory fallback and seed data
- [`backend/app/repositories/sqlalchemy.py`](../backend/app/repositories/sqlalchemy.py): database-backed expense repository
- [`backend/app/repositories/users.py`](../backend/app/repositories/users.py): user lookup and auth storage
- [`backend/app/core/security.py`](../backend/app/core/security.py): password hashing and JWT signing
- [`backend/app/deps.py`](../backend/app/deps.py): current-user dependency and request helpers
- [`backend/app/models/expense.py`](../backend/app/models/expense.py): expense ORM model
- [`backend/app/models/user.py`](../backend/app/models/user.py): user ORM model
- [`backend/alembic/versions/0001_phase2_initial_expenses.py`](../backend/alembic/versions/0001_phase2_initial_expenses.py): initial expense table
- [`backend/alembic/versions/0002_phase3_users_and_rbac.py`](../backend/alembic/versions/0002_phase3_users_and_rbac.py): users table and foreign key

## Request Flow

For a protected route like `GET /api/v1/expenses`:

- FastAPI validates the query params
- `get_current_user` reads the bearer token
- the service decides whether the caller is a user or admin
- the repository reads from memory or PostgreSQL
- the response model converts the result back to JSON

## Real Example

If a user signs in and asks for their expenses:

- the token is attached as `Authorization: Bearer ...`
- the backend decodes the token and loads the user profile
- the service filters the rows to that user unless the role is `admin`
- the frontend sees only the rows it is allowed to see

If the same user tries to fetch another user’s expense:

- the repository returns the row
- the service compares `user_id`
- the service raises `403 Forbidden`

## Auth Flow

- `POST /api/v1/auth/register` creates a new user with a hashed password
- `POST /api/v1/auth/login` checks the password and returns a JWT
- `GET /api/v1/auth/me` returns the authenticated user profile
- the JWT payload stores the user id and role

## Where The Logic Lives

- `main.py` wires the app together
- `routers/` defines the HTTP contract
- `services/` decides what is allowed
- `repositories/` reads and writes data
- `schemas/` validates input and shapes output
- `models/` maps ORM classes to database tables

## What To Remember

- routers should stay thin
- services should own business rules
- repositories should only worry about storage
- the auth token is the bridge between the browser and the backend

