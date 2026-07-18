import { getDashboard, listAlerts } from "@/lib/db/queries";
import { pollCadenceMs } from "@/lib/cron";
import { cityForIata } from "@/lib/airports";
import { asReason, discountPct, midpointAt, seriesPoints } from "@/lib/dealMath";
import { DealsBoard, type DealCardData } from "@/components/deals/DealsBoard";

// Deals is the alert history made scannable: every card is a stored alert
// joined to the observations around it. Discounts are computed against the
// watch's own range at fire time or not shown at all.
export const dynamic = "force-dynamic";

const DAY_MS = 24 * 3_600_000;

function buildDeals(
  dash: Awaited<ReturnType<typeof getDashboard>>,
  alerts: Awaited<ReturnType<typeof listAlerts>>,
  gap: number
): DealCardData[] {
  const byWatch = new Map(dash.summaries.map((s) => [s.watch.id, s]));
  const since = Date.now() - 90 * DAY_MS;
  const deals: DealCardData[] = [];
  for (const a of alerts) {
    const reason = asReason(a.reason);
    if (!reason) continue;
    const summary = byWatch.get(a.watchId);
    const midpoint = summary ? midpointAt(summary, a.sentAt) : null;
    const pct = midpoint != null ? discountPct(a.price, midpoint) : null;
    deals.push({
      id: String(a.id),
      origin: a.origin,
      destination: a.destination,
      originCity: cityForIata(a.origin),
      destCity: cityForIata(a.destination),
      carriers: a.carriers ?? [],
      reason,
      price: a.price,
      currency: a.currency || summary?.watch.currency || "",
      midpoint,
      discountPct: pct != null && pct > 0 ? pct : null,
      caughtAt: a.sentAt,
      deepLink: a.deepLink,
      series: summary ? seriesPoints(summary, since) : [],
      gapMs: gap,
    });
  }
  return deals;
}

export default async function DealsPage() {
  const [dash, alerts] = await Promise.all([getDashboard(), listAlerts(200)]);
  const cadence = pollCadenceMs();
  const deals = buildDeals(dash, alerts, (cadence ?? DAY_MS) * 2);

  return (
    <DealsBoard
      deals={deals}
      routesWatched={dash.routesWatched}
      lastPollAt={dash.lastPollAt}
      cadenceMs={cadence}
    />
  );
}
