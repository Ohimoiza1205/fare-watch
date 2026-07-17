import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/db/client";
import { loadTripPlan, type TripPlan } from "@/lib/planner/repo";
import { runGrounded } from "@/lib/assistant/grounding";
import { plannerTools } from "@/lib/assistant/tools/planner";
import { getWatchSummaryTool } from "@/lib/assistant/tools/tracker";
import type { ChatTurn } from "@/lib/assistant/provider";

export const maxDuration = 60;

// The planner-scoped assistant. Every factual answer flows through the trip's
// read-only tools plus one bridge into the tracker's watch summary; the
// grounding pipeline in runGrounded is the only path a reply reaches the client.

function systemPrompt(plan: TripPlan): string {
  const label = plan.trip.dest_label ?? plan.trip.destination;
  return [
    `You help a traveller understand a planned trip to ${label} and answer questions about it.`,
    "Answer only from tool results. Never invent a venue, a price, a date, or a route.",
    "Every figure you state must come from a tool result, with its currency, and estimates must be called estimates.",
    "If a lookup returns nothing or lacks the data asked for, say so plainly.",
    "Use get_trip for the plan, find_alternatives for real swap candidates, get_budget for the totals, and get_watch_summary when the question touches watched flight fares.",
    "Keep replies short and plain. No marketing language.",
  ].join("\n");
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
  if (!messages.some((m) => m.role === "user")) {
    return NextResponse.json({ error: "Send a message." }, { status: 400 });
  }

  const db = createServiceClient();
  const plan = await loadTripPlan(db, tripId);
  if (!plan) {
    return NextResponse.json({ error: "Trip not found." }, { status: 404 });
  }

  try {
    const result = await runGrounded({
      system: systemPrompt(plan),
      turns: messages,
      tools: [...plannerTools(plan), getWatchSummaryTool()],
    });
    return NextResponse.json({ reply: result.reply, toolLog: result.toolLog });
  } catch {
    return NextResponse.json({
      reply: "The assistant could not be reached. Please try again.",
      toolLog: [],
    });
  }
}
