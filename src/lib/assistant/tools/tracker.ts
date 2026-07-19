import { getDashboard, listAlerts, type Dashboard, type RouteSummary } from "@/lib/db/queries";
import { evaluate, type PriceRow } from "@/lib/detect/signals";
import type { AssistantTool } from "../provider";

// Read-only tracker tools. Each executor returns compact JSON with only the
// fields an answer needs, because tool payloads dominate token cost.

function compactWatch(s: RouteSummary) {
  return {
    watchId: s.watch.id,
    origin: s.watch.origin,
    destination: s.watch.destination,
    departDate: s.watch.depart_date,
    returnDate: s.watch.return_date,
    currency: s.watch.currency,
    targetPrice: s.watch.target_price,
    current: s.current,
    min: s.min,
    max: s.max,
    p10: s.p10,
    status: s.status,
    observations: s.series.length,
  };
}

function routeOf(result: unknown): string {
  const r = result as { origin?: string; destination?: string } | null;
  return r?.origin && r?.destination ? ` for ${r.origin} to ${r.destination}` : "";
}

const EMPTY_INPUT = { type: "object", properties: {}, additionalProperties: false };

// One dashboard read shared across a turn's tool calls.
function dashboardOnce(): () => Promise<Dashboard> {
  let cached: Promise<Dashboard> | null = null;
  return () => (cached ??= getDashboard());
}

function watchesResult(d: Dashboard) {
  return {
    routesWatched: d.routesWatched,
    lastPollAt: d.lastPollAt,
    alertsToday: d.alertsToday,
    watches: d.summaries.map(compactWatch),
  };
}

// The planner's one bridge into tracker data, per the one-brain contract.
export function getWatchSummaryTool(): AssistantTool {
  const dash = dashboardOnce();
  return {
    name: "get_watch_summary",
    description:
      "Summary of the flight tracker's watched routes: current price, normal range (min, max, tenth percentile), status, and target price per watch.",
    inputSchema: EMPTY_INPUT,
    execute: async () => watchesResult(await dash()),
    summarize: () => "read the watched routes summary",
  };
}

export function trackerTools(): AssistantTool[] {
  const dash = dashboardOnce();

  return [
    {
      name: "list_watches",
      description:
        "List every watched flight route with its current price, normal range (min, max, tenth percentile), status, and target price. Call this first to find watch ids.",
      inputSchema: EMPTY_INPUT,
      execute: async () => watchesResult(await dash()),
      summarize: () => "read the watched routes",
    },
    {
      name: "get_price_history",
      description:
        "The stored price history series for one watch. Input the watchId from list_watches.",
      inputSchema: {
        type: "object",
        properties: { watchId: { type: "string" } },
        required: ["watchId"],
        additionalProperties: false,
      },
      execute: async (input) => {
        const d = await dash();
        const s = d.summaries.find((x) => x.watch.id === input.watchId);
        if (!s) return { error: "no watch with that id" };
        // The last 90 points bound the payload; older shape rarely changes an answer.
        const points = s.series.slice(-90).map((p) => ({
          date: p.observed_at.slice(0, 10),
          price: p.price,
        }));
        return {
          origin: s.watch.origin,
          destination: s.watch.destination,
          currency: s.watch.currency,
          min: s.min,
          max: s.max,
          p10: s.p10,
          current: s.current,
          points,
        };
      },
      summarize: (_input, result) => `read price history${routeOf(result)}`,
    },
    {
      name: "list_alerts",
      description:
        "Recent alerts that fired, newest first, with reason, price, and route. Optional limit, default 20, maximum 50.",
      inputSchema: {
        type: "object",
        properties: { limit: { type: "integer" } },
        additionalProperties: false,
      },
      execute: async (input) => {
        const limit = Math.min(Math.max(Number(input.limit) || 20, 1), 50);
        const rows = await listAlerts(limit);
        return {
          alerts: rows.map((a) => ({
            reason: a.reason,
            price: a.price,
            currency: a.currency,
            origin: a.origin,
            destination: a.destination,
            sentAt: a.sentAt,
            stops: a.stops,
          })),
        };
      },
      summarize: () => "read the alert history",
    },
    {
      name: "evaluate_price",
      description:
        "Check a hypothetical current price against one watch's stored history using the app's detection rules. Input the watchId and the price to test.",
      inputSchema: {
        type: "object",
        properties: {
          watchId: { type: "string" },
          price: { type: "number" },
        },
        required: ["watchId", "price"],
        additionalProperties: false,
      },
      execute: async (input) => {
        const d = await dash();
        const s = d.summaries.find((x) => x.watch.id === input.watchId);
        if (!s) return { error: "no watch with that id" };
        const price = Number(input.price);
        if (!Number.isFinite(price)) return { error: "price must be a number" };
        // evaluate expects the history newest first.
        const history: PriceRow[] = [...s.series].reverse();
        const signal = evaluate(price, history, s.watch.target_price);
        return {
          origin: s.watch.origin,
          destination: s.watch.destination,
          currency: s.watch.currency,
          testedPrice: price,
          fires: signal.fire,
          reason: signal.reason,
          context: signal.context,
        };
      },
      summarize: (input, result) =>
        `evaluated ${input.price} against stored history${routeOf(result)}`,
    },
  ];
}
