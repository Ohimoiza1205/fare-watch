import { NextRequest, NextResponse } from "next/server";
import { runGrounded } from "@/lib/assistant/grounding";
import { trackerTools } from "@/lib/assistant/tools/tracker";
import type { ChatTurn } from "@/lib/assistant/provider";

export const maxDuration = 60;

// The tracker-scoped assistant. Every factual answer flows through the
// read-only tracker tools; the grounding pipeline in runGrounded is the only
// path a reply reaches the client.

const SYSTEM = [
  "You help a traveller read a flight fare tracker: watched routes, stored price history, and fired alerts.",
  "Answer only from tool results. Never invent a price, a route, a date, or an alert.",
  "Every figure you state must come from a tool result, with its currency.",
  "If a lookup returns nothing or lacks the data asked for, say so plainly.",
  "Use list_watches first to find watch ids, get_price_history for a route's series, list_alerts for what fired, and evaluate_price to test a hypothetical price against stored history.",
  "Keep replies short and plain. No marketing language.",
].join("\n");

export async function POST(req: NextRequest) {
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

  try {
    const result = await runGrounded({
      system: SYSTEM,
      turns: messages,
      tools: trackerTools(),
    });
    return NextResponse.json({ reply: result.reply, toolLog: result.toolLog });
  } catch {
    return NextResponse.json({
      reply: "The assistant could not be reached. Please try again.",
      toolLog: [],
    });
  }
}
