"""Fetch from ERDDAP and seed MongoDB with iceberg observations.

Usage:
    pnpm --filter api seed                 # incremental — adds new observations
    pnpm --filter api seed -- --wipe       # drops collections first (clean slate)
    pnpm --filter api seed -- --since 2022-01-01
"""
from __future__ import annotations

import argparse
import asyncio
import logging
import sys
from datetime import UTC, datetime

from app.config import get_settings
from app.data.fetcher import fetch_current_observations
from app.data.parser import dataframe_to_observations
from app.db import close_client, ensure_indexes, icebergs_collection, observations_collection
from app.logging_config import configure_logging
from app.services.iceberg_service import count_icebergs, upsert_observations

logger = logging.getLogger("seed_db")


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Seed MongoDB with iceberg data")
    parser.add_argument(
        "--wipe",
        action="store_true",
        help="Drop `icebergs` and `observations` before inserting (clean slate).",
    )
    parser.add_argument(
        "--since",
        type=str,
        default=None,
        help="Only fetch observations at or after this ISO date (e.g. 2022-01-01).",
    )
    return parser.parse_args()


async def seed(args: argparse.Namespace) -> int:
    settings = get_settings()
    configure_logging(settings.log_level)
    logger.info(
        "Starting seed run (source=%s, wipe=%s, since=%s)",
        settings.data_source,
        args.wipe,
        args.since,
    )

    since: datetime | None = None
    if args.since:
        since = datetime.fromisoformat(args.since).replace(tzinfo=UTC)

    try:
        df, source, used_fallback = fetch_current_observations(since=since)
        if used_fallback:
            logger.warning(
                "Live source unavailable — seeded with synthetic sample. "
                "Check DATA_SOURCE + network connectivity in .env."
            )

        observations = dataframe_to_observations(df, default_source=source)
        if not observations:
            logger.error("No valid observations to insert; aborting.")
            return 1

        if args.wipe:
            logger.warning("--wipe: dropping `icebergs` and `observations` collections")
            await icebergs_collection().drop()
            await observations_collection().drop()

        await ensure_indexes()
        counts = await upsert_observations(observations)
        total = await count_icebergs()
        logger.info(
            "Seed complete: %d observations upserted, %d icebergs upserted, %d total in DB",
            counts["observations_upserted"],
            counts["icebergs_upserted"],
            total,
        )
        return 0
    finally:
        await close_client()


def main() -> None:
    sys.exit(asyncio.run(seed(_parse_args())))


if __name__ == "__main__":
    main()
