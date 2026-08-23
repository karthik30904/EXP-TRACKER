# Expense Tracker: Project Explanation

## Overview

Expense Tracker is a layered FastAPI and Next.js application for recording expenses and viewing category totals. The API contract stays stable while the repository implementation changes from the Phase 1 in-memory store to the Phase 2 SQLAlchemy store.

## Phase 1: Completed

- FastAPI application with expense CRUD endpoints and a summary endpoint.
- Pydantic validation and consistent error responses.
- Request IDs, structured request logging, health endpoint, Swagger UI, and ReDoc.
- Repository/service/router separation with deterministic in-memory seed data.

## Phase 2: Implemented

- SQLAlchemy `Expense` model, session factory, database repository, and Alembic migration.
- Database selection through `USE_DATABASE=true` and `DATABASE_URL`; the memory repository remains a safe fallback.
- Database seed script and health readiness reporting for database mode.
- Next.js dashboard that lists expenses, displays summary totals, creates expenses, and edits existing expenses.
- Frontend API endpoint configuration with `NEXT_PUBLIC_API_BASE_URL`.

The implementation is complete. The remaining operational check is to run the migration, seed process, and integration suite against an accessible PostgreSQL service.

## Phase 3: Pending

- User registration, login, JWT issuance and validation.
- User-owned expenses instead of the temporary default user.
- Admin/user roles and authorization rules.
- Auth-aware frontend screens, protected requests, and comprehensive automated tests.

## Phase 4: Pending

- Node.js MCP server adapter.
- API-key authentication between the MCP service and API.
- MCP tools/resources for expenses and summary data.
- Cursor/client configuration, security review, and end-to-end MCP tests.

## Current Test Status

| Area | Status |
|---|---|
| Frontend production build | Passed (`npm run build`) |
| Backend syntax/API smoke test | Blocked locally: the configured Python/uv executable cannot spawn because of an OS access-denied error |
| Database integration script | Present (`backend/test_integration.py`), awaiting an accessible PostgreSQL instance and the same Python runtime fix |
| Frontend unit/component tests | Not yet implemented |

## Runbook

Use `backend/test_integration.py` after applying the Alembic migration, seeding the database, and starting the backend in database mode. Use `npm run build` in `frontend/` for the production build check. See `README.md` for environment variables and startup commands.
