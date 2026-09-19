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

    @model_validator(mode="after")
    def _check_production_secret(self) -> "Settings":
        if (
            self.app_env == "production"
            and self.secret_key == "change-me-in-production"
        ):
            raise ValueError(
                "SECRET_KEY must be changed from the default value in production."
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
