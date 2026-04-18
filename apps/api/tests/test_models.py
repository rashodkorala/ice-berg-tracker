"""Wire-model sanity checks."""
from __future__ import annotations

from datetime import UTC, datetime

from app.models import IcebergTrack, TrackPoint, TracksResponse


def test_tracks_response_roundtrip():
    tr = IcebergTrack(
        iceberg_name="A-76a",
        points=[
            TrackPoint(
                latitude=-65.0,
                longitude=-45.0,
                observed_at=datetime(2026, 1, 1, tzinfo=UTC),
            ),
            TrackPoint(
                latitude=-64.5,
                longitude=-44.8,
                observed_at=datetime(2026, 2, 1, tzinfo=UTC),
            ),
        ],
    )
    payload = TracksResponse(tracks=[tr])
    assert payload.tracks[0].points[1].latitude == -64.5
