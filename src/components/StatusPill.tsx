"use client";

import type { CSSProperties } from "react";

type Status = "below" | "normal" | "above" | "watching";
type Reason = "mistake" | "threshold" | "percentile" | "drop";

const STATUS_LABEL: Record<Status, string> = {
  below: "BELOW NORMAL",
  normal: "NORMAL",
  above: "ABOVE NORMAL",
  watching: "WATCHING",
};

const STATUS_STYLE: Record<Status, CSSProperties> = {
  below: { background: "var(--warm-soft)", color: "var(--warm)" },
  normal: { background: "var(--cool-soft)", color: "var(--cool)" },
  above: { background: "var(--amber-soft)", color: "var(--amber)" },
  watching: { background: "transparent", color: "var(--ink-2)", border: "1px solid var(--hairline-strong)" },
};

const REASON_LABEL: Record<Reason, string> = {
  mistake: "MISTAKE FARE",
  threshold: "THRESHOLD",
  percentile: "PERCENTILE",
  drop: "SUDDEN DROP",
};

const REASON_STYLE: Record<Reason, CSSProperties> = {
  mistake: { background: "var(--warm-soft)", color: "var(--warm)" },
  drop: { background: "var(--warm-soft)", color: "var(--warm)" },
  threshold: { background: "var(--cool-soft)", color: "var(--cool)" },
  percentile: { background: "var(--cool-soft)", color: "var(--cool)" },
};

const PILL_BASE: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: "var(--r-pill)",
  fontSize: "10px",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  padding: "3px 10px",
};

export function StatusPill({ status }: { status: Status }) {
  return <span style={{ ...PILL_BASE, ...STATUS_STYLE[status] }}>{STATUS_LABEL[status]}</span>;
}

export function ReasonBadge({ reason }: { reason: Reason }) {
  return <span style={{ ...PILL_BASE, ...REASON_STYLE[reason] }}>{REASON_LABEL[reason]}</span>;
}
