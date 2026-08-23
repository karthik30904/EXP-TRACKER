import json
import urllib.error
import urllib.request

BASE = "http://127.0.0.1:8001"
TOKEN = None


def get_token() -> str:
    global TOKEN
    if TOKEN is None:
        data = json.dumps({"email": "user@example.com", "password": "User123!"}).encode()
        headers = {"Content-Type": "application/json"}
        req = urllib.request.Request(f"{BASE}/api/v1/auth/login", data=data, method="POST", headers=headers)
        with urllib.request.urlopen(req) as resp:
            body = json.loads(resp.read().decode())
            TOKEN = body.get("access_token", "")
    return TOKEN


def request(method: str, path: str, body: dict | None = None) -> tuple[int, dict | list | str]:
    data = json.dumps(body).encode() if body else None
    headers = {"Content-Type": "application/json"}
    if not path.startswith("/health") and not path.startswith("/api/v1/auth"):
        headers["Authorization"] = f"Bearer {get_token()}"

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

    status, me = request("GET", "/api/v1/auth/me")
    print(f"AUTH ME: {status} {me.get('email', '')} (Role: {me.get('role', '')})")

    status, data = request("GET", "/api/v1/expenses")
    print(f"LIST: {status} {len(data)} expenses")

    status, created = request(
        "POST",
        "/api/v1/expenses",
        {"amount": "25.00", "description": "Test lunch", "category": "food", "date": "2026-08-18"},
    )
    print(f"CREATE: {status} {created['id']}")
    expense_id = created["id"]

    status, data = request("GET", f"/api/v1/expenses/{expense_id}")
    print(f"GET: {status} {data['description']}")

    status, data = request("PATCH", f"/api/v1/expenses/{expense_id}", {"description": "Updated lunch"})
    print(f"PATCH: {status} {data['description']}")

    status, summary = request("GET", "/api/v1/stats/summary")
    print(f"SUMMARY: {status} {summary['expense_count']} expenses, total {summary['total_amount']}")

    status, _ = request("DELETE", f"/api/v1/expenses/{expense_id}")
    print(f"DELETE: {status}")

    print("All endpoints OK")


if __name__ == "__main__":
    main()
