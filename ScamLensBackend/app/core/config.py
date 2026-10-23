from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = "ScamLens API"
    app_env: str = "development"
    database_url: str = "sqlite:///./scamlens_dev.db"
    jwt_secret: str = "development-only-change-me"
    jwt_issuer: str = "scamlens-api"
    access_token_minutes: int = 60
    google_client_id: str = ""
    cors_origins: str = "chrome-extension://dflegigijeolhcafocojenplplcjdjba/,localhost:8081"
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

@lru_cache
def get_settings() -> Settings:
    return Settings()
