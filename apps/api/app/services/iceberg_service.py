"""Reads + writes against the `icebergs` and `observations` collections."""
from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any

from pymongo import UpdateOne

from app.db import icebergs_collection, observations_collection
from app.models import Iceberg, IcebergTrack, LatestObservation, Observation, TrackPoint

logger = logging.getLogger(__name__)


async def upsert_observations(observations: list[Observation]) -> dict[str, int]:
    """Idempotently upsert observations + their parent iceberg records.

    Observations are keyed on (iceberg_name, observed_at) so re-seeding the
    same satellite week doesn't create duplicates. Iceberg records are keyed
    on `name` with a denormalized `latest_observation`.

    Returns counts: {"observations_upserted", "icebergs_upserted"}.
    """
    if not observations:
        return {"observations_upserted": 0, "icebergs_upserted": 0}

    obs_ops = [
        UpdateOne(
            {"iceberg_name": obs.iceberg_name, "observed_at": obs.observed_at},
            {"$set": _observation_to_doc(obs)},
            upsert=True,
        )
        for obs in observations
    ]
    obs_result = await observations_collection().bulk_write(obs_ops, ordered=False)

    latest_by_name: dict[str, Observation] = {}
    for obs in observations:
        current = latest_by_name.get(obs.iceberg_name)
        if current is None or obs.observed_at > current.observed_at:
            latest_by_name[obs.iceberg_name] = obs

    now = datetime.now(UTC)
    iceberg_ops = [
        UpdateOne(
            {"name": name},
            {
                "$set": {
                    "latest_observation": LatestObservation(
                        latitude=obs.latitude,
                        longitude=obs.longitude,
                        observed_at=obs.observed_at,
                        area_sqnm=obs.area_sqnm,
                    ).model_dump(),
                    "updated_at": now,
                },
                "$setOnInsert": {
                    "name": name,
                    "status": "tracked",
                    "created_at": now,
                },
            },
            upsert=True,
        )
        for name, obs in latest_by_name.items()
    ]
    iceberg_result = await icebergs_collection().bulk_write(iceberg_ops, ordered=False)

    counts = {
        "observations_upserted": (obs_result.upserted_count or 0)
        + (obs_result.modified_count or 0),
        "icebergs_upserted": (iceberg_result.upserted_count or 0)
        + (iceberg_result.modified_count or 0),
    }
    logger.info("Upsert complete: %s", counts)
    return counts


async def list_icebergs(status: str | None = None) -> list[Iceberg]:
    query: dict[str, Any] = {}
    if status:
        query["status"] = status
    cursor = icebergs_collection().find(query).sort("latest_observation.observed_at", -1)
    results: list[Iceberg] = []
    async for doc in cursor:
        results.append(_doc_to_iceberg(doc))
    return results


async def get_iceberg(name: str) -> Iceberg | None:
    doc = await icebergs_collection().find_one({"name": name})
    if doc is None:
        return None
    return _doc_to_iceberg(doc)


async def get_observations(name: str) -> list[Observation]:
    cursor = observations_collection().find({"iceberg_name": name}).sort("observed_at", 1)
    results: list[Observation] = []
    async for doc in cursor:
        results.append(_doc_to_observation(doc))
    return results


async def list_tracks(min_points: int = 2) -> list[IcebergTrack]:
    """Return drift paths for every iceberg with at least `min_points` observations."""
    pipeline = [
        {"$sort": {"observed_at": 1}},
        {
            "$group": {
                "_id": "$iceberg_name",
                "points": {
                    "$push": {
                        "latitude": {"$arrayElemAt": ["$location.coordinates", 1]},
                        "longitude": {"$arrayElemAt": ["$location.coordinates", 0]},
                        "observed_at": "$observed_at",
                    }
                },
                "n": {"$sum": 1},
            }
        },
        {"$match": {"n": {"$gte": min_points}}},
        {"$sort": {"_id": 1}},
    ]
    cursor = observations_collection().aggregate(pipeline)
    tracks: list[IcebergTrack] = []
    async for doc in cursor:
        raw_points = doc["points"]
        tracks.append(
            IcebergTrack(
                iceberg_name=doc["_id"],
                points=[TrackPoint.model_validate(p) for p in raw_points],
            )
        )
    return tracks


async def count_icebergs() -> int:
    return await icebergs_collection().count_documents({})


def _observation_to_doc(obs: Observation) -> dict[str, Any]:
    doc = obs.model_dump()
    return doc


def _doc_to_iceberg(doc: dict[str, Any]) -> Iceberg:
    doc.pop("_id", None)
    return Iceberg.model_validate(doc)


def _doc_to_observation(doc: dict[str, Any]) -> Observation:
    doc.pop("_id", None)
    return Observation.model_validate(doc)
