"""Transform raw fetched rows into validated `Observation` domain models."""
from __future__ import annotations

import logging
import math
from collections.abc import Iterable
from typing import Any

import pandas as pd
from pydantic import ValidationError

from app.models import GeoPoint, Observation

logger = logging.getLogger(__name__)


def _scrub(value: Any) -> Any:
    """Convert NaN / pd.NA to None so Pydantic / MongoDB handle them cleanly."""
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    if value is pd.NA:
        return None
    return value


def dataframe_to_observations(
    df: pd.DataFrame, default_source: str = "polarwatch"
) -> list[Observation]:
    """Validate + convert a normalized DataFrame into Observation models.

    Rows that fail validation are dropped with a warning log (so one bad record
    doesn't kill the whole seed run).
    """
    observations: list[Observation] = []
    failures = 0

    for record in _iter_rows(df):
        try:
            obs = Observation(
                iceberg_name=str(record["iceberg_name"]).strip(),
                observed_at=record["observed_at"],
                location=GeoPoint(
                    coordinates=[float(record["longitude"]), float(record["latitude"])]
                ),
                length_nm=_scrub(record.get("length_nm")),
                width_nm=_scrub(record.get("width_nm")),
                area_sqnm=_scrub(record.get("area_sqnm")),
                source=str(record.get("source") or default_source),
                raw_data={k: _scrub(v) for k, v in record.items() if not k.startswith("_")},
            )
            observations.append(obs)
        except (ValidationError, ValueError, TypeError) as exc:
            failures += 1
            logger.warning("Skipping invalid row %s: %s", record.get("iceberg_name"), exc)

    if failures:
        logger.warning("Dropped %d invalid rows during parse", failures)
    logger.info("Parsed %d observations", len(observations))
    return observations


def _iter_rows(df: pd.DataFrame) -> Iterable[dict[str, Any]]:
    for _, row in df.iterrows():
        yield {k: _scrub(v) for k, v in row.to_dict().items()}
