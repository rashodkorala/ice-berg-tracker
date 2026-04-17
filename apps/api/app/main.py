"""FastAPI application entry point — CORS, lifespan, routers."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import icebergs as icebergs_router
from app.config import get_settings
from app.db import close_client, ensure_indexes, get_client
from app.logging_config import configure_logging
from app.models import HealthResponse

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    configure_logging(settings.log_level)
    logger.info("Iceberg Tracker API starting")
    try:
        await ensure_indexes()
    except Exception as exc:
        logger.error("Index setup failed (continuing anyway): %s", exc)
    yield
    await close_client()
    logger.info("Iceberg Tracker API shutdown complete")


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings.log_level)

    app = FastAPI(
        title="Iceberg Tracker API",
        version="0.1.0",
        description="Antarctic & North Atlantic iceberg tracking, drift, and analytics.",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(icebergs_router.router)

    @app.get("/health", response_model=HealthResponse, tags=["meta"])
    async def health() -> HealthResponse:
        try:
            await get_client().admin.command("ping")
            return HealthResponse(db="connected")
        except Exception as exc:
            logger.warning("DB health check failed: %s", exc)
            return HealthResponse(db="disconnected")

    @app.get("/", tags=["meta"])
    async def root() -> dict[str, str]:
        return {
            "name": "Iceberg Tracker API",
            "docs": "/docs",
            "health": "/health",
        }

    return app


app = create_app()
