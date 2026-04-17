"""/api/icebergs endpoints."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.models import Iceberg, IcebergListResponse, Observation
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
