"""ERDDAP data fetching with retry + exponential backoff.

We use `erddapy` to shape the request URL against NOAA PolarWatch, then `httpx`
to perform the actual HTTP call so we can wrap it with `tenacity` retries.

The real dataset ID / variable names on PolarWatch are set via environment
variables (ERDDAP_DATASET_ID) — if the target dataset can't be reached or
responds without the expected columns, we gracefully fall back to a small,
deterministic sample so the rest of the pipeline (seed + API) still works
for local development. This keeps Phase 1 self-contained while letting a real
ERDDAP endpoint slot in later with zero code changes.
"""
from __future__ import annotations

import io
import logging
from datetime import UTC, datetime, timedelta

import httpx
import pandas as pd
from erddapy import ERDDAP
from tenacity import (
    RetryError,
    before_sleep_log,
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.config import get_settings

logger = logging.getLogger(__name__)

# ERDDAP column naming varies between datasets; these are the names we'll try,
# in order, when normalizing the DataFrame.
_NAME_COLS = ("iceberg", "iceberg_name", "berg_name", "name")
_TIME_COLS = ("time", "observed_at", "date")
_LAT_COLS = ("latitude", "lat")
_LON_COLS = ("longitude", "lon")
_LEN_COLS = ("length_nm", "length")
_WIDTH_COLS = ("width_nm", "width")
_AREA_COLS = ("area_sqnm", "area")


class ERDDAPFetchError(RuntimeError):
    """Raised when ERDDAP is unreachable or returns unexpected content."""


@retry(
    reraise=True,
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    retry=retry_if_exception_type((httpx.HTTPError, httpx.TimeoutException)),
    before_sleep=before_sleep_log(logger, logging.WARNING),
)
def _http_get(url: str) -> str:
    logger.info("GET %s", url)
    with httpx.Client(timeout=30.0, follow_redirects=True) as client:
        response = client.get(url)
        response.raise_for_status()
        return response.text


def _build_erddap_url(since: datetime | None = None) -> str | None:
    """Build the tabledap CSV URL, optionally constrained to observations at/after `since`."""
    settings = get_settings()
    try:
        e = ERDDAP(server=settings.erddap_server_url, protocol="tabledap", response="csv")
        e.dataset_id = settings.erddap_dataset_id
        if since is not None:
            e.constraints = {"time>=": since.strftime("%Y-%m-%dT%H:%M:%SZ")}
        return e.get_download_url()
    except Exception as exc:  # pragma: no cover — erddapy's surface is broad
        logger.warning(
            "Could not build ERDDAP URL for dataset %s: %s",
            settings.erddap_dataset_id,
            exc,
        )
        return None


def _pick(df: pd.DataFrame, candidates: tuple[str, ...]) -> str | None:
    cols = {c.lower(): c for c in df.columns}
    for candidate in candidates:
        if candidate in cols:
            return cols[candidate]
    return None


def _normalize(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize raw ERDDAP columns into our canonical schema."""
    name_col = _pick(df, _NAME_COLS)
    time_col = _pick(df, _TIME_COLS)
    lat_col = _pick(df, _LAT_COLS)
    lon_col = _pick(df, _LON_COLS)
    if not all((name_col, time_col, lat_col, lon_col)):
        raise ERDDAPFetchError(
            f"ERDDAP response missing required columns; saw {list(df.columns)}"
        )

    out = pd.DataFrame(
        {
            "iceberg_name": df[name_col].astype(str).str.strip(),
            "observed_at": pd.to_datetime(
                df[time_col], utc=True, errors="coerce", format="ISO8601"
            ),
            "latitude": pd.to_numeric(df[lat_col], errors="coerce"),
            "longitude": pd.to_numeric(df[lon_col], errors="coerce"),
        }
    )

    for col, candidates in (
        ("length_nm", _LEN_COLS),
        ("width_nm", _WIDTH_COLS),
        ("area_sqnm", _AREA_COLS),
    ):
        src = _pick(df, candidates)
        out[col] = pd.to_numeric(df[src], errors="coerce") if src else pd.NA

    out = out.dropna(subset=["iceberg_name", "observed_at", "latitude", "longitude"])
    out = out[out["iceberg_name"].str.len() > 0]

    # USNIC publishes length + width but not area — derive it so downstream
    # analytics + the UI always have a `area_sqnm` to key off.
    derived = out["length_nm"] * out["width_nm"]
    out["area_sqnm"] = out["area_sqnm"].where(out["area_sqnm"].notna(), derived)

    return out.reset_index(drop=True)


# The USNIC dataset on PolarWatch is currently published with a multi-year
# publishing gap; a 5-year default guarantees we still retrieve data while also
# keeping a live dataset's payload bounded.
DEFAULT_LOOKBACK_DAYS = 365 * 5


def fetch_erddap_observations(since: datetime | None = None) -> pd.DataFrame:
    """Fetch + normalize iceberg observations from ERDDAP.

    Args:
        since: only fetch observations at or after this timestamp. Defaults to
            roughly the last 2 years so we don't pull the full 10-year archive
            every time the seed runs.

    Returns a DataFrame with columns:
        iceberg_name, observed_at, latitude, longitude,
        length_nm, width_nm, area_sqnm
    """
    if since is None:
        since = datetime.now(UTC) - timedelta(days=DEFAULT_LOOKBACK_DAYS)

    url = _build_erddap_url(since=since)
    if url is None:
        raise ERDDAPFetchError("Failed to build ERDDAP URL")

    try:
        csv_text = _http_get(url)
    except (httpx.HTTPError, RetryError) as exc:
        raise ERDDAPFetchError(f"ERDDAP request failed: {exc}") from exc

    try:
        df = pd.read_csv(io.StringIO(csv_text), comment="#")
    except Exception as exc:
        raise ERDDAPFetchError(f"Failed to parse ERDDAP CSV: {exc}") from exc

    normalized = _normalize(df)
    logger.info("Fetched %d observations from ERDDAP (since=%s)", len(normalized), since.date())
    return normalized


def fetch_observations_with_fallback(
    since: datetime | None = None,
) -> tuple[pd.DataFrame, bool]:
    """Fetch from ERDDAP, falling back to a synthetic sample if unavailable.

    Returns (df, used_fallback).
    """
    try:
        return fetch_erddap_observations(since=since), False
    except ERDDAPFetchError as exc:
        logger.warning("ERDDAP unavailable (%s) — using sample data", exc)
        return _sample_observations(), True


def fetch_current_observations(
    since: datetime | None = None,
) -> tuple[pd.DataFrame, str, bool]:
    """Dispatch to the right fetcher based on `DATA_SOURCE` in settings.

    Returns (df, source_name, used_fallback).
    """
    # Imported lazily so configuring DATA_SOURCE=usnic doesn't require met.no
    # credentials / UA string to be set, and vice versa.
    settings = get_settings()
    source = (settings.data_source or "metno").lower()

    if source == "metno":
        from app.data.metno_fetcher import (
            MetnoFetchError,
            fetch_metno_multiweek,
            fetch_metno_observations,
        )

        try:
            if settings.metno_weeks > 1:
                df = fetch_metno_multiweek(
                    weeks=settings.metno_weeks,
                    ship_filter_km=settings.metno_ship_filter_km,
                )
            else:
                df = fetch_metno_observations(
                    ship_filter_km=settings.metno_ship_filter_km,
                )
            return df, "metno", False
        except MetnoFetchError as exc:
            logger.warning("met.no unavailable (%s) — using sample data", exc)
            return _sample_observations(), "metno", True

    if source == "usnic":
        df, used_fallback = fetch_observations_with_fallback(since=since)
        return df, "usnic", used_fallback

    raise ValueError(
        f"Unknown DATA_SOURCE={source!r}; expected one of 'metno', 'usnic'"
    )


def _sample_observations() -> pd.DataFrame:
    """Small, realistic sample so local dev works without network/Atlas access."""
    now = datetime.now(UTC).replace(microsecond=0)

    def track(name: str, start_lat: float, start_lon: float, drift: tuple[float, float],
              length: float, width: float, days_back: list[int]) -> list[dict]:
        rows = []
        for days in days_back:
            t = now - timedelta(days=days)
            lat = start_lat + drift[0] * days
            lon = start_lon + drift[1] * days
            area = length * width
            rows.append(
                {
                    "iceberg_name": name,
                    "observed_at": t,
                    "latitude": lat,
                    "longitude": lon,
                    "length_nm": length,
                    "width_nm": width,
                    "area_sqnm": area,
                }
            )
        return rows

    rows: list[dict] = []
    rows += track("A-23a", -75.8, -40.2, (0.02, -0.05), 50.0, 38.0, [120, 90, 60, 30, 7, 0])
    rows += track("A-76a", -71.0, -60.5, (0.015, -0.03), 36.0, 10.0, [150, 100, 50, 14, 0])
    rows += track("D-30a", -66.2, 45.1, (-0.01, 0.04), 22.0, 14.0, [80, 40, 10, 0])
    rows += track("B-22a", -74.3, -107.8, (0.005, -0.02), 33.0, 25.0, [200, 150, 75, 30, 0])
    rows += track("C-19c", -66.0, 147.5, (-0.005, 0.01), 18.0, 8.0, [60, 30, 0])

    return pd.DataFrame(rows)
