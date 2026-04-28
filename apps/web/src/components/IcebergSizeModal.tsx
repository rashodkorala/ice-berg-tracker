"use client";

import { useEffect } from "react";

import {
  IcebergSizeCanvas,
  formatDimensionSummary,
} from "@/components/IcebergSizeCanvas";
import { dataStaleWarning, formatArea, formatDate, formatLatLon, formatSource } from "@/lib/format";
import { icebergSizeModel } from "@/lib/iceberg-3d";
import type { Iceberg } from "@/lib/types";

interface IcebergSizeModalProps {
  iceberg: Iceberg | null;
  onClose: () => void;
}

export default function IcebergSizeModal({ iceberg, onClose }: IcebergSizeModalProps) {
  useEffect(() => {
    if (!iceberg) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [iceberg, onClose]);

  if (!iceberg?.latest_observation) return null;

  const obs = iceberg.latest_observation;
  const { dimensions, scales } = icebergSizeModel(
    obs.area_sqnm,
    obs.length_nm ?? null,
    obs.width_nm ?? null,
  );
  const stale = dataStaleWarning(obs.observed_at);
  const isMetno = obs.source === "metno" || /^NA-\d{8}-/.test(iceberg.name);

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="berg-size-title"
      onClick={onClose}
    >
      <div
        className="card max-h-[90vh] w-full max-w-lg overflow-y-auto p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="eyebrow">Relative scale</div>
            <h2 id="berg-size-title" className="mt-1 font-serif text-2xl text-ink">
              {iceberg.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-border px-3 py-1 text-sm text-ink-light hover:bg-ocean/light"
          >
            Close
          </button>
        </div>

        <p className="mt-3 text-sm text-ink-light">
          The block grows to match inferred dimensions from satellite footprint and length.
          Drag to orbit — scale is comparative, not a nautical chart.
        </p>

        {stale && (
          <div
            className={`mt-3 rounded px-3 py-2 text-xs ${
              stale.level === "danger"
                ? "bg-red-50 text-red-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            ⚠ {stale.text}
          </div>
        )}

        <div className="mt-4">
          <IcebergSizeCanvas scales={scales} icebergKey={iceberg.name} />
        </div>

        <p className="mt-3 text-xs leading-relaxed text-ink-light">{formatDimensionSummary(dimensions)}</p>

        <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-light">Area</dt>
            <dd className="text-ink">{formatArea(obs.area_sqnm)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-light">Position</dt>
            <dd className="text-ink">{formatLatLon(obs.latitude, obs.longitude)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-light">Observed</dt>
            <dd className="text-ink">{formatDate(obs.observed_at)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-light">Source</dt>
            <dd className="text-ink">{formatSource(obs.source)}</dd>
          </div>
        </dl>

        {(isMetno || obs.data_note) && (
          <div className="mt-4 space-y-2 rounded border border-border bg-ocean-light/40 p-3 text-xs text-ink-light">
            <p className="font-medium text-ink">Data quality notes</p>
            {isMetno && (
              <p>
                <span className="font-medium">Synthetic ID:</span> This berg&apos;s name is derived
                from its first-detected position and date — met.no SAR data carries no persistent
                iceberg identifier. The same physical berg may appear under a different name if
                re-detected after drifting.
              </p>
            )}
            {obs.data_note && (
              <p>
                <span className="font-medium">Linked track:</span> {obs.data_note}. Consecutive
                weekly positions were matched by proximity (≤ 55 nm), not a continuous satellite
                fix. Drift path is an estimate.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
