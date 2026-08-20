# Database Layer

This project uses PostgreSQL with SQLAlchemy and Alembic. The database layer is built so the app can switch between memory and persistent storage without changing the API contract.

## The Tech Stack

- `PostgreSQL`: the durable database
- `SQLAlchemy`: the ORM
- `Alembic`: migrations and schema history
- `psycopg`: PostgreSQL driver

## Critical Files

- [`backend/app/db/base.py`](../backend/app/db/base.py): shared ORM base class
- [`backend/app/db/session.py`](../backend/app/db/session.py): engine and session factory
- [`backend/app/models/expense.py`](../backend/app/models/expense.py): expense table mapping
- [`backend/app/models/user.py`](../backend/app/models/user.py): user table mapping
- [`backend/app/repositories/sqlalchemy.py`](../backend/app/repositories/sqlalchemy.py): expense database access
- [`backend/app/repositories/users.py`](../backend/app/repositories/users.py): user database access
- [`backend/alembic/env.py`](../backend/alembic/env.py): migration bootstrap
- [`backend/alembic/versions/0001_phase2_initial_expenses.py`](../backend/alembic/versions/0001_phase2_initial_expenses.py): expense table migration
- [`backend/alembic/versions/0002_phase3_users_and_rbac.py`](../backend/alembic/versions/0002_phase3_users_and_rbac.py): users table and foreign key migration

## How SQLAlchemy Works Here

SQLAlchemy maps Python classes to tables:

- `Expense` maps to `expenses`
- `User` maps to `users`
- `mapped_column(...)` defines each field
- `session.add(...)`, `commit()`, and `refresh()` persist changes
- `select(...)` reads rows back as ORM objects

## Real Example

When a new expense is created:

- the service calls the repository
- the repository builds an `Expense` ORM object
- SQLAlchemy turns that object into an `INSERT`
- PostgreSQL stores the row
- the repository refreshes the object and returns plain Python data

When the dashboard loads:

- the repository runs a `SELECT`
- SQLAlchemy returns ORM rows
- the repository converts them to dictionaries
- Pydantic serializes them for the API response

## Why Alembic Matters

- the model files describe the shape of the database
- Alembic records the changes over time
- migration `0001` creates the expense table
- migration `0002` adds users and the owner relationship
- this keeps schema changes repeatable across machines

## What The ORM Gives You

- typed model classes instead of raw SQL everywhere
- reusable filters and ordering
- safer database access than ad hoc string queries
- a consistent place to add relationships later

## What To Watch For

- user ids must stay in sync between the auth table and expense rows
- timestamps should keep timezone awareness
- enum values should match the Pydantic schema
- seed data should exist in both the memory and database path

## Why This Layer Is Useful

- the app can switch storage without changing the route contract
- the backend logic stays readable
- the frontend does not need to know whether the data came from memory or PostgreSQL

