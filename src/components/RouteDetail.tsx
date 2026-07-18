"use client";

import { ScrubSparkline } from "./ScrubSparkline";
import type { RouteSummary } from "@/lib/db/queries";

function fmt(n: number) {
  return n.toLocaleString("en-GB");
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="eyebrow">{label}</span>
      <span className="num text-lg" style={{ color: "var(--ink-1)" }}>
        {value}
      </span>
    </div>
  );
}

// The expanded content: the full history at reading size, the stats in a true
// row, the cheapest stored itinerary, and one action.
export function RouteDetail({
  summary,
  gapMs,
}: {
  summary: RouteSummary;
  gapMs: number;
}) {
  const { latest, series, min, max, current, belowNormal } = summary;
  const ccy = latest?.currency ?? summary.watch.currency;
  const money = (n: number | null) => (n != null ? `${ccy} ${fmt(n)}` : "none yet");
  const points = series.map((s) => ({
    t: new Date(s.observed_at).getTime(),
    v: s.price,
  }));

  return (
    <div
      className="mt-4 rounded-xl px-5 py-5"
      style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)" }}
    >
      <ScrubSparkline
        points={points}
        width={430}
        height={110}
        stroke={belowNormal ? "var(--warm)" : "var(--ink-1)"}
        baseline={min ?? undefined}
        gapMs={gapMs}
        formatValue={(v) => `${ccy} ${fmt(Math.round(v))}`}
        className="max-w-full"
      />

      <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
        <Stat label="Low" value={money(min)} />
        <Stat label="High" value={money(max)} />
        <Stat label="Current" value={money(current)} />
        <Stat label="Points" value={String(series.length)} />
      </div>

      {latest && (
        <div className="num mt-5 flex flex-wrap gap-x-6 gap-y-1 text-sm" style={{ color: "var(--ink-3)" }}>
          <span>{(latest.carriers ?? []).join(" ") || "carrier unknown"}</span>
          <span>{latest.stops != null ? `${latest.stops} stop(s)` : "stops unknown"}</span>
          <span>
            {latest.depart_date}
            {latest.return_date ? ` to ${latest.return_date}` : ""}
          </span>
          {latest.is_virtual_interline && <span>virtual interline</span>}
        </div>
      )}

      {latest?.deep_link && (
        <a
          href={latest.deep_link}
          target="_blank"
          rel="noopener noreferrer"
          className="pressable mt-5 inline-flex items-center rounded-full px-4 py-2 text-sm font-medium"
          style={{ border: "1px solid var(--cool)", color: "var(--cool)" }}
        >
          Open booking
        </a>
      )}
    </div>
  );
}
