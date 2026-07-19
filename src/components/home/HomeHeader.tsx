"use client";

import { KineticHeading } from "@/components/KineticHeading";
import { useNow } from "@/lib/hooks";

// The page header: eyebrow, the time-aware greeting, and a live last-poll
// pill. The greeting text comes from the server so hydration stays exact; the
// pill ticks on the client from the real newest observation timestamp.

function relativeAge(ms: number): string {
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "under a minute";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function HomeHeader({
  greeting,
  lastPollAt,
}: {
  greeting: string;
  lastPollAt: string | null;
}) {
  const now = useNow(30_000);

  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="flex items-center gap-2">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--cool)"
            strokeWidth="1.6"
            strokeLinecap="round"
            className="h-3.5 w-3.5"
            aria-hidden="true"
          >
            <path d="M3 12h4l2-7 4 14 2-7h6" />
          </svg>
          <span className="eyebrow">Telemetry overview</span>
        </div>
        <KineticHeading className="mt-2 text-3xl">{greeting}</KineticHeading>
      </div>

      <span
        className="surface-2 flex items-center gap-2 rounded-full px-3 py-1.5 text-xs"
        style={{ border: "1px solid var(--hairline)" }}
      >
        <span
          className="dot-breathe"
          style={{
            width: 6,
            height: 6,
            borderRadius: "var(--r-pill)",
            background: "var(--cool)",
          }}
        />
        <span className="num" style={{ color: "var(--ink-2)" }}>
          {lastPollAt
            ? `Last poll ${relativeAge(now - new Date(lastPollAt).getTime())} ago`
            : "No polls recorded"}
        </span>
      </span>
    </div>
  );
}
