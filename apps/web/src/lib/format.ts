export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// 1 sq nm = 1,852² m² = 3,429,904 m²
const SQ_M_PER_SQ_NM = 1852 * 1852;

export function formatArea(sqnm: number | null | undefined): string {
  if (sqnm == null || Number.isNaN(sqnm)) return "—";
  if (sqnm >= 1000) return `${(sqnm / 1000).toFixed(1)}k sq nm`;
  if (sqnm >= 1) return `${sqnm.toFixed(1)} sq nm`;
  // For the SAR-detected bergs off Newfoundland, sq nm are tiny — show m² for clarity.
  const sqm = sqnm * SQ_M_PER_SQ_NM;
  if (sqm >= 1_000_000) return `${(sqm / 1_000_000).toFixed(2)} km²`;
  if (sqm >= 10_000) return `${(sqm / 1000).toFixed(0)}k m²`;
  return `${Math.round(sqm).toLocaleString()} m²`;
}

export function formatLatLon(lat: number, lon: number): string {
  const lat_s = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? "N" : "S"}`;
  const lon_s = `${Math.abs(lon).toFixed(2)}°${lon >= 0 ? "E" : "W"}`;
  return `${lat_s}, ${lon_s}`;
}
