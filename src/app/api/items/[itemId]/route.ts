import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/db/client";
import { updateItem } from "@/lib/planner/repo";
import { PlannerError } from "@/lib/planner/intake";
import type { AlternativeOption } from "@/lib/planner/alternatives";
import type { ComposedItem } from "@/lib/planner/day";

// Apply a swap. The chosen option came from the alternatives lookup, so it is
// already real and priced. We only ever write those fields, so a swap cannot
// introduce an invented venue or price.
function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
function str(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const { itemId } = await params;
  const id = Number(itemId);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Bad item id." }, { status: 400 });
  }

  let body: Partial<AlternativeOption>;
  try {
    body = (await req.json()) as Partial<AlternativeOption>;
  } catch {
    return NextResponse.json({ error: "Send a JSON body." }, { status: 400 });
  }

  const venue = str(body.venue);
  if (!venue || !str(body.category)) {
    return NextResponse.json({ error: "An option is required." }, { status: 400 });
  }

  const db = createServiceClient();
  try {
    const row = await updateItem(db, id, {
      category: str(body.category) ?? undefined,
      title: str(body.title) ?? venue,
      venue,
      address: str(body.address),
      lat: num(body.lat),
      lon: num(body.lon),
      price: num(body.price),
      price_max: num(body.priceMax),
      currency: str(body.currency) ?? undefined,
      // alternatives are always real venues with a marked estimate
      is_estimated: body.isEstimated !== false,
      price_source: str(body.priceSource) ?? "estimate",
      source_url: str(body.sourceUrl),
      notes: str(body.note),
    });

    if (!row) {
      return NextResponse.json({ error: "Item not found." }, { status: 404 });
    }

    const item: ComposedItem = {
      id: row.id,
      category: row.category,
      title: row.title,
      venue: row.venue,
      address: row.address,
      lat: row.lat,
      lon: row.lon,
      price: row.price,
      priceMax: row.price_max,
      currency: row.currency,
      isEstimated: row.is_estimated,
      priceSource: row.price_source,
      sourceUrl: row.source_url,
      note: row.notes,
    };
    return NextResponse.json({ item });
  } catch (e) {
    if (e instanceof PlannerError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Swap failed." }, { status: 500 });
  }
}
