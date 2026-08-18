# Expense Tracker

Full-stack expense tracking app: FastAPI backend, Next.js frontend, PostgreSQL, JWT auth with RBAC, and MCP integration for Cursor.

## Build Phases

| Phase | Focus | Steps | Status |
|-------|-------|-------|--------|
| **1** | Backend API + Observability | FastAPI, 6 endpoints, Swagger, structlog, request tracing | Complete |
| **2** | UI + Database | Next.js frontend, PostgreSQL + SQLAlchemy + Alembic | Pending |
| **3** | Integration, Auth & RBAC | Wire frontend↔API↔DB, JWT login, admin/user roles | Pending |
| **4** | MCP Server | Node.js MCP adapter, API key auth, Cursor config | Pending |

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

## Run Locally (Phase 1)

Requires [uv](https://docs.astral.sh/uv/getting-started/installation/) (Python 3.11+).

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8001
```

- Swagger UI: http://localhost:8001/docs
- ReDoc: http://localhost:8001/redoc
- Health check: http://localhost:8001/health

> Port 8000 may be in use on your machine — use `--port 8001` if needed.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `INFO` | Log level (DEBUG, INFO, WARNING, ERROR) |
| `DEBUG` | `false` | Enable FastAPI debug mode |
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated allowed origins |
| `DATABASE_URL` | — | PostgreSQL connection string (Phase 2) |
