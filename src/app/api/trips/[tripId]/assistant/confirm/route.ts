import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/db/client";
import { applyProposal, type SwapProposal } from "@/lib/assistant/proposal";
import { PlannerError } from "@/lib/planner/intake";

export const maxDuration = 30;

// Applies a staged swap proposal. This route never calls the model: the
// traveller's click is the confirmation, and applyProposal does the
// compare-and-swap against the item's current state. The proposal comes back
// from the client whole; its HMAC token proves it left this server unaltered,
// and prices are re-derived server side regardless.

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;

  let body: { proposal?: SwapProposal; optionId?: string };
  try {
    body = (await req.json()) as { proposal?: SwapProposal; optionId?: string };
  } catch {
    return NextResponse.json({ error: "Send a JSON body." }, { status: 400 });
  }
  if (!body.proposal || typeof body.optionId !== "string") {
    return NextResponse.json(
      { error: "Send a proposal and a chosen option." },
      { status: 400 }
    );
  }

  const db = createServiceClient();
  try {
    const outcome = await applyProposal(db, tripId, body.proposal, body.optionId);
    if (!outcome.ok) {
      return NextResponse.json(
        { error: outcome.message },
        { status: outcome.status }
      );
    }
    return NextResponse.json({ item: outcome.item, budget: outcome.budget });
  } catch (e) {
    if (e instanceof PlannerError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: "The swap could not be applied." }, { status: 500 });
  }
}
