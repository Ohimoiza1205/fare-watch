"use client";

import { useState } from "react";
import { useNow } from "@/lib/hooks";
import { StatusPill } from "@/components/StatusPill";
import { ScrubSparkline } from "@/components/ScrubSparkline";
import { DeltaFlash } from "@/components/DeltaFlash";
import { RouteDetail } from "@/components/RouteDetail";
import type { RouteSummary } from "@/lib/db/queries";

// One watched route as a card. Everything printed is stored data or plain
// arithmetic on it; a route without enough readings states how many it has
// instead of borrowing a statistic it cannot support.

export type WatchCardExtras = {
  status: "below" | "normal" | "above" | "watching";
  trend: "falling" | "rising" | null;
  cheapestPct: number | null;
  readings: number;
  gapMs: number;
};

const STROKE: Record<WatchCardExtras["status"], string> = {
  below: "var(--warm)",
  normal: "var(--cool)",
  above: "var(--amber)",
  watching: "var(--ink-2)",
};

function fmt(n: number) {
  return Math.round(n).toLocaleString("en-GB");
}

function relAge(ms: number): string {
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function WatchCard({
  summary,
  extras,
}: {
  summary: RouteSummary;
  extras: WatchCardExtras;
}) {
  const [open, setOpen] = useState(false);
  const now = useNow(30_000);
  const { watch, current, min, max, series } = summary;
  // The honest loading state for a known layout is the last known value plus
  // its age (P3), never a skeleton.
  const ageMs = summary.latest ? now - new Date(summary.latest.observed_at).getTime() : null;
  const ccy = summary.latest?.currency ?? watch.currency;
  const points = series.map((s) => ({
    t: new Date(s.observed_at).getTime(),
    v: s.price,
  }));

  return (
    <div className="elev-raise rounded-[var(--r-card)]">
      <div
        className="surface-2 rounded-[var(--r-card)] p-5"
        style={{ border: "1px solid var(--hairline)" }}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="block w-full text-left"
          aria-expanded={open}
        >
          <div className="flex items-start justify-between gap-3">
            <span className="num text-xl" style={{ color: "var(--ink-0)" }}>
              {watch.origin} <span style={{ color: "var(--ink-4)" }}>to</span>{" "}
              {watch.destination}
            </span>
            <StatusPill status={extras.status} />
          </div>

          <div className="mt-4 flex items-end justify-between gap-4">
            <div>
              <span className="eyebrow">
                Current
                {ageMs != null && (
                  <span className="num ml-2 normal-case" style={{ color: "var(--ink-3)", letterSpacing: 0 }}>
                    as of {relAge(ageMs)}
                  </span>
                )}
              </span>
              {current != null ? (
                <div className="flex items-baseline gap-2">
                  <span className="num text-xs" style={{ color: "var(--ink-3)" }}>
                    {ccy}
                  </span>
                  <span className="num text-3xl" style={{ color: "var(--ink-0)" }}>
                    {fmt(current)}
                  </span>
                  <DeltaFlash value={current} />
                </div>
              ) : (
                <div>
                  <span className="num text-3xl" style={{ color: "var(--ink-4)" }}>
                    -
                  </span>
                  <span className="ml-2 text-xs" style={{ color: "var(--ink-3)" }}>
                    No reading yet
                  </span>
                </div>
              )}
            </div>

            {min != null && max != null && series.length >= 3 && (
              <div className="text-right">
                <span className="eyebrow">Normal range</span>
                <div className="num text-sm" style={{ color: "var(--ink-1)" }}>
                  {ccy} {fmt(min)} to {fmt(max)}
                  {extras.trend && (
                    <span className="ml-2 text-xs" style={{ color: "var(--ink-3)" }}>
                      {extras.trend}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {points.length >= 2 && (
            <ScrubSparkline
              points={points}
              width={430}
              height={64}
              stroke={STROKE[extras.status]}
              baseline={min ?? undefined}
              gapMs={extras.gapMs}
              formatValue={(v) => `${ccy} ${fmt(v)}`}
              className="mt-4 max-w-full"
            />
          )}

          <div
            className="mt-4 flex items-baseline justify-between border-t pt-3 text-xs"
            style={{ borderColor: "var(--hairline)" }}
          >
            <span className="num" style={{ color: "var(--ink-3)" }}>
              {extras.cheapestPct != null
                ? `Cheapest ${extras.cheapestPct} percent of readings seen`
                : `${extras.readings} ${extras.readings === 1 ? "reading" : "readings"} stored`}
            </span>
            {min != null && max != null && (
              <span className="num" style={{ color: "var(--ink-3)" }}>
                low {ccy} {fmt(min)} &middot; high {ccy} {fmt(max)}
              </span>
            )}
          </div>
        </button>

        {open && <RouteDetail summary={summary} gapMs={extras.gapMs} />}
      </div>
    </div>
  );
}
