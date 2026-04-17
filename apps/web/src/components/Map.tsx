"use client";

import dynamic from "next/dynamic";

import type { Iceberg } from "@/lib/types";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-paper">
      <div className="eyebrow text-ink-light">Loading map…</div>
    </div>
  ),
});

export function Map({ icebergs }: { icebergs: Iceberg[] }) {
  return <MapView icebergs={icebergs} />;
}
