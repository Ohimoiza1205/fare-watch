import type { TripPlan } from "@/lib/planner/repo";
import { findAlternatives } from "@/lib/planner/alternatives";
import { computeTripBudget } from "@/lib/planner/budget";
import type { AssistantTool } from "../provider";

// Read-only planner tools over one loaded trip. Applying a swap through the
// assistant is a later phase; nothing here mutates. Executors return compact
// JSON with only the fields an answer needs.

export function plannerTools(plan: TripPlan): AssistantTool[] {
  const { trip, days } = plan;

  const pricedItems = () =>
    days.flatMap((d) =>
      d.items.map((it) => ({
        price: it.price,
        priceMax: it.priceMax,
        isEstimated: it.isEstimated,
      }))
    );

  return [
    {
      name: "get_trip",
      description:
        "The full trip plan: each day with its date, rhythm, and items. Every item carries its venue, category, price, and whether the price is an estimate or confirmed.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      execute: async () => ({
        destination: trip.dest_label ?? trip.destination,
        origin: trip.origin,
        startDate: trip.start_date,
        endDate: trip.end_date,
        travellers: trip.travellers,
        currency: trip.currency,
        budgetLimit: trip.budget_ceiling,
        days: days.map((d) => ({
          dayIndex: d.dayIndex,
          date: d.date,
          rhythm: d.rhythm,
          dayTotal: d.total.average,
          items: d.items.map((it, position) => ({
            position,
            category: it.category,
            name: it.venue ?? it.title,
            price: it.price,
            priceMax: it.priceMax,
            currency: it.currency,
            isEstimated: it.isEstimated,
            locked: it.locked,
          })),
        })),
      }),
      summarize: () => "read the trip plan",
    },
    {
      name: "find_alternatives",
      description:
        "Real nearby venues in the same category as one item, from the app's live lookups, as swap candidates. Identify the item by dayIndex and position from get_trip. Optional minPrice and maxPrice bound the party price.",
      inputSchema: {
        type: "object",
        properties: {
          dayIndex: { type: "integer" },
          position: { type: "integer" },
          minPrice: { type: "number" },
          maxPrice: { type: "number" },
        },
        required: ["dayIndex", "position"],
        additionalProperties: false,
      },
      execute: async (input) => {
        const day = days.find((d) => d.dayIndex === Number(input.dayIndex));
        const item = day?.items[Number(input.position)];
        if (!day || !item) return { error: "no item at that dayIndex and position" };

        const lat = item.lat ?? trip.dest_lat;
        const lon = item.lon ?? trip.dest_lon;
        if (lat == null || lon == null) {
          return { error: "no coordinates for that item" };
        }

        let options = await findAlternatives({
          lat,
          lon,
          category: item.category,
          travellers: trip.travellers,
          currency: trip.currency,
          excludeVenue: item.venue,
        });

        const min = Number(input.minPrice);
        const max = Number(input.maxPrice);
        if (Number.isFinite(min)) {
          options = options.filter((o) => o.price != null && o.price >= min);
        }
        if (Number.isFinite(max)) {
          options = options.filter((o) => o.price != null && o.price <= max);
        }

        return {
          currentName: item.venue ?? item.title,
          currentPrice: item.price,
          currency: item.currency,
          options: options.slice(0, 8).map((o) => ({
            venue: o.venue,
            address: o.address,
            price: o.price,
            priceMax: o.priceMax,
            currency: o.currency,
            isEstimated: o.isEstimated,
          })),
        };
      },
      summarize: (input, result) => {
        const r = result as { currentName?: string } | null;
        return r?.currentName
          ? `looked up alternatives for ${r.currentName}`
          : `looked up alternatives for day ${input.dayIndex}`;
      },
    },
    {
      name: "get_budget",
      description:
        "The trip budget recomputed from the current items: average total, conservative ceiling, the optional limit, and whether the plan is over it.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      execute: async () => {
        const b = computeTripBudget(pricedItems(), {
          currency: trip.currency,
          limit: trip.budget_ceiling,
        });
        return {
          currency: b.currency,
          average: b.average,
          ceiling: b.ceiling,
          limit: b.limit,
          overLimit: b.overLimit,
          overBy: b.overBy,
          itemCount: b.count,
          hasEstimate: b.hasEstimate,
        };
      },
      summarize: () => "recomputed the trip budget",
    },
  ];
}
