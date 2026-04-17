# Iceberg Tracker

Full-stack tracker for real-world icebergs in the North Atlantic (iceberg alley
between Labrador and the Grand Banks) — positions, sizes, and drift, sourced
from Copernicus Sentinel-1 SAR observations published weekly by the Norwegian
Meteorological Institute.

- **Backend** (`apps/api`): Python + FastAPI, MongoDB (Atlas), pluggable data pipeline
  (met.no North Atlantic · NOAA USNIC Antarctic)
- **Frontend** (`apps/web`): Next.js + Tailwind, React-Leaflet maps, Recharts analytics
- **Monorepo**: Turborepo + pnpm workspaces

## Prerequisites

- Node.js >= 20 and pnpm >= 10 (`npm i -g pnpm`)
- Python >= 3.11 managed via [`uv`](https://docs.astral.sh/uv/) (`curl -LsSf https://astral.sh/uv/install.sh | sh`)
- A MongoDB Atlas free-tier cluster (M0) — copy its connection string into `.env`

## Setup

```bash
pnpm install                    # installs workspace JS tooling (turbo)
cp .env.example .env            # fill in MONGODB_URI
cd apps/api && uv sync          # installs Python deps into apps/api/.venv
```

## Running

```bash
pnpm dev                        # starts API (:8000) + web (:3000) in parallel
pnpm --filter api seed          # one-off fetch of the latest satellite pass
pnpm --filter api seed -- --wipe   # nuke + reseed (useful when switching sources)
```

Verify:

```bash
curl http://localhost:8000/api/icebergs | jq '.count'
open http://localhost:3000
```

## Data sources

The backend dispatches on `DATA_SOURCE` in `.env`:

- `metno` *(default)* — [api.met.no iceberg API](https://api.met.no/weatherapi/iceberg/0.1/documentation).
  GeoJSON weekly updates covering the Arctic and NW Atlantic. Great for
  Newfoundland / Labrador coverage. ~500 bergs per scene.
- `usnic` — NOAA PolarWatch ERDDAP `usnic_weekly_iceberg`. Tracks the giant
  named Antarctic bergs (A23A, A68, etc.). Low volume, big drifters.

Because met.no sightings have no persistent IDs, synthetic names are derived
from the observation date and coordinates (`NA-YYYYMMDD-LAT-LON`), keeping
reseeds idempotent.

## Repo layout

```
apps/
  api/     Python FastAPI backend
  web/     Next.js frontend (Phase 2+)
```

See `cozy-singing-hinton.md` for the full implementation plan.

## Author

Built by Rashod ([rashodkorala.com](https://www.rashodkorala.com) ·
[hello@rashodkorala.com](mailto:hello@rashodkorala.com) ·
[@rashodkorala](https://github.com/rashodkorala)) in Newfoundland.

Data © Norwegian Meteorological Institute & Copernicus, licensed under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Site code MIT.
