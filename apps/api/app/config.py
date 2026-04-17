"""Application configuration loaded from environment/.env via pydantic-settings."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    """Typed settings. Values come from env vars or the repo-root `.env` file."""

    model_config = SettingsConfigDict(
        env_file=(REPO_ROOT / ".env", Path.cwd() / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    mongodb_uri: str = Field(
        default="mongodb://localhost:27017",
        alias="MONGODB_URI",
        description="MongoDB Atlas SRV connection string.",
    )
    mongodb_db: str = Field(default="iceberg_tracker", alias="MONGODB_DB")

    # Which live source to pull from:
    #   metno → Norwegian Met Institute iceberg API (NW Atlantic, weekly, live)
    #   usnic → NOAA PolarWatch ERDDAP usnic_weekly_iceberg (Antarctic)
    data_source: str = Field(default="metno", alias="DATA_SOURCE")

    erddap_server_url: str = Field(
        default="https://polarwatch.noaa.gov/erddap",
        alias="ERDDAP_SERVER_URL",
    )
    erddap_dataset_id: str = Field(
        default="usnic_weekly_iceberg",
        alias="ERDDAP_DATASET_ID",
    )

    metno_user_agent: str = Field(
        default="IcebergTracker/0.1 (https://github.com/yourusername/iceberg-tracker)",
        alias="METNO_USER_AGENT",
        description="Required by met.no API usage policy — include contact info.",
    )
    metno_ship_filter_km: float = Field(
        default=2.0,
        alias="METNO_SHIP_FILTER_KM",
        description="Drop features within this many km of a ship track (likely vessels).",
    )
    metno_weeks: int = Field(
        default=1,
        alias="METNO_WEEKS",
        description="How many past weekly scenes to fetch during seed.",
    )

    api_host: str = Field(default="0.0.0.0", alias="API_HOST")
    api_port: int = Field(default=8000, alias="API_PORT")
    cors_origins: str = Field(default="http://localhost:3000", alias="CORS_ORIGINS")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
