"""Tests for the data parser — runs with `pnpm --filter api test`."""
from __future__ import annotations

from datetime import UTC, datetime

import pandas as pd

from app.data.parser import dataframe_to_observations


def test_dataframe_to_observations_valid():
    df = pd.DataFrame(
        [
            {
                "iceberg_name": "A-23a",
                "observed_at": datetime(2026, 1, 1, tzinfo=UTC),
                "latitude": -68.5,
                "longitude": -52.3,
                "length_nm": 40.0,
                "width_nm": 25.0,
                "area_sqnm": 1000.0,
            }
        ]
    )
    observations = dataframe_to_observations(df)
    assert len(observations) == 1
    obs = observations[0]
    assert obs.iceberg_name == "A-23a"
    assert obs.location.coordinates == [-52.3, -68.5]
    assert obs.area_sqnm == 1000.0


def test_dataframe_to_observations_drops_invalid_rows():
    df = pd.DataFrame(
        [
            {
                "iceberg_name": "A-23a",
                "observed_at": datetime(2026, 1, 1, tzinfo=UTC),
                "latitude": -68.5,
                "longitude": -52.3,
            },
            {
                "iceberg_name": "",
                "observed_at": None,
                "latitude": None,
                "longitude": None,
            },
        ]
    )
    observations = dataframe_to_observations(df)
    assert len(observations) == 1
    assert observations[0].iceberg_name == "A-23a"
