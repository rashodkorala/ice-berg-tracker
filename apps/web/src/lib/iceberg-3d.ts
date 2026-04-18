/**
 * Convert sensor fields into metres and normalised Three.js scale factors.
 * The mesh is a 1×1×1 unit box; we scale it so relative proportions reflect
 * inferred length × width × thickness (thickness is a heuristic — SAR gives
 * footprint and often max length, not freeboard).
 */

const NM_TO_M = 1852;
/** 1 sq nm in m² */
export const SQ_M_PER_SQ_NM = NM_TO_M * NM_TO_M;
/** Scene reference edge (m) → one unit cube side before animation clamping */
const REF_M = 650;

export function areaSqnmToM2(sqnm: number | null | undefined): number | null {
  if (sqnm == null || Number.isNaN(sqnm) || sqnm <= 0) return null;
  return sqnm * SQ_M_PER_SQ_NM;
}

export function nmToMetres(nm: number | null | undefined): number | null {
  if (nm == null || Number.isNaN(nm) || nm <= 0) return null;
  return nm * NM_TO_M;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export interface BergDimensions {
  /** Horizontal extent along X (metres) — SAR max length when known */
  lengthM: number;
  /** Horizontal extent along Z (metres) — derived from area ÷ length when needed */
  widthM: number;
  /** Vertical extent along Y (metres) — heuristic slab thickness */
  thicknessM: number;
}

export function inferBergDimensions(
  areaSqnm: number | null | undefined,
  lengthNm: number | null | undefined,
  widthNm: number | null | undefined,
): BergDimensions {
  const areaM2 = areaSqnmToM2(areaSqnm);
  let lengthM = nmToMetres(lengthNm);
  let widthM = nmToMetres(widthNm);

  if (areaM2 != null) {
    const side = Math.sqrt(areaM2);
    if (lengthM == null && widthM == null) {
      lengthM = side;
      widthM = side;
    } else if (lengthM != null && widthM == null) {
      widthM = clamp(areaM2 / lengthM, 20, lengthM * 3);
    } else if (widthM != null && lengthM == null) {
      lengthM = clamp(areaM2 / widthM, 20, widthM * 3);
    }
  }

  if (lengthM == null) lengthM = 400;
  if (widthM == null) widthM = areaM2 != null ? clamp(areaM2 / lengthM, 20, lengthM * 3) : lengthM;

  const footprint = Math.max(lengthM * widthM, 1);
  const thicknessM = clamp(
    Math.min(lengthM, widthM) * 0.32,
    Math.sqrt(footprint) * 0.08,
    420,
  );

  return {
    lengthM,
    widthM,
    thicknessM,
  };
}

/** Scale factors applied to a unit box (X = length, Y = thickness, Z = width). */
export function bergSceneScale(dim: BergDimensions): { sx: number; sy: number; sz: number } {
  return {
    sx: clamp(dim.lengthM / REF_M, 0.06, 5),
    sy: clamp(dim.thicknessM / REF_M, 0.04, 4),
    sz: clamp(dim.widthM / REF_M, 0.06, 5),
  };
}

export function icebergSizeModel(
  areaSqnm: number | null | undefined,
  lengthNm: number | null | undefined,
  widthNm: number | null | undefined,
): { dimensions: BergDimensions; scales: { sx: number; sy: number; sz: number } } {
  const dimensions = inferBergDimensions(areaSqnm, lengthNm, widthNm);
  return { dimensions, scales: bergSceneScale(dimensions) };
}
