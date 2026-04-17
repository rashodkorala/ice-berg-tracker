# apps/api — Iceberg Tracker Backend

FastAPI + MongoDB (Atlas) + ERDDAP data pipeline.

## Setup

```bash
uv sync
cp ../../.env.example ../../.env   # fill MONGODB_URI
```

## Commands

| Command | Description |
|---|---|
| `pnpm --filter api dev` | Start FastAPI with hot-reload on :8000 |
| `pnpm --filter api seed` | One-off fetch from ERDDAP into MongoDB |
| `pnpm --filter api test` | Run pytest suite |
| `pnpm --filter api lint` | Ruff check |

## Endpoints (Phase 1)

- `GET /health` — liveness probe
- `GET /api/icebergs` — list all icebergs with latest observation
- `GET /api/icebergs/{name}` — full observation history for one iceberg

Later phases add drift tracks and analytics endpoints.
