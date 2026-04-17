"use client";

import type { LatLngBoundsExpression, LatLngExpression } from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";

import { IcebergMarker } from "./IcebergMarker";
import type { Iceberg } from "@/lib/types";

interface MapViewProps {
  icebergs: Iceberg[];
}

// Fallback view if the DB is empty: the NW Atlantic iceberg alley so an empty
// state still looks locally relevant for users in Newfoundland/Labrador.
const FALLBACK_CENTER: LatLngExpression = [55, -52];
const FALLBACK_ZOOM = 4;

function computeBounds(icebergs: Iceberg[]): LatLngBoundsExpression | null {
  const points = icebergs
    .map((b) => b.latest_observation)
    .filter((o): o is NonNullable<typeof o> => o != null);
  if (points.length === 0) return null;

  let minLat = points[0].latitude;
  let maxLat = points[0].latitude;
  let minLon = points[0].longitude;
  let maxLon = points[0].longitude;
  for (const p of points) {
    if (p.latitude < minLat) minLat = p.latitude;
    if (p.latitude > maxLat) maxLat = p.latitude;
    if (p.longitude < minLon) minLon = p.longitude;
    if (p.longitude > maxLon) maxLon = p.longitude;
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

export default function MapView({ icebergs }: MapViewProps) {
  const bounds = useMemo(() => computeBounds(icebergs), [icebergs]);

  return (
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
      {icebergs.map((iceberg) => (
        <IcebergMarker key={iceberg.name} iceberg={iceberg} />
      ))}
    </MapContainer>
  );
}
