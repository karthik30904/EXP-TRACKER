from __future__ import annotations

import smtplib
from email.message import EmailMessage
from typing import Optional

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class EmailService:
    """Service to send emails via SMTP with development logging fallback."""

    def __init__(self) -> None:
        self.host = settings.smtp_host
        self.port = settings.smtp_port
        self.user = settings.smtp_user
        self.password = settings.smtp_password
        self.from_email = settings.smtp_from_email
        self.from_name = settings.smtp_from_name
        self.use_tls = settings.smtp_tls

    def is_smtp_configured(self) -> bool:
        return bool(self.host and self.from_email)

    def send_email(
        self,
        to_email: str,
        subject: str,
        html_body: str,
        text_body: Optional[str] = None,
    ) -> bool:
        """Send an email using SMTP or log to console if not configured."""
        if not self.is_smtp_configured():
            logger.info(
                "email_mock_sent",
                to=to_email,
                subject=subject,
                preview=(text_body or html_body)[:100],
            )
            return True

        try:
            msg = EmailMessage()
            msg["Subject"] = subject
            msg["From"] = f"{self.from_name} <{self.from_email}>"
            msg["To"] = to_email

            if text_body:
                msg.set_content(text_body)
                msg.add_alternative(html_body, subtype="html")
            else:
                msg.set_content(html_body, subtype="html")

            with smtplib.SMTP(self.host, self.port, timeout=10) as server:
                if self.use_tls:
                    server.starttls()
                if self.user and self.password:
                    server.login(self.user, self.password)
                server.send_message(msg)

            logger.info("email_sent_successfully", to=to_email, subject=subject)
            return True
        except Exception as e:
            logger.error("email_send_failed", to=to_email, error=str(e))
            return False

    def send_registration_otp(self, to_email: str, otp: str, expire_minutes: int = 10) -> bool:
        subject = f"Your Verification Code: {otp} - FIN$ight"
        text_body = (
            f"Welcome to FIN$ight Expense Tracker!\n\n"
            f"Your verification code is: {otp}\n\n"
            f"This code will expire in {expire_minutes} minutes. If you did not request this, please ignore this email."
        )
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b132b; color: #e2e8f0; margin: 0; padding: 20px; }}
            .container {{ max-width: 520px; margin: 0 auto; background: #1c2541; border: 1px solid #3a506b; border-radius: 12px; padding: 32px; }}
            .logo {{ font-size: 24px; font-weight: 800; color: #00f2fe; margin-bottom: 20px; letter-spacing: 1px; }}
            .otp-box {{ background: #0b132b; border: 2px dashed #00f2fe; border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0; }}
            .otp-code {{ font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #4facfe; font-family: monospace; }}
            .footer {{ font-size: 12px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #3a506b; padding-top: 16px; }}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">⚡ FIN$ight</div>
            <h2 style="color: #ffffff; margin-top: 0;">Verify Your Email Address</h2>
            <p>Thank you for signing up for FIN$ight Expense Tracker. Use the verification code below to verify your email and complete your registration:</p>
            <div class="otp-box">
              <div class="otp-code">{otp}</div>
            </div>
            <p style="font-size: 14px; color: #94a3b8;">This code is valid for <strong>{expire_minutes} minutes</strong>. If you did not attempt to sign up, you can safely ignore this email.</p>
            <div class="footer">
              &copy; FIN$ight Expense Intelligence &bull; Secured with automated verification
            </div>
          </div>
        </body>
        </html>
        """
        return self.send_email(to_email, subject, html_body, text_body)

    def send_password_reset_otp(self, to_email: str, otp: str, expire_minutes: int = 10) -> bool:
        subject = f"Password Reset Code: {otp} - FIN$ight"
        text_body = (
            f"FIN$ight Password Reset Request\n\n"
            f"Your password reset verification code is: {otp}\n\n"
            f"This code will expire in {expire_minutes} minutes. If you did not request a password reset, please secure your account immediately."
        )
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b132b; color: #e2e8f0; margin: 0; padding: 20px; }}
            .container {{ max-width: 520px; margin: 0 auto; background: #1c2541; border: 1px solid #ef4444; border-radius: 12px; padding: 32px; }}
            .logo {{ font-size: 24px; font-weight: 800; color: #00f2fe; margin-bottom: 20px; letter-spacing: 1px; }}
            .otp-box {{ background: #0b132b; border: 2px dashed #ef4444; border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0; }}
            .otp-code {{ font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #f87171; font-family: monospace; }}
            .footer {{ font-size: 12px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #3a506b; padding-top: 16px; }}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">⚡ FIN$ight</div>
            <h2 style="color: #ffffff; margin-top: 0;">Reset Your Password</h2>
            <p>We received a request to reset your password for your FIN$ight account. Use the verification code below to authorize your password change:</p>
            <div class="otp-box">
              <div class="otp-code">{otp}</div>
            </div>
            <p style="font-size: 14px; color: #94a3b8;">This code is valid for <strong>{expire_minutes} minutes</strong>. If you did not request this password reset, please ignore this email.</p>
            <div class="footer">
              &copy; FIN$ight Expense Intelligence &bull; Account Protection
            </div>
          </div>
        </body>
        </html>
        """
        return self.send_email(to_email, subject, html_body, text_body)


email_service = EmailService()
