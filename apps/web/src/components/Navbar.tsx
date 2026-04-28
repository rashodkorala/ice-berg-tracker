import Link from "next/link";

const NAV_LINKS = [
  { href: "/", label: "Map", live: true },
  { href: "/dashboard", label: "Dashboard", live: false },
  { href: "/about", label: "About", live: false },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-paper/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-6">
        <Link href="/" className="group flex items-baseline gap-2">
          <span className="font-serif text-xl tracking-tight text-ink">
            Iceberg Tracker
          </span>
          <span className="eyebrow hidden sm:inline-block group-hover:text-ocean-dark">
            North Atlantic · Iceberg Alley
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-sm text-ink-light">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-1.5 transition-colors hover:text-ocean-dark"
            >
              {link.live && (
                <span
                  className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
                  style={{ backgroundColor: "#22c55e" }}
                  aria-hidden="true"
                />
              )}
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
