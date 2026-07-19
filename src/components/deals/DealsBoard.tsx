"use client";

import { useMemo, useRef, useState } from "react";
import { KineticHeading } from "@/components/KineticHeading";
import { SpotlightCard } from "@/components/SpotlightCard";
import { MagneticButton } from "@/components/MagneticButton";
import { ReasonBadge } from "@/components/StatusPill";
import { ScrubSparkline } from "@/components/ScrubSparkline";
import { fireConfetti } from "@/components/confetti";
import { useNow, useReveal } from "@/lib/hooks";
import type { Reason } from "@/lib/dealMath";

// Every card is one real alert joined to the observations that surrounded it.
// A card with too little history to state a range simply shows no discount;
// it never borrows one.

export type DealCardData = {
  id: string;
  origin: string;
  destination: string;
  originCity: string;
  destCity: string;
  carriers: string[];
  reason: Reason;
  price: number;
  currency: string;
  midpoint: number | null;
  discountPct: number | null;
  caughtAt: string;
  deepLink: string | null;
  series: { t: number; v: number }[];
  gapMs: number;
};

type Filter = "all" | Reason;
type Sort = "discount" | "recency";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "mistake", label: "Mistake fare" },
  { id: "drop", label: "Sudden drop" },
  { id: "threshold", label: "Threshold" },
  { id: "percentile", label: "Percentile" },
];

function relativeAge(ms: number): string {
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "under a minute";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function PlaneGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-4 w-4"}
      aria-hidden="true"
    >
      <path d="M21 4L3 11l7 2.5L12.5 21l3-6.5L21 4z" />
    </svg>
  );
}

function DealCard({ deal, index, revealed }: { deal: DealCardData; index: number; revealed: boolean }) {
  const now = useNow(30_000);
  const bookRef = useRef<HTMLDivElement | null>(null);
  const big = (deal.discountPct ?? 0) >= 40;
  const warmStroke = deal.reason === "mistake" || deal.reason === "drop";

  const openBooking = () => {
    if (big && bookRef.current) {
      const r = bookRef.current.getBoundingClientRect();
      fireConfetti(r.left + r.width / 2, r.top);
    }
    if (deal.deepLink) window.open(deal.deepLink, "_blank", "noopener");
  };

  return (
    <div
      style={{
        opacity: revealed ? 1 : 0,
        transform: revealed ? "none" : "translateY(8px)",
        transition: `opacity var(--d3) var(--ease) ${index * 60}ms, transform var(--d3) var(--ease) ${index * 60}ms`,
      }}
    >
      <SpotlightCard glow={big} className="elev-raise h-full rounded-[var(--r-card)]">
        <div
          className="flex h-full flex-col rounded-[var(--r-card)] p-5"
          style={
            big
              ? undefined
              : { background: "var(--surface-2)", border: "1px solid var(--hairline)" }
          }
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="num text-xl" style={{ color: "var(--ink-0)" }}>
                {deal.origin}
              </span>
              <span className="flex w-14 items-center gap-1" style={{ color: "var(--ink-4)" }}>
                <span className="h-0 flex-1" style={{ borderTop: "1px dashed var(--hairline-strong)" }} />
                <PlaneGlyph className="h-3.5 w-3.5" />
                <span className="h-0 flex-1" style={{ borderTop: "1px dashed var(--hairline-strong)" }} />
              </span>
              <span className="num text-xl" style={{ color: "var(--ink-0)" }}>
                {deal.destination}
              </span>
            </div>
            <ReasonBadge reason={deal.reason} />
          </div>
          <div className="mt-0.5 text-xs" style={{ color: "var(--ink-3)" }}>
            {deal.originCity} to {deal.destCity}
            {deal.carriers.length > 0 && <> &middot; {deal.carriers.join(" ")}</>}
          </div>

          <div className="mt-4 flex items-end justify-between gap-4">
            <div>
              <span className="eyebrow">Price now</span>
              <div className="flex items-baseline gap-1.5">
                <span className="num text-xs" style={{ color: "var(--ink-3)" }}>
                  {deal.currency}
                </span>
                <span className="num text-3xl" style={{ color: "var(--ink-0)" }}>
                  {deal.price.toLocaleString("en-GB")}
                </span>
              </div>
              {deal.midpoint != null && deal.discountPct != null && (
                <div className="num mt-0.5 text-xs line-through" style={{ color: "var(--ink-3)" }}>
                  {deal.currency} {Math.round(deal.midpoint).toLocaleString("en-GB")}
                </div>
              )}
            </div>
            {deal.discountPct != null && (
              <div className="text-right">
                <span className="eyebrow">Off normal</span>
                <div className="num text-2xl" style={{ color: "var(--warm)" }}>
                  -{Math.round(deal.discountPct)}%
                </div>
              </div>
            )}
          </div>

          {deal.series.length >= 2 && (
            <div className="mt-3">
              <span className="eyebrow">History</span>
              <ScrubSparkline
                points={deal.series}
                width={260}
                height={48}
                stroke={warmStroke ? "var(--warm)" : "var(--cool)"}
                gapMs={deal.gapMs}
                formatValue={(v) => `${deal.currency} ${Math.round(v).toLocaleString("en-GB")}`}
                className="mt-1"
              />
            </div>
          )}

          <div className="mt-auto flex items-center justify-between pt-4">
            <span className="num flex items-center gap-1.5 text-xs" style={{ color: "var(--ink-3)" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="h-3.5 w-3.5" aria-hidden="true">
                <path d="M12 8v5l3 2M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9z" />
              </svg>
              caught {relativeAge(now - new Date(deal.caughtAt).getTime())} ago
            </span>
            <div ref={bookRef}>
              <MagneticButton
                onClick={openBooking}
                disabled={!deal.deepLink}
                className="rounded-full px-4 py-2 text-xs font-medium"
                style={{ border: "1px solid var(--cool)", color: "var(--cool)" }}
                ariaLabel="Open booking"
              >
                Open booking
              </MagneticButton>
            </div>
          </div>
        </div>
      </SpotlightCard>
    </div>
  );
}

export function DealsBoard({
  deals,
  routesWatched,
  lastPollAt,
  cadenceMs,
}: {
  deals: DealCardData[];
  routesWatched: number;
  lastPollAt: string | null;
  cadenceMs: number | null;
}) {
  const now = useNow(30_000);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("recency");
  const [gridRef, revealed] = useReveal<HTMLDivElement>(0.05);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = deals.filter((d) => {
      if (filter !== "all" && d.reason !== filter) return false;
      if (!q) return true;
      const hay =
        `${d.origin} ${d.destination} ${d.originCity} ${d.destCity}`.toLowerCase();
      return hay.includes(q);
    });
    if (sort === "discount") {
      return [...filtered].sort(
        (a, b) => (b.discountPct ?? -Infinity) - (a.discountPct ?? -Infinity)
      );
    }
    return [...filtered].sort(
      (a, b) => new Date(b.caughtAt).getTime() - new Date(a.caughtAt).getTime()
    );
  }, [deals, filter, query, sort]);

  const nextPollAt =
    lastPollAt != null && cadenceMs != null
      ? new Date(lastPollAt).getTime() + cadenceMs
      : null;

  const activeFilterLabel =
    FILTERS.find((f) => f.id === filter)?.label.toLowerCase() ?? "";

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Live catches</span>
          <KineticHeading className="mt-2 text-3xl">Deals</KineticHeading>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter routes"
            className="surface-2 num w-40 rounded-lg px-3 py-2 text-xs outline-none"
            style={{
              border: "1px solid var(--hairline)",
              color: "var(--ink-1)",
            }}
          />
          <div
            className="surface-2 flex rounded-lg p-0.5"
            style={{ border: "1px solid var(--hairline)" }}
          >
            {(["recency", "discount"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSort(s)}
                className={`pressable rounded-md px-3 py-1.5 text-xs ${sort === s ? "pressed-in" : ""}`}
                style={{
                  color: sort === s ? "var(--cool)" : "var(--ink-3)",
                  background: sort === s ? "var(--cool-soft)" : "transparent",
                }}
              >
                {s === "recency" ? "Recent" : "Discount"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`pressable rounded-full px-3.5 py-1.5 text-xs ${filter === f.id ? "pressed-in" : ""}`}
              style={
                filter === f.id
                  ? { background: "var(--cool-soft)", color: "var(--cool)" }
                  : { border: "1px solid var(--hairline)", color: "var(--ink-2)" }
              }
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="num text-xs" style={{ color: "var(--ink-3)" }}>
          {visible.length} live
          {lastPollAt != null && (
            <> &middot; refreshed {relativeAge(now - new Date(lastPollAt).getTime())} ago</>
          )}
        </span>
      </div>

      {visible.length === 0 ? (
        <div
          className="surface-2 elev-raise mt-6 flex min-h-48 flex-col items-center justify-center gap-2 rounded-[var(--r-card)] p-8"
          style={{ border: "1px solid var(--hairline)" }}
        >
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>
            {filter === "all"
              ? "No catches recorded yet."
              : `No ${activeFilterLabel} catches recorded.`}{" "}
            The tracker is watching <span className="num">{routesWatched}</span>{" "}
            {routesWatched === 1 ? "route" : "routes"}.
          </p>
          {nextPollAt != null && (
            <p className="num text-xs" style={{ color: "var(--ink-3)" }}>
              next poll expected{" "}
              {nextPollAt > now
                ? `in ${Math.ceil((nextPollAt - now) / 60_000)}m`
                : "overdue"}
            </p>
          )}
        </div>
      ) : (
        <div ref={gridRef} className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
          {visible.map((d, i) => (
            <DealCard key={d.id} deal={d} index={i} revealed={revealed} />
          ))}
        </div>
      )}
    </main>
  );
}
