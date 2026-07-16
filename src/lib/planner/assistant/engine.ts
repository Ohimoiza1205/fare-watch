import type { TripPlan } from "../repo";
import { formatMoney } from "../format";
import { computeTripBudget } from "../budget";

// The assistant plans and answers, it never prices. The safeguard is structural,
// not a request: the model may only return an action that names what to change,
// and the app resolves that action through the real venue lookups. The action
// schema below has no place to put a price or a venue, so a fabricated figure
// cannot travel from the model to the traveller. Any number the traveller sees
// comes from the plan data or from a live lookup, carrying its confirmed or
// estimate marking.

export type AssistantAction =
  | { type: "none" }
  | { type: "cheaper"; dayIndex: number }
  | { type: "alternatives"; dayIndex: number; position: number };

export type ParsedAssistant = { reply: string; action: AssistantAction };

// A plain summary of the plan with its real figures, so the model reasons about
// the actual trip rather than guessing.
export function planSummary(plan: TripPlan): string {
  const { trip, days } = plan;
  const priced = days.flatMap((d) =>
    d.items.map((it) => ({
      price: it.price,
      priceMax: it.priceMax,
      isEstimated: it.isEstimated,
    }))
  );
  const budget = computeTripBudget(priced, {
    currency: trip.currency,
    limit: trip.budget_ceiling,
  });

  const lines: string[] = [];
  lines.push(
    `Trip to ${trip.dest_label ?? trip.destination}, ${days.length} days, ${trip.travellers} travellers, currency ${trip.currency}.`
  );
  lines.push(
    `Budget average ${formatMoney(budget.average, trip.currency)}, conservative ceiling ${formatMoney(budget.ceiling, trip.currency)}${trip.budget_ceiling != null ? `, maximum ${formatMoney(trip.budget_ceiling, trip.currency)}` : ""}.`
  );

  days.forEach((d) => {
    lines.push(`Day ${d.dayIndex} (${d.date}), rhythm ${d.rhythm}:`);
    d.items.forEach((it, pos) => {
      const figure =
        it.price != null ? formatMoney(it.price, it.currency) : "no price";
      const mark = it.isEstimated ? "estimate" : "confirmed";
      lines.push(
        `  position ${pos}: ${it.category}, ${it.venue ?? it.title}, ${figure} (${mark}).`
      );
    });
  });

  return lines.join("\n");
}

export function buildSystemPrompt(plan: TripPlan): string {
  return [
    "You help a traveller adjust a trip plan and answer questions about it.",
    "You never invent a venue or a price. Every venue and every figure comes from the app data below or from the app's real lookups.",
    "Do not state specific money amounts in your reply text. Refer to items by name and let the app show the figures.",
    "To change the plan, set an action. The app runs the action through its real venue lookups and shows real priced options the traveller can apply.",
    "",
    "Respond with a single JSON object and nothing else, in this shape:",
    '{ "reply": string, "action": object }',
    "Where action is one of:",
    '{ "type": "none" }',
    '{ "type": "cheaper", "dayIndex": number }   to fetch cheaper real options for the most expensive item of a day',
    '{ "type": "alternatives", "dayIndex": number, "position": number }   to fetch real options for a specific item',
    "",
    "The current plan:",
    planSummary(plan),
  ].join("\n");
}

// Parse the model output. Only the known fields are read, so any stray price or
// venue the model might place in the JSON is ignored by construction.
export function parseAssistant(text: string): ParsedAssistant {
  const fallback: ParsedAssistant = { reply: text, action: { type: "none" } };

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return fallback;

  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    return fallback;
  }
  if (typeof parsed !== "object" || parsed === null) return fallback;

  const obj = parsed as Record<string, unknown>;
  const reply = typeof obj.reply === "string" ? obj.reply : text;
  const rawAction = obj.action as Record<string, unknown> | undefined;
  const action = readAction(rawAction);
  return { reply, action };
}

function readAction(raw: Record<string, unknown> | undefined): AssistantAction {
  if (!raw || typeof raw.type !== "string") return { type: "none" };
  if (raw.type === "cheaper" && typeof raw.dayIndex === "number") {
    return { type: "cheaper", dayIndex: raw.dayIndex };
  }
  if (
    raw.type === "alternatives" &&
    typeof raw.dayIndex === "number" &&
    typeof raw.position === "number"
  ) {
    return { type: "alternatives", dayIndex: raw.dayIndex, position: raw.position };
  }
  return { type: "none" };
}
