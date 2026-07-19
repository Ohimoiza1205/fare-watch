import type { RouteSummary } from "@/lib/db/queries";

// Deal arithmetic shared by Home and Deals. A discount is only ever measured
// against the watch's own stored range as it stood at fire time; when the
// history is too thin to state a range, the discount is absent, not guessed.

export type Reason = "mistake" | "threshold" | "percentile" | "drop";

export function asReason(reason: string): Reason | null {
  return reason === "mistake" ||
    reason === "threshold" ||
    reason === "percentile" ||
    reason === "drop"
    ? reason
    : null;
}

// Min-max midpoint of the series up to the given moment; needs three points.
export function midpointAt(summary: RouteSummary, atIso: string): number | null {
  const at = new Date(atIso).getTime();
  const prices = summary.series
    .filter((p) => new Date(p.observed_at).getTime() <= at)
    .map((p) => p.price);
  if (prices.length < 3) return null;
  const midpoint = (Math.min(...prices) + Math.max(...prices)) / 2;
  return midpoint > 0 ? midpoint : null;
}

export function discountPct(price: number, midpoint: number): number {
  return (1 - price / midpoint) * 100;
}

export function seriesPoints(
  summary: RouteSummary,
  sinceMs: number
): { t: number; v: number }[] {
  return summary.series
    .filter((p) => new Date(p.observed_at).getTime() >= sinceMs)
    .map((p) => ({ t: new Date(p.observed_at).getTime(), v: p.price }));
}
