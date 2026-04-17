# Iceberg Tracker - Implementation Plan

## Context
Build a full-stack application that tracks real-world Antarctic and North Atlantic icebergs — their locations, sizes, drift patterns, and analytics. Python backend for data fetching/analytics, Next.js frontend for a polished editorial UI.

## Tech Stack
- **Monorepo:** Turborepo with pnpm workspaces
- **Backend (API):** Python + FastAPI — data fetching, analytics, REST API
- **Frontend:** Next.js (TypeScript) + Tailwind CSS
- **Maps:** React-Leaflet with CartoDB Positron tiles
- **Charts:** Recharts (lightweight, React-native charting)
- **Database:** MongoDB Atlas (free tier) — accessed via `pymongo` / `motor` (async) in backend
- **Data Sources:** NOAA PolarWatch ERDDAP (primary), BYU SCP (historical drift tracks)
- **Analytics Engine:** pandas + numpy (server-side)

## Design System

### Typography
- **Headings / Display:** Serif editorial font — **Playfair Display** (Google Fonts)
- **Body / UI:** Clean sans-serif — **Inter** (Google Fonts)
- Type scale: modular, with generous line-height for readability

### Color Palette
| Token | Tailwind Class | Value | Usage |
|---|---|---|---|
| `paper` | `bg-paper` | `#F5F2EE` | Background, off-white with warm undertone |
| `ink` | `text-ink` | `#2C2C2C` | Primary text, muted black |
| `ink-light` | `text-ink-light` | `#6B6B6B` | Secondary text, captions |
| `ocean` | `text-ocean` | `#1B6B93` | Accent — links, active states, map highlights |
| `ocean-light` | `bg-ocean-light` | `#E8F1F5` | Accent background — cards, hover states |
| `ocean-dark` | `text-ocean-dark` | `#134B66` | Accent pressed/active states |
| `border` | `border-border` | `#E0DCD7` | Subtle dividers, card borders |

### UI Style
- Clean, editorial feel — scientific journal meets modern dashboard
- Generous whitespace, clear hierarchy
- Cards with subtle border, no heavy shadows
- Map tiles: CartoDB Positron (muted grayscale)
- Charts: ocean blue primary, ink for axes/labels, paper background
- Navigation: top bar with serif logo, sans-serif nav links

### Layout
- Full-width map as hero on the home page
- Sidebar panel (right) for iceberg details, slides in on click
- Dashboard: CSS grid with stat cards on top, charts below
- Responsive: stack sidebar below map on mobile

## Data Sources
1. **NOAA PolarWatch ERDDAP** — Antarctic icebergs, weekly updates since 2014, CSV/JSON via `erddapy` library
2. **BYU Scatterometer Pathfinder** — Historical drift tracks since 1992, ASCII text files
3. **NSIDC International Ice Patrol** — North Atlantic sightings (stretch goal)

## Project Structure (Turborepo Monorepo)
```
iceberg-tracker/
├── package.json                    # Root — pnpm workspaces + turbo scripts
├── pnpm-workspace.yaml             # Workspace config
├── turbo.json                      # Turborepo pipeline config
├── .gitignore
│
├── apps/
│   ├── api/                        # Python FastAPI backend
│   │   ├── pyproject.toml
│   │   ├── app/
│   │   │   ├── main.py             # FastAPI app, CORS, startup events
│   │   │   ├── config.py           # pydantic-settings (MONGODB_URI)
│   │   │   ├── db.py               # MongoDB client init (motor async)
│   │   │   ├── data/
│   │   │   │   ├── fetcher.py      # ERDDAP data fetching
│   │   │   │   ├── parser.py       # Transform data into models
│   │   │   │   └── scheduler.py    # APScheduler weekly fetch
│   │   │   ├── api/
│   │   │   │   ├── icebergs.py     # GET /api/icebergs, /api/icebergs/{id}
│   │   │   │   └── analytics.py    # GET /api/analytics/*
│   │   │   └── services/
│   │   │       ├── iceberg_service.py
│   │   │       └── analytics_service.py
│   │   ├── scripts/
│   │   │   ├── seed_db.py
│   │   │   └── backfill_history.py
│   │   └── tests/
│   │
│   └── web/                        # Next.js frontend
│       ├── package.json
│       ├── next.config.js
│       ├── tailwind.config.ts      # Custom colors, fonts
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx      # Root layout, fonts, nav
│       │   │   ├── page.tsx        # Home — full-width map
│       │   │   ├── dashboard/
│       │   │   │   └── page.tsx    # Analytics dashboard
│       │   │   └── icebergs/
│       │   │       └── [id]/
│       │   │           └── page.tsx
│       │   ├── components/
│       │   │   ├── Map.tsx         # React-Leaflet (dynamic import)
│       │   │   ├── IcebergMarker.tsx
│       │   │   ├── DriftTrack.tsx
│       │   │   ├── Sidebar.tsx
│       │   │   ├── StatCard.tsx
│       │   │   ├── Navbar.tsx
│       │   │   └── charts/
│       │   │       ├── SizeDistribution.tsx
│       │   │       ├── DriftSpeed.tsx
│       │   │       ├── ActiveCount.tsx
│       │   │       └── Heatmap.tsx
│       │   ├── lib/
│       │   │   ├── api.ts          # Fetch helpers for backend API
│       │   │   └── types.ts        # TypeScript interfaces
│       │   └── styles/
│       │       └── globals.css     # Tailwind directives + custom styles
│       └── public/
│           └── favicon.ico
│
└── README.md
```

### Turborepo Configuration
- **Root `package.json`**: defines `pnpm` workspaces, turbo scripts (`dev`, `build`, `lint`, `test`)
- **`pnpm-workspace.yaml`**: `packages: ["apps/*"]`
- **`turbo.json`**: pipeline with `dev` (persistent), `build`, `lint`, `test` tasks
- **`apps/api/package.json`**: thin wrapper with scripts that invoke Python commands (`uvicorn`, `pytest`)
- **`apps/web/package.json`**: standard Next.js package with Tailwind, React-Leaflet, Recharts deps
- Run everything: `pnpm dev` starts both backend (port 8000) and frontend (port 3000) in parallel

## API Endpoints (Backend)

| Method | Path | Description |
|---|---|---|
| GET | `/api/icebergs` | List all icebergs (with latest observation) |
| GET | `/api/icebergs/{id}` | Single iceberg with full observation history |
| GET | `/api/icebergs/{id}/track` | GeoJSON drift track for map rendering |
| GET | `/api/analytics/overview` | Summary stats (total, largest, fastest) |
| GET | `/api/analytics/size-distribution` | Histogram data |
| GET | `/api/analytics/drift-speeds` | Speed calculations per iceberg |
| GET | `/api/analytics/activity` | Active count over time |

## Data Model (MongoDB Atlas)

### Collection: `icebergs`
```json
{
  "_id": ObjectId,
  "name": "A-23a",                          // unique index
  "status": "tracked",                      // "tracked" | "grounded" | "disintegrated"
  "source_glacier": "Filchner Ice Shelf",   // nullable
  "original_calving_date": ISODate,         // nullable
  "latest_observation": {                   // denormalized for fast list queries
    "latitude": -68.5,
    "longitude": -52.3,
    "observed_at": ISODate,
    "area_sqnm": 1500
  },
  "created_at": ISODate,
  "updated_at": ISODate
}
```

### Collection: `observations`
```json
{
  "_id": ObjectId,
  "iceberg_name": "A-23a",                 // indexed, matches icebergs.name
  "observed_at": ISODate,
  "location": {                            // GeoJSON for $geoNear queries
    "type": "Point",
    "coordinates": [-52.3, -68.5]          // [longitude, latitude]
  },
  "length_nm": 40.0,
  "width_nm": 25.0,
  "area_sqnm": 1500.0,
  "source": "polarwatch",
  "raw_data": {}                           // original record
}
```

### Indexes
- `icebergs`: unique on `name`, index on `status`
- `observations`: index on `iceberg_name` + `observed_at`, 2dsphere on `location`

## Implementation Phases

### Phase 1: Monorepo + Backend Foundation

**1a. Project scaffolding**
- Init git repo, create `.gitignore` (node_modules, __pycache__, .env, .venv, dist, .next)
- Init Turborepo monorepo: root `package.json`, `pnpm-workspace.yaml`, `turbo.json`
- Set up `apps/api/` with `uv init`, `pyproject.toml` — use `uv` for Python deps and venv
- Add thin `apps/api/package.json` with scripts wrapping Python commands (`uv run uvicorn ...`)
- Create `.env.example` with `MONGODB_URI`, `ERDDAP_SERVER_URL` placeholders

**1b. Database setup**
- Create MongoDB Atlas free cluster (M0), create `iceberg_tracker` database
- Configure `motor` (async MongoDB driver) client in `app/db.py`
- Create startup function that ensures indexes: unique on `icebergs.name`, 2dsphere on `observations.location`, compound on `observations.(iceberg_name, observed_at)`

**1c. Data pipeline**
- Build ERDDAP data fetcher using `erddapy` with retry logic (httpx retries, exponential backoff)
- Add Pydantic models for data validation — validate ERDDAP records before MongoDB insert
- Create `seed_db.py` script to fetch and insert data into MongoDB
- Add Python `logging` config for the data pipeline (INFO level, structured output)

**1d. API layer**
- Set up FastAPI with CORS (allow `localhost:3000` for dev)
- Basic `/api/icebergs` endpoint querying MongoDB
- Load config via `pydantic-settings` from `.env`

- **Verify:** `pnpm --filter api dev` starts backend; `curl /api/icebergs` returns JSON from MongoDB

### Phase 2: Frontend Shell + Map
- Init Next.js in `apps/web/` with TypeScript + Tailwind
- Configure Tailwind with custom design tokens (colors, fonts)
- Build root layout with Playfair Display + Inter fonts, Navbar component
- Build Map component with React-Leaflet (dynamic import, CartoDB Positron tiles)
- Fetch icebergs from API, render as ocean-blue circle markers
- Add popups with iceberg name, size, last observed date
- **Verify:** `pnpm dev` starts both; `http://localhost:3000/` shows editorial-styled map

### Phase 3: Iceberg Details + Drift Tracks
- Build Sidebar component that slides in on marker click
- Build iceberg detail page (`/icebergs/[id]`) with metadata + observation table
- Add DriftTrack component (React-Leaflet Polyline connecting observations)
- Add `/api/icebergs/{id}/track` endpoint returning GeoJSON
- **Verify:** Clicking an iceberg shows sidebar with drift track visualization

### Phase 4: Analytics Dashboard
- Build backend analytics endpoints (pandas aggregations)
- Build dashboard page with StatCard grid + Recharts charts
- Charts: size distribution, drift speeds, active count over time
- Style charts with ocean/ink/paper palette
- **Verify:** `/dashboard` shows 4+ charts with real data

### Phase 5: Automation + Polish
- APScheduler weekly auto-fetch on backend startup
- Error handling, loading states, empty states in frontend
- "Last updated" indicator
- Responsive layout (mobile-friendly)
- Dockerfile(s) for deployment

## Key Dependencies

**Backend:** fastapi, uvicorn, motor (async MongoDB), pymongo, erddapy, pandas, httpx, apscheduler, pydantic-settings

**Frontend:** next, react, react-dom, typescript, tailwindcss, react-leaflet, leaflet, recharts, @types/leaflet

## Verification
1. `cd apps/api && python scripts/seed_db.py` — check MongoDB collections have iceberg documents
2. `pnpm dev` (from root) — starts both backend (8000) and frontend (3000)
3. `http://localhost:3000/` — map loads with real iceberg data from MongoDB
4. Click icebergs on map — sidebar and drift tracks render
5. `/dashboard` — charts show meaningful analytics
6. `pnpm test` — runs both `pytest` (backend) and frontend tests
