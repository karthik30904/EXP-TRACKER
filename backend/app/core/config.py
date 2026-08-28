from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Expense Tracker API"
    debug: bool = False
    log_level: str = "INFO"
    cors_origins: str = "http://localhost:3000"
    api_v1_prefix: str = "/api/v1"
    use_database: bool = False
    database_url: str = ""
    frontend_url: str = "http://localhost:3000"
    jwt_secret_key: str = "dev-secret-key-change-in-production-1234567890"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440

    # Email & SMTP Settings
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from_email: str = "noreply@finsight.local"
    smtp_from_name: str = "FIN$ight Expense Tracker"
    smtp_tls: bool = True
    otp_expire_minutes: int = 10
    max_otp_attempts: int = 5
    max_login_attempts: int = 5
    lockout_minutes: int = 15

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()

