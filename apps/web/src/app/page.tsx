import { Map } from "@/components/Map";
import { fetchIcebergs, fetchTracks } from "@/lib/api";
import { formatArea, formatDate } from "@/lib/format";
import type { Iceberg, IcebergListResponse, IcebergTrack } from "@/lib/types";

export const dynamic = "force-dynamic";

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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="eyebrow">{label}</span>
      <span className="mt-1 font-serif text-2xl text-ink">{value}</span>
    </div>
  );
}

function computeStats(icebergs: Iceberg[]) {
  const tracked = icebergs.filter((b) => b.status === "tracked").length;
  const withArea = icebergs
    .map((b) => b.latest_observation?.area_sqnm ?? null)
    .filter((a): a is number => a != null);
  const largest = withArea.length > 0 ? Math.max(...withArea) : null;
  const mostRecent = icebergs
    .map((b) => b.latest_observation?.observed_at)
    .filter((t): t is string => !!t)
    .sort()
    .pop();
  return { total: icebergs.length, tracked, largest, mostRecent };
}

export default async function HomePage() {
  const { data, tracks, error } = await loadPage();
  const icebergs = data?.icebergs ?? [];
  const stats = computeStats(icebergs);

  return (
    <div className="flex flex-col">
      <section className="border-b border-border bg-paper">
        <div className="mx-auto max-w-[1600px] px-6 py-10">
          <div className="eyebrow">Live tracker · North Atlantic</div>
          <h1 className="mt-2 max-w-3xl font-serif text-4xl leading-tight text-ink md:text-display">
            Iceberg alley, from orbit.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-ink-light md:text-lg">
            Every berg the Copernicus Sentinel-1 satellite sees between Labrador and the
            Grand Banks — updated weekly by the Norwegian Meteorological Institute.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-6 border-t border-border pt-6 md:grid-cols-4">
            <Stat label="Tracked icebergs" value={stats.total.toString()} />
            <Stat label="Active" value={stats.tracked.toString()} />
            <Stat
              label="Largest"
              value={stats.largest != null ? formatArea(stats.largest) : "—"}
            />
            <Stat label="Last update" value={formatDate(stats.mostRecent)} />
          </div>
        </div>
      </section>

      <section className="relative h-[70vh] min-h-[520px] w-full border-b border-border">
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
            {tracks.length > 0 ? (
              <div className="pointer-events-none absolute bottom-4 left-4 max-w-sm rounded border border-border bg-paper/95 px-3 py-2 text-xs text-ink-light shadow-sm backdrop-blur-sm">
                <span className="font-medium text-ink">{tracks.length}</span> drift path
                {tracks.length === 1 ? "" : "s"} — lines connect older sightings to newer ones
                for the same iceberg id.
              </div>
            ) : null}
          </div>
        )}
      </section>

      <section className="mx-auto w-full max-w-[1600px] px-6 py-10">
        <div className="flex items-baseline justify-between border-b border-border pb-3">
          <h2 className="font-serif text-2xl text-ink">Currently tracked</h2>
          <span className="eyebrow">{icebergs.length} icebergs</span>
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
              .map((iceberg) => (
                <article key={iceberg.name} className="card p-5">
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-serif text-xl text-ink">{iceberg.name}</h3>
                    <span className="eyebrow">{iceberg.status}</span>
                  </div>
                  <dl className="mt-4 space-y-1 text-sm text-ink-light">
                    <div className="flex justify-between">
                      <dt>Area</dt>
                      <dd className="text-ink">
                        {formatArea(iceberg.latest_observation?.area_sqnm ?? null)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Last observed</dt>
                      <dd className="text-ink">
                        {formatDate(iceberg.latest_observation?.observed_at ?? null)}
                      </dd>
                    </div>
                    {iceberg.source_glacier ? (
                      <div className="flex justify-between">
                        <dt>Origin</dt>
                        <dd className="text-ink">{iceberg.source_glacier}</dd>
                      </div>
                    ) : null}
                  </dl>
                </article>
              ))}
          </div>
        )}
      </section>
    </div>
  );
}
