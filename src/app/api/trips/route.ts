import { NextRequest, NextResponse } from "next/server";
import { generateTrip } from "@/lib/planner/generate";
import { PlannerError, TASTE_TAGS } from "@/lib/planner/intake";
import type { Pace, TasteTag, TripIntake } from "@/lib/planner/intake";

// Generation makes several outbound lookups, so allow more than the default.
export const maxDuration = 60;

const PACES: Pace[] = ["relaxed", "balanced", "packed"];

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function optionalNumber(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number.parseFloat(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Coerce the request body into a TripIntake, taking only known fields. The
// generator does the real validation and raises plain messages.
function parseIntake(body: Record<string, unknown>): TripIntake {
  const pace = PACES.includes(body.pace as Pace) ? (body.pace as Pace) : "balanced";
  const taste = Array.isArray(body.taste)
    ? (body.taste.filter((t) => TASTE_TAGS.includes(t as TasteTag)) as TasteTag[])
    : [];

  return {
    origin: str(body.origin),
    destination: str(body.destination),
    startDate: str(body.startDate) || null,
    endDate: str(body.endDate) || null,
    lengthDays: optionalNumber(body.lengthDays),
    roughMonth: str(body.roughMonth) || null,
    travellers: optionalNumber(body.travellers) ?? 1,
    budgetCeiling: optionalNumber(body.budgetCeiling),
    pace,
    taste,
  };
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Send a JSON body." }, { status: 400 });
  }

  try {
    const result = await generateTrip(parseIntake(body));
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    if (e instanceof PlannerError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("trip generation failed", e);
    return NextResponse.json(
      { error: "Generation failed. Please try again." },
      { status: 500 }
    );
  }
}
