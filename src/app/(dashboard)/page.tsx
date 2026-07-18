import { getDashboard, listAlerts, type AlertLogRow, type RouteSummary } from "@/lib/db/queries";
import { asReason, discountPct, midpointAt, seriesPoints } from "@/lib/dealMath";
import { createServiceClient } from "@/lib/db/client";
import { listTrips, resolveOwnerUserId, type TripSummary } from "@/lib/planner/repo";
import { pollCadenceMs } from "@/lib/cron";
import { cityForIata } from "@/lib/airports";
import { HomeHeader } from "@/components/home/HomeHeader";
import { StatStrip, type SavingsStat } from "@/components/home/StatStrip";
import { BestDealCard, type BestDeal } from "@/components/home/BestDealCard";
import { NextTripCard, type NextTripInfo } from "@/components/home/NextTripCard";
import { RecentActivity, type ActivityEvent } from "@/components/home/RecentActivity";

// Home answers one question: is anything below its own normal right now, and
// by how much. Every figure is stored data or arithmetic on stored data; the
// savings and discount numbers are measured against each watch's own range as
// it stood at fire time, never against an invented reference.
export const dynamic = "force-dynamic";

const DAY_MS = 24 * 3_600_000;

// With no cron schedule configured the sparkline gap rule falls back to the
// documented once-a-day polling plan rather than drawing across real gaps.
function gapMs(): number {
  const cadence = pollCadenceMs();
  return (cadence ?? DAY_MS) * 2;
}

function greetingNow(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function bestDeal(
  alerts: AlertLogRow[],
  byWatch: Map<string, RouteSummary>,
  gap: number
): BestDeal | null {
  const cutoff = Date.now() - 48 * 3_600_000;
  let best: BestDeal | null = null;
  for (const a of alerts) {
    if (new Date(a.sentAt).getTime() < cutoff) continue;
    const reason = asReason(a.reason);
    const summary = byWatch.get(a.watchId);
    if (!reason || !summary) continue;
    const midpoint = midpointAt(summary, a.sentAt);
    if (midpoint == null) continue;
    const pct = discountPct(a.price, midpoint);
    if (pct <= 0) continue;
    if (best && pct <= best.discountPct) continue;

    best = {
      origin: a.origin,
      destination: a.destination,
      originCity: cityForIata(a.origin),
      destCity: cityForIata(a.destination),
      carriers: a.carriers ?? [],
      reason,
      price: a.price,
      currency: a.currency || summary.watch.currency,
      midpoint,
      discountPct: pct,
      caughtAt: a.sentAt,
      deepLink: a.deepLink,
      series: seriesPoints(summary, Date.now() - 90 * DAY_MS),
      gapMs: gap,
    };
  }
  return best;
}

function savingsStat(
  alerts: AlertLogRow[],
  byWatch: Map<string, RouteSummary>
): SavingsStat {
  const cutoff = Date.now() - 30 * DAY_MS;
  const pcts: number[] = [];
  for (const a of alerts) {
    if (new Date(a.sentAt).getTime() < cutoff) continue;
    const summary = byWatch.get(a.watchId);
    if (!summary) continue;
    const midpoint = midpointAt(summary, a.sentAt);
    if (midpoint == null) continue;
    const pct = discountPct(a.price, midpoint);
    if (pct > 0) pcts.push(pct);
  }
  if (pcts.length < 3) return null;
  return {
    meanPct: pcts.reduce((s, p) => s + p, 0) / pcts.length,
    count: pcts.length,
  };
}

function activityEvents(
  alerts: AlertLogRow[],
  byWatch: Map<string, RouteSummary>
): ActivityEvent[] {
  const events: ActivityEvent[] = [];

  for (const a of alerts) {
    const reason = asReason(a.reason);
    const summary = byWatch.get(a.watchId);
    const ccy = a.currency || summary?.watch.currency || "";
    const midpoint = summary ? midpointAt(summary, a.sentAt) : null;
    const pct = midpoint != null ? Math.round(discountPct(a.price, midpoint)) : null;

    let detail = "";
    if (reason === "threshold" && summary?.watch.target_price != null) {
      detail = `threshold ${ccy} ${summary.watch.target_price.toLocaleString("en-GB")}`;
    } else if (pct != null && pct > 0) {
      detail = `${pct} percent below normal`;
    }

    events.push({
      id: `alert-${a.id}`,
      kind: reason === "mistake" || reason === "drop" ? "warm" : "cool",
      at: a.sentAt,
      route: `${a.origin} ${a.destination}`,
      description:
        a.channels.length > 0
          ? `Alert fired via ${a.channels.join(" and ")}`
          : `Price dropped to ${ccy} ${a.price.toLocaleString("en-GB")}`,
      detail,
    });
  }

  for (const s of byWatch.values()) {
    if (!s.watch.created_at) continue;
    events.push({
      id: `watch-${s.watch.id}`,
      kind: "neutral",
      at: s.watch.created_at,
      route: `${s.watch.origin} ${s.watch.destination}`,
      description: "New watch added",
      detail:
        s.watch.target_price != null
          ? `target ${s.watch.currency} ${s.watch.target_price.toLocaleString("en-GB")}`
          : "",
    });
  }

  return events
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 8);
}

function localToday(): string {
  return new Date().toLocaleDateString("en-CA");
}

async function nextTripInfo(trips: TripSummary[]): Promise<NextTripInfo | null> {
  const today = localToday();
  const upcoming = trips
    .filter((t) => t.startDate != null && t.startDate >= today)
    .sort((a, b) => (a.startDate! < b.startDate! ? -1 : 1))[0];
  if (!upcoming || !upcoming.startDate) return null;

  const db = createServiceClient();
  const { data: days } = await db.from("day").select("id").eq("trip_id", upcoming.id);
  const dayIds = ((days ?? []) as { id: string }[]).map((d) => d.id);
  let stops = 0;
  if (dayIds.length > 0) {
    const { count } = await db
      .from("item")
      .select("id", { count: "exact", head: true })
      .in("day_id", dayIds);
    stops = count ?? 0;
  }

  const label = upcoming.destLabel ?? upcoming.destination;
  const daysUntil = Math.max(
    0,
    Math.ceil(
      (new Date(`${upcoming.startDate}T00:00:00`).getTime() -
        new Date(`${today}T00:00:00`).getTime()) /
        DAY_MS
    )
  );

  return {
    id: upcoming.id,
    city: label.split(",")[0].trim(),
    label,
    startDate: upcoming.startDate,
    endDate: upcoming.endDate,
    daysUntil,
    stops,
  };
}

function countLast24h(alerts: AlertLogRow[]): number {
  const dayAgo = Date.now() - DAY_MS;
  return alerts.filter((a) => new Date(a.sentAt).getTime() >= dayAgo).length;
}

async function observationsTotal(): Promise<number> {
  const db = createServiceClient();
  const { count } = await db
    .from("observation")
    .select("id", { count: "exact", head: true });
  return count ?? 0;
}

export default async function Home() {
  const [dash, alerts, trips, obsTotal] = await Promise.all([
    getDashboard(),
    listAlerts(200),
    listTrips(createServiceClient(), resolveOwnerUserId()),
    observationsTotal(),
  ]);

  const byWatch = new Map(dash.summaries.map((s) => [s.watch.id, s]));
  const gap = gapMs();
  const deal = bestDeal(alerts, byWatch, gap);
  const savings = savingsStat(alerts, byWatch);
  const events = activityEvents(alerts, byWatch);
  const trip = await nextTripInfo(trips);

  const alertsLast24h = countLast24h(alerts);

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-10">
      <HomeHeader greeting={greetingNow()} lastPollAt={dash.lastPollAt} />

      <StatStrip
        routesWatched={dash.routesWatched}
        lastPollAt={dash.lastPollAt}
        scheduleKnown={pollCadenceMs() != null}
        alertsToday={dash.alertsToday}
        alertsLast24h={alertsLast24h}
        savings={savings}
        observationsTotal={obsTotal}
      />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <BestDealCard deal={deal} routesWatched={dash.routesWatched} />
        </div>
        <NextTripCard trip={trip} />
      </div>

      <RecentActivity events={events} />
    </main>
  );
}
