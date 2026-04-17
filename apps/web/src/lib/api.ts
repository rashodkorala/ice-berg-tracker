import type { Iceberg, IcebergListResponse, Observation } from "./types";

/**
 * Base origin for backend calls. On the server we talk to the API directly; in
 * the browser we go through Next's rewrite proxy at `/api/*` so we never have
 * to worry about CORS.
 */
const SERVER_API_ORIGIN =
  process.env.API_ORIGIN || process.env.NEXT_PUBLIC_API_ORIGIN || "http://127.0.0.1:8000";

function apiUrl(path: string): string {
  if (typeof window === "undefined") {
    return `${SERVER_API_ORIGIN}${path}`;
  }
  return path;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`API ${path} failed: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
}

export async function fetchIcebergs(): Promise<IcebergListResponse> {
  return request<IcebergListResponse>("/api/icebergs");
}

export async function fetchIceberg(name: string): Promise<Iceberg> {
  return request<Iceberg>(`/api/icebergs/${encodeURIComponent(name)}`);
}

export async function fetchObservations(name: string): Promise<Observation[]> {
  return request<Observation[]>(`/api/icebergs/${encodeURIComponent(name)}/observations`);
}
