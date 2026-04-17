export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-[1600px] px-6 py-16">
      <div className="eyebrow">Dashboard</div>
      <h1 className="mt-2 font-serif text-4xl text-ink">Analytics</h1>
      <p className="mt-4 max-w-xl text-ink-light">
        Size distribution, drift speeds, and activity over time. Coming in Phase 4.
      </p>
      <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
        {["Size distribution", "Drift speeds", "Active count", "Heatmap"].map((title) => (
          <div key={title} className="card flex h-56 flex-col justify-between p-5">
            <div>
              <div className="eyebrow">Chart</div>
              <h3 className="mt-1 font-serif text-xl text-ink">{title}</h3>
            </div>
            <div className="text-xs text-ink-light">Coming soon</div>
          </div>
        ))}
      </div>
    </div>
  );
}
