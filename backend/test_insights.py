from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request
import uuid

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

BASE = "http://127.0.0.1:8001"
passed = 0
failed = 0
errors: list[str] = []


def request(
    method: str,
    path: str,
    body: dict | None = None,
    token: str | None = None,
) -> tuple[int, dict | list | str]:
    data = json.dumps(body).encode() if body else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    req = urllib.request.Request(f"{BASE}{path}", data=data, method=method, headers=headers)
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
        print(f"  [PASS] {label}")
    else:
        failed += 1
        msg = f"  [FAIL] {label}: expected {expected!r}, got {actual!r}"
        print(msg)
        errors.append(msg)


def assert_true(label: str, condition: bool) -> None:
    global passed, failed
    if condition:
        passed += 1
        print(f"  [PASS] {label}")
    else:
        failed += 1
        msg = f"  [FAIL] {label}: condition was False"
        print(msg)
        errors.append(msg)


def run_tests() -> None:
    print("=== Financial Insights & Recommendations Test Suite ===")

    # 1. Login user
    print("\n1. Authentication")
    status, res = request("POST", "/api/v1/auth/login", {"email": "user@example.com", "password": "User123!"})
    assert_eq("Login returns 200", status, 200)
    token = res["access_token"]

    # 2. Add some diverse sample expenses
    print("\n2. Seeding Sample Expenses")
    expenses_to_add = [
        {"amount": "1500.00", "description": "Groceries at Supermarket", "category": "food", "date": "2026-08-10"},
        {"amount": "499.00", "description": "Netflix Subscription", "category": "entertainment", "date": "2026-08-12"},
        {"amount": "499.00", "description": "Netflix Subscription", "category": "entertainment", "date": "2026-08-20"},
        {"amount": "4500.00", "description": "High ticket Shopping Jacket", "category": "shopping", "date": "2026-08-15"},
        {"amount": "350.00", "description": "Metro Rail Pass", "category": "transport", "date": "2026-08-18"},
        {"amount": "1200.00", "description": "Electricity Bill", "category": "bills", "date": "2026-08-22"},
    ]
    for exp in expenses_to_add:
        st, _ = request("POST", "/api/v1/expenses", exp, token=token)
        assert_true("Expense created", st in [200, 201])

    # 3. Call GET /stats/insights
    print("\n3. GET /stats/insights Verification")
    status, insights = request("GET", "/api/v1/stats/insights?monthly_budget=50000", token=token)
    assert_eq("Insights returns 200", status, 200)
    assert_true("Has safe_daily_spend", "safe_daily_spend" in insights)
    assert_true("Has projected_month_end_spend", "projected_month_end_spend" in insights)
    assert_true("Has remaining_budget", "remaining_budget" in insights)
    assert_true("Has burn_rate_status", "burn_rate_status" in insights)
    assert_true("Has recommendations", "recommendations" in insights and len(insights["recommendations"]) > 0)
    print(f"    Recommendations count: {len(insights['recommendations'])}")
    for r in insights["recommendations"]:
        print(f"    - [{r['type'].upper()}] {r['title']} ({r.get('metric', '')})")

    # 4. 50/30/20 Ratio checks
    print("\n4. 50/30/20 Rule Metrics")
    assert_true("Has needs_percent", "needs_percent" in insights)
    assert_true("Has wants_percent", "wants_percent" in insights)
    print(f"    Needs: {insights['needs_percent']}%, Wants: {insights['wants_percent']}%, Savings Buffer: {insights['savings_buffer_percent']}%")

    print("\n=========================================")
    print(f"Results: {passed} passed, {failed} failed")
    if failed:
        for err_msg in errors:
            print(f"  {err_msg}")
        sys.exit(1)
    else:
        print("All Financial Insights & Recommendations tests PASSED!")


if __name__ == "__main__":
    run_tests()
