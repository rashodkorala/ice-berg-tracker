"""Pydantic models — both wire-level (request/response) and internal domain types.

These live in a single module for Phase 1; we'll split later if they grow.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

IcebergStatus = Literal["tracked", "grounded", "disintegrated"]


class GeoPoint(BaseModel):
    """GeoJSON Point. Coordinates are [longitude, latitude]."""

    type: Literal["Point"] = "Point"
    coordinates: list[float] = Field(min_length=2, max_length=2)


class LatestObservation(BaseModel):
    """Denormalized sub-document on the iceberg record for fast list queries."""

    latitude: float
    longitude: float
    observed_at: datetime
    area_sqnm: float | None = None


class Iceberg(BaseModel):
    """Wire representation of a single iceberg (returned by the API)."""

    model_config = ConfigDict(populate_by_name=True)

    name: str
    status: IcebergStatus = "tracked"
    source_glacier: str | None = None
    original_calving_date: datetime | None = None
    latest_observation: LatestObservation | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class Observation(BaseModel):
    """Single observation of an iceberg at a moment in time."""

    iceberg_name: str
    observed_at: datetime
    location: GeoPoint
    length_nm: float | None = None
    width_nm: float | None = None
    area_sqnm: float | None = None
    source: str = "polarwatch"
    raw_data: dict[str, Any] | None = None

    @property
    def latitude(self) -> float:
        return self.location.coordinates[1]

    @property
    def longitude(self) -> float:
        return self.location.coordinates[0]


class IcebergListResponse(BaseModel):
    count: int
    icebergs: list[Iceberg]


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    db: Literal["connected", "disconnected", "unknown"] = "unknown"
