from __future__ import annotations

import secrets
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Optional

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class OTPRecord:
    otp: str
    purpose: str
    expires_at: datetime
    attempts: int = 0
    created_at: datetime = datetime.now(UTC)


class OTPService:
    """Manages OTP generation, validation, expiration, and login attempt restrictions."""

    def __init__(self) -> None:
        self._otps: dict[tuple[str, str], OTPRecord] = {}  # key: (normalized_email, purpose)
        self._login_attempts: dict[str, dict] = {}  # key: normalized_email -> {attempts: int, locked_until: datetime}

    def _normalize_email(self, email: str) -> str:
        return email.strip().lower()

    def generate_otp(self, email: str, purpose: str, expire_minutes: Optional[int] = None) -> tuple[str, int]:
        """Generate and save a 6-digit numeric OTP for a given email and purpose."""
        norm_email = self._normalize_email(email)
        ttl = expire_minutes or settings.otp_expire_minutes
        now = datetime.now(UTC)

        # Generate cryptographically secure 6-digit numeric code
        otp_code = f"{secrets.randbelow(1000000):06d}"
        expires_at = now + timedelta(minutes=ttl)

        self._otps[(norm_email, purpose)] = OTPRecord(
            otp=otp_code,
            purpose=purpose,
            expires_at=expires_at,
            attempts=0,
            created_at=now,
        )

        logger.info(
            "otp_generated",
            email=norm_email,
            purpose=purpose,
            expires_at=expires_at.isoformat(),
        )
        return otp_code, ttl

    def verify_otp(self, email: str, purpose: str, entered_otp: str) -> tuple[bool, str]:
        """Verify the entered OTP against the active record for the given email and purpose."""
        norm_email = self._normalize_email(email)
        key = (norm_email, purpose)
        record = self._otps.get(key)
        now = datetime.now(UTC)

        if not record:
            return False, "No active verification code found. Please request a new code."

        if now > record.expires_at:
            self._otps.pop(key, None)
            return False, "Verification code has expired. Please request a new code."

        if record.attempts >= settings.max_otp_attempts:
            self._otps.pop(key, None)
            return (
                False,
                f"Too many failed attempts. This verification code has been revoked. Please request a new one.",
            )

        if secrets.compare_digest(record.otp, entered_otp.strip()):
            # Correct OTP - remove record and succeed
            self._otps.pop(key, None)
            return True, "Verification successful."

        # Wrong OTP entered
        record.attempts += 1
        remaining = settings.max_otp_attempts - record.attempts
        if remaining <= 0:
            self._otps.pop(key, None)
            return (
                False,
                "Incorrect verification code. Maximum attempts exceeded, code revoked. Please request a new one.",
            )

        return (
            False,
            f"Incorrect verification code entered. You have {remaining} attempt{'s' if remaining != 1 else ''} remaining.",
        )

    def can_resend_otp(self, email: str, purpose: str, cooldown_seconds: int = 60) -> tuple[bool, int]:
        """Check if enough time has passed to resend an OTP (anti-spam cooldown)."""
        norm_email = self._normalize_email(email)
        key = (norm_email, purpose)
        record = self._otps.get(key)
        if not record:
            return True, 0

        now = datetime.now(UTC)
        elapsed = (now - record.created_at).total_seconds()
        if elapsed < cooldown_seconds:
            remaining = int(cooldown_seconds - elapsed)
            return False, remaining
        return True, 0

    # -------------------------------------------------------------
    # Login Attempt Lockout / Restriction
    # -------------------------------------------------------------
    def is_login_locked(self, email: str) -> tuple[bool, Optional[str]]:
        """Check if account is temporarily restricted due to repeated wrong password entries."""
        norm_email = self._normalize_email(email)
        record = self._login_attempts.get(norm_email)
        if not record:
            return False, None

        locked_until = record.get("locked_until")
        if locked_until:
            now = datetime.now(UTC)
            if now < locked_until:
                mins_left = max(1, int((locked_until - now).total_seconds() / 60))
                return True, (
                    f"Account access is temporarily restricted due to multiple failed login attempts. "
                    f"Please try again in {mins_left} minute(s) or use 'Forgot Password' to reset."
                )
            else:
                # Lockout expired, clear record
                self._login_attempts.pop(norm_email, None)

        return False, None

    def record_login_failure(self, email: str) -> str:
        """Increment failed password count and lock if threshold exceeded."""
        norm_email = self._normalize_email(email)
        now = datetime.now(UTC)
        record = self._login_attempts.get(norm_email, {"attempts": 0, "locked_until": None})

        record["attempts"] += 1
        remaining_attempts = settings.max_login_attempts - record["attempts"]

        if record["attempts"] >= settings.max_login_attempts:
            record["locked_until"] = now + timedelta(minutes=settings.lockout_minutes)
            self._login_attempts[norm_email] = record
            return (
                f"You entered an incorrect password. Account access is now restricted for {settings.lockout_minutes} minutes. "
                f"You can reset your password immediately using 'Forgot Password'."
            )

        self._login_attempts[norm_email] = record
        return (
            f"You entered an incorrect password. Please check your credentials. "
            f"({remaining_attempts} attempt{'s' if remaining_attempts != 1 else ''} remaining before temporary restriction)"
        )

    def record_login_success(self, email: str) -> None:
        """Clear failed attempts on successful login."""
        norm_email = self._normalize_email(email)
        self._login_attempts.pop(norm_email, None)


otp_service = OTPService()
