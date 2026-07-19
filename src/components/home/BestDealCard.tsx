"use client";

import { useRef } from "react";
import { SpotlightCard } from "@/components/SpotlightCard";
import { MagneticButton } from "@/components/MagneticButton";
import { IconTile } from "@/components/IconTile";
import { ReasonBadge } from "@/components/StatusPill";
import { Odometer } from "@/components/Odometer";
import { ScrubSparkline } from "@/components/ScrubSparkline";
import { fireConfetti } from "@/components/confetti";
import { useNow } from "@/lib/hooks";

// The loudest surface on Home: the newest alert within 48 hours with the
// largest discount against its own stored range. Every figure on it is either
// stored (the fired price, the booking link, the fire time) or arithmetic on
// stored observations (the discount, the range midpoint). There is no expiry
// countdown because no source states an expiry; inventing one would be a lie.

export type BestDeal = {
  origin: string;
  destination: string;
  originCity: string;
  destCity: string;
  carriers: string[];
  reason: "mistake" | "threshold" | "percentile" | "drop";
  price: number;
  currency: string;
  midpoint: number;
  discountPct: number;
  caughtAt: string;
  deepLink: string | null;
  series: { t: number; v: number }[];
  gapMs: number;
};

function relativeAge(ms: number): string {
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "under a minute";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function FlameGlyph() {
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
      <path d="M12 21c-3.9 0-7-2.9-7-6.5 0-2.8 1.7-4.6 3.2-6.3C9.6 6.6 11 5.1 11 3c3 1.5 8 5.5 8 11.5 0 3.6-3.1 6.5-7 6.5z" />
    </svg>
  );
}

function PlaneGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M21 4L3 11l7 2.5L12.5 21l3-6.5L21 4z" />
    </svg>
  );
}

export function BestDealCard({
  deal,
  routesWatched,
}: {
  deal: BestDeal | null;
  routesWatched: number;
}) {
  const now = useNow(30_000);
  const bookRef = useRef<HTMLDivElement | null>(null);

  if (!deal) {
    return (
      <div
        className="surface-2 elev-raise flex min-h-64 flex-col items-center justify-center gap-3 rounded-[var(--r-card)] p-8"
        style={{ border: "1px solid var(--hairline)" }}
      >
        <span style={{ color: "var(--ink-4)" }}>
          <PlaneGlyph />
        </span>
        <p className="text-sm" style={{ color: "var(--ink-2)" }}>
          No live deal right now. The tracker is watching{" "}
          <span className="num">{routesWatched}</span>{" "}
          {routesWatched === 1 ? "route" : "routes"}.
        </p>
      </div>
    );
  }

  const big = deal.discountPct >= 40;

  const openBooking = () => {
    if (big && bookRef.current) {
      const r = bookRef.current.getBoundingClientRect();
      fireConfetti(r.left + r.width / 2, r.top);
    }
    if (deal.deepLink) window.open(deal.deepLink, "_blank", "noopener");
  };

  return (
    <SpotlightCard
      glow={big}
      className="elev-raise rounded-[var(--r-card)]"
    >
      <div
        className="rounded-[var(--r-card)] p-6"
        style={
          big
            ? undefined
            : { background: "var(--surface-2)", border: "1px solid var(--hairline)" }
        }
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <IconTile tone="warm" size={30}>
              <FlameGlyph />
            </IconTile>
            <span className="eyebrow" style={{ color: "var(--warm)" }}>
              Best current deal
            </span>
          </div>
          <ReasonBadge reason={deal.reason} />
        </div>

        <div className="mt-5 flex items-center gap-4">
          <span className="num text-3xl" style={{ color: "var(--ink-0)" }}>
            {deal.origin}
          </span>
          <span
            className="flex flex-1 items-center gap-2"
            style={{ color: "var(--ink-4)" }}
          >
            <span
              className="h-0 flex-1"
              style={{ borderTop: "1px dashed var(--hairline-strong)" }}
            />
            <PlaneGlyph />
            <span
              className="h-0 flex-1"
              style={{ borderTop: "1px dashed var(--hairline-strong)" }}
            />
          </span>
          <span className="num text-3xl" style={{ color: "var(--ink-0)" }}>
            {deal.destination}
          </span>
        </div>
        <div className="mt-1 text-center text-xs" style={{ color: "var(--ink-3)" }}>
          {deal.originCity} to {deal.destCity}
          {deal.carriers.length > 0 && <> &middot; {deal.carriers.join(" ")}</>}
        </div>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
          <div>
            <span className="eyebrow">Discount</span>
            <div className="num text-4xl" style={{ color: "var(--warm)" }}>
              -{Math.round(deal.discountPct)}%
            </div>
          </div>

          <div>
            <span className="eyebrow">Now</span>
            <div className="flex items-baseline gap-2">
              <span className="num text-sm" style={{ color: "var(--ink-3)" }}>
                {deal.currency}
              </span>
              <Odometer value={deal.price} className="text-4xl" />
            </div>
            <div
              className="num mt-0.5 text-sm line-through"
              style={{ color: "var(--ink-3)" }}
            >
              {deal.currency} {Math.round(deal.midpoint).toLocaleString("en-GB")}
            </div>
          </div>

          <ScrubSparkline
            points={deal.series}
            width={190}
            height={56}
            stroke="var(--warm)"
            gapMs={deal.gapMs}
            formatValue={(v) => `${deal.currency} ${Math.round(v).toLocaleString("en-GB")}`}
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs" style={{ color: "var(--ink-3)" }}>
            <span className="flex items-center gap-1.5">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                className="h-3.5 w-3.5"
                aria-hidden="true"
              >
                <path d="M12 8v5l3 2M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9z" />
              </svg>
              <span className="num">
                caught {relativeAge(now - new Date(deal.caughtAt).getTime())} ago
              </span>
            </span>
            {deal.reason === "mistake" && (
              <p className="mt-1">mistake fares can vanish fast</p>
            )}
          </div>

          <div ref={bookRef}>
            <MagneticButton
              onClick={openBooking}
              disabled={!deal.deepLink}
              className="rounded-full px-5 py-2.5 text-sm font-medium"
              style={{ background: "var(--warm)", color: "#1a0e06" }}
              ariaLabel="Open booking"
            >
              Open booking
            </MagneticButton>
          </div>
        </div>
      </div>
    </SpotlightCard>
  );
}
