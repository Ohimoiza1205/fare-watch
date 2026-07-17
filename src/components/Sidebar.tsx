"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { WeatherSnapshot } from "@/lib/planner/types";

// The left rail. The wordmark sits at the top, the destinations run down the
// middle with the active one in the accent, and a quiet user card is pinned at
// the bottom. The tracker and the planner both live here. It reads on the dark
// tracker and the blue planner because it is built from the shared tokens.

type Glyph = (p: { className?: string }) => React.ReactElement;

function G({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const ICON: Record<string, Glyph> = {
  home: (p) => <G {...p}><path d="M4 11l8-6 8 6M6 10v9h12v-9" /></G>,
  trips: (p) => <G {...p}><path d="M4 7h16v12H4zM4 7l3-3h10l3 3M9 11h6" /></G>,
  deals: (p) => <G {...p}><path d="M12 3l2.5 5 5.5.8-4 3.9 1 5.5L12 16.9 7 18.2l1-5.5-4-3.9 5.5-.8z" /></G>,
  watchlist: (p) => <G {...p}><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" /><circle cx="12" cy="12" r="2.5" /></G>,
  alerts: (p) => <G {...p}><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6M10 20a2 2 0 0 0 4 0" /></G>,
  profile: (p) => <G {...p}><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></G>,
  settings: (p) => <G {...p}><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></G>,
};

type Item = { id: string; label: string; href: string };

const ITEMS: Item[] = [
  { id: "home", label: "Home", href: "/" },
  { id: "trips", label: "Trips", href: "/plan" },
  { id: "deals", label: "Deals", href: "/deals" },
  { id: "watchlist", label: "Watchlist", href: "/watchlist" },
  { id: "alerts", label: "Alerts", href: "/alerts" },
  { id: "profile", label: "Profile", href: "/profile" },
  { id: "settings", label: "Settings", href: "/settings" },
];

function isActive(item: Item, pathname: string): boolean {
  if (item.href === "/") return pathname === "/";
  return pathname.startsWith(item.href);
}

export type SidebarWeather = {
  destLabel: string;
  snapshot: WeatherSnapshot;
};

// Weather for the next trip's destination, kept quiet: figures, unit, and the
// condition in plain words. An estimated snapshot dims and takes a tilde, the
// same treatment estimated prices get in the planner.
function WeatherCard({ weather }: { weather: SidebarWeather }) {
  const { tempMax, tempMin, unit, summary, estimated } = weather.snapshot;
  return (
    <div className="mx-3 px-3 py-2">
      <span className="block truncate text-xs ink-2">{weather.destLabel}</span>
      <span
        className={`mt-1 flex items-baseline gap-2 text-xs ${estimated ? "ink-3" : "ink-2"}`}
      >
        {estimated && (
          <span aria-hidden="true" className="ink-3">
            ~
          </span>
        )}
        <span className={`num ${estimated ? "ink-2" : "ink-1"}`}>
          {tempMax != null ? Math.round(tempMax) : "--"}
        </span>
        <span className="num ink-3">
          {tempMin != null ? Math.round(tempMin) : "--"}
        </span>
        <span className="ink-4">{unit}</span>
        <span className="truncate lowercase">{summary}</span>
      </span>
    </div>
  );
}

export function Sidebar({ weather }: { weather?: SidebarWeather | null }) {
  const pathname = usePathname();

  return (
    <aside
      className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r md:flex surface-2"
      style={{ borderColor: "var(--hairline)" }}
    >
      <div className="px-5 py-5">
        <span className="num text-sm tracking-tight ink-0">FareWatch</span>
      </div>

      <nav className="flex-1 px-3" aria-label="Primary">
        <ul className="space-y-0.5">
          {ITEMS.map((item) => {
            const Icon = ICON[item.id];
            const active = isActive(item, pathname);
            const inner = (
              <span
                className={`relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-[var(--d1)] ${
                  active
                    ? ""
                    : "ink-2 hover:text-[var(--ink-0)] hover:bg-[var(--surface-1)]"
                }`}
                style={
                  active
                    ? { background: "var(--accent-soft)", color: "var(--accent)" }
                    : undefined
                }
              >
                {active && (
                  <span
                    className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full"
                    style={{ background: "var(--accent)" }}
                  />
                )}
                <Icon className="h-[18px] w-[18px]" />
                {item.label}
              </span>
            );

            return (
              <li key={item.id}>
                <Link href={item.href} aria-current={active ? "page" : undefined}>
                  {inner}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {weather && <WeatherCard weather={weather} />}

      <div className="m-3 flex items-center gap-3 rounded-lg p-3 surface-1">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium"
          style={{ background: "var(--ink-2)", color: "var(--on-ink)" }}
        >
          Y
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm ink-1">You</span>
          <span className="block truncate text-xs ink-3">Local account</span>
        </span>
      </div>
    </aside>
  );
}
