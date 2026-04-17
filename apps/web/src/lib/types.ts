export type IcebergStatus = "tracked" | "grounded" | "disintegrated";

export interface LatestObservation {
  latitude: number;
  longitude: number;
  observed_at: string;
  area_sqnm: number | null;
}

export interface Iceberg {
  name: string;
  status: IcebergStatus;
  source_glacier: string | null;
  original_calving_date: string | null;
  latest_observation: LatestObservation | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface IcebergListResponse {
  count: number;
  icebergs: Iceberg[];
}

export interface GeoPoint {
  type: "Point";
  coordinates: [number, number];
}

export interface Observation {
  iceberg_name: string;
  observed_at: string;
  location: GeoPoint;
  length_nm: number | null;
  width_nm: number | null;
  area_sqnm: number | null;
  source: string;
  raw_data?: Record<string, unknown> | null;
}
