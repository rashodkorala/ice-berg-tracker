export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="eyebrow">About</div>
      <h1 className="mt-2 font-serif text-4xl text-ink">Iceberg alley, from orbit.</h1>

      <div className="prose prose-neutral mt-6 space-y-5 text-ink-light">
        <p>
          Every spring, icebergs calved off western Greenland drift south on the
          Labrador Current into the shipping lanes between Newfoundland and the
          Grand Banks — the stretch of ocean known as{" "}
          <em>iceberg alley</em>. This site follows them, week by week, from
          space.
        </p>

        <p>
          Observations come from the{" "}
          <a
            className="text-ocean-dark underline decoration-border"
            href="https://api.met.no/weatherapi/iceberg/0.1/documentation"
            target="_blank"
            rel="noreferrer"
          >
            Norwegian Meteorological Institute iceberg API
          </a>
          , which ingests Copernicus{" "}
          <a
            className="text-ocean-dark underline decoration-border"
            href="https://sentiwiki.copernicus.eu/web/sentinel-1"
            target="_blank"
            rel="noreferrer"
          >
            Sentinel-1
          </a>{" "}
          and{" "}
          <a
            className="text-ocean-dark underline decoration-border"
            href="https://www.asc-csa.gc.ca/eng/satellites/radarsat/"
            target="_blank"
            rel="noreferrer"
          >
            RADARSAT Constellation
          </a>{" "}
          SAR imagery and publishes a fresh GeoJSON scene every week. Synthetic
          aperture radar sees through cloud and polar night, so detection works
          year-round.
        </p>

        <h2 className="mt-10 font-serif text-2xl text-ink">How it works</h2>
        <ol className="list-decimal space-y-2 pl-6">
          <li>
            A scheduled job pulls the latest weekly FeatureCollection from
            met.no.
          </li>
          <li>
            Features within 2&nbsp;km of a known ship AIS track are dropped
            &mdash; those are almost certainly vessels, not ice.
          </li>
          <li>
            Area (m²) and max length (m) are converted to nautical units and
            upserted into MongoDB.
          </li>
          <li>
            The Next.js front-end draws each berg as a marker and connects
            repeated sightings with a drift path (see below).
          </li>
        </ol>

        <h2 className="mt-10 font-serif text-2xl text-ink">Drift paths</h2>
        <p>
          Whenever the database holds two or more observations for the{" "}
          <em>same</em> iceberg id (oldest → newest), the map overlays a teal
          polyline between those coordinates — a simple inferred track from the
          points we have logged. Antarctic USNIC ids are stable season to
          season, so paths appear naturally after you seed several weeks of
          data.
        </p>
        <p>
          Weekly met.no snapshots use anonymous detections renamed from date +
          coordinates, so separate weeks usually produce unrelated ids unless a
          berg stays at the exact same rounded location. Increase{" "}
          <code>METNO_WEEKS</code> and reseed to accumulate history faster, or
          pipe in a secondary source once we add trajectory matching.
        </p>

        <h2 className="mt-10 font-serif text-2xl text-ink">About the IDs</h2>
        <p>
          Unlike the named Antarctic giants (A23A, A68, &hellip;), SAR-detected
          bergs off Newfoundland are anonymous — each weekly scan is a fresh
          snapshot. We synthesise stable identifiers from the observation date
          and coordinates, e.g. <code>NA-20260416-50.21N-53.42W</code>, so
          re-running the importer never creates duplicates, but a berg tracked
          across multiple weeks will appear under a different name each week.
          True trajectory linking across snapshots is still on the roadmap —
          drift lines only connect rows that share the synthetic id today.
        </p>

        <h2 className="mt-10 font-serif text-2xl text-ink">Why it matters</h2>
        <p>
          Bergs in the alley are a navigation hazard for the transatlantic
          shipping lanes and the offshore oil platforms on the Grand Banks.
          They&rsquo;re also a quiet, beautiful signal of a changing cryosphere
          — the more meltwater Greenland&rsquo;s glaciers shed, the more
          calving events feed the current.
        </p>

        <h2 className="mt-10 font-serif text-2xl text-ink">Stack</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>Next.js 15 · Tailwind · React-Leaflet on the front-end</li>
          <li>FastAPI · MongoDB Atlas · pandas on the back-end</li>
          <li>Turborepo + pnpm workspaces</li>
          <li>
            <a
              className="text-ocean-dark underline decoration-border"
              href="https://github.com/rashodkorala/ice-berg-tracker"
              target="_blank"
              rel="noreferrer"
            >
              Source on GitHub
            </a>
          </li>
        </ul>

        <h2 className="mt-10 font-serif text-2xl text-ink">Colophon</h2>
        <p>
          Built by{" "}
          <a
            className="text-ocean-dark underline decoration-border"
            href="https://www.rashodkorala.com"
            target="_blank"
            rel="noreferrer"
          >
            Rashod
          </a>{" "}
          in Newfoundland. Get in touch:
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            Web ·{" "}
            <a
              className="text-ocean-dark underline decoration-border"
              href="https://www.rashodkorala.com"
              target="_blank"
              rel="noreferrer"
            >
              rashodkorala.com
            </a>
          </li>
          <li>
            Email ·{" "}
            <a
              className="text-ocean-dark underline decoration-border"
              href="mailto:hello@rashodkorala.com"
            >
              hello@rashodkorala.com
            </a>
          </li>
          <li>
            GitHub ·{" "}
            <a
              className="text-ocean-dark underline decoration-border"
              href="https://github.com/rashodkorala"
              target="_blank"
              rel="noreferrer"
            >
              @rashodkorala
            </a>
          </li>
        </ul>

        <p className="mt-10 text-xs text-ink-light">
          Data © Norwegian Meteorological Institute & Copernicus, licensed
          under{" "}
          <a
            className="underline decoration-border"
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="noreferrer"
          >
            CC BY 4.0
          </a>
          . Site code MIT.
        </p>
      </div>
    </div>
  );
}
