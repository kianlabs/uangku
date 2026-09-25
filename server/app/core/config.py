from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/uangku"
    database_url_test: str = (
        "postgresql+psycopg://postgres:postgres@localhost:5432/uangku_test"
    )
    secret_key: str = "change-me-in-production"
    https_only: bool = False
    app_env: str = "development"
    # Comma-separated list of trusted reverse-proxy IPs (e.g. "10.0.0.1,10.0.0.2").
    # When set, X-Forwarded-For is trusted only for requests coming from these IPs.
    # Leave empty in local dev (rate-limiting falls back to request.client.host).
    trusted_proxy_ips: str = ""
    # Allowed frontend origins for CSRF validation (comma-separated, e.g. "https://my-app.vercel.app").
    allowed_origins: str = ""
    # Google OAuth 2.0 credentials
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = ""
    # Database connection pool settings (tuned for production / serverless Postgres)
    db_pool_size: int = 5
    db_max_overflow: int = 10
    db_pool_recycle: int = 300

    @property
    def trusted_proxy_set(self) -> frozenset[str]:
        """Return parsed set of trusted proxy IPs."""
        if not self.trusted_proxy_ips:
            return frozenset()
        return frozenset(
            ip.strip() for ip in self.trusted_proxy_ips.split(",") if ip.strip()
        )

    @property
    def is_google_auth_enabled(self) -> bool:
        """Return True jika kredensial Google OAuth lengkap."""
        return bool(self.google_client_id and self.google_client_secret)

    @property
    def allowed_origins_set(self) -> frozenset[str]:
        """Return parsed set of allowed origin hostnames."""
        if not self.allowed_origins:
            return frozenset()
        hosts = set()
        for item in self.allowed_origins.split(","):
            raw = item.strip().lower()
            if not raw:
                continue
            if "://" in raw:
                from urllib.parse import urlparse

                parsed = urlparse(raw)
                if parsed.hostname:
                    hosts.add(parsed.hostname)
            else:
                hosts.add(raw.split(":")[0])
        return frozenset(hosts)

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
