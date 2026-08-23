"""
Full integration test suite for Expense Tracker (Backend + Database + Frontend connectivity).

Tests:
  1. Health check
  2. List expenses (seed data loaded from DB)
  3. Create expense (persists to DB)
  4. Get single expense
  5. Update expense (PATCH)
  6. Delete expense
  7. Summary stats
  8. List with category filter
  9. List with date-range filter
 10. Validation errors (bad input)
 11. 404 for missing resource
 12. Frontend can reach backend (fetches /api/v1/expenses)

Run:
    cd backend
    uv run python test_integration.py

Prerequisites:
    - Backend server running on port 8001 with USE_DATABASE=true
    - Database migrated and seeded (uv run alembic upgrade head && uv run python seed_db.py)
"""
from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request
from datetime import date

BASE = "http://127.0.0.1:8001"
passed = 0
failed = 0
errors: list[str] = []


AUTH_TOKEN: str | None = None


def get_auth_token() -> str:
    global AUTH_TOKEN
    if AUTH_TOKEN is None:
        st, res = request("POST", "/api/v1/auth/login", {"email": "user@example.com", "password": "User123!"}, skip_auth=True)
        if st == 200 and isinstance(res, dict) and "access_token" in res:
            AUTH_TOKEN = res["access_token"]
    return AUTH_TOKEN or ""


def request(
    method: str, path: str, body: dict | None = None, skip_auth: bool = False
) -> tuple[int, dict | list | str]:
    data = json.dumps(body).encode() if body else None
    headers = {"Content-Type": "application/json"}
    if not skip_auth and not path.startswith("/health") and not path.startswith("/api/v1/auth"):
        token = get_auth_token()
        if token:
            headers["Authorization"] = f"Bearer {token}"

    req = urllib.request.Request(
        f"{BASE}{path}", data=data, method=method, headers=headers
    )
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode()
            return resp.status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        content = e.read().decode()
        try:
            return e.code, json.loads(content)
        except Exception:
            return e.code, content


def assert_eq(label: str, actual, expected) -> None:
    global passed, failed
    if actual == expected:
        passed += 1
        print(f"  PASS  {label}")
    else:
        failed += 1
        msg = f"  FAIL  {label}: expected {expected!r}, got {actual!r}"
        print(msg)
        errors.append(msg)


def assert_true(label: str, condition: bool, detail: str = "") -> None:
    global passed, failed
    if condition:
        passed += 1
        print(f"  PASS  {label}")
    else:
        failed += 1
        msg = f"  FAIL  {label}" + (f" ({detail})" if detail else "")
        print(msg)
        errors.append(msg)


def assert_in(label: str, needle: str, haystack: str) -> None:
    assert_true(label, needle in haystack, f"{needle!r} not in {haystack!r}")


# ──────────────────────────────────────────────
#  1. Health check
# ──────────────────────────────────────────────
print("\n=== 1. Health check ===")
status, data = request("GET", "/health")
assert_eq("status code", status, 200)
assert_eq("status field", data.get("status"), "healthy")
assert_in("storage=database in response", "database", str(data))


# ──────────────────────────────────────────────
#  2. List expenses (should have seed data)
# ──────────────────────────────────────────────
print("\n=== 2. List expenses ===")
status, data = request("GET", "/api/v1/expenses")
assert_eq("status code", status, 200)
assert_true("returns a list", isinstance(data, list))
assert_true("has seed data (>=5)", len(data) >= 5, f"got {len(data)} expenses")

# Check structure of first expense
if data:
    exp = data[0]
    for key in ("id", "amount", "description", "category", "date", "user_id", "created_at", "updated_at"):
        assert_in(f"expense has '{key}'", key, json.dumps(exp))


# ──────────────────────────────────────────────
#  3. Create expense
# ──────────────────────────────────────────────
print("\n=== 3. Create expense ===")
new_expense = {
    "amount": "99.99",
    "description": "Integration test expense",
    "category": "entertainment",
    "date": "2026-08-20",
}
status, created = request("POST", "/api/v1/expenses", new_expense)
assert_eq("status code", status, 201)
created_id = created.get("id")
assert_true("has id", created_id is not None)
assert_eq("amount matches", created.get("amount"), "99.99")
assert_eq("description matches", created.get("description"), "Integration test expense")
assert_eq("category matches", created.get("category"), "entertainment")
assert_eq("date matches", created.get("date"), "2026-08-20")


# ──────────────────────────────────────────────
#  4. Get single expense
# ──────────────────────────────────────────────
print("\n=== 4. Get single expense ===")
status, fetched = request("GET", f"/api/v1/expenses/{created_id}")
assert_eq("status code", status, 200)
assert_eq("id matches", fetched.get("id"), created_id)
assert_eq("description matches", fetched.get("description"), "Integration test expense")


# ──────────────────────────────────────────────
#  5. Update expense (PATCH)
# ──────────────────────────────────────────────
print("\n=== 5. Update expense (PATCH) ===")
status, updated = request("PATCH", f"/api/v1/expenses/{created_id}", {"description": "Updated test expense"})
assert_eq("status code", status, 200)
assert_eq("description updated", updated.get("description"), "Updated test expense")
assert_eq("amount unchanged", updated.get("amount"), "99.99")


# ──────────────────────────────────────────────
#  6. Summary stats
# ──────────────────────────────────────────────
print("\n=== 6. Summary stats ===")
status, summary = request("GET", "/api/v1/stats/summary")
assert_eq("status code", status, 200)
assert_true("has total_amount", summary.get("total_amount") is not None)
assert_true("has expense_count", summary.get("expense_count") is not None)
assert_true("expense_count >= 6", summary.get("expense_count", 0) >= 6, f"got {summary.get('expense_count')}")
assert_true("has by_category list", isinstance(summary.get("by_category"), list))
assert_true("by_category not empty", len(summary.get("by_category", [])) > 0)


# ──────────────────────────────────────────────
#  7. List with category filter
# ──────────────────────────────────────────────
print("\n=== 7. List with category filter ===")
status, food = request("GET", "/api/v1/expenses?category=food")
assert_eq("status code", status, 200)
assert_true("all food", all(e["category"] == "food" for e in food), f"categories: {[e['category'] for e in food]}")
assert_true("food count >= 2", len(food) >= 2, f"got {len(food)} food expenses")


# ──────────────────────────────────────────────
#  8. List with date-range filter
# ──────────────────────────────────────────────
print("\n=== 8. List with date-range filter ===")
status, ranged = request("GET", "/api/v1/expenses?start_date=2026-08-01&end_date=2026-08-25")
assert_eq("status code", status, 200)
assert_true("all in range", all("2026-08-01" <= e["date"] <= "2026-08-25" for e in ranged))
assert_true("date-range results >= 2", len(ranged) >= 2, f"got {len(ranged)}")


# ──────────────────────────────────────────────
#  9. Validation error (bad input)
# ──────────────────────────────────────────────
print("\n=== 9. Validation error (bad amount) ===")
status, err = request("POST", "/api/v1/expenses", {"amount": "-10", "description": "x", "category": "food", "date": "2026-01-01"})
assert_eq("status code", status, 422)
assert_true("has detail", "detail" in err)


# ──────────────────────────────────────────────
# 10. 404 for missing resource
# ──────────────────────────────────────────────
print("\n=== 10. 404 for missing resource ===")
status, err = request("GET", "/api/v1/expenses/00000000-0000-0000-0000-000000000000")
assert_eq("status code", status, 404)


# ──────────────────────────────────────────────
# 11. Delete expense
# ──────────────────────────────────────────────
print("\n=== 11. Delete expense ===")
status, _ = request("DELETE", f"/api/v1/expenses/{created_id}")
assert_eq("status code", status, 204)

status, after_delete = request("GET", f"/api/v1/expenses/{created_id}")
assert_eq("GET after DELETE returns 404", status, 404)


# ──────────────────────────────────────────────
# 12. Frontend connectivity check
# ──────────────────────────────────────────────
print("\n=== 12. Frontend connectivity ===")
FRONTEND = "http://127.0.0.1:3000"
try:
    req = urllib.request.Request(FRONTEND, method="GET")
    with urllib.request.urlopen(req, timeout=5) as resp:
        html = resp.read().decode()
        assert_eq("frontend status code", resp.status, 200)
        assert_in("frontend serves expense tracker HTML", "Expense Tracker", html)
        assert_in("frontend has form for adding expenses", "Save expense", html)
        assert_in("frontend has expense list", "Recent expenses", html)
except urllib.error.URLError as e:
    failed += 1
    msg = f"  FAIL  Frontend not reachable at {FRONTEND}: {e}"
    print(msg)
    errors.append(msg)
except Exception as e:
    failed += 1
    msg = f"  FAIL  Frontend check error: {e}"
    print(msg)
    errors.append(msg)


# ──────────────────────────────────────────────
#  Summary
# ──────────────────────────────────────────────
print("\n" + "=" * 50)
total = passed + failed
print(f"  TOTAL: {total} tests | PASSED: {passed} | FAILED: {failed}")
if errors:
    print("\n  Failures:")
    for e in errors:
        print(f"    {e}")
print("=" * 50)

sys.exit(1 if failed else 0)
