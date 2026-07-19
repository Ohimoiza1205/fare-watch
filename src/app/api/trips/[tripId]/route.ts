import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/db/client";
import { fetchWeatherRange } from "@/lib/planner/weather";
import type { DayRow, TripRow, WeatherSnapshot } from "@/lib/planner/types";

// P7: a deliberate date re-flow. A same-length range shifts every day's date
// by the same offset and refreshes each day's weather from the real forecast.
// A different length is refused plainly: stretching or trimming an arranged
// plan silently would desync what the arranger built, and regeneration is
// the honest path to a new length.

const DAY_MS = 86_400_000;

function parseDay(s: unknown): number | null {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const t = Date.parse(`${s}T00:00:00Z`);
  return Number.isNaN(t) ? null : t;
}

function toIso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;

  let body: { startDate?: unknown; endDate?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const newStart = parseDay(body.startDate);
  const newEnd = parseDay(body.endDate);
  if (newStart == null || newEnd == null || newEnd < newStart) {
    return NextResponse.json(
      { error: "Dates must be a valid range, yyyy-mm-dd." },
      { status: 422 }
    );
  }

  const db = createServiceClient();
  const { data: tripData } = await db
    .from("trip")
    .select("*")
    .eq("id", tripId)
    .maybeSingle();
  if (!tripData) return NextResponse.json({ error: "trip not found" }, { status: 404 });
  const trip = tripData as TripRow;

  const oldStart = trip.start_date ? parseDay(trip.start_date) : null;
  const oldEnd = trip.end_date ? parseDay(trip.end_date) : null;
  if (oldStart == null || oldEnd == null) {
    return NextResponse.json(
      { error: "This trip has no dated range to shift." },
      { status: 422 }
    );
  }

  const oldLen = Math.round((oldEnd - oldStart) / DAY_MS) + 1;
  const newLen = Math.round((newEnd - newStart) / DAY_MS) + 1;
  if (oldLen !== newLen) {
    return NextResponse.json(
      {
        error: `The new range is ${newLen} days, the plan is ${oldLen}. Shifting keeps every arranged day; to change the length, regenerate the trip.`,
      },
      { status: 422 }
    );
  }

  const { data: dayData } = await db
    .from("day")
    .select("id, day_index, day_date, weather")
    .eq("trip_id", tripId)
    .order("day_index", { ascending: true });
  const days = (dayData ?? []) as Pick<DayRow, "id" | "day_index" | "day_date" | "weather">[];

  // Each day's target date is derived from its index anchored at the new
  // start, never from a relative offset, so the write is idempotent: if a
  // failure leaves the plan partially shifted, applying the same range again
  // converges every remaining day. The trip row is written first for the
  // same reason; a re-apply then recomputes identical targets.
  const minIdx = days.length ? Math.min(...days.map((d) => d.day_index)) : 0;
  const targeted = days.map((d) => ({
    ...d,
    newDate: toIso(newStart + (d.day_index - minIdx) * DAY_MS),
  }));

  const { error: tripErr } = await db
    .from("trip")
    .update({ start_date: toIso(newStart), end_date: toIso(newEnd) })
    .eq("id", tripId);
  if (tripErr) {
    return NextResponse.json(
      { error: `The trip did not update: ${tripErr.message}. Nothing was changed.` },
      { status: 500 }
    );
  }

  // Real forecasts for the new dates in one call; a date the forecast cannot
  // cover comes back absent and the day stores null rather than a stale
  // snapshot for a date it no longer sits on.
  let weatherByDate = new Map<string, WeatherSnapshot>();
  if (trip.dest_lat != null && trip.dest_lon != null) {
    try {
      weatherByDate = await fetchWeatherRange({
        lat: trip.dest_lat,
        lon: trip.dest_lon,
        dates: targeted.map((d) => d.newDate),
      });
    } catch {
      // weather refresh is best effort; the dates still shift
    }
  }

  for (const d of targeted) {
    const { error } = await db
      .from("day")
      .update({ day_date: d.newDate, weather: weatherByDate.get(d.newDate) ?? null })
      .eq("id", d.id);
    if (error) {
      return NextResponse.json(
        {
          error: `Day ${d.day_index} did not update: ${error.message}. The plan may be partially shifted; apply the same dates again to finish.`,
        },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true, startDate: toIso(newStart), endDate: toIso(newEnd) });
}
