"use client";

import dynamic from "next/dynamic";

import type { Iceberg, IcebergTrack } from "@/lib/types";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-paper">
      <div className="eyebrow text-ink-light">Loading map…</div>
    </div>
  ),
});

export function Map({
  icebergs,
  tracks = [],
}: {
  icebergs: Iceberg[];
  tracks?: IcebergTrack[];
}) {
  return <MapView icebergs={icebergs} tracks={tracks} />;
}
