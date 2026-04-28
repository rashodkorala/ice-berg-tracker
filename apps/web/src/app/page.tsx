import { Map } from "@/components/Map";
import { fetchIcebergs, fetchTracks } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Iceberg, IcebergListResponse, IcebergTrack } from "@/lib/types";

export const dynamic = "force-dynamic";

const SQ_NM_TO_KM2 = 3.429904;

async function loadPage(): Promise<{
  data: IcebergListResponse | null;
  tracks: IcebergTrack[];
  error: string | null;
}> {
  try {
    const data = await fetchIcebergs();
    let tracks: IcebergTrack[] = [];
    try {
      const tr = await fetchTracks();
      tracks = tr.tracks;
    } catch {
      tracks = [];
    }
    return { data, tracks, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { data: null, tracks: [], error: message };
  }
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col">
      <span className="eyebrow">{label}</span>
      <span className="mt-1 font-serif text-2xl text-ink">{value}</span>
      {sub && <span className="mt-0.5 text-xs text-ink-light">{sub}</span>}
    </div>
  );
}

function computeStats(icebergs: Iceberg[], tracksCount: number) {
  const withArea = icebergs
    .map((b) => b.latest_observation?.area_sqnm ?? null)
    .filter((a): a is number => a != null);
  const largestSqnm = withArea.length > 0 ? Math.max(...withArea) : null;
  const largestKm2 = largestSqnm != null ? largestSqnm * SQ_NM_TO_KM2 : null;
  const mostRecent = icebergs
    .map((b) => b.latest_observation?.observed_at)
    .filter((t): t is string => !!t)
    .sort()
    .pop();
  return { total: icebergs.length, tracksCount, largestKm2, mostRecent };
}

function SourceBadge({ name, source }: { name: string; source?: string | null }) {
  const isMetno = source === "metno" || /^NA-\d{8}-/.test(name);
  if (isMetno) {
    return (
      <span className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-widest bg-ocean-light text-ocean-dark">
        SAR · met.no
      </span>
    );
  }
  return (
    <span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-widest text-ink-light">
      USNIC
    </span>
  );
}

export default async function HomePage() {
  const { data, tracks, error } = await loadPage();
  const icebergs = data?.icebergs ?? [];
  const stats = computeStats(icebergs, tracks.length);
  const trackedNames = new Set(tracks.map((t) => t.iceberg_name));

  return (
    <div className="flex flex-col">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="border-b border-border bg-paper">
        <div className="mx-auto max-w-[1600px] px-6 py-10">
          <div className="eyebrow">Live tracker · North Atlantic · Updated weekly</div>
          <h1 className="mt-2 max-w-3xl font-serif text-4xl leading-tight text-ink md:text-display">
            Iceberg alley, from orbit.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-ink-light md:text-lg">
            Each spring, icebergs calved off Greenland&rsquo;s glaciers drift south on the
            Labrador Current into the transatlantic shipping lanes between Newfoundland and
            the Grand Banks. This tracks them, week by week, from space.
          </p>
          <p className="mt-2 max-w-2xl text-sm text-ink-light">
            Observations from Copernicus Sentinel-1 &amp; RADARSAT SAR imagery via the
            Norwegian Meteorological Institute. Synthetic aperture radar sees through cloud
            cover and polar night — detection is continuous, year-round.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-6 border-t border-border pt-6 md:grid-cols-4">
            <Stat label="Bergs in view" value={stats.total.toLocaleString()} sub="current detections" />
            <Stat label="With drift path" value={stats.tracksCount.toLocaleString()} sub="linked across scans" />
            <Stat
              label="Largest"
              value={stats.largestKm2 != null ? `${stats.largestKm2.toFixed(1)} km²` : "—"}
              sub="by SAR footprint"
            />
            <Stat label="Last SAR scan" value={formatDate(stats.mostRecent)} sub="met.no weekly update" />
          </div>
        </div>
      </section>

      {/* ── Map ──────────────────────────────────────────────────────── */}
      <section className="relative h-[75vh] min-h-[560px] w-full border-b border-border">
        {error ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-paper px-6 text-center">
            <div className="eyebrow text-ink-light">Unable to load data</div>
            <p className="max-w-md text-sm text-ink-light">{error}</p>
            <p className="max-w-md text-xs text-ink-light">
              Make sure the backend is running on <code>:8000</code> and that MongoDB is
              reachable. Try <code className="font-mono">pnpm --filter api seed</code>.
            </p>
          </div>
        ) : (
          <div className="relative h-full w-full">
            <Map icebergs={icebergs} tracks={tracks} />

            {/* Legend + drift path note */}
            <div className="pointer-events-none absolute bottom-4 left-4 max-w-[220px] rounded border border-border bg-paper/95 px-3 py-2.5 text-xs text-ink-light shadow-sm backdrop-blur-sm">
              {tracks.length > 0 && (
                <>
                  <p className="mb-2 font-medium text-ink">
                    {tracks.length.toLocaleString()} drift path{tracks.length === 1 ? "" : "s"}
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <svg width="24" height="6" viewBox="0 0 24 6" fill="none" aria-hidden="true">
                        <line x1="0" y1="3" x2="24" y2="3" stroke="#1B6B93" strokeWidth="2" strokeLinecap="round" opacity="0.65" />
                      </svg>
                      <span>Tracked drift path</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg width="24" height="6" viewBox="0 0 24 6" fill="none" aria-hidden="true">
                        <line x1="0" y1="3" x2="24" y2="3" stroke="#1B6B93" strokeWidth="1.5" strokeDasharray="5 4" strokeLinecap="round" opacity="0.45" />
                      </svg>
                      <span>Inferred (proximity match)</span>
                    </div>
                  </div>
                  <p className="mt-2 text-[10px] leading-snug text-ink-light/70">
                    Lines connect older sightings to newer ones. Dashed = proximity-linked, not continuously tracked.
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ── Iceberg cards ────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-[1600px] px-6 py-10">
        <div className="flex items-baseline justify-between border-b border-border pb-3">
          <h2 className="font-serif text-2xl text-ink">Active detections</h2>
          <span className="eyebrow">{icebergs.length.toLocaleString()} icebergs · top 12 by area</span>
        </div>

        {icebergs.length === 0 ? (
          <p className="py-8 text-sm text-ink-light">
            No icebergs in the database yet. Run{" "}
            <code className="font-mono">pnpm --filter api seed</code> to populate.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 pt-6 md:grid-cols-2 lg:grid-cols-3">
            {[...icebergs]
              .sort(
                (a, b) =>
                  (b.latest_observation?.area_sqnm ?? 0) -
                  (a.latest_observation?.area_sqnm ?? 0),
              )
              .slice(0, 12)
              .map((iceberg) => {
                const obs = iceberg.latest_observation;
                const hasDrift = trackedNames.has(iceberg.name);
                const areaKm2 = obs?.area_sqnm != null
                  ? (obs.area_sqnm * SQ_NM_TO_KM2).toFixed(2)
                  : null;

                return (
                  <article key={iceberg.name} className="card p-5">
                    {/* Header row: name + badges */}
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-serif text-xl leading-tight text-ink">{iceberg.name}</h3>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <SourceBadge name={iceberg.name} source={obs?.source} />
                        {hasDrift && (
                          <span className="text-[10px] text-ocean-dark">↔ drift path</span>
                        )}
                      </div>
                    </div>

                    <dl className="mt-4 space-y-1 text-sm text-ink-light">
                      {areaKm2 && (
                        <div className="flex justify-between">
                          <dt>Area</dt>
                          <dd className="text-ink">{areaKm2} km²</dd>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <dt>Last observed</dt>
                        <dd className="text-ink">
                          {formatDate(obs?.observed_at ?? null)}
                        </dd>
                      </div>
                      {obs?.latitude != null && (
                        <div className="flex justify-between">
                          <dt>Position</dt>
                          <dd className="text-ink">
                            {Math.abs(obs.latitude).toFixed(1)}°{obs.latitude >= 0 ? "N" : "S"},{" "}
                            {Math.abs(obs.longitude).toFixed(1)}°{obs.longitude >= 0 ? "E" : "W"}
                          </dd>
                        </div>
                      )}
                      {iceberg.source_glacier && (
                        <div className="flex justify-between">
                          <dt>Origin</dt>
                          <dd className="text-ink">{iceberg.source_glacier}</dd>
                        </div>
                      )}
                    </dl>
                  </article>
                );
              })}
          </div>
        )}

        <p className="mt-6 text-xs text-ink-light">
          Showing largest 12 by SAR footprint area.{" "}
          <a href="/dashboard" className="underline decoration-border hover:text-ocean-dark">
            View full analytics →
          </a>
        </p>
      </section>
    </div>
  );
}
