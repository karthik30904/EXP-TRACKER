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
    print("=== Email OTP & Password Management Test Suite ===")

    # 1. Health Check
    print("\n1. Health Check")
    status, health = request("GET", "/health")
    assert_eq("Health returns 200", status, 200)

    # 2. Registration OTP Flow
    print("\n2. Registration OTP Flow")
    unique_email = f"user_{uuid.uuid4().hex[:6]}@example.com"
    status, res = request("POST", "/api/v1/auth/register/send-otp", {"email": unique_email})
    assert_eq("Send OTP returns 200", status, 200)
    assert_true("Response has dev_otp for testing", "dev_otp" in res and res["dev_otp"] is not None)
    otp = res["dev_otp"]

    # Try invalid OTP
    status, err = request(
        "POST",
        "/api/v1/auth/register/verify",
        {"email": unique_email, "otp": "000000", "password": "SecurePassword123!", "full_name": "OTP Test User"},
    )
    assert_eq("Invalid OTP returns 400", status, 400)
    assert_true("Error mentions incorrect code", "Incorrect" in str(err.get("detail", "")))

    # Verify with correct OTP
    status, auth_res = request(
        "POST",
        "/api/v1/auth/register/verify",
        {"email": unique_email, "otp": otp, "password": "SecurePassword123!", "full_name": "OTP Test User"},
    )
    assert_eq("Correct OTP returns 201", status, 201)
    assert_true("Returns access token", "access_token" in auth_res)
    user_token = auth_res["access_token"]

    # 3. Duplicate Registration Check
    print("\n3. Duplicate Registration Rejection")
    status, _ = request("POST", "/api/v1/auth/register/send-otp", {"email": unique_email})
    assert_eq("Duplicate email OTP request returns 409", status, 409)

    # 4. Sign In & Wrong Password Restriction
    print("\n4. Sign In & Wrong Password Restriction")
    # Correct password
    status, res = request("POST", "/api/v1/auth/login", {"email": unique_email, "password": "SecurePassword123!"})
    assert_eq("Correct login returns 200", status, 200)

    # Wrong password attempt
    status, err = request("POST", "/api/v1/auth/login", {"email": unique_email, "password": "WrongPassword!"})
    assert_eq("Wrong password returns 401", status, 401)
    assert_true("Mentions incorrect password", "incorrect password" in str(err.get("detail", "")).lower())

    # Exceed retry threshold (4 more wrong attempts -> lockout)
    for _ in range(4):
        status, err = request("POST", "/api/v1/auth/login", {"email": unique_email, "password": "WrongPassword!"})

    assert_eq("Locked out returns 403 or 401 with lock message", status in [401, 403], True)
    assert_true("Error mentions restriction", "restricted" in str(err.get("detail", "")).lower())

    # 5. Forgot Password Flow
    print("\n5. Forgot Password Flow")
    # Non-existent user
    status, _ = request("POST", "/api/v1/auth/forgot-password/send-otp", {"email": "nobody@example.com"})
    assert_eq("Unknown user returns 404", status, 404)

    # Existing user forgot password
    status, reset_res = request("POST", "/api/v1/auth/forgot-password/send-otp", {"email": unique_email})
    assert_eq("Forgot password OTP returns 200", status, 200)
    reset_otp = reset_res["dev_otp"]

    # Reset with wrong OTP
    status, err = request(
        "POST",
        "/api/v1/auth/forgot-password/reset",
        {"email": unique_email, "otp": "999999", "new_password": "NewSecurePassword456!"},
    )
    assert_eq("Reset with wrong OTP returns 400", status, 400)

    # Reset with correct OTP
    status, reset_ok = request(
        "POST",
        "/api/v1/auth/forgot-password/reset",
        {"email": unique_email, "otp": reset_otp, "new_password": "NewSecurePassword456!"},
    )
    assert_eq("Reset with valid OTP returns 200", status, 200)

    # Login with old password should fail
    status, _ = request("POST", "/api/v1/auth/login", {"email": unique_email, "password": "SecurePassword123!"})
    assert_eq("Old password login fails (401)", status, 401)

    # Login with new password should succeed and unlock account
    status, login_res = request("POST", "/api/v1/auth/login", {"email": unique_email, "password": "NewSecurePassword456!"})
    assert_eq("New password login succeeds (200)", status, 200)
    new_token = login_res["access_token"]

    # 6. Authenticated Password Change (Settings / Profile)
    print("\n6. Authenticated Password Change")
    # Wrong current password
    status, err = request(
        "PATCH",
        "/api/v1/auth/profile",
        {"current_password": "TotallyWrongPassword!", "new_password": "AnotherBrandNewPassword789!"},
        token=new_token,
    )
    assert_eq("Wrong current password returns 400", status, 400)
    assert_true("Error mentions restricted/incorrect", "incorrect" in str(err.get("detail", "")).lower())

    # Correct current password
    status, prof_res = request(
        "PATCH",
        "/api/v1/auth/profile",
        {"current_password": "NewSecurePassword456!", "new_password": "AnotherBrandNewPassword789!"},
        token=new_token,
    )
    assert_eq("Correct password change returns 200", status, 200)

    # Login with final password
    status, _ = request("POST", "/api/v1/auth/login", {"email": unique_email, "password": "AnotherBrandNewPassword789!"})
    assert_eq("Login with final password succeeds (200)", status, 200)

    # Final summary
    print("\n=========================================")
    print(f"Results: {passed} passed, {failed} failed")
    if failed:
        for err_msg in errors:
            print(f"  {err_msg}")
        sys.exit(1)
    else:
        print("All OTP & Password Management tests PASSED!")


if __name__ == "__main__":
    run_tests()
