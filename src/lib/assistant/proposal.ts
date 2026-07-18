import { createHmac, randomBytes, randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ItemRow } from "@/lib/planner/types";
import type { ComposedItem } from "@/lib/planner/day";
import type { AlternativeOption } from "@/lib/planner/alternatives";
import {
  loadItemContext,
  loadTripPlan,
  updateItem,
  composeItem,
} from "@/lib/planner/repo";
import { estimateParty } from "@/lib/planner/categories";
import { computeTripBudget, type TripBudget } from "@/lib/planner/budget";

// A swap proposal is staged state between the assistant proposing and the
// traveller confirming. The server stays stateless: the whole proposal rides
// to the client inside the assistant response and comes back on confirm. Two
// mechanisms keep that honest. An HMAC token over the proposal body means the
// client can carry it but not alter it, so a confirm can never smuggle in an
// invented venue or price. A version stamp over the item's swappable fields
// means the apply is compare-and-swap: if the item changed since the proposal,
// nothing is written.

export const STALE_PROPOSAL =
  "This item changed since the proposal. Ask again for fresh options.";
export const LOCKED_REFUSAL = "Locked. Unlock to swap.";
export const INVALID_PROPOSAL = "The proposal is not valid.";

export type ProposalOption = {
  id: string; // "a", "b", "c"
  venue: string;
  // One distinguishing fact shown on the option row, the address when known.
  fact: string | null;
  price: number | null;
  priceMax: number | null;
  currency: string;
  isEstimated: boolean;
  // Carried whole because the server holds nothing between propose and
  // confirm. Prices are re-derived server side on apply regardless.
  category: string;
  title: string;
  address: string | null;
  lat: number | null;
  lon: number | null;
  sourceUrl: string | null;
  note: string | null;
};

export type SwapProposal = {
  proposalId: string;
  itemId: number;
  dayIndex: number; // zero based; the interface labels it day n+1
  travellers: number;
  before: {
    venue: string;
    price: number | null;
    priceMax: number | null;
    currency: string;
    isEstimated: boolean;
  };
  options: ProposalOption[];
  versionStamp: string;
  token: string;
};

// Deterministic serialisation so the HMAC survives a JSON round trip through
// the client regardless of key order.
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    return `{${keys
      .map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

// Without a configured secret the key is per process, so proposals simply
// expire on restart. They are short-lived by design; that is acceptable.
const processKey = randomBytes(32).toString("hex");
function signingKey(): string {
  return (
    process.env.ASSISTANT_PROPOSAL_SECRET ?? process.env.CRON_SECRET ?? processKey
  );
}

function sign(body: Omit<SwapProposal, "token">): string {
  return createHmac("sha256", signingKey())
    .update(stableStringify(body))
    .digest("hex");
}

export function verifyProposal(p: SwapProposal): boolean {
  const { token, ...body } = p;
  if (typeof token !== "string" || token.length === 0) return false;
  return token === sign(body);
}

// The stamp covers exactly the fields a swap replaces. locked stays out: a
// lock is its own refusal, not staleness.
type Swappable = {
  venue: string | null;
  title: string;
  category: string;
  price: number | null;
  priceMax: number | null;
  currency: string;
  isEstimated: boolean;
  priceSource: string | null;
  address: string | null;
  lat: number | null;
  lon: number | null;
};

function stampOf(f: Swappable): string {
  return createHmac("sha256", "planner-item-stamp")
    .update(stableStringify(f))
    .digest("hex")
    .slice(0, 16);
}

export function stampFromComposed(it: ComposedItem): string {
  return stampOf({
    venue: it.venue,
    title: it.title,
    category: it.category,
    price: it.price,
    priceMax: it.priceMax,
    currency: it.currency,
    isEstimated: it.isEstimated,
    priceSource: it.priceSource,
    address: it.address,
    lat: it.lat,
    lon: it.lon,
  });
}

export function stampFromRow(row: ItemRow): string {
  return stampFromComposed(composeItem(row));
}

export function buildSwapProposal(args: {
  item: ComposedItem;
  dayIndex: number;
  travellers: number;
  options: AlternativeOption[];
}): SwapProposal {
  const ids = ["a", "b", "c"];
  const body: Omit<SwapProposal, "token"> = {
    proposalId: randomUUID(),
    itemId: args.item.id,
    dayIndex: args.dayIndex,
    travellers: args.travellers,
    before: {
      venue: args.item.venue ?? args.item.title,
      price: args.item.price,
      priceMax: args.item.priceMax,
      currency: args.item.currency,
      isEstimated: args.item.isEstimated,
    },
    options: args.options.slice(0, 3).map((o, i) => ({
      id: ids[i],
      venue: o.venue,
      fact: o.address,
      price: o.price,
      priceMax: o.priceMax,
      currency: o.currency,
      isEstimated: o.isEstimated,
      category: o.category,
      title: o.title,
      address: o.address,
      lat: o.lat,
      lon: o.lon,
      sourceUrl: o.sourceUrl,
      note: o.note,
    })),
    versionStamp: stampFromComposed(args.item),
  };
  return { ...body, token: sign(body) };
}

export type ApplyOutcome =
  | {
      ok: true;
      item: ComposedItem;
      budget: Pick<TripBudget, "currency" | "average" | "ceiling" | "limit" | "overLimit">;
    }
  | { ok: false; status: number; message: string };

// Idempotency: successful applies are remembered per proposal id in module
// memory, so a double click returns the first result without a second write.
// This is per server instance; across a restart the compare-and-swap stamp
// catches the replay instead (the item changed, so nothing is written), which
// is the honest fallback for state this short-lived.
const applied = new Map<string, ApplyOutcome>();
const APPLIED_CAP = 100;
function remember(id: string, outcome: ApplyOutcome) {
  if (applied.size >= APPLIED_CAP) {
    const oldest = applied.keys().next().value;
    if (oldest !== undefined) applied.delete(oldest);
  }
  applied.set(id, outcome);
}

export async function applyProposal(
  db: SupabaseClient,
  tripId: string,
  proposal: SwapProposal,
  optionId: string
): Promise<ApplyOutcome> {
  if (!verifyProposal(proposal)) {
    return { ok: false, status: 400, message: INVALID_PROPOSAL };
  }

  const prior = applied.get(proposal.proposalId);
  if (prior) return prior;

  const option = proposal.options.find((o) => o.id === optionId);
  if (!option) {
    return { ok: false, status: 400, message: "Choose one of the proposed options." };
  }

  const ctx = await loadItemContext(db, proposal.itemId);
  if (!ctx || ctx.trip.id !== tripId) {
    return { ok: false, status: 404, message: "Item not found." };
  }
  if (ctx.item.locked) {
    return { ok: false, status: 409, message: LOCKED_REFUSAL };
  }
  if (stampFromRow(ctx.item) !== proposal.versionStamp) {
    return { ok: false, status: 409, message: STALE_PROPOSAL };
  }

  // Prices are never taken from the wire: the party estimate is re-derived
  // from the option's category and the trip's travellers, the same maths the
  // lookup used to produce it.
  const { price, priceMax } = estimateParty(
    option.category,
    ctx.trip.travellers,
    ctx.trip.currency
  );

  const row = await updateItem(db, proposal.itemId, {
    category: option.category,
    title: option.title || option.venue,
    venue: option.venue,
    address: option.address,
    lat: option.lat,
    lon: option.lon,
    price,
    price_max: priceMax,
    currency: ctx.trip.currency,
    is_estimated: true,
    price_source: "estimate",
    source_url: option.sourceUrl,
    notes: option.note,
  });
  if (!row) {
    return { ok: false, status: 404, message: "Item not found." };
  }

  const plan = await loadTripPlan(db, tripId);
  const priced = (plan?.days ?? []).flatMap((d) =>
    d.items.map((it) => ({
      price: it.price,
      priceMax: it.priceMax,
      isEstimated: it.isEstimated,
    }))
  );
  const b = computeTripBudget(priced, {
    currency: ctx.trip.currency,
    limit: ctx.trip.budget_ceiling,
  });

  const outcome: ApplyOutcome = {
    ok: true,
    item: composeItem(row),
    budget: {
      currency: b.currency,
      average: b.average,
      ceiling: b.ceiling,
      limit: b.limit,
      overLimit: b.overLimit,
    },
  };
  remember(proposal.proposalId, outcome);
  return outcome;
}
