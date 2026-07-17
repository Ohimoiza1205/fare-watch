import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/db/client";
import { loadTripPlan, type TripPlan } from "@/lib/planner/repo";
import { runGrounded } from "@/lib/assistant/grounding";
import { plannerTools } from "@/lib/assistant/tools/planner";
import { getWatchSummaryTool } from "@/lib/assistant/tools/tracker";
import type { SwapProposal } from "@/lib/assistant/proposal";
import type { ChatTurn } from "@/lib/assistant/provider";

export const maxDuration = 60;

// The planner-scoped assistant. Every factual answer flows through the trip's
// tools plus one bridge into the tracker's watch summary; the grounding
// pipeline in runGrounded is the only path a reply reaches the client. A
// propose_swap call stages a structured proposal that rides the response next
// to the reply text; applying it is the confirm route's job, never the model's.

function systemPrompt(plan: TripPlan): string {
  const label = plan.trip.dest_label ?? plan.trip.destination;
  return [
    `You help a traveller understand a planned trip to ${label} and answer questions about it.`,
    "Answer only from tool results. Never invent a venue, a price, a date, or a route.",
    "Every figure you state must come from a tool result, with its currency, and estimates must be called estimates.",
    "If a lookup returns nothing or lacks the data asked for, say so plainly.",
    "Use get_trip for the plan, find_alternatives to explore candidates, get_budget for the totals, and get_watch_summary when the question touches watched flight fares.",
    "When the traveller asks to change, replace, or swap an item, call propose_swap for it. The proposal appears in the interface where the traveller confirms or dismisses it. Reply by pointing at the options plainly.",
    "Never say a swap happened. A swap is applied only through the interface; when one has been, the conversation carries a system note saying so, and only then may you refer to it as done.",
    "If propose_swap finds no alternatives, say plainly that none were found.",
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

  // Proposals staged during this turn's tool calls; the last one rides the
  // response. They are built entirely from server-side lookups, so they stay
  // grounded even when the prose needs a retry.
  const proposals: SwapProposal[] = [];

  try {
    const result = await runGrounded({
      system: systemPrompt(plan),
      turns: messages,
      tools: [
        ...plannerTools(plan, { onProposal: (p) => proposals.push(p) }),
        getWatchSummaryTool(),
      ],
    });
    return NextResponse.json({
      reply: result.reply,
      toolLog: result.toolLog,
      proposal: proposals.at(-1) ?? null,
    });
  } catch {
    return NextResponse.json({
      reply: "The assistant could not be reached. Please try again.",
      toolLog: [],
      proposal: null,
    });
  }
}
