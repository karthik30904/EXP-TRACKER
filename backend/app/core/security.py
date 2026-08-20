from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

from app.core.config import settings

PASSWORD_ITERATIONS = 210_000


def _base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _base64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def _json_dumps(payload: dict[str, Any]) -> bytes:
    return json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")


def hash_password(password: str, *, salt: bytes | None = None) -> str:
    raw_salt = salt or secrets.token_bytes(16)
    derived = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        raw_salt,
        PASSWORD_ITERATIONS,
    )
    return "pbkdf2_sha256${iterations}${salt}${hash}".format(
        iterations=PASSWORD_ITERATIONS,
        salt=_base64url_encode(raw_salt),
        hash=_base64url_encode(derived),
    )


def verify_password(password: str, password_hash: str) -> bool:
    try:
        algorithm, iterations, salt, expected_hash = password_hash.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        derived = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            _base64url_decode(salt),
            int(iterations),
        )
        return hmac.compare_digest(_base64url_encode(derived), expected_hash)
    except Exception:
        return False


def create_access_token(
    *,
    subject: str,
    role: str,
    expires_delta: timedelta | None = None,
) -> str:
    expires = datetime.now(UTC) + (expires_delta or timedelta(minutes=settings.access_token_minutes))
    header = {"alg": settings.auth_algorithm, "typ": "JWT"}
    payload = {
        "sub": subject,
        "role": role,
        "iat": int(datetime.now(UTC).timestamp()),
        "exp": int(expires.timestamp()),
    }
    signing_input = ".".join(
        [
            _base64url_encode(_json_dumps(header)),
            _base64url_encode(_json_dumps(payload)),
        ]
    ).encode("ascii")
    signature = hmac.new(
        settings.auth_secret_key.encode("utf-8"),
        signing_input,
        hashlib.sha256,
    ).digest()
    return f"{signing_input.decode('ascii')}.{_base64url_encode(signature)}"


def decode_access_token(token: str) -> dict[str, Any]:
    try:
        header_b64, payload_b64, signature_b64 = token.split(".")
        signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
        expected = hmac.new(
            settings.auth_secret_key.encode("utf-8"),
            signing_input,
            hashlib.sha256,
        ).digest()
        actual = _base64url_decode(signature_b64)
        if not hmac.compare_digest(expected, actual):
            raise ValueError("Invalid token signature")

        payload = json.loads(_base64url_decode(payload_b64))
        expires_at = datetime.fromtimestamp(int(payload["exp"]), tz=UTC)
        if expires_at < datetime.now(UTC):
            raise ValueError("Token expired")
        return payload
    except Exception as exc:
        raise ValueError("Invalid access token") from exc
