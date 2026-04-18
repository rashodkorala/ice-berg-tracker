"use client";

import { CircleMarker, Popup } from "react-leaflet";

import { formatArea, formatDate, formatLatLon } from "@/lib/format";
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
            {iceberg.source_glacier ? (
              <div className="flex justify-between gap-3">
                <dt className="shrink-0">Origin</dt>
                <dd className="break-words text-right text-ink">{iceberg.source_glacier}</dd>
              </div>
            ) : null}
          </dl>
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
