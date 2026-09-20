from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/uangku"
    database_url_test: str = "postgresql+psycopg://postgres:postgres@localhost:5432/uangku_test"
    secret_key: str = "change-me-in-production"
    https_only: bool = False
    app_env: str = "development"
    backend_url: str = ""
    # Comma-separated list of trusted reverse-proxy IPs (e.g. "10.0.0.1,10.0.0.2").
    # When set, X-Forwarded-For is trusted only for requests coming from these IPs.
    # Leave empty in local dev (rate-limiting falls back to request.client.host).
    trusted_proxy_ips: str = ""

    @property
    def trusted_proxy_set(self) -> frozenset[str]:
        """Return parsed set of trusted proxy IPs."""
        if not self.trusted_proxy_ips:
            return frozenset()
        return frozenset(ip.strip() for ip in self.trusted_proxy_ips.split(",") if ip.strip())

    @model_validator(mode="after")
    def _check_production_secret(self) -> "Settings":
        if self.app_env == "production":
            if self.secret_key == "change-me-in-production":
                raise ValueError(
                    "SECRET_KEY must be changed from the default value in production."
                )
            if len(self.secret_key) < 32:
                raise ValueError(
                    "SECRET_KEY must be at least 32 characters in production."
                )
        return self

    @model_validator(mode="after")
    def _check_production_transport(self) -> "Settings":
        if self.app_env == "production" and not self.https_only:
            raise ValueError(
                "HTTPS_ONLY must be true in production so session cookies are never sent over HTTP."
            )
        return self


settings = Settings()
