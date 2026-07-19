"use client";

import { PriceRoll } from "@/components/PriceRoll";
import { useNow } from "@/lib/hooks";

// Four raised panels, each one real figure with one quiet sub-line. The
// savings card only exists when at least three alerts can be measured against
// their own stored range; otherwise the slot states the observation count
// instead, because an invented savings figure would poison trust in the rest.

function Glyph({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

function Panel({
  label,
  glyph,
  children,
  sub,
  figureColor,
}: {
  label: string;
  glyph: string;
  children: React.ReactNode;
  sub: string | null;
  figureColor?: string;
}) {
  return (
    <div
      className="surface-2 elev-raise rounded-[var(--r-card)] p-4"
      style={{ border: "1px solid var(--hairline)" }}
    >
      <div className="flex items-start justify-between">
        <span className="eyebrow">{label}</span>
        <span style={{ color: "var(--ink-4)" }}>
          <Glyph d={glyph} />
        </span>
      </div>
      <div
        className="num mt-3 text-2xl"
        style={{ color: figureColor ?? "var(--ink-0)" }}
      >
        {children}
      </div>
      {sub && (
        <div className="mt-1 text-xs" style={{ color: "var(--ink-3)" }}>
          {sub}
        </div>
      )}
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

export type SavingsStat = { meanPct: number; count: number } | null;

export function StatStrip({
  routesWatched,
  lastPollAt,
  scheduleKnown,
  alertsToday,
  alertsLast24h,
  savings,
  observationsTotal,
}: {
  routesWatched: number;
  lastPollAt: string | null;
  scheduleKnown: boolean;
  alertsToday: number;
  alertsLast24h: number;
  savings: SavingsStat;
  observationsTotal: number;
}) {
  const now = useNow(30_000);
  const morning = new Date(now).getHours() < 12;

  const alertsSub =
    alertsToday > 0 && morning
      ? `${alertsToday} fired this morning`
      : `${alertsLast24h} in the last 24h`;

  return (
    <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Panel
        label="Routes watched"
        glyph="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"
        sub={`${routesWatched} active ${routesWatched === 1 ? "monitor" : "monitors"}`}
      >
        <PriceRoll value={routesWatched} />
      </Panel>

      <Panel
        label="Last poll"
        glyph="M12 8v5l3 2M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9z"
        sub={scheduleKnown ? "next run per cron schedule" : null}
      >
        {lastPollAt ? `${relativeAge(now - new Date(lastPollAt).getTime())} ago` : "never"}
      </Panel>

      <Panel
        label="Alerts today"
        glyph="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6M10 20a2 2 0 0 0 4 0"
        sub={alertsSub}
        figureColor={alertsToday > 0 ? "var(--warm)" : undefined}
      >
        <PriceRoll value={alertsToday} />
      </Panel>

      {savings ? (
        <Panel
          label="Avg savings"
          glyph="M3 17l6-6 4 4 8-8M21 7v6h-6"
          sub={`across ${savings.count} alerts, 30 days`}
          figureColor="var(--warm)"
        >
          -{Math.round(savings.meanPct)}%
        </Panel>
      ) : (
        <Panel
          label="Observations"
          glyph="M4 19V5M4 19h16M8 15v-4M12 15V8M16 15v-6"
          sub="stored readings"
        >
          <PriceRoll value={observationsTotal} />
        </Panel>
      )}
    </div>
  );
}
