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


def main() -> None:
    status, data = request("GET", "/health")
    print(f"HEALTH: {status} {data}")

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
