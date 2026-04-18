"""/api/icebergs endpoints."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.models import Iceberg, IcebergListResponse, Observation, TracksResponse
from app.services import iceberg_service

router = APIRouter(prefix="/api/icebergs", tags=["icebergs"])


@router.get("", response_model=IcebergListResponse)
async def list_icebergs(
    status: str | None = Query(
        default=None,
        description="Optional status filter: tracked | grounded | disintegrated",
    ),
) -> IcebergListResponse:
    icebergs = await iceberg_service.list_icebergs(status=status)
    return IcebergListResponse(count=len(icebergs), icebergs=icebergs)


@router.get("/tracks", response_model=TracksResponse)
async def list_tracks(
    min_points: int = Query(
        default=2,
        ge=2,
        le=50,
        description="Minimum observation count per iceberg to emit a path",
    ),
) -> TracksResponse:
    """Polylines for icebergs with multiple logged positions (oldest → newest)."""
    tracks = await iceberg_service.list_tracks(min_points=min_points)
    return TracksResponse(tracks=tracks)


@router.get("/{name}", response_model=Iceberg)
async def get_iceberg(name: str) -> Iceberg:
    iceberg = await iceberg_service.get_iceberg(name)
    if iceberg is None:
        raise HTTPException(status_code=404, detail=f"Iceberg {name!r} not found")
    return iceberg


@router.get("/{name}/observations", response_model=list[Observation])
async def list_observations(name: str) -> list[Observation]:
    iceberg = await iceberg_service.get_iceberg(name)
    if iceberg is None:
        raise HTTPException(status_code=404, detail=f"Iceberg {name!r} not found")
    return await iceberg_service.get_observations(name)
