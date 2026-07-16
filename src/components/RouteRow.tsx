"use client";

import { useState } from "react";
import { Sparkline } from "./Sparkline";
import { PriceRoll } from "./PriceRoll";
import { RouteDetail } from "./RouteDetail";
import { ROW_GRID } from "./rowGrid";
import type { RouteSummary } from "@/lib/db/queries";

function fmt(n: number) {
  return n.toLocaleString("en-GB");
}

// Status by form and one accent, nothing more. Below its own tenth percentile
// reads in the accent; everything else is quiet grey. A dot and a word, no pill.
function StatusMark({ status, belowNormal }: { status: string; belowNormal: boolean }) {
  const tone = belowNormal ? "var(--accent)" : "var(--ink-3)";
  return (
    <span className="inline-flex items-center gap-2 text-xs" style={{ color: belowNormal ? "var(--accent)" : "var(--ink-2)" }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone }} />
      {status}
    </span>
  );
}

export function RouteRow({ summary }: { summary: RouteSummary }) {
  const [open, setOpen] = useState(false);
  const { watch, current, min, max, p10, status, series, belowNormal } = summary;
  const ccy = summary.latest?.currency ?? watch.currency;

  return (
    <div className="group relative rounded-xl transition-colors duration-200 hover:bg-[var(--surface-1)]">
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: open ? "transparent" : "var(--hairline)" }}
      />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`${ROW_GRID} w-full px-3 pt-5 pb-2 text-left`}
      >
        <span className="num text-base ink-1">{watch.origin}</span>
        <span className="num text-base ink-3">{watch.destination}</span>

        <span className="num text-2xl ink-0">
          {current != null ? (
            <>
              <span className="mr-1 text-sm ink-3">{ccy}</span>
              <PriceRoll value={current} />
            </>
          ) : (
            <span className="text-sm ink-4">no fare yet</span>
          )}
        </span>

        <span className="num text-sm ink-3">
          {min != null && max != null ? `${fmt(min)} to ${fmt(max)}` : ""}
        </span>

        <span>
          <Sparkline prices={series.map((s) => s.price)} belowNormal={belowNormal} />
        </span>

        <span>
          <StatusMark status={status} belowNormal={belowNormal} />
        </span>
      </button>

      {/* secondary detail, quiet until the row is looked at, reserved so the
          run does not shift on hover */}
      <div
        className={`${ROW_GRID} pointer-events-none px-3 pb-4 opacity-0 transition-opacity duration-200 ${
          open ? "" : "group-hover:opacity-100"
        }`}
      >
        <span />
        <span />
        <span className="num text-[0.6875rem] ink-4">
          {p10 != null ? `p10 ${fmt(p10)}` : "gathering history"}
        </span>
        <span className="num text-[0.6875rem] ink-4">{series.length} points</span>
        <span />
        <span />
      </div>

      {/* Row expansion: height eases open on a real user action, not on load. */}
      <div
        className={`grid transition-[grid-template-rows] duration-[var(--d3)] ease-[var(--ease)] ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <RouteDetail summary={summary} />
        </div>
      </div>
    </div>
  );
}
