import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/db/client";
import { loadItemContext } from "@/lib/planner/repo";
import { findAlternatives } from "@/lib/planner/alternatives";

// Real alternatives for one activity, in the same category, from the live venue
// lookups. Every option is a real place with a real or marked estimate price.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const { itemId } = await params;
  const id = Number(itemId);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Bad item id." }, { status: 400 });
  }

  const db = createServiceClient();
  const ctx = await loadItemContext(db, id);
  if (!ctx) {
    return NextResponse.json({ error: "Item not found." }, { status: 404 });
  }

  const { item, trip } = ctx;
  const lat = item.lat ?? trip.dest_lat;
  const lon = item.lon ?? trip.dest_lon;
  if (lat == null || lon == null) {
    return NextResponse.json({ options: [] });
  }

  const options = await findAlternatives({
    lat,
    lon,
    category: item.category,
    travellers: trip.travellers,
    currency: trip.currency,
    excludeVenue: item.venue,
  });

  return NextResponse.json({ options });
}
