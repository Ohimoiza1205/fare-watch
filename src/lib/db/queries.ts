import { createServiceClient } from "./client";

// Auth is not built yet, so these reads use the service client and return every
// watch. Once Supabase Auth is wired, scope this to the signed-in user and move
// to the anon client so row-level security does the scoping.

export type WatchRow = {
  id: string;
  origin: string;
  destination: string;
  depart_date: string;
  return_date: string;
  cabin: string;
  adults: number;
  max_stops: number | null;
  target_price: number | null;
  currency: string;
  active: boolean;
  created_at: string;
};

export type ObservationRow = {
  id: number;
  watch_id: string;
  price: number;
  currency: string;
  depart_date: string;
  return_date: string | null;
  stops: number | null;
  carriers: string[] | null;
  deep_link: string | null;
  is_virtual_interline: boolean | null;
  observed_at: string;
};

export type RouteSummary = {
  watch: WatchRow;
  latest: ObservationRow | null;
  current: number | null;
  min: number | null;
  max: number | null;
  p10: number | null;
  belowNormal: boolean;
  status: "below normal" | "normal" | "watching";
  series: { price: number; observed_at: string }[]; // ascending by time
};

export type Dashboard = {
  summaries: RouteSummary[];
  routesWatched: number;
  lastPollAt: string | null;
  alertsToday: number;
};

type HistoryPoint = { watch_id: string; time: number; price: number };

// A range needs a few points before "normal" or "below normal" means anything.
const MIN_POINTS = 3;

function percentile(values: number[], p: number): number {
  if (values.length === 0) return Infinity;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.floor((p / 100) * (sorted.length - 1));
  return sorted[idx];
}

// Provider epochs come in seconds or milliseconds. Normalise to milliseconds so
// they sort cleanly against our observation timestamps.
function toMillis(time: number): number {
  return time < 1e12 ? time * 1000 : time;
}

function summarise(
  watch: WatchRow,
  rows: ObservationRow[],
  history: HistoryPoint[]
): RouteSummary {
  // A watch with no price_history rows hands back undefined, not [], so default
  // both inputs before any map or sort. The page must render at zero history.
  const obsRows = rows ?? [];
  const histRows = history ?? [];

  // Merge the provider's history with our own observations into one time-sorted
  // series, so a fresh watch shows real shape from its first poll.
  const merged = [
    ...histRows.map((h) => ({ t: toMillis(h.time), price: h.price })),
    ...obsRows.map((r) => ({ t: new Date(r.observed_at).getTime(), price: r.price })),
  ].sort((a, b) => a.t - b.t);

  const series = merged.map((m) => ({
    price: m.price,
    observed_at: new Date(m.t).toISOString(),
  }));
  const prices = series.map((s) => s.price);

  // Current is our own latest observation, the live fare. Provider history only
  // gives the line its shape, it does not stand in for the current price.
  const latest = obsRows.length ? obsRows[obsRows.length - 1] : null;
  const current = latest ? latest.price : null;

  if (current == null || prices.length < MIN_POINTS) {
    return {
      watch,
      latest,
      current,
      min: prices.length ? Math.min(...prices) : null,
      max: prices.length ? Math.max(...prices) : null,
      p10: null,
      belowNormal: false,
      status: "watching",
      series,
    };
  }

  const p10 = percentile(prices, 10);
  const belowNormal = current <= p10;
  return {
    watch,
    latest,
    current,
    min: Math.min(...prices),
    max: Math.max(...prices),
    p10,
    belowNormal,
    status: belowNormal ? "below normal" : "normal",
    series,
  };
}

export type AlertLogRow = {
  id: number;
  watchId: string;
  reason: string;
  price: number;
  channels: string[];
  sentAt: string;
  origin: string;
  destination: string;
  currency: string;
  deepLink: string | null;
  carriers: string[] | null;
  stops: number | null;
};

type EmbeddedWatch = { origin: string; destination: string; currency: string };
type EmbeddedObservation = {
  deep_link: string | null;
  carriers: string[] | null;
  stops: number | null;
};

// Supabase returns an embedded relation as an object for a to-one join, but the
// generic client types it loosely, so normalise either shape to one record.
function one<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

// The alert log joined to its watch for the route and to the observation that
// fired it for the booking link. Newest first.
export async function listAlerts(limit = 200): Promise<AlertLogRow[]> {
  const db = createServiceClient();
  const { data } = await db
    .from("alert")
    .select(
      "id, watch_id, reason, price, channels, sent_at, " +
        "watch:watch_id (origin, destination, currency), " +
        "observation:observation_id (deep_link, carriers, stops)"
    )
    .order("sent_at", { ascending: false })
    .limit(limit);

  type Raw = {
    id: number;
    watch_id: string;
    reason: string;
    price: number;
    channels: string[] | null;
    sent_at: string;
    watch: EmbeddedWatch | EmbeddedWatch[] | null;
    observation: EmbeddedObservation | EmbeddedObservation[] | null;
  };

  return ((data ?? []) as unknown as Raw[]).map((r) => {
    const w = one(r.watch);
    const o = one(r.observation);
    return {
      id: r.id,
      watchId: r.watch_id,
      reason: r.reason,
      price: r.price,
      channels: r.channels ?? [],
      sentAt: r.sent_at,
      origin: w?.origin ?? "",
      destination: w?.destination ?? "",
      currency: w?.currency ?? "",
      deepLink: o?.deep_link ?? null,
      carriers: o?.carriers ?? null,
      stops: o?.stops ?? null,
    };
  });
}

// Real requests made this calendar month, from the poll_request table the
// poller writes one row into per outbound API call. Null when the table does
// not exist yet (tracker-additions.sql not run) so callers omit the counter
// rather than invent one.
export async function requestsThisMonth(): Promise<number | null> {
  const db = createServiceClient();
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const { count, error } = await db
    .from("poll_request")
    .select("id", { count: "exact", head: true })
    .gte("requested_at", monthStart);
  if (error || count == null) return null;
  return count;
}

// The newest observation timestamp alone, for the sidebar's poll status line.
export async function latestObservationAt(): Promise<string | null> {
  const db = createServiceClient();
  const { data } = await db
    .from("observation")
    .select("observed_at")
    .order("observed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as { observed_at: string } | null)?.observed_at ?? null;
}

export async function getDashboard(): Promise<Dashboard> {
  const db = createServiceClient();

  const { data: watches } = await db
    .from("watch")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: true });

  const watchRows = (watches ?? []) as WatchRow[];

  // One pass for all observations, grouped in memory. Fine for a personal tool.
  const { data: observations } = await db
    .from("observation")
    .select("*")
    .order("observed_at", { ascending: true });

  const obsRows = (observations ?? []) as ObservationRow[];
  const byWatch = new Map<string, ObservationRow[]>();
  for (const o of obsRows) {
    const list = byWatch.get(o.watch_id) ?? [];
    list.push(o);
    byWatch.set(o.watch_id, list);
  }

  const { data: history } = await db
    .from("price_history")
    .select("watch_id, time, price");

  const histRows = (history ?? []) as HistoryPoint[];
  const histByWatch = new Map<string, HistoryPoint[]>();
  for (const h of histRows) {
    const list = histByWatch.get(h.watch_id) ?? [];
    list.push(h);
    histByWatch.set(h.watch_id, list);
  }

  const summaries = watchRows.map((w) =>
    summarise(w, byWatch.get(w.id) ?? [], histByWatch.get(w.id) ?? [])
  );
  const lastPollAt = obsRows.length ? obsRows[obsRows.length - 1].observed_at : null;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const { count: alertsToday } = await db
    .from("alert")
    .select("id", { count: "exact", head: true })
    .gte("sent_at", startOfToday.toISOString());

  return {
    summaries,
    routesWatched: watchRows.length,
    lastPollAt,
    alertsToday: alertsToday ?? 0,
  };
}
