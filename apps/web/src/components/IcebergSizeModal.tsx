"use client";

import { useEffect } from "react";

import {
  IcebergSizeCanvas,
  formatDimensionSummary,
} from "@/components/IcebergSizeCanvas";
import { formatArea, formatDate, formatLatLon } from "@/lib/format";
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
        </dl>
      </div>
    </div>
  );
}
