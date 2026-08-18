# Expense Tracker API — How It Works

This document explains every API endpoint in **simple, everyday language** and in **technical terms**, so anyone can understand what the system does and how the code is organized.

**Try it live:** [Swagger UI](http://localhost:8001/docs) (run the server first — see [project README](../README.md))

---

## The Big Picture (Non-Technical)

Think of this API as a **digital expense notebook** with a smart assistant behind it.

1. You (or an app) send a **request** — for example, “show me all my food expenses this month.”
2. The server **checks** that your request is valid (correct format, required fields present).
3. It **looks up or changes data** in the expense list.
4. It **sends back a response** — usually JSON (structured text) with the result.

Right now, expenses are stored **in memory** (like a list in the app’s RAM). When the server restarts, seed data reloads and any new entries from that session are lost. In Phase 2, this will move to **PostgreSQL** so data persists permanently.

---

## The Big Picture (Technical)

The backend follows a **layered architecture**. Each layer has one job:

```
Client (Swagger / Browser / Frontend)
        │
        ▼
┌───────────────────────────────────────┐
│  Routers (expenses.py, stats.py)      │  ← HTTP routes, query params, status codes
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│  Service (expense.py)                 │  ← Business rules, 404 handling
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│  Repository (memory.py)               │  ← Data access (in-memory list today)
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│  Schemas (expense.py)               │  ← Pydantic models: validate in/out JSON
└───────────────────────────────────────┘
```

**Every request also passes through middleware** before it hits a route:

1. **Request ID** — assigns a unique ID (`X-Request-ID`) for tracing logs.
2. **Request logging** — logs method, path, status, and duration.
3. **CORS** — allows the future Next.js frontend to call the API from the browser.

---

## What Happens on Every Request (Step by Step)

### Non-Technical

| Step | What happens |
|------|----------------|
| 1 | Your browser or Swagger sends a message to the server (e.g. “add a ₹250 coffee expense”). |
| 2 | The server gives this request a **tracking number** so errors can be traced in logs. |
| 3 | The server checks the message format — amount must be positive, description required, etc. |
| 4 | The correct “department” handles it — expenses go to the expense handler, summaries go to the stats handler. |
| 5 | Data is read or updated in the expense list. |
| 6 | The server replies with JSON — the expense details, a list, a summary, or an error message. |

### Technical

| Step | Layer | Code |
|------|-------|------|
| 1 | Middleware | `RequestIDMiddleware` → `RequestLoggingMiddleware` → `CORSMiddleware` |
| 2 | Router | FastAPI matches URL + HTTP method to a function in `routers/` |
| 3 | Validation | Pydantic parses body/query into `ExpenseCreate`, `ExpenseUpdate`, etc. |
| 4 | Service | `ExpenseService` applies logic and raises `HTTPException(404)` if not found |
| 5 | Repository | `InMemoryExpenseRepository` reads/writes the `_store` list |
| 6 | Response | Pydantic serializes to `ExpenseResponse` / `SummaryResponse` JSON |

---

## All Endpoints at a Glance

| # | Method | URL | Plain English | HTTP Success |
|---|--------|-----|---------------|--------------|
| 1 | GET | `/api/v1/expenses` | Show all expenses (with optional filters) | 200 |
| 2 | POST | `/api/v1/expenses` | Add a new expense | 201 |
| 3 | GET | `/api/v1/expenses/{id}` | Show one expense by its ID | 200 |
| 4 | PATCH | `/api/v1/expenses/{id}` | Update part of an expense | 200 |
| 5 | DELETE | `/api/v1/expenses/{id}` | Remove an expense | 204 |
| 6 | GET | `/api/v1/stats/summary` | Show totals and breakdown by category | 200 |
| — | GET | `/health` | “Is the server alive?” | 200 |

Base URL (local): `http://localhost:8001`

---

## Endpoint Details

### 1. List Expenses — `GET /api/v1/expenses`

**Non-technical:**  
“Show me my expense list.” You can optionally filter by category (food, transport, etc.) or date range.

**Technical flow:**
1. Router receives optional query params: `category`, `start_date`, `end_date`.
2. Service calls `repository.list_expenses(...)`.
3. Repository filters the in-memory list and sorts by date (newest first).
4. Returns `list[ExpenseResponse]`.

**Example:**
```http
GET /api/v1/expenses?category=food&start_date=2026-08-01
```

**Sample response:**
```json
[
  {
    "id": "55555555-5555-5555-5555-555555555555",
    "amount": "35.00",
    "description": "Coffee with friends",
    "category": "food",
    "date": "2026-08-17",
    "user_id": "00000000-0000-0000-0000-000000000001",
    "created_at": "2026-08-18T16:00:00Z",
    "updated_at": "2026-08-18T16:00:00Z"
  }
]
```

---

### 2. Create Expense — `POST /api/v1/expenses`

**Non-technical:**  
“Record a new expense.” You provide amount, description, category, and date. The server assigns a unique ID and timestamps.

**Technical flow:**
1. Body validated against `ExpenseCreate` (amount > 0, description 1–500 chars, valid category enum).
2. Service calls `repository.create_expense(data, user_id)`.
3. Repository generates a UUID, appends to `_store`, returns the new record.
4. Returns `ExpenseResponse` with status **201 Created**.

**Example request body:**
```json
{
  "amount": "25.00",
  "description": "Lunch at cafe",
  "category": "food",
  "date": "2026-08-18"
}
```

**Core logic (repository):**
```python
expense = {
    "id": uuid4(),           # new unique ID
    "amount": data.amount,
    "description": data.description,
    "category": data.category,
    "date": data.date,
    "user_id": user_id,      # default user in Phase 1
    "created_at": now,
    "updated_at": now,
}
self._store.append(expense)
```

---

### 3. Get One Expense — `GET /api/v1/expenses/{id}`

**Non-technical:**  
“Show me the details of expense #XYZ.” If it doesn’t exist, you get a “not found” error.

**Technical flow:**
1. FastAPI parses `{id}` as UUID.
2. Service calls `repository.get_expense(expense_id)`.
3. If `None` → raises `HTTPException(404)`.
4. Otherwise returns `ExpenseResponse`.

---

### 4. Update Expense — `PATCH /api/v1/expenses/{id}`

**Non-technical:**  
“Change some fields on an existing expense.” You only send the fields you want to change — not the whole record.

**Technical flow:**
1. Body validated against `ExpenseUpdate` (all fields optional).
2. Service calls `repository.update_expense(id, data)`.
3. Repository uses `data.model_dump(exclude_unset=True)` — only updates fields you actually sent.
4. Sets `updated_at` to current time.
5. Returns updated `ExpenseResponse`, or 404 if ID not found.

**Example — change only the description:**
```json
{
  "description": "Updated lunch description"
}
```

---

### 5. Delete Expense — `DELETE /api/v1/expenses/{id}`

**Non-technical:**  
“Remove this expense from my records permanently.”

**Technical flow:**
1. Service calls `repository.delete_expense(expense_id)`.
2. Repository finds the item in `_store` and removes it.
3. Returns **204 No Content** (empty body) on success, or 404 if not found.

---

### 6. Summary Stats — `GET /api/v1/stats/summary`

**Non-technical:**  
“How much have I spent in total, and how does it break down by category (food, bills, etc.)?” Optional date range filters apply.

**Technical flow:**
1. Router accepts optional `start_date`, `end_date`.
2. Service calls `repository.get_summary(...)`.
3. Repository:
   - Gets filtered expenses via `list_expenses`.
   - Loops through them, summing `amount` per category.
   - Returns total, count, and sorted category breakdown.
4. Service wraps result in `SummaryResponse`.

**Sample response:**
```json
{
  "total_amount": "432.49",
  "expense_count": 5,
  "by_category": [
    { "category": "bills", "total": "250.00", "count": 1 },
    { "category": "food", "total": "80.50", "count": 2 },
    { "category": "entertainment", "total": "89.99", "count": 1 },
    { "category": "transport", "total": "12.00", "count": 1 }
  ],
  "period_start": null,
  "period_end": null
}
```

---

### Health Check — `GET /health`

**Non-technical:**  
A quick “ping” to confirm the server is running. Used by Docker and monitoring tools.

**Technical:** Returns `{"status": "healthy"}` with no database check yet (Phase 2 will extend this).

---

## Data Model (What an Expense Looks Like)

| Field | Type | Required on create | Description |
|-------|------|-------------------|-------------|
| `id` | UUID | Auto-generated | Unique identifier |
| `amount` | Decimal | Yes | Must be > 0 |
| `description` | String | Yes | 1–500 characters |
| `category` | Enum | Yes | `food`, `transport`, `entertainment`, `shopping`, `bills`, `health`, `other` |
| `date` | Date | Yes | When the expense occurred (`YYYY-MM-DD`) |
| `user_id` | UUID | Auto-assigned | Owner (default user in Phase 1; JWT in Phase 3) |
| `created_at` | DateTime | Auto-generated | When record was created |
| `updated_at` | DateTime | Auto-generated | Last modification time |

---

## Error Handling

### Non-Technical

- **Bad input** (missing amount, negative number) → server explains what’s wrong.
- **Expense not found** → “404 Not Found” with a clear message.
- **Unexpected crash** → “500 Internal Server Error” with a tracking ID so developers can find it in logs.

### Technical

| Error | Status | Response shape |
|-------|--------|----------------|
| Validation failure | 422 | `{"detail": [...], "request_id": "...", "type": "ValidationError"}` |
| Not found | 404 | `{"detail": "Expense {id} not found", "request_id": "...", "type": "HTTPException"}` |
| Unhandled exception | 500 | `{"detail": "Internal server error", "request_id": "...", "type": "..."}` |

Every error includes a **`request_id`** — match it in server logs to debug.

---

## Project File Map (Where the Logic Lives)

```
backend/app/
├── main.py                 # App entry, middleware, routers, exception handlers
├── routers/
│   ├── expenses.py         # 5 expense HTTP endpoints
│   └── stats.py            # 1 summary endpoint
├── services/
│   └── expense.py          # Business logic + 404 rules
├── repositories/
│   ├── base.py             # Abstract interface (swap memory → DB in Phase 2)
│   └── memory.py           # In-memory list + 5 seed expenses
├── schemas/
│   └── expense.py          # Pydantic request/response models
├── middleware/
│   ├── request_id.py       # X-Request-ID per request
│   └── logging.py          # Structured request/response logs
└── core/
    ├── config.py           # Settings from environment variables
    └── logging.py          # structlog setup
```

---

## Testing in Swagger UI

1. Start the server:
   ```bash
   cd backend
   uv sync
   uv run uvicorn app.main:app --reload --port 8001
   ```
2. Open http://localhost:8001/docs
3. Expand any endpoint → **Try it out** → fill parameters → **Execute**
4. See the response body and status code below

**Suggested test order:**
1. `GET /api/v1/expenses` — see 5 seed expenses
2. `POST /api/v1/expenses` — create one
3. `GET /api/v1/expenses/{id}` — fetch the one you created
4. `PATCH /api/v1/expenses/{id}` — update its description
5. `GET /api/v1/stats/summary` — see totals update
6. `DELETE /api/v1/expenses/{id}` — remove it

Or run the automated smoke test:
```bash
uv run python test_api.py
```

---

## What Comes Next (Future Phases)

| Phase | Change | Impact on endpoints |
|-------|--------|---------------------|
| 2 — Database | Replace `memory.py` with PostgreSQL | Same URLs; data persists after restart |
| 3 — Auth | JWT login required | All 6 endpoints need `Authorization: Bearer <token>` |
| 3 — RBAC | Admin vs user roles | Users see only their expenses; admin sees all |
| 4 — MCP | Cursor/Claude integration | Same API, called via API key from MCP server |

The **router and service layers stay the same** — only the repository and auth dependencies change. That’s the benefit of the layered design.

---

## Quick Reference — Request Flow Diagram

```
  YOU (Swagger UI)
       │
       │  POST /api/v1/expenses  { amount, description, category, date }
       ▼
  ┌─────────────┐
  │  Middleware  │  assign request_id, log start
  └──────┬──────┘
         ▼
  ┌─────────────┐
  │   Router     │  expenses.create_expense(data: ExpenseCreate)
  └──────┬──────┘
         ▼
  ┌─────────────┐
  │   Service    │  validate business rules, call repository
  └──────┬──────┘
         ▼
  ┌─────────────┐
  │ Repository   │  append to _store, return dict
  └──────┬──────┘
         ▼
  ┌─────────────┐
  │   Schema     │  ExpenseResponse → JSON
  └──────┬──────┘
         ▼
  201 Created  +  expense JSON  +  X-Request-ID header
```

---

## Summary

- **6 core endpoints** cover full CRUD on expenses plus a dashboard summary.
- **3 layers** (router → service → repository) keep HTTP, business logic, and data access separate.
- **Pydantic schemas** validate all input and shape all output — Swagger docs are auto-generated from them.
- **Middleware** logs every request and attaches a trace ID for debugging.
- **Phase 1** uses in-memory storage with seed data; later phases add PostgreSQL, auth, and MCP without rewriting the API surface.
