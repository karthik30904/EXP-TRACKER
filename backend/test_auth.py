"""
Automated test suite for Phase 3 Auth and Role-Based Access Control (RBAC).

Run:
    cd backend
    python test_auth.py
"""
from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request
import uuid

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
    print("=== Phase 3: Auth & RBAC Test Suite ===")

    # 1. Health check
    print("\n1. Health check")
    status, health = request("GET", "/health")
    assert_eq("Health returns 200", status, 200)

    # 2. Login with pre-seeded demo user
    print("\n2. Demo user login")
    status, res = request("POST", "/api/v1/auth/login", {"email": "user@example.com", "password": "User123!"})
    assert_eq("Demo login returns 200", status, 200)
    assert_true("Response contains access_token", "access_token" in res)
    user_token = res["access_token"]
    assert_eq("User role is 'user'", res["user"]["role"], "user")

    # 3. Login with pre-seeded demo admin
    print("\n3. Demo admin login")
    status, res = request("POST", "/api/v1/auth/login", {"email": "admin@example.com", "password": "Admin123!"})
    assert_eq("Admin login returns 200", status, 200)
    admin_token = res["access_token"]
    assert_eq("Admin role is 'admin'", res["user"]["role"], "admin")

    # 4. Invalid login credentials
    print("\n4. Invalid login credentials")
    status, _ = request("POST", "/api/v1/auth/login", {"email": "user@example.com", "password": "WrongPassword!"})
    assert_eq("Wrong password returns 401", status, 401)

    # 5. Register new user
    print("\n5. User registration")
    unique_email = f"alice_{uuid.uuid4().hex[:6]}@example.com"
    status, res = request(
        "POST",
        "/api/v1/auth/register",
        {"email": unique_email, "password": "Password123!", "full_name": "Alice Wonderland"},
    )
    assert_eq("Registration returns 201", status, 201)
    assert_true("Returns access token", "access_token" in res)
    alice_token = res["access_token"]
    alice_id = res["user"]["id"]

    # 6. Duplicate registration rejection
    print("\n6. Duplicate registration rejection")
    status, _ = request(
        "POST",
        "/api/v1/auth/register",
        {"email": unique_email, "password": "Password123!", "full_name": "Alice Duplicate"},
    )
    assert_eq("Duplicate email returns 409", status, 409)

    # 7. Access /auth/me with valid token
    print("\n7. Authenticated profile (/auth/me)")
    status, profile = request("GET", "/api/v1/auth/me", token=alice_token)
    assert_eq("Profile returns 200", status, 200)
    assert_eq("Profile email matches", profile["email"], unique_email)
    assert_eq("Profile name matches", profile["full_name"], "Alice Wonderland")

    # 8. Unauthenticated access blocked
    print("\n8. Unauthenticated access blocked")
    status, _ = request("GET", "/api/v1/auth/me")
    assert_eq("Missing token returns 401", status, 401)
    status, _ = request("GET", "/api/v1/expenses")
    assert_eq("Expenses missing token returns 401", status, 401)

    # 9. Multi-user isolation (Alice creates an expense)
    print("\n9. Multi-user isolation")
    status, created = request(
        "POST",
        "/api/v1/expenses",
        {"amount": "42.50", "description": "Alice coffee", "category": "food", "date": "2026-08-23"},
        token=alice_token,
    )
    assert_eq("Alice expense created (201)", status, 201)
    alice_expense_id = created["id"]

    # Alice lists expenses - should include her expense
    status, alice_list = request("GET", "/api/v1/expenses", token=alice_token)
    assert_eq("Alice list returns 200", status, 200)
    assert_true(
        "Alice expense in Alice list",
        any(e["id"] == alice_expense_id for e in alice_list),
    )

    # 10. Role-Based Access Control: Admin vs User
    print("\n10. RBAC User listing (/auth/users)")
    # Admin can list users
    status, users = request("GET", "/api/v1/auth/users", token=admin_token)
    assert_eq("Admin can list users (200)", status, 200)
    assert_true("User list has users", len(users) >= 2)

    # Regular user cannot list users (403 Forbidden)
    status, _ = request("GET", "/api/v1/auth/users", token=alice_token)
    assert_eq("Regular user is blocked from /auth/users (403)", status, 403)

    # Clean up Alice's expense
    status, _ = request("DELETE", f"/api/v1/expenses/{alice_expense_id}", token=alice_token)
    assert_eq("Alice expense deleted (204)", status, 204)

    # Final summary
    print(f"\n=========================================")
    print(f"Results: {passed} passed, {failed} failed")
    if failed:
        for err in errors:
            print(f"  {err}")
        sys.exit(1)
    else:
        print("All Phase 3 Auth and RBAC tests PASSED!")


if __name__ == "__main__":
    run_tests()
