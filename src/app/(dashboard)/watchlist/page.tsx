import { getDashboard, type RouteSummary } from "@/lib/db/queries";
import { pollCadenceMs } from "@/lib/cron";
import {
  WatchlistBoard,
} from "@/components/watchlist/WatchlistBoard";
import type { WatchCardExtras } from "@/components/watchlist/WatchCard";

// The list reflects the latest poll, so read fresh on every request. All the
// derived figures (status, trend, percentile position) are computed here from
// the stored series and handed to the cards as plain data.
export const dynamic = "force-dynamic";

const DAY_MS = 24 * 3_600_000;

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.floor((p / 100) * (sorted.length - 1));
  return sorted[idx];
}

function extrasFor(s: RouteSummary, gapMs: number): WatchCardExtras {
  const prices = s.series.map((p) => p.price);

  let status: WatchCardExtras["status"] = "watching";
  if (s.status === "below normal") status = "below";
  else if (s.status === "normal") status = "normal";
  if (
    status === "normal" &&
    s.current != null &&
    prices.length >= 3 &&
    s.current >= percentile(prices, 90)
  ) {
    status = "above";
  }

  // Trend from the last five stored observations, stated only with three or
  // more; fewer points cannot support a direction word.
  let trend: WatchCardExtras["trend"] = null;
  const lastFive = s.series.slice(-5);
  if (lastFive.length >= 3) {
    const first = lastFive[0].price;
    const last = lastFive[lastFive.length - 1].price;
    if (last < first) trend = "falling";
    else if (last > first) trend = "rising";
  }

  let cheapestPct: number | null = null;
  if (s.current != null && prices.length >= 5) {
    const atOrBelow = prices.filter((p) => p <= s.current!).length;
    cheapestPct = Math.max(1, Math.round((atOrBelow / prices.length) * 100));
  }

  return { status, trend, cheapestPct, readings: prices.length, gapMs };
}

export default async function WatchlistPage() {
  const dash = await getDashboard();
  const gapMs = (pollCadenceMs() ?? DAY_MS) * 2;

  const extras: Record<string, WatchCardExtras> = {};
  for (const s of dash.summaries) extras[s.watch.id] = extrasFor(s, gapMs);

  const first = dash.summaries[0]?.watch;
  const route = first ? `${first.origin} to ${first.destination}` : null;
  const suggestions = [
    ...(route
      ? [`When was ${route} cheapest`, `Is ${route} below its normal range`]
      : []),
    "Compare my watched routes",
    "What alerts fired in the last month",
  ];

  return (
    <WatchlistBoard
      summaries={dash.summaries}
      extras={extras}
      assistantOnline={Boolean(process.env.ANTHROPIC_API_KEY)}
      suggestions={suggestions}
    />
  );
}
