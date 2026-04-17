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
    "Real-time locations, sizes, and drift patterns of Antarctic and North Atlantic icebergs.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="min-h-screen bg-paper text-ink">
        <div className="flex min-h-screen flex-col">
          <Navbar />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-border bg-paper">
            <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-4 text-xs text-ink-light">
              <span>
                Data: <a className="underline decoration-border hover:text-ocean-dark" href="https://polarwatch.noaa.gov/erddap/" target="_blank" rel="noreferrer">NOAA PolarWatch ERDDAP</a>
              </span>
              <span className="eyebrow">v0.1</span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
