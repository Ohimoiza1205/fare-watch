import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/db/client";
import { updateItem, deleteItem, getItem, composeItem } from "@/lib/planner/repo";
import { PlannerError } from "@/lib/planner/intake";
import type { AlternativeOption } from "@/lib/planner/alternatives";

// Item mutations. A body carrying a boolean locked toggles the hold flag and
// nothing else. Otherwise the body is a swap: a chosen option from the
// alternatives lookup, already real and priced, and only those fields are ever
// written, so a swap cannot introduce an invented venue or price. A locked
// item refuses a swap.
function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
function str(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function parseId(itemId: string): number | null {
  const id = Number(itemId);
  return Number.isInteger(id) ? id : null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const { itemId } = await params;
  const id = parseId(itemId);
  if (id == null) {
    return NextResponse.json({ error: "Bad item id." }, { status: 400 });
  }

  let body: Partial<AlternativeOption> & { locked?: unknown };
  try {
    body = (await req.json()) as Partial<AlternativeOption> & { locked?: unknown };
  } catch {
    return NextResponse.json({ error: "Send a JSON body." }, { status: 400 });
  }

  const db = createServiceClient();

  if (typeof body.locked === "boolean") {
    try {
      const row = await updateItem(db, id, { locked: body.locked });
      if (!row) {
        return NextResponse.json({ error: "Item not found." }, { status: 404 });
      }
      return NextResponse.json({ item: composeItem(row) });
    } catch (e) {
      if (e instanceof PlannerError) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
      return NextResponse.json({ error: "Lock failed." }, { status: 500 });
    }
  }

  const venue = str(body.venue);
  if (!venue || !str(body.category)) {
    return NextResponse.json({ error: "An option is required." }, { status: 400 });
  }

  try {
    const existing = await getItem(db, id);
    if (!existing) {
      return NextResponse.json({ error: "Item not found." }, { status: 404 });
    }
    if (existing.locked) {
      return NextResponse.json(
        { error: "Locked. Unlock to swap." },
        { status: 409 }
      );
    }

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
    return NextResponse.json({ item: composeItem(row) });
  } catch (e) {
    if (e instanceof PlannerError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Swap failed." }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const { itemId } = await params;
  const id = parseId(itemId);
  if (id == null) {
    return NextResponse.json({ error: "Bad item id." }, { status: 400 });
  }

  const db = createServiceClient();
  try {
    const removed = await deleteItem(db, id);
    if (!removed) {
      return NextResponse.json({ error: "Item not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof PlannerError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Remove failed." }, { status: 500 });
  }
}
