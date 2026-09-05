# Expense Tracker

Full-stack expense tracking app: FastAPI backend, Next.js frontend, PostgreSQL, JWT auth with RBAC, and MCP integration for Cursor.

## Build Phases

| Phase | Focus | Steps | Status |
|-------|-------|-------|--------|
| **1** | Backend API + Observability | FastAPI, 6 endpoints, Swagger, structlog, request tracing | Complete |
| **2** | UI + Database | Next.js dashboard (list/create/edit/summary), SQLAlchemy repository, Alembic initial migration, database readiness health check | Complete — deployment verification pending |
| **3** | Integration, Auth & RBAC | Wire frontend↔API↔DB, JWT login, admin/user roles | Complete |
| **4** | MCP Server | Node.js/TS MCP server, dual transports (stdio + SSE), Cursor/Claude/ChatGPT integration | Complete |

Phase notes:
- [Phase 1 document](docs/Phase1_doc.md)
- [Phase 2 document](docs/phase2_doc.md)
- [Phase 3 document](docs/phase3_doc.md)
- [MCP Server Integrator Guide](docs/MCP_Server_Integrator.md)
- [Project explanation](project_explanation.md)

## Architecture

```
Browser (Next.js) ──HTTP+JWT──► FastAPI ──► PostgreSQL
Cursor / Claude   ──MCP stdio──► mcp-server ──HTTP+API key──► FastAPI
```

## Tech Stack

- **Backend:** FastAPI, Python 3.11+, [uv](https://docs.astral.sh/uv/) for dependency management
- **Frontend:** Next.js 15, TypeScript, Tailwind, shadcn/ui
- **Database:** PostgreSQL 16
- **Auth:** JWT (python-jose + passlib)
- **Logging:** structlog + request-ID middleware
- **MCP:** Node.js @modelcontextprotocol/sdk

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/expenses` | List expenses (filters: date, category) |
| POST | `/api/v1/expenses` | Create expense |
| GET | `/api/v1/expenses/{id}` | Get single expense |
| PATCH | `/api/v1/expenses/{id}` | Update expense |
| DELETE | `/api/v1/expenses/{id}` | Delete expense |
| GET | `/api/v1/stats/summary` | Dashboard totals, by-category breakdown |

Auth routes (Phase 3): `POST /auth/register`, `POST /auth/login`, `GET /auth/me`

**How the API works:** see [backend/README.md](backend/README.md) for a full guide (non-technical + technical).

## Run Locally

Requires [uv](https://docs.astral.sh/uv/getting-started/installation/) (Python 3.11+).

```bash
cd backend
uv sync
DATABASE_URL="postgresql+psycopg://USER:PASSWORD@localhost:5432/expense_tracker" USE_DATABASE=true uv run alembic upgrade head
DATABASE_URL="postgresql+psycopg://USER:PASSWORD@localhost:5432/expense_tracker" USE_DATABASE=true uv run python seed_db.py
DATABASE_URL="postgresql+psycopg://USER:PASSWORD@localhost:5432/expense_tracker" USE_DATABASE=true uv run uvicorn app.main:app --reload --port 8001
```

- Swagger UI: http://localhost:8001/docs
- ReDoc: http://localhost:8001/redoc
- Health check: http://localhost:8001/health

> Port 8000 may be in use on your machine — use `--port 8001` if needed.

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`. Set `NEXT_PUBLIC_API_BASE_URL` when the API is not on port 8001.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `INFO` | Log level (DEBUG, INFO, WARNING, ERROR) |
| `DEBUG` | `false` | Enable FastAPI debug mode |
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated allowed origins |
| `DATABASE_URL` | — | PostgreSQL SQLAlchemy URL, required when `USE_DATABASE=true` |
| `USE_DATABASE` | `false` | Select the SQLAlchemy repository; leave false for Phase 1 in-memory mode |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8001` | Browser-visible API base URL for the frontend |
