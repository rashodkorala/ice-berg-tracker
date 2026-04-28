"""Norwegian Meteorological Institute iceberg API fetcher.

Source: https://api.met.no/weatherapi/iceberg/0.1/ (GeoJSON) — Copernicus Sentinel-1 /
RCM SAR satellite observations covering the Arctic ocean and the NW Atlantic
(including Newfoundland's iceberg alley). Updated weekly.

Schema quirks we normalize away:

- Features have **no persistent iceberg ID** — each weekly scan is an anonymous
  snapshot. We synthesize a stable coordinate-and-date derived name so reseeds
  of the same week are idempotent, e.g. `NA-20260416-50.21N-53.42W`.
- `BRGARE` (area) is in m²; `IA_BLN` (max length) is in m. We convert to
  nautical units so everything in MongoDB is consistent with the USNIC schema.
- `ais_chk` is the distance in km to the nearest ship AIS track when AIS data
  was available. Values below the ship-filter threshold are likely vessels
  mis-classified as icebergs, so we drop them.
"""
from __future__ import annotations

import logging
import math
from datetime import UTC, datetime
from typing import Any

import httpx
import pandas as pd
from tenacity import (
    before_sleep_log,
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.config import get_settings

logger = logging.getLogger(__name__)

METNO_API_BASE = "https://api.met.no/weatherapi/iceberg/0.1/"

# 1 nautical mile = 1852 m, so 1 sq nm = 1852² = 3,429,904 m²
M_PER_NM = 1852.0
SQM_PER_SQNM = M_PER_NM * M_PER_NM

# Drop features flagged as being within this many km of a ship track — they
# are almost certainly SAR echoes of vessels rather than real icebergs.
DEFAULT_SHIP_FILTER_KM = 2.0

# Maximum inter-week travel distance (nm) for two detections to be considered
# the same physical iceberg.  Newfoundland's narrowest peninsulas are ~22–32 nm
# wide, so keeping this at 30 nm prevents most across-peninsula false positives
# while still capturing bergs drifting at up to ~4 km/day — the lower half of
# the typical 5–25 km/day range but the safe choice for coastal geometry.
MAX_LINK_DIST_NM = 30.0

# If both observations have a known area, their ratio must be below this factor.
# An iceberg can lose mass week-to-week but a 4× area change in seven days is
# physically implausible for any berg larger than ~0.001 sq nm.
MAX_AREA_RATIO = 4.0
# Only apply the area filter for bergs above this size (smaller readings are
# noisy enough that area comparison isn't reliable).
MIN_AREA_FOR_RATIO_CHECK = 0.001  # sq nm ≈ 3 430 m²
_EARTH_RADIUS_NM = 3440.065


def _great_circle_nm(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Fast equirectangular great-circle approximation in nautical miles."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = phi2 - phi1
    dlam = math.radians(lon2 - lon1)
    cos_mid = math.cos((phi1 + phi2) / 2.0)
    return _EARTH_RADIUS_NM * math.sqrt(dphi ** 2 + (cos_mid * dlam) ** 2)


def _link_weekly_frames(df: pd.DataFrame, max_dist_nm: float = MAX_LINK_DIST_NM) -> pd.DataFrame:
    """Link the same physical iceberg across consecutive weekly SAR scans.

    met.no features have no persistent ID — each weekly scan assigns a fresh
    synthetic name.  This function matches observations in adjacent weeks by
    proximity (greedy nearest-neighbour, one-to-one).  Matched rows in the
    later week inherit the earlier week's name so MongoDB upserts merge them
    into a single tracked entity with a real drift path.

    A ``_linked`` boolean column is added; the parser maps it to
    ``Observation.data_note`` for UI transparency.
    """
    if df.empty or len(df) < 2:
        df["_linked"] = False
        return df

    df = df.copy()
    df["_linked"] = False

    week_col = df["observed_at"].dt.tz_localize(None).dt.to_period("W")
    weeks = sorted(week_col.unique())
    if len(weeks) < 2:
        return df

    week_to_idx: dict = {w: list(df[week_col == w].index) for w in weeks}

    for i in range(1, len(weeks)):
        prev_idxs = week_to_idx[weeks[i - 1]]
        curr_idxs = week_to_idx[weeks[i]]
        if not prev_idxs or not curr_idxs:
            continue

        # Build all candidate (distance, curr_idx, prev_idx) triples within threshold
        candidates: list[tuple[float, int, int]] = []
        for c_idx in curr_idxs:
            c = df.loc[c_idx]
            for p_idx in prev_idxs:
                p = df.loc[p_idx]
                d = _great_circle_nm(
                    float(c["latitude"]), float(c["longitude"]),
                    float(p["latitude"]), float(p["longitude"]),
                )
                if d > max_dist_nm:
                    continue

                # Area-similarity guard: reject matches where one berg is much
                # larger/smaller than the other — likely different icebergs that
                # happen to be nearby.
                c_area = c.get("area_sqnm")
                p_area = p.get("area_sqnm")
                if (
                    c_area is not None and p_area is not None
                    and not math.isnan(float(c_area)) and not math.isnan(float(p_area))
                    and float(c_area) > MIN_AREA_FOR_RATIO_CHECK
                    and float(p_area) > MIN_AREA_FOR_RATIO_CHECK
                ):
                    ratio = max(float(c_area), float(p_area)) / min(float(c_area), float(p_area))
                    if ratio > MAX_AREA_RATIO:
                        continue

                candidates.append((d, c_idx, p_idx))

        # Greedy one-to-one assignment: sort by distance, skip already-matched
        candidates.sort()
        used_prev: set[int] = set()
        used_curr: set[int] = set()
        for _d, c_idx, p_idx in candidates:
            if p_idx in used_prev or c_idx in used_curr:
                continue
            df.loc[c_idx, "iceberg_name"] = df.loc[p_idx, "iceberg_name"]
            df.loc[c_idx, "_linked"] = True
            used_prev.add(p_idx)
            used_curr.add(c_idx)

    linked_count = int(df["_linked"].sum())
    logger.info("Linked %d observations to a previous week's detection", linked_count)
    return df


class MetnoFetchError(RuntimeError):
    """Raised when the met.no iceberg API is unreachable or returns bad data."""


@retry(
    reraise=True,
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    retry=retry_if_exception_type((httpx.HTTPError, httpx.TimeoutException)),
    before_sleep=before_sleep_log(logger, logging.WARNING),
)
def _http_get_json(url: str, user_agent: str) -> dict[str, Any]:
    logger.info("GET %s", url)
    with httpx.Client(
        timeout=30.0,
        follow_redirects=True,
        headers={"User-Agent": user_agent, "Accept": "application/geo+json"},
    ) as client:
        response = client.get(url)
        response.raise_for_status()
        return response.json()


def _synth_name(observed_at: datetime, lat: float, lon: float) -> str:
    lat_s = f"{abs(lat):.2f}{'N' if lat >= 0 else 'S'}"
    lon_s = f"{abs(lon):.2f}{'E' if lon >= 0 else 'W'}"
    return f"NA-{observed_at.strftime('%Y%m%d')}-{lat_s}-{lon_s}"


def _parse_ais_chk(value: Any) -> float | None:
    """ais_chk is either the string 'NA' or a numeric km distance."""
    if value is None or value == "NA":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _feature_to_row(feature: dict[str, Any], ship_filter_km: float) -> dict[str, Any] | None:
    try:
        coords = feature["geometry"]["coordinates"]
        lon, lat = float(coords[0]), float(coords[1])
        instant = feature["when"]["instant"]
        props = feature.get("properties") or {}
    except (KeyError, TypeError, ValueError, IndexError):
        return None

    observed_at = pd.to_datetime(instant, utc=True, errors="coerce", format="ISO8601")
    if pd.isna(observed_at):
        return None

    ais_km = _parse_ais_chk(props.get("ais_chk"))
    if ais_km is not None and ais_km < ship_filter_km:
        return None

    area_m2 = props.get("BRGARE")
    length_m = props.get("IA_BLN")

    area_sqnm = float(area_m2) / SQM_PER_SQNM if area_m2 is not None else None
    length_nm = float(length_m) / M_PER_NM if length_m is not None else None

    return {
        "iceberg_name": _synth_name(observed_at.to_pydatetime(), lat, lon),
        "observed_at": observed_at,
        "latitude": lat,
        "longitude": lon,
        "length_nm": length_nm,
        "width_nm": None,
        "area_sqnm": area_sqnm,
        "source": "metno",
        "_raw_properties": props,
    }


def fetch_metno_observations(
    date: str | None = None,
    ship_filter_km: float = DEFAULT_SHIP_FILTER_KM,
) -> pd.DataFrame:
    """Fetch the latest met.no iceberg scene (or a specific week's scene).

    Args:
        date: Optional ISO date "YYYY-MM-DD"; fetches the weekly file ending
            on or before that date. Defaults to the current week.
        ship_filter_km: Drop features with ais_chk < this (km). Set to 0 to
            keep everything.
    """
    settings = get_settings()
    url = METNO_API_BASE + (f"?date={date}" if date else "")

    try:
        payload = _http_get_json(url, user_agent=settings.metno_user_agent)
    except httpx.HTTPError as exc:
        raise MetnoFetchError(f"met.no request failed: {exc}") from exc

    features = payload.get("features") or []
    if not features:
        raise MetnoFetchError("met.no returned an empty FeatureCollection")

    raw_rows: list[dict[str, Any]] = []
    dropped = 0
    for feature in features:
        row = _feature_to_row(feature, ship_filter_km=ship_filter_km)
        if row is None:
            dropped += 1
            continue
        raw_rows.append(row)

    if dropped:
        logger.info(
            "Dropped %d met.no features (invalid or within %.1fkm of a ship)",
            dropped,
            ship_filter_km,
        )

    df = pd.DataFrame(raw_rows)
    logger.info(
        "Fetched %d icebergs from met.no (latest observation: %s)",
        len(df),
        df["observed_at"].max() if not df.empty else "n/a",
    )
    return df


def _last_n_weeks(n: int) -> list[str]:
    """Return N most recent Saturday-ending dates in YYYY-MM-DD format.

    met.no's weekly files are dated on the Saturday (end of SAR integration
    period). Using Saturday dates maximises cache hits; intermediate days
    will 404 or return the same file.
    """
    today = datetime.now(UTC).date()
    days_since_sat = (today.weekday() + 2) % 7  # Monday=0, so Sat is 5
    last_sat = today.fromordinal(today.toordinal() - days_since_sat)
    dates = []
    for i in range(n):
        d = last_sat.fromordinal(last_sat.toordinal() - i * 7)
        dates.append(d.isoformat())
    return dates


def fetch_metno_multiweek(
    weeks: int, ship_filter_km: float = DEFAULT_SHIP_FILTER_KM
) -> pd.DataFrame:
    """Fetch several consecutive weekly scenes, concatenated."""
    frames: list[pd.DataFrame] = []
    for date in _last_n_weeks(weeks):
        try:
            frames.append(fetch_metno_observations(date=date, ship_filter_km=ship_filter_km))
        except MetnoFetchError as exc:
            logger.warning("Skipping week %s: %s", date, exc)

    if not frames:
        raise MetnoFetchError("no met.no weeks returned any data")

    df = pd.concat(frames, ignore_index=True)
    df = df.drop_duplicates(subset=["iceberg_name", "observed_at"]).reset_index(drop=True)
    # Link the same physical berg across weeks before the data leaves this module.
    df = _link_weekly_frames(df)
    # Re-deduplicate: linking can produce (name, observed_at) collisions if two
    # bergs in the same week were both matched to the same previous-week berg
    # (shouldn't happen with one-to-one matching, but guard anyway).
    df = df.drop_duplicates(subset=["iceberg_name", "observed_at"]).reset_index(drop=True)
    logger.info("Fetched %d total met.no observations across %d weeks", len(df), len(frames))
    return df
