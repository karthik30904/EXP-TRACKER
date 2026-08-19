# Phase 2 Document

## Goal

Phase 2 adds the persistent data layer and the first frontend experience:

- Next.js user interface
- PostgreSQL for durable expense storage
- SQLAlchemy models for database access
- Alembic migrations for schema versioning
- A clean path from the current in-memory repository to a database-backed repository

## Why Phase 2 Matters

Phase 1 is useful for proving the API shape, but it does not keep data after a restart. Phase 2 turns the tracker into a real application by:

- storing expenses permanently
- preparing the app for multiple users
- making the backend ready for auth in Phase 3
- giving users a browser-based experience

## Planned Scope

### Database

- Add PostgreSQL connection settings
- Introduce SQLAlchemy engine and session handling
- Create an `Expense` table that matches the current schema
- Add Alembic migrations for initial schema creation
- Keep repository methods aligned with the current service layer

### Frontend

- Create a Next.js app shell
- Build an expenses list view
- Add create and edit expense forms
- Add a summary dashboard
- Prepare API calls to the FastAPI backend

### Backend Adjustments

- Replace `memory.py` with a database repository implementation
- Keep the existing routes stable
- Preserve validation and response models
- Extend health checks to include database readiness

## Suggested Data Model

The database layer should mirror the existing expense object:

- `id`
- `amount`
- `description`
- `category`
- `date`
- `user_id`
- `created_at`
- `updated_at`

## Suggested Project Shape

- `frontend/` for the Next.js app
- `backend/app/db/` for engine and session setup
- `backend/app/models/` for SQLAlchemy models
- `backend/app/repositories/sqlalchemy.py` for persistent storage
- `backend/alembic/` for migrations

## Acceptance Criteria

Phase 2 is done when:

- expenses survive backend restarts
- the frontend can list and create expenses
- summary data comes from PostgreSQL
- the repository layer remains swappable
- the API routes still behave the same for clients

## Risks To Watch

- migration drift between Pydantic and SQLAlchemy models
- timezone handling for timestamps
- date filtering consistency between frontend and backend
- session management and transaction safety

## Outcome

Phase 2 should feel like a quiet upgrade, not a rewrite. The endpoint contract stays steady while storage and user experience become production-ready.
