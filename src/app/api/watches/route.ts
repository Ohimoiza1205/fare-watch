import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/db/client";

// Adds a watch. Auth is not built, so the new row attaches to the same owner
// as the existing watches (or PLANNER_USER_ID when set); with neither present
// the request is refused plainly rather than inventing an owner, because the
// watch table requires a real user id.

const IATA = /^[A-Za-z]{3}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
  }

  const origin = String(body.origin ?? "").toUpperCase().trim();
  const destination = String(body.destination ?? "").toUpperCase().trim();
  const departDate = String(body.departDate ?? "");
  const returnDate = String(body.returnDate ?? "");
  const adults = Number(body.adults ?? 1);
  const cabin = String(body.cabin ?? "1");
  const maxStops = Number(body.maxStops ?? 0);
  const currency = String(body.currency ?? "GBP").toUpperCase();
  const targetPrice =
    body.targetPrice != null && body.targetPrice !== ""
      ? Number(body.targetPrice)
      : null;

  if (!IATA.test(origin) || !IATA.test(destination)) {
    return NextResponse.json(
      { error: "Origin and destination must be 3 letter airport codes." },
      { status: 400 }
    );
  }
  if (!ISO_DATE.test(departDate) || !ISO_DATE.test(returnDate)) {
    return NextResponse.json(
      { error: "Departure and return dates are required." },
      { status: 400 }
    );
  }
  if (returnDate < departDate) {
    return NextResponse.json(
      { error: "The return date is before the departure date." },
      { status: 400 }
    );
  }
  if (targetPrice != null && !(targetPrice > 0)) {
    return NextResponse.json(
      { error: "The target price must be above zero." },
      { status: 400 }
    );
  }

  const db = createServiceClient();

  const { data: existing } = await db
    .from("watch")
    .select("user_id")
    .limit(1)
    .maybeSingle();
  const userId =
    (existing as { user_id: string } | null)?.user_id ??
    process.env.PLANNER_USER_ID ??
    null;
  if (!userId) {
    return NextResponse.json(
      { error: "No account exists to own the watch yet." },
      { status: 409 }
    );
  }

  const { data, error } = await db
    .from("watch")
    .insert({
      user_id: userId,
      origin,
      destination,
      depart_date: departDate,
      return_date: returnDate,
      adults: Number.isFinite(adults) && adults >= 1 ? Math.floor(adults) : 1,
      cabin: ["1", "2", "3", "4"].includes(cabin) ? cabin : "1",
      max_stops: [0, 1, 2, 3].includes(maxStops) ? maxStops : 0,
      target_price: targetPrice,
      currency,
      active: true,
    })
    .select("id")
    .single();

  if (error) {
    console.error("watch insert failed", error);
    return NextResponse.json(
      { error: "The watch could not be saved." },
      { status: 500 }
    );
  }

  return NextResponse.json({ id: (data as { id: string }).id }, { status: 201 });
}
