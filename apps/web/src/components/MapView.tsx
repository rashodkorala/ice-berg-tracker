"use client";

import dynamic from "next/dynamic";
import type { LatLngBoundsExpression, LatLngExpression } from "leaflet";
import { useEffect, useMemo, useState } from "react";
import { MapContainer, Polyline, TileLayer, useMap } from "react-leaflet";

import { IcebergMarker } from "./IcebergMarker";
import type { Iceberg, IcebergTrack } from "@/lib/types";

const IcebergSizeModal = dynamic(() => import("./IcebergSizeModal"), {
  ssr: false,
});

interface MapViewProps {
  icebergs: Iceberg[];
  tracks: IcebergTrack[];
}

// Fallback view if the DB is empty: the NW Atlantic iceberg alley so an empty
// state still looks locally relevant for users in Newfoundland/Labrador.
const FALLBACK_CENTER: LatLngExpression = [55, -52];
const FALLBACK_ZOOM = 4;

function computeBounds(
  icebergs: Iceberg[],
  tracks: IcebergTrack[],
): LatLngBoundsExpression | null {
  const coords: [number, number][] = [];
  for (const b of icebergs) {
    const o = b.latest_observation;
    if (o) coords.push([o.latitude, o.longitude]);
  }
  for (const t of tracks) {
    for (const p of t.points) {
      coords.push([p.latitude, p.longitude]);
    }
  }
  if (coords.length === 0) return null;

  let minLat = coords[0][0];
  let maxLat = coords[0][0];
  let minLon = coords[0][1];
  let maxLon = coords[0][1];
  for (const [lat, lon] of coords) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
  }
  return [
    [minLat, minLon],
    [maxLat, maxLon],
  ];
}

function FitToBounds({ bounds }: { bounds: LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (!bounds) return;
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 6, animate: false });
  }, [bounds, map]);
  return null;
}

export default function MapView({ icebergs, tracks }: MapViewProps) {
  const bounds = useMemo(() => computeBounds(icebergs, tracks), [icebergs, tracks]);
  const [inspectTarget, setInspectTarget] = useState<Iceberg | null>(null);

  return (
    <>
    <MapContainer
      center={FALLBACK_CENTER}
      zoom={FALLBACK_ZOOM}
      minZoom={2}
      maxZoom={10}
      worldCopyJump
      scrollWheelZoom
      className="h-full w-full"
      attributionControl
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={19}
      />
      <FitToBounds bounds={bounds} />
      {tracks.map((track) => {
        // met.no bergs have synthesized names (NA-YYYYMMDD-lat-lon); their
        // drift paths are proximity-inferred, not continuously tracked.
        // Render them dashed + lighter so users can visually distinguish them
        // from reliable USNIC tracks.
        const isInferred = /^NA-\d{8}-/.test(track.iceberg_name);
        return (
          <Polyline
            key={`track-${track.iceberg_name}`}
            positions={track.points.map((p) => [p.latitude, p.longitude])}
            pathOptions={{
              color: "#1B6B93",
              weight: isInferred ? 1.5 : 2,
              opacity: isInferred ? 0.35 : 0.65,
              dashArray: isInferred ? "6 5" : undefined,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        );
      })}
      {icebergs.map((iceberg) => (
        <IcebergMarker key={iceberg.name} iceberg={iceberg} onInspect={setInspectTarget} />
      ))}
    </MapContainer>
    <IcebergSizeModal iceberg={inspectTarget} onClose={() => setInspectTarget(null)} />
    </>
  );
}
