"use client";

import { CircleMarker, Popup } from "react-leaflet";

import { dataStaleWarning, formatArea, formatDate, formatLatLon, formatSource } from "@/lib/format";
import type { Iceberg } from "@/lib/types";

interface IcebergMarkerProps {
  iceberg: Iceberg;
  /** Opens the Three.js scale viewer (wired from `MapView`). */
  onInspect?: (iceberg: Iceberg) => void;
}

const BASE_RADIUS = 4;

function radiusForArea(area: number | null | undefined): number {
  if (!area || area <= 0) return BASE_RADIUS;
  // Log scaling because sources span 5+ orders of magnitude:
  //   met.no (Copernicus SAR) detects bergs at ~10^-4 sq nm
  //   USNIC tracks giants at ~10^3 sq nm (A23A ~1300)
  // 3 px per decade, centred so the median met.no berg (~10^-3) is ~6 px.
  const r = 3 * Math.log10(area) + 15;
  return Math.max(3, Math.min(16, r));
}

export function IcebergMarker({ iceberg, onInspect }: IcebergMarkerProps) {
  const obs = iceberg.latest_observation;
  if (!obs) return null;
  const stale = dataStaleWarning(obs.observed_at);
  // Detect met.no bergs via source field (set after reseed) or the synthetic
  // name pattern NA-YYYYMMDD-lat-lon (works with pre-existing DB records).
  const isMetno = obs.source === "metno" || /^NA-\d{8}-/.test(iceberg.name);

  return (
    <CircleMarker
      center={[obs.latitude, obs.longitude]}
      radius={radiusForArea(obs.area_sqnm)}
      pathOptions={{
        color: "#1B6B93",
        weight: 1.5,
        fillColor: "#1B6B93",
        fillOpacity: 0.35,
      }}
    >
      <Popup
        maxWidth={320}
        minWidth={220}
        autoPanPadding={[20, 56]}
      >
        <div className="max-w-[min(280px,85vw)] min-w-[200px]">
          <div className="eyebrow mb-1">{iceberg.status}</div>
          <div className="break-words font-serif text-lg leading-snug text-ink">
            {iceberg.name}
          </div>
          <dl className="mt-3 space-y-1 text-xs text-ink-light">
            <div className="flex justify-between gap-3">
              <dt className="shrink-0">Position</dt>
              <dd className="break-words text-right text-ink">{formatLatLon(obs.latitude, obs.longitude)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="shrink-0">Area</dt>
              <dd className="break-words text-right text-ink">{formatArea(obs.area_sqnm)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="shrink-0">Observed</dt>
              <dd className="break-words text-right text-ink">{formatDate(obs.observed_at)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="shrink-0">Source</dt>
              <dd className="break-words text-right text-ink">{formatSource(obs.source)}</dd>
            </div>
            {stale && (
              <div className={`mt-1 rounded px-2 py-1 text-xs ${
                stale.level === "danger" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
              }`}>
                ⚠ {stale.text}
              </div>
            )}
            {iceberg.source_glacier ? (
              <div className="flex justify-between gap-3">
                <dt className="shrink-0">Origin</dt>
                <dd className="break-words text-right text-ink">{iceberg.source_glacier}</dd>
              </div>
            ) : null}
          </dl>
          {/* Data-quality notes */}
          {(isMetno || obs.data_note) && (
            <div className="mt-3 space-y-1 border-t border-border pt-2">
              {isMetno && (
                <p className="text-xs text-ink-light">
                  <span className="font-medium text-ink">ⓘ Synthetic ID</span> — name encodes
                  first-detected position; no persistent satellite identifier.
                </p>
              )}
              {obs.data_note && (
                <p className="text-xs text-ink-light">
                  <span className="font-medium text-ink">↔ Linked</span> — {obs.data_note.toLowerCase()}.
                  Drift track shown is inferred, not continuously tracked.
                </p>
              )}
            </div>
          )}

          {onInspect ? (
            <button
              type="button"
              className="mt-4 w-full rounded border border-ocean bg-ocean/light py-2 text-xs font-medium text-ocean-dark hover:bg-ocean hover:text-white"
              onClick={() => onInspect(iceberg)}
            >
              View relative size (3D)
            </button>
          ) : null}
        </div>
      </Popup>
    </CircleMarker>
  );
}
