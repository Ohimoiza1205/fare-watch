"use client";

import { KineticHeading } from "@/components/KineticHeading";
import { IconTile } from "@/components/IconTile";
import { useNow, useReveal } from "@/lib/hooks";
import type { Reason } from "@/lib/dealMath";

// The notification log: every alert that actually went out, grouped by the
// day it fired, with the channels it really used and its delta against the
// watch's own range at fire time. Nothing here is synthesised.

export type AlertRowData = {
  id: string;
  firedAt: string;
  channels: string[];
  reason: Reason;
  origin: string;
  destination: string;
  price: number;
  currency: string;
  normal: number | null;
};

export type AlertDayGroup = {
  label: string;
  count: number;
  rows: AlertRowData[];
};

const REASON_LABEL: Record<Reason, string> = {
  mistake: "Mistake fare",
  drop: "Sudden drop",
  threshold: "Threshold",
  percentile: "Percentile",
};

function ReasonTile({ reason }: { reason: Reason }) {
  const warm = reason === "mistake" || reason === "drop";
  const path =
    reason === "mistake"
      ? "M12 21c-3.9 0-7-2.9-7-6.5 0-2.8 1.7-4.6 3.2-6.3C9.6 6.6 11 5.1 11 3c3 1.5 8 5.5 8 11.5 0 3.6-3.1 6.5-7 6.5z"
      : reason === "drop"
        ? "M4 6l7 7 4-4 5 5M20 10v4h-4"
        : reason === "threshold"
          ? "M12 14v-3M7 20a8 8 0 1 1 10 0zM12 6v1"
          : "M19 5L5 19M7.5 8a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM16.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z";
  return (
    <IconTile tone={warm ? "warm" : "cool"} size={34}>
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
        <path d={path} />
      </svg>
    </IconTile>
  );
}

function ChannelGlyph({ channel }: { channel: string }) {
  const path =
    channel === "email"
      ? "M3 6h18v12H3zM3 7l9 6 9-6"
      : channel === "whatsapp"
        ? "M21 12a9 9 0 0 1-13 8l-5 1 1.4-4.5A9 9 0 1 1 21 12z"
        : "M8 3h8v18H8zM11 19h2";
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
      <path d={path} />
    </svg>
  );
}

function fmt(n: number) {
  return Math.round(n).toLocaleString("en-GB");
}

function fireTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AlertsBoard({
  groups,
  fetchedAt,
}: {
  groups: AlertDayGroup[];
  fetchedAt: string;
}) {
  const now = useNow(1_000);
  const [listRef, revealed] = useReveal<HTMLDivElement>(0.05);
  const syncedS = Math.max(0, Math.floor((now - new Date(fetchedAt).getTime()) / 1000));

  let rowIndex = 0;

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-8 lg:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="flex items-center gap-2">
            <span className="bell-swing inline-flex" style={{ color: "var(--cool)" }}>
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
                <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6M10 20a2 2 0 0 0 4 0" />
              </svg>
            </span>
            <span className="eyebrow">Notification log</span>
          </span>
          <KineticHeading className="mt-2 text-3xl">Alerts</KineticHeading>
        </div>
        <span className="flex items-center gap-2 text-xs">
          <span
            className="dot-breathe"
            style={{ width: 6, height: 6, borderRadius: "var(--r-pill)", background: "var(--cool)" }}
          />
          <span className="num" style={{ color: "var(--ink-3)" }}>
            synced {syncedS}s ago
          </span>
        </span>
      </div>

      {groups.length === 0 ? (
        <div
          className="surface-2 elev-raise mt-8 flex min-h-40 items-center justify-center rounded-[var(--r-card)] p-8"
          style={{ border: "1px solid var(--hairline)" }}
        >
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>
            No alerts yet. They will land here when a watched fare crosses a
            trigger.
          </p>
        </div>
      ) : (
        <div ref={listRef} className="mt-6">
          {groups.map((g) => (
            <section key={g.label} className="mb-6">
              <div className="flex items-center gap-3">
                <span
                  className="text-[11px] uppercase"
                  style={{ letterSpacing: "0.1em", color: "var(--ink-3)" }}
                >
                  {g.label}
                </span>
                <span className="h-0 flex-1" style={{ borderTop: "1px solid var(--hairline)" }} />
                <span className="num text-xs" style={{ color: "var(--ink-4)" }}>
                  {g.count}
                </span>
              </div>

              <div className="mt-2 space-y-2">
                {g.rows.map((r) => {
                  const i = rowIndex++;
                  const delta = r.normal != null ? r.price - r.normal : null;
                  return (
                    <div
                      key={r.id}
                      className="surface-2 flex items-center gap-4 rounded-xl p-3.5"
                      style={{
                        border: "1px solid var(--hairline)",
                        opacity: revealed ? 1 : 0,
                        transform: revealed ? "none" : "translateY(6px)",
                        transition: `opacity var(--d2) var(--ease) ${i * 45}ms, transform var(--d2) var(--ease) ${i * 45}ms`,
                      }}
                    >
                      <div className="w-16 shrink-0">
                        <div className="num text-sm" style={{ color: "var(--ink-1)" }}>
                          {fireTime(r.firedAt)}
                        </div>
                        <div
                          className="mt-0.5 text-[9px] uppercase leading-tight"
                          style={{ letterSpacing: "0.05em", color: "var(--ink-4)" }}
                        >
                          {r.channels.length > 0 ? r.channels.join(" ") : "none sent"}
                        </div>
                      </div>

                      <ReasonTile reason={r.reason} />

                      <div className="min-w-0 flex-1">
                        <div className="num text-sm font-medium" style={{ color: "var(--ink-0)" }}>
                          {r.origin} {r.destination}
                        </div>
                        <div className="mt-0.5 truncate text-xs" style={{ color: "var(--ink-3)" }}>
                          {REASON_LABEL[r.reason]}
                          {r.normal != null && (
                            <>
                              {" "}
                              &middot; normal {r.currency} {fmt(r.normal)}
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="num text-xl" style={{ color: "var(--ink-0)" }}>
                          <span className="mr-1 text-xs" style={{ color: "var(--ink-3)" }}>
                            {r.currency}
                          </span>
                          {fmt(r.price)}
                        </div>
                        {delta != null && Math.round(delta) !== 0 && (
                          <div
                            className="num text-xs"
                            style={{ color: delta < 0 ? "var(--cool)" : "var(--warm)" }}
                          >
                            {delta < 0 ? "-" : "+"}
                            {fmt(Math.abs(delta))}
                          </div>
                        )}
                      </div>

                      <span className="hidden shrink-0 sm:block" style={{ color: "var(--ink-4)" }}>
                        {r.channels[0] && <ChannelGlyph channel={r.channels[0]} />}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
