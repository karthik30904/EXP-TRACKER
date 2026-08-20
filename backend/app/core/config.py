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
    auth_secret_key: str = "dev-expense-tracker-secret-change-me"
    auth_algorithm: str = "HS256"
    access_token_minutes: int = 120
    seed_demo_accounts: bool = True
    demo_admin_email: str = "admin@example.com"
    demo_admin_password: str = "Admin123!"
    demo_user_email: str = "user@example.com"
    demo_user_password: str = "User123!"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
