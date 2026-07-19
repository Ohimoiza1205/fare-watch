"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { WeatherSnapshot } from "@/lib/planner/types";
import { useNow } from "@/lib/hooks";
import { DestinationImage } from "@/components/DestinationImage";

// The left rail. Dark in both themes for continuity, so it reads from the
// root tokens and never from the planner scope. The wordmark and live poll
// status sit at the top, the nav runs in three labelled groups, the weather
// card rides under the planner group, and the poll cadence strip holds the
// bottom. Every state shown here is real: the status line and the strip are
// derived from the newest observation timestamp and the configured cron
// cadence, and say so plainly when either is missing.

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
  deals: (p) => <G {...p}><path d="M12 3l2.5 5 5.5.8-4 3.9 1 5.5L12 16.9 7 18.2l1-5.5-4-3.9 5.5-.8z" /></G>,
  watchlist: (p) => <G {...p}><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" /><circle cx="12" cy="12" r="2.5" /></G>,
  alerts: (p) => <G {...p}><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6M10 20a2 2 0 0 0 4 0" /></G>,
  plan: (p) => <G {...p}><path d="M4 7h16v12H4zM4 7l3-3h10l3 3M9 11h6" /></G>,
  trip: (p) => <G {...p}><path d="M9 20l-5-2V5l5 2 6-2 5 2v13l-5-2-6 2zM9 7v13M15 5v13" /></G>,
  profile: (p) => <G {...p}><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></G>,
  settings: (p) => <G {...p}><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></G>,
};

function PlaneGlyph({ className }: { className?: string }) {
  return (
    <G className={className}>
      <path d="M21 4L3 11l7 2.5L12.5 21l3-6.5L21 4z" />
    </G>
  );
}

type Item = { id: string; label: string; href: string };
type Group = { label: string; items: Item[] };

function isActive(item: Item, pathname: string): boolean {
  if (item.href === "/") return pathname === "/";
  return pathname.startsWith(item.href) || pathname === item.href;
}

export type SidebarWeather = {
  destLabel: string;
  snapshot: WeatherSnapshot;
};

function WeatherCard({ weather }: { weather: SidebarWeather }) {
  const { tempMax, tempMin, unit, summary, estimated } = weather.snapshot;
  return (
    <div className="surface-1 mx-3 mt-1 rounded-lg px-3 py-2">
      <span className="block truncate text-xs" style={{ color: "var(--ink-2)" }}>
        {weather.destLabel}
      </span>
      <span
        className="mt-1 flex items-baseline gap-2 text-xs"
        style={{ color: estimated ? "var(--ink-3)" : "var(--ink-2)" }}
      >
        {estimated && (
          <span aria-hidden="true" style={{ color: "var(--ink-3)" }}>
            ~
          </span>
        )}
        <span className="num" style={{ color: estimated ? "var(--ink-2)" : "var(--ink-1)" }}>
          {tempMax != null ? Math.round(tempMax) : "--"}
        </span>
        <span className="num" style={{ color: "var(--ink-3)" }}>
          {tempMin != null ? Math.round(tempMin) : "--"}
        </span>
        <span style={{ color: "var(--ink-4)" }}>{unit}</span>
        <span className="truncate lowercase">{summary}</span>
      </span>
    </div>
  );
}

function relativeAge(ms: number): string {
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

type PollState = "live" | "overdue" | "unscheduled";

function pollState(lastPollAt: string | null, cadenceMs: number | null, now: number): PollState {
  if (cadenceMs == null) return "unscheduled";
  if (lastPollAt == null) return "overdue";
  return now - new Date(lastPollAt).getTime() <= cadenceMs * 2 ? "live" : "overdue";
}

const POLL_LABEL: Record<PollState, string> = {
  live: "Polling live",
  overdue: "Poll overdue",
  unscheduled: "Cron not scheduled",
};

const POLL_COLOR: Record<PollState, string> = {
  live: "var(--cool)",
  overdue: "var(--amber)",
  unscheduled: "var(--ink-3)",
};

export function Sidebar({
  weather,
  lastPollAt,
  cadenceMs,
  tripLink,
}: {
  weather?: SidebarWeather | null;
  lastPollAt: string | null;
  cadenceMs: number | null;
  tripLink: { label: string; href: string; city: string } | null;
}) {
  const pathname = usePathname();
  const now = useNow(30_000);

  const state = pollState(lastPollAt, cadenceMs, now);
  const elapsed = lastPollAt != null ? now - new Date(lastPollAt).getTime() : null;

  const groups: Group[] = [
    {
      label: "Tracker",
      items: [
        { id: "home", label: "Home", href: "/" },
        { id: "deals", label: "Deals", href: "/deals" },
        { id: "watchlist", label: "Watchlist", href: "/watchlist" },
        { id: "alerts", label: "Alerts", href: "/alerts" },
      ],
    },
    {
      label: "Planner",
      items: [
        { id: "plan", label: "Plan a trip", href: "/plan" },
        ...(tripLink ? [{ id: "trip", label: tripLink.label, href: tripLink.href }] : []),
      ],
    },
    {
      label: "Account",
      items: [
        { id: "profile", label: "Profile", href: "/profile" },
        { id: "settings", label: "Settings", href: "/settings" },
      ],
    },
  ];

  return (
    <aside
      className="surface-1 sticky top-0 z-10 hidden h-screen w-56 shrink-0 flex-col border-r md:flex"
      style={{ borderColor: "var(--hairline)" }}
    >
      <div className="flex items-center gap-2.5 px-4 py-4">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: "var(--cool-soft)", color: "var(--cool)" }}
        >
          <PlaneGlyph className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span
            className="heading block text-sm tracking-wide"
            style={{ color: "var(--ink-0)", letterSpacing: "0.06em" }}
          >
            FAREPOINT
          </span>
          <span
            className="mt-0.5 flex items-center gap-1.5 text-[10px] uppercase"
            style={{ letterSpacing: "0.07em" }}
          >
            <span
              className={state === "live" ? "dot-breathe" : undefined}
              style={{
                width: 5,
                height: 5,
                borderRadius: "var(--r-pill)",
                background: POLL_COLOR[state],
              }}
            />
            <span style={{ color: POLL_COLOR[state] }}>{POLL_LABEL[state]}</span>
          </span>
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3" aria-label="Primary">
        {groups.map((group) => (
          <div key={group.label} className="mb-3">
            <div
              className="px-3 pb-1 pt-2 text-[10px] uppercase"
              style={{ letterSpacing: "0.1em", color: "var(--ink-4)" }}
            >
              {group.label}
            </div>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = ICON[item.id];
                const active = isActive(item, pathname);
                return (
                  <li key={item.id}>
                    <Link href={item.href} aria-current={active ? "page" : undefined}>
                      <span
                        className="pressable relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm"
                        style={
                          active
                            ? { background: "var(--cool-soft)", color: "var(--cool)" }
                            : { color: "var(--ink-2)" }
                        }
                      >
                        {active && (
                          <span
                            className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full"
                            style={{ background: "var(--cool)" }}
                          />
                        )}
                        {item.id === "trip" && tripLink ? (
                          <DestinationImage
                            place={tripLink.city}
                            className="h-[18px] w-[26px] shrink-0 rounded"
                          />
                        ) : (
                          Icon && <Icon className="h-[18px] w-[18px]" />
                        )}
                        <span className="truncate">{item.label}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {group.label === "Planner" && weather && <WeatherCard weather={weather} />}
          </div>
        ))}
      </nav>

      <div className="border-t px-4 py-3" style={{ borderColor: "var(--hairline)" }}>
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] uppercase" style={{ letterSpacing: "0.08em", color: "var(--ink-4)" }}>
            Poll cadence
          </span>
          <span className="num text-[11px]" style={{ color: "var(--ink-3)" }}>
            {state === "unscheduled"
              ? "not scheduled"
              : elapsed != null
                ? `${relativeAge(elapsed)} ago`
                : "no polls yet"}
          </span>
        </div>
        {cadenceMs != null && (
          <div
            className="surface-3 mt-2 h-1 overflow-hidden rounded-full"
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${elapsed != null ? Math.min(100, (elapsed / cadenceMs) * 100) : 100}%`,
                background: state === "overdue" ? "var(--amber)" : "var(--cool)",
                transition: "width var(--d3) var(--ease)",
              }}
            />
          </div>
        )}
      </div>
    </aside>
  );
}
