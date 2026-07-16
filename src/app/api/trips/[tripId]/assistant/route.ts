import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/db/client";
import { loadTripPlan } from "@/lib/planner/repo";
import { findAlternatives } from "@/lib/planner/alternatives";
import { assistantConfig, complete, type ChatTurn } from "@/lib/planner/assistant/provider";
import {
  buildSystemPrompt,
  parseAssistant,
  type AssistantAction,
} from "@/lib/planner/assistant/engine";
import type { AssistantSuggestion } from "@/lib/planner/assistant/types";
import type { ComposedDay } from "@/lib/planner/day";

export const maxDuration = 60;

function pricedTarget(day: ComposedDay): number | null {
  let bestIdx: number | null = null;
  let bestPrice = -Infinity;
  day.items.forEach((it, i) => {
    if (it.price != null && it.price > bestPrice) {
      bestPrice = it.price;
      bestIdx = i;
    }
  });
  return bestIdx;
}

async function resolve(
  action: AssistantAction,
  days: ComposedDay[],
  ctx: { destLat: number | null; destLon: number | null; travellers: number; currency: string }
): Promise<AssistantSuggestion | null> {
  let dayIndex = -1;
  let position = -1;

  if (action.type === "cheaper") {
    dayIndex = action.dayIndex;
    const day = days[dayIndex];
    if (!day) return null;
    const target = pricedTarget(day);
    if (target === null) return null;
    position = target;
  } else if (action.type === "alternatives") {
    dayIndex = action.dayIndex;
    position = action.position;
  } else {
    return null;
  }

  const day = days[dayIndex];
  const item = day?.items[position];
  if (!item) return null;

  const lat = item.lat ?? ctx.destLat;
  const lon = item.lon ?? ctx.destLon;
  if (lat == null || lon == null) return null;

  let options = await findAlternatives({
    lat,
    lon,
    category: item.category,
    travellers: ctx.travellers,
    currency: ctx.currency,
    excludeVenue: item.venue,
  });

  // For a cheaper request, keep only options below the current figure, so the
  // suggestion honours the ask. The prices are still the lookup's, never the
  // model's.
  if (action.type === "cheaper" && item.price != null) {
    const cheaper = options.filter(
      (o) => o.price != null && o.price < (item.price as number)
    );
    if (cheaper.length) options = cheaper;
  }

  return {
    itemRef: { dayIndex, position },
    currentName: item.venue ?? item.title,
    currentPrice: item.price,
    currency: item.currency,
    options,
  };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;

  let body: { messages?: ChatTurn[] };
  try {
    body = (await req.json()) as { messages?: ChatTurn[] };
  } catch {
    return NextResponse.json({ error: "Send a JSON body." }, { status: 400 });
  }
  const messages = Array.isArray(body.messages) ? body.messages : [];

  const cfg = assistantConfig();
  if (!cfg) {
    return NextResponse.json({
      reply:
        "The assistant is not configured. Set ASSISTANT_API_KEY to turn it on.",
      suggestion: null,
    });
  }

  const db = createServiceClient();
  const plan = await loadTripPlan(db, tripId);
  if (!plan) {
    return NextResponse.json({ error: "Trip not found." }, { status: 404 });
  }

  let text: string;
  try {
    text = await complete(cfg, buildSystemPrompt(plan), messages);
  } catch {
    return NextResponse.json({
      reply: "The assistant could not be reached. Please try again.",
      suggestion: null,
    });
  }

  const { reply, action } = parseAssistant(text);
  const suggestion = await resolve(action, plan.days, {
    destLat: plan.trip.dest_lat,
    destLon: plan.trip.dest_lon,
    travellers: plan.trip.travellers,
    currency: plan.trip.currency,
  });

  return NextResponse.json({ reply, suggestion });
}
