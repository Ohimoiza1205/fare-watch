"use client";

import Link from "next/link";
import { useNow, useReveal } from "@/lib/hooks";

// Real events merged newest first: alerts, threshold and percentile firings,
// and watch additions. The cascade runs once on first reveal; after that the
// list is still, because motion here would not be information.

export type ActivityEvent = {
  id: string;
  kind: "warm" | "cool" | "neutral";
  at: string;
  route: string;
  description: string;
  detail: string;
};

const DOT: Record<ActivityEvent["kind"], string> = {
  warm: "var(--warm)",
  cool: "var(--cool)",
  neutral: "var(--ink-4)",
};

function relativeAge(ms: number): string {
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function RecentActivity({ events }: { events: ActivityEvent[] }) {
  const now = useNow(30_000);
  const [ref, revealed] = useReveal<HTMLDivElement>(0.1);

  return (
    <div
      ref={ref}
      className="elev-raise mt-6 rounded-[var(--r-card)] p-5"
      style={{ background: "var(--surface-2)", border: "1px solid var(--hairline)" }}
    >
      <div className="flex items-baseline justify-between">
        <span className="eyebrow">Recent activity</span>
        <Link href="/alerts" className="pressable text-xs" style={{ color: "var(--cool)" }}>
          All alerts
        </Link>
      </div>

      {events.length === 0 ? (
        <p className="mt-4 text-sm" style={{ color: "var(--ink-3)" }}>
          Nothing recorded yet. Events land here as the tracker works.
        </p>
      ) : (
        <ul className="mt-3">
          {events.map((e, i) => (
            <li
              key={e.id}
              className="flex flex-wrap items-baseline gap-x-4 border-t py-2.5"
              style={{
                borderColor: "var(--hairline)",
                opacity: revealed ? 1 : 0,
                transform: revealed ? "none" : "translateY(6px)",
                transition: `opacity var(--d2) var(--ease) ${i * 45}ms, transform var(--d2) var(--ease) ${i * 45}ms`,
              }}
            >
              <span className="num w-8 shrink-0 text-xs" style={{ color: "var(--ink-3)" }}>
                {relativeAge(now - new Date(e.at).getTime())}
              </span>
              <span className="flex items-center gap-2">
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "var(--r-pill)",
                    background: DOT[e.kind],
                  }}
                />
                <span className="num text-sm" style={{ color: "var(--ink-1)" }}>
                  {e.route}
                </span>
              </span>
              <span
                className="order-4 mt-0.5 basis-full pl-12 text-sm sm:order-3 sm:mt-0 sm:min-w-0 sm:flex-1 sm:basis-auto sm:truncate sm:pl-0"
                style={{ color: "var(--ink-2)" }}
              >
                {e.description}
              </span>
              <span
                className="order-3 ml-auto num text-xs sm:order-4 sm:ml-0"
                style={{ color: "var(--ink-3)" }}
              >
                {e.detail}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
