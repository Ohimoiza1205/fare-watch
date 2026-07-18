import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/db/client";
import { loadDayContext, appendItem, composeItem } from "@/lib/planner/repo";
import { findAlternatives } from "@/lib/planner/alternatives";
import type { AlternativeOption } from "@/lib/planner/alternatives";
import { categoryById } from "@/lib/planner/categories";
import { PlannerError } from "@/lib/planner/intake";

// Adding an activity reuses the swap flow's lookup: real venues in the chosen
// category near the trip's destination, each with a real or marked estimate
// price. GET lists the options, POST inserts the chosen one at the end of the
// day. Nothing here can invent a venue or a price.

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
function str(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ dayId: string }> }
) {
  const { dayId } = await params;
  const category = req.nextUrl.searchParams.get("category");
  if (!category || !categoryById(category)) {
    return NextResponse.json({ error: "A known category is required." }, { status: 400 });
  }

  const db = createServiceClient();
  const ctx = await loadDayContext(db, dayId);
  if (!ctx) {
    return NextResponse.json({ error: "Day not found." }, { status: 404 });
  }

  const { trip } = ctx;
  if (trip.dest_lat == null || trip.dest_lon == null) {
    return NextResponse.json({ options: [] });
  }

  const options = await findAlternatives({
    lat: trip.dest_lat,
    lon: trip.dest_lon,
    category,
    travellers: trip.travellers,
    currency: trip.currency,
  });

  return NextResponse.json({ options });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ dayId: string }> }
) {
  const { dayId } = await params;

  let body: Partial<AlternativeOption>;
  try {
    body = (await req.json()) as Partial<AlternativeOption>;
  } catch {
    return NextResponse.json({ error: "Send a JSON body." }, { status: 400 });
  }

  const venue = str(body.venue);
  const category = str(body.category);
  if (!venue || !category || !categoryById(category)) {
    return NextResponse.json({ error: "An option is required." }, { status: 400 });
  }

  const db = createServiceClient();
  const ctx = await loadDayContext(db, dayId);
  if (!ctx) {
    return NextResponse.json({ error: "Day not found." }, { status: 404 });
  }

  // One currency source of truth per trip: an option priced in another
  // currency is refused plainly rather than relabelled or mis-summed.
  const optionCurrency = str(body.currency);
  if (optionCurrency && optionCurrency !== ctx.trip.currency) {
    return NextResponse.json(
      {
        error: `The option is priced in ${optionCurrency}; this trip is priced in ${ctx.trip.currency}.`,
      },
      { status: 422 }
    );
  }

  try {
    const row = await appendItem(db, dayId, {
      category,
      title: str(body.title) ?? venue,
      venue,
      address: str(body.address),
      lat: num(body.lat),
      lon: num(body.lon),
      price: num(body.price),
      price_max: num(body.priceMax),
      currency: ctx.trip.currency,
      // added options are real venues with a marked estimate
      is_estimated: body.isEstimated !== false,
      price_source: str(body.priceSource) ?? "estimate",
      source_url: str(body.sourceUrl),
      notes: str(body.note),
    });

    return NextResponse.json({ item: composeItem(row) });
  } catch (e) {
    if (e instanceof PlannerError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Add failed." }, { status: 500 });
  }
}
