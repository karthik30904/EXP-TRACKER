# Phase 1 Document

## Goal

Phase 1 establishes the backend foundation for the expense tracker:

- FastAPI application structure
- Expense CRUD endpoints
- Summary endpoint for dashboard totals
- Request tracing and structured logging
- Swagger and ReDoc for API exploration
- In-memory data storage for fast local development

## What Phase 1 Delivers

The API exposes these routes:

- `GET /api/v1/expenses`
- `POST /api/v1/expenses`
- `GET /api/v1/expenses/{expense_id}`
- `PATCH /api/v1/expenses/{expense_id}`
- `DELETE /api/v1/expenses/{expense_id}`
- `GET /api/v1/stats/summary`
- `GET /health`

The current backend uses seed data so the API is immediately usable after startup.

## Architecture

Phase 1 follows a layered design:

1. Router layer handles HTTP requests and response models.
2. Service layer applies business rules and raises `404` when needed.
3. Repository layer stores and filters expense records.
4. Schema layer validates incoming and outgoing data.
5. Middleware layer adds request IDs and structured logs.

## Core Files

- `backend/app/main.py`
- `backend/app/routers/expenses.py`
- `backend/app/routers/stats.py`
- `backend/app/services/expense.py`
- `backend/app/repositories/memory.py`
- `backend/app/repositories/base.py`
- `backend/app/schemas/expense.py`
- `backend/app/middleware/request_id.py`
- `backend/app/middleware/logging.py`
- `backend/app/core/logging.py`
- `backend/app/core/config.py`

## Behavior Notes

- Validation errors return a `422` response with the request ID.
- Missing expenses return a `404` response with the request ID.
- Unexpected exceptions return a generic `500` response with the request ID.
- Expense totals and category breakdowns are computed from the repository data.

## Limitations

- Data is stored in memory, so it resets on restart.
- There is no authentication or role-based access control yet.
- There is no persistent database yet.
- There is no frontend UI yet.

## Verification

Phase 1 can be checked with:

- Swagger UI at `http://localhost:8001/docs`
- ReDoc at `http://localhost:8001/redoc`
- Health endpoint at `http://localhost:8001/health`
- Smoke test script in `backend/test_api.py`

## Outcome

Phase 1 gives the project a stable API contract and observability baseline so Phase 2 can swap in persistent storage and a frontend without changing the core endpoint surface.
