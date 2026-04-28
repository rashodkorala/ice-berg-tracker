import { fetchIcebergs, fetchTracks } from "@/lib/api";
import { formatArea, formatDate } from "@/lib/format";
import type { Iceberg } from "@/lib/types";

export const dynamic = "force-dynamic";

const SQ_NM_TO_KM2 = 3.429904;

function toKm2(sqnm: number) {
  return sqnm * SQ_NM_TO_KM2;
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

function SizeBucket({
  label,
  count,
  total,
  range,
}: {
  label: string;
  count: number;
  total: number;
  range: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-ink">{label}</span>
        <span className="text-ink-light">{range}</span>
        <span className="font-medium text-ink">{count.toLocaleString()}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-ocean-light">
        <div
          className="h-full rounded-full bg-ocean transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-right text-xs text-ink-light">{pct.toFixed(1)} %</p>
    </div>
  );
}

export default async function DashboardPage() {
  let icebergs: Iceberg[] = [];
  let tracksCount = 0;

  try {
    const data = await fetchIcebergs();
    icebergs = data?.icebergs ?? [];
  } catch {
    // render with empty state
  }
  try {
    const tr = await fetchTracks();
    tracksCount = tr.tracks.length;
  } catch {
    // ignore
  }

  const withArea = icebergs.filter((b) => b.latest_observation?.area_sqnm != null);
  const areas = withArea.map((b) => toKm2(b.latest_observation!.area_sqnm!));
  const totalWithArea = areas.length;

  // Size buckets (km²)
  const buckets = {
    tiny: areas.filter((a) => a < 1).length,
    small: areas.filter((a) => a >= 1 && a < 10).length,
    medium: areas.filter((a) => a >= 10 && a < 100).length,
    large: areas.filter((a) => a >= 100).length,
  };

  const largestKm2 = areas.length > 0 ? Math.max(...areas) : null;
  const mostRecent = icebergs
    .map((b) => b.latest_observation?.observed_at)
    .filter((t): t is string => !!t)
    .sort()
    .pop();

  const top15 = [...icebergs]
    .filter((b) => b.latest_observation?.area_sqnm != null)
    .sort(
      (a, b) =>
        (b.latest_observation!.area_sqnm ?? 0) - (a.latest_observation!.area_sqnm ?? 0),
    )
    .slice(0, 15);

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-10">
      <div className="eyebrow">Dashboard</div>
      <h1 className="mt-2 font-serif text-4xl text-ink">Analytics</h1>
      <p className="mt-3 max-w-xl text-ink-light">
        Current season overview — {icebergs.length.toLocaleString()} iceberg detections from
        the latest SAR scan.
      </p>

      {/* ── Summary stats ──────────────────────────────────────────── */}
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Total detections", value: icebergs.length.toLocaleString() },
          { label: "With drift path", value: tracksCount.toLocaleString() },
          {
            label: "Largest",
            value: largestKm2 != null ? `${largestKm2.toFixed(1)} km²` : "—",
          },
          { label: "Last SAR scan", value: formatDate(mostRecent) },
        ].map(({ label, value }) => (
          <div key={label} className="card p-5">
            <div className="eyebrow">{label}</div>
            <div className="mt-1 font-serif text-2xl text-ink">{value}</div>
          </div>
        ))}
      </div>

      {/* ── Size distribution ──────────────────────────────────────── */}
      <div className="mt-10">
        <h2 className="border-b border-border pb-3 font-serif text-2xl text-ink">
          Size distribution
        </h2>
        <p className="mt-2 text-sm text-ink-light">
          By SAR footprint area — {totalWithArea.toLocaleString()} bergs with known area.
        </p>
        <div className="mt-6 space-y-4 max-w-2xl">
          <SizeBucket label="Tiny" range="< 1 km²" count={buckets.tiny} total={totalWithArea} />
          <SizeBucket label="Small" range="1–10 km²" count={buckets.small} total={totalWithArea} />
          <SizeBucket label="Medium" range="10–100 km²" count={buckets.medium} total={totalWithArea} />
          <SizeBucket label="Large" range="> 100 km²" count={buckets.large} total={totalWithArea} />
        </div>
      </div>

      {/* ── Top 15 largest ─────────────────────────────────────────── */}
      <div className="mt-10">
        <h2 className="border-b border-border pb-3 font-serif text-2xl text-ink">
          Largest icebergs
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="eyebrow pb-2 pr-6">Name</th>
                <th className="eyebrow pb-2 pr-6">Area</th>
                <th className="eyebrow pb-2 pr-6">Last observed</th>
                <th className="eyebrow pb-2">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {top15.map((berg) => {
                const obs = berg.latest_observation;
                const km2 = obs?.area_sqnm != null ? toKm2(obs.area_sqnm) : null;
                return (
                  <tr key={berg.name} className="hover:bg-ocean-light/30 transition-colors">
                    <td className="py-2.5 pr-6 font-serif text-ink">{berg.name}</td>
                    <td className="py-2.5 pr-6 text-ink">
                      {km2 != null ? `${km2.toFixed(2)} km²` : formatArea(obs?.area_sqnm ?? null)}
                    </td>
                    <td className="py-2.5 pr-6 text-ink-light">
                      {formatDate(obs?.observed_at ?? null)}
                    </td>
                    <td className="py-2.5">
                      <SourceBadge name={berg.name} source={obs?.source} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Coming soon ────────────────────────────────────────────── */}
      <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
        {["Drift speed distribution", "Weekly detection count", "Geographic heatmap", "Size over time"].map(
          (title) => (
            <div key={title} className="card flex h-40 flex-col justify-between p-5">
              <div>
                <div className="eyebrow">Chart</div>
                <h3 className="mt-1 font-serif text-xl text-ink">{title}</h3>
              </div>
              <div className="text-xs text-ink-light">Coming soon</div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
