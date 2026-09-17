from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/uangku"
    database_url_test: str = "postgresql+psycopg://postgres:postgres@localhost:5432/uangku_test"
    secret_key: str = "change-me-in-production"
    https_only: bool = False


settings = Settings()
