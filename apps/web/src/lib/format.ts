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

/** Returns age in whole days, or null if the date is invalid. */
export function datAgeInDays(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Returns a human-readable warning string if the observation is stale,
 * or null if it is recent enough not to warrant a warning.
 *
 * Thresholds:
 *  - met.no updates weekly → warn after 14 days (missed 2 scans)
 *  - Any source → warn after 30 days; escalate after 365 days
 */
export function dataStaleWarning(
  iso: string | null | undefined,
): { level: "warn" | "danger"; text: string } | null {
  const days = datAgeInDays(iso);
  if (days === null) return null;
  if (days > 365) {
    const years = (days / 365).toFixed(1);
    return { level: "danger", text: `Data is ${years} yr old — iceberg may no longer exist` };
  }
  if (days > 30) {
    return { level: "warn", text: `Data is ${days} days old` };
  }
  return null;
}

/** Pretty-print the raw source identifier. */
export function formatSource(source: string | null | undefined): string {
  if (!source) return "Unknown";
  if (source === "metno") return "met.no (Copernicus SAR)";
  if (source === "usnic" || source === "polarwatch") return "NOAA / US National Ice Center";
  return source;
}

export function formatLatLon(lat: number, lon: number): string {
  const lat_s = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? "N" : "S"}`;
  const lon_s = `${Math.abs(lon).toFixed(2)}°${lon >= 0 ? "E" : "W"}`;
  return `${lat_s}, ${lon_s}`;
}
