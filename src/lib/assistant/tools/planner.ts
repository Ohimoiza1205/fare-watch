import type { TripPlan } from "@/lib/planner/repo";
import { findAlternatives } from "@/lib/planner/alternatives";
import { computeTripBudget } from "@/lib/planner/budget";
import { buildSwapProposal, type SwapProposal } from "../proposal";
import type { AssistantTool } from "../provider";

// Planner tools over one loaded trip. Everything here reads; propose_swap
// stages a proposal but writes nothing, and the confirm endpoint is the only
// path that mutates. Executors return compact JSON with only the fields an
// answer needs. onProposal hands each staged proposal to the route so it can
// ride the response to the client alongside the reply text.

export function plannerTools(
  plan: TripPlan,
  opts?: { onProposal?: (p: SwapProposal) => void }
): AssistantTool[] {
  const { trip, days } = plan;

  const pricedItems = () =>
    days.flatMap((d) =>
      d.items.map((it) => ({
        price: it.price,
        priceMax: it.priceMax,
        isEstimated: it.isEstimated,
      }))
    );

  // One lookup shared by find_alternatives and propose_swap, so both draw
  // candidates from the same live source with the same bounds.
  async function lookupOptions(input: Record<string, unknown>) {
    const day = days.find((d) => d.dayIndex === Number(input.dayIndex));
    const item = day?.items[Number(input.position)];
    if (!day || !item) {
      return { error: "no item at that dayIndex and position" } as const;
    }

    const lat = item.lat ?? trip.dest_lat;
    const lon = item.lon ?? trip.dest_lon;
    if (lat == null || lon == null) {
      return { error: "no coordinates for that item" } as const;
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

    return { day, item, options } as const;
  }

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
        const found = await lookupOptions(input);
        if ("error" in found) return found;
        const { item, options } = found;

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
      name: "propose_swap",
      description:
        "Stage a formal swap proposal for one item when the traveller asks to change or replace it. Fetches 2 or 3 real alternatives and returns them as a proposal the traveller confirms or dismisses in the interface. This changes nothing by itself; never claim a swap happened from this result. Identify the item by dayIndex and position from get_trip. Optional minPrice and maxPrice bound the party price.",
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
        const found = await lookupOptions(input);
        if ("error" in found) return found;
        const { day, item, options } = found;

        if (options.length === 0) {
          return {
            replaces: item.venue ?? item.title,
            day: day.dayIndex + 1,
            options: [],
            note: "No real alternatives were found nearby. Nothing was proposed.",
          };
        }

        const proposal = buildSwapProposal({
          item,
          dayIndex: day.dayIndex,
          travellers: trip.travellers,
          options,
        });
        opts?.onProposal?.(proposal);

        // The model sees the same figures the card renders, so its prose stays
        // inside the grounding whitelist. The token stays out of its view.
        return {
          proposalId: proposal.proposalId,
          replaces: proposal.before.venue,
          currentPrice: proposal.before.price,
          day: day.dayIndex + 1,
          options: proposal.options.map((o) => ({
            option: o.id,
            venue: o.venue,
            fact: o.fact,
            price: o.price,
            priceMax: o.priceMax,
            currency: o.currency,
            isEstimated: o.isEstimated,
          })),
          note: "Proposal staged. The traveller confirms or dismisses it in the interface. Do not say the swap happened.",
        };
      },
      summarize: (_input, result) => {
        const r = result as { replaces?: string; options?: unknown[] } | null;
        if (!r?.replaces) return "looked for swap options";
        return r.options?.length
          ? `proposed a swap for ${r.replaces}`
          : `found no alternatives for ${r.replaces}`;
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
