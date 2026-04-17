"""Placeholder — Phase 5 will populate this with BYU Scatterometer historical data.

For Phase 1, this is a stub that just logs that it ran.
"""
from __future__ import annotations

import logging

from app.config import get_settings
from app.logging_config import configure_logging

logger = logging.getLogger("backfill")


def main() -> None:
    configure_logging(get_settings().log_level)
    logger.info("backfill_history: not yet implemented (planned for Phase 5)")


if __name__ == "__main__":
    main()
