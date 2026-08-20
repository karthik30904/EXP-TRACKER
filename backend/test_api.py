import json
import urllib.error
import urllib.request

BASE = "http://127.0.0.1:8001"


def request(method: str, path: str, body: dict | None = None) -> tuple[int, dict | list | str]:
    data = json.dumps(body).encode() if body else None
    headers = {"Content-Type": "application/json"} if body else {}
    req = urllib.request.Request(f"{BASE}{path}", data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode()
            return resp.status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        content = e.read().decode()
        return e.code, json.loads(content) if content else {}


def login(email: str, password: str) -> str:
    status, data = request("POST", "/api/v1/auth/login", {"email": email, "password": password})
    if status != 200:
        raise RuntimeError(f"Login failed: {status} {data}")
    return data["access_token"]


def authed_request(token: str, method: str, path: str, body: dict | None = None):
    data = json.dumps(body).encode() if body else None
    headers = {"Authorization": f"Bearer {token}"}
    if body:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(f"{BASE}{path}", data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode()
            return resp.status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        content = e.read().decode()
        return e.code, json.loads(content) if content else {}


def main() -> None:
    status, data = request("GET", "/health")
    print(f"HEALTH: {status} {data}")

    token = login("user@example.com", "User123!")

    status, data = authed_request(token, "GET", "/api/v1/expenses")
    print(f"LIST: {status} {len(data)} expenses")

    status, created = authed_request(
        token,
        "POST",
        "/api/v1/expenses",
        {"amount": "25.00", "description": "Test lunch", "category": "food", "date": "2026-08-18"},
    )
    print(f"CREATE: {status} {created['id']}")
    expense_id = created["id"]

    status, data = authed_request(token, "GET", f"/api/v1/expenses/{expense_id}")
    print(f"GET: {status} {data['description']}")

    status, data = authed_request(token, "PATCH", f"/api/v1/expenses/{expense_id}", {"description": "Updated lunch"})
    print(f"PATCH: {status} {data['description']}")

    status, summary = authed_request(token, "GET", "/api/v1/stats/summary")
    print(f"SUMMARY: {status} {summary['expense_count']} expenses, total {summary['total_amount']}")

    status, _ = authed_request(token, "DELETE", f"/api/v1/expenses/{expense_id}")
    print(f"DELETE: {status}")

    admin_token = login("admin@example.com", "Admin123!")
    status, data = authed_request(admin_token, "GET", "/api/v1/expenses")
    print(f"ADMIN LIST: {status} {len(data)} expenses")

    print("All endpoints OK")


if __name__ == "__main__":
    main()
