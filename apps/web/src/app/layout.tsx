import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";

import "@/styles/globals.css";

import { Navbar } from "@/components/Navbar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Iceberg Tracker",
  description:
    "Real-time locations, sizes, and drift patterns of North Atlantic icebergs — sourced from Copernicus Sentinel-1 SAR via the Norwegian Meteorological Institute.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="min-h-screen bg-paper text-ink">
        <div className="flex min-h-screen flex-col">
          <Navbar />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-border bg-paper">
            <div className="mx-auto flex max-w-[1600px] flex-col gap-1 px-6 py-4 text-xs text-ink-light sm:flex-row sm:items-center sm:justify-between sm:gap-0">
              <span>
                Data:{" "}
                <a className="underline decoration-border hover:text-ocean-dark" href="https://api.met.no/weatherapi/iceberg/0.1/documentation" target="_blank" rel="noreferrer">
                  met.no (Norwegian Met. Institute)
                </a>
                {" · "}
                <a className="underline decoration-border hover:text-ocean-dark" href="https://sentiwiki.copernicus.eu/web/sentinel-1" target="_blank" rel="noreferrer">
                  Copernicus Sentinel-1
                </a>
                {" · "}
                <a className="underline decoration-border hover:text-ocean-dark" href="https://polarwatch.noaa.gov/erddap/" target="_blank" rel="noreferrer">
                  NOAA PolarWatch
                </a>
              </span>
              <span className="eyebrow">v0.1</span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
