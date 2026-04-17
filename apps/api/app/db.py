"""MongoDB (Atlas) async client — motor — with index setup."""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, GEOSPHERE, IndexModel

from app.config import get_settings

if TYPE_CHECKING:
    from motor.motor_asyncio import AsyncIOMotorCollection

logger = logging.getLogger(__name__)

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        settings = get_settings()
        logger.info("Connecting to MongoDB (db=%s)", settings.mongodb_db)
        _client = AsyncIOMotorClient(
            settings.mongodb_uri,
            tz_aware=True,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
        )
    return _client


def get_db() -> AsyncIOMotorDatabase:
    global _db
    if _db is None:
        _db = get_client()[get_settings().mongodb_db]
    return _db


def icebergs_collection() -> AsyncIOMotorCollection:
    return get_db()["icebergs"]


def observations_collection() -> AsyncIOMotorCollection:
    return get_db()["observations"]


async def ensure_indexes() -> None:
    """Idempotently ensure the MongoDB indexes exist."""
    db = get_db()

    await db["icebergs"].create_indexes(
        [
            IndexModel([("name", ASCENDING)], name="uniq_name", unique=True),
            IndexModel([("status", ASCENDING)], name="idx_status"),
        ]
    )
    await db["observations"].create_indexes(
        [
            IndexModel(
                [("iceberg_name", ASCENDING), ("observed_at", ASCENDING)],
                name="uniq_name_observed",
                unique=True,
            ),
            IndexModel([("location", GEOSPHERE)], name="geo_location"),
        ]
    )
    logger.info("MongoDB indexes ensured (icebergs, observations)")


async def close_client() -> None:
    global _client, _db
    if _client is not None:
        _client.close()
        _client = None
        _db = None
        logger.info("MongoDB client closed")
