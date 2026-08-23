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

## Delivered Scope

### Database

- PostgreSQL connection settings via `DATABASE_URL` and `USE_DATABASE`
- SQLAlchemy engine and session handling
- An `Expense` table matching the API schema
- Alembic initial migration (`0001_phase2_initial_expenses`)
- A swappable SQLAlchemy repository aligned with the existing service layer
- A health check that reports database readiness when database mode is enabled

### Frontend

- Next.js app shell
- Expense list view
- Create and edit expense forms
- Summary dashboard
- API calls to the FastAPI backend, configured with `NEXT_PUBLIC_API_BASE_URL`

### Backend Adjustments

- Select the database repository with `USE_DATABASE=true` while retaining the in-memory fallback
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

## Acceptance Criteria and Verification

Phase 2 is done when:

| Criterion | Implementation status | Verification status |
|---|---|---|
| Expenses survive backend restarts | SQLAlchemy repository, migration, and seed script are present | Requires a running PostgreSQL instance |
| Frontend lists, creates, and edits expenses | Implemented in `frontend/app/page.tsx` | Production build passes |
| Summary data comes from the database | Summary delegates through the selected repository | Requires a running PostgreSQL instance |
| Repository remains swappable | Memory fallback and database factory are present | Code-reviewed |
| API routes retain their contract | Existing routers and Pydantic responses are unchanged | Runtime test blocked locally by Python runtime permissions |

### Test Commands

```bash
cd backend
USE_DATABASE=true DATABASE_URL="postgresql+psycopg://USER:PASSWORD@localhost:5432/expense_tracker" uv run alembic upgrade head
USE_DATABASE=true DATABASE_URL="postgresql+psycopg://USER:PASSWORD@localhost:5432/expense_tracker" uv run python seed_db.py
USE_DATABASE=true DATABASE_URL="postgresql+psycopg://USER:PASSWORD@localhost:5432/expense_tracker" uv run uvicorn app.main:app --port 8001
uv run python test_integration.py

cd ../frontend
npm run build
```

The repository contains API smoke and end-to-end HTTP scripts (`backend/test_api.py` and `backend/test_integration.py`). There is no isolated frontend unit/component test suite yet; add one in Phase 3 when authentication changes the UI state model.

## Risks To Watch

- migration drift between Pydantic and SQLAlchemy models
- timezone handling for timestamps
- date filtering consistency between frontend and backend
- session management and transaction safety

## Outcome

Phase 2 should feel like a quiet upgrade, not a rewrite. The endpoint contract stays steady while storage and user experience become production-ready.
