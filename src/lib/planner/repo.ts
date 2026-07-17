import type { SupabaseClient } from "@supabase/supabase-js";
import type { ResolvedIntake } from "./intake";
import { PlannerError } from "./intake";
import type { PlannedDay } from "./arrange";
import type { WeatherSnapshot, TripRow, DayRow, ItemRow, ItemInsert } from "./types";
import type { GeoResult } from "./geocode";
import type { ComposedDay, ComposedItem } from "./day";
import { rollup } from "./budget";

type DB = SupabaseClient;

// Reads and writes for trips, days, and items. Auth is not wired yet. This
// matches the tracker's pre-auth stage, where watch rows carry a relaxed
// user_id: use PLANNER_USER_ID when it is set, otherwise attach the trip to a
// null owner so generation works locally. RLS stays in place for when auth
// arrives; a null owner is simply invisible to any signed-in user later.
export function resolveOwnerUserId(): string | null {
  return process.env.PLANNER_USER_ID ?? null;
}

export async function insertTrip(
  db: DB,
  args: {
    userId: string | null;
    intake: ResolvedIntake;
    geo: GeoResult;
    currency: string;
  }
): Promise<TripRow> {
  const { intake, geo } = args;
  const { data, error } = await db
    .from("trip")
    .insert({
      user_id: args.userId,
      origin: intake.origin,
      destination: intake.destination,
      dest_label: geo.label,
      dest_lat: geo.lat,
      dest_lon: geo.lon,
      start_date: intake.startDate,
      end_date: intake.endDate,
      length_days: intake.lengthDays,
      rough_month: intake.roughMonth ?? null,
      travellers: intake.travellers,
      budget_ceiling: intake.budgetCeiling ?? null,
      currency: args.currency,
      pace: intake.pace,
      taste: intake.taste,
      status: "generated",
    })
    .select()
    .single();

  if (error || !data) {
    throw new PlannerError(`Could not save the trip. ${error?.message ?? ""}`.trim());
  }
  return data as TripRow;
}

export async function insertDaysAndItems(
  db: DB,
  tripId: string,
  planned: PlannedDay[],
  weatherByDate: Map<string, WeatherSnapshot>
): Promise<void> {
  const dayRows = planned.map((p) => ({
    trip_id: tripId,
    day_index: p.dayIndex,
    day_date: p.date,
    rhythm: p.rhythm,
    weather: weatherByDate.get(p.date) ?? null,
    locked: false,
  }));

  const { data: days, error: dayError } = await db
    .from("day")
    .insert(dayRows)
    .select("id, day_index");
  if (dayError || !days) {
    throw new PlannerError(`Could not save the days. ${dayError?.message ?? ""}`.trim());
  }

  const idByIndex = new Map<number, string>(
    (days as { id: string; day_index: number }[]).map((d) => [d.day_index, d.id])
  );

  const itemRows = planned.flatMap((p) => {
    const dayId = idByIndex.get(p.dayIndex);
    if (!dayId) return [];
    return p.items.map((it) => ({
      day_id: dayId,
      category: it.category,
      title: it.title,
      venue: it.venue,
      address: it.address,
      lat: it.lat,
      lon: it.lon,
      price: it.price,
      price_max: it.priceMax,
      currency: it.currency,
      is_estimated: it.isEstimated,
      price_source: it.priceSource,
      source_url: it.sourceUrl,
      locked: false,
      position: it.position,
      notes: it.note,
    }));
  });

  if (itemRows.length) {
    const { error: itemError } = await db.from("item").insert(itemRows);
    if (itemError) {
      throw new PlannerError(`Could not save the items. ${itemError.message}`);
    }
  }
}

// The one row-to-interface mapping, shared with the API routes so an item
// always crosses the wire in the same shape.
export function composeItem(row: ItemRow): ComposedItem {
  return {
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
    locked: row.locked,
  };
}

export type TripPlan = { trip: TripRow; days: ComposedDay[] };

export async function loadTripPlan(
  db: DB,
  tripId: string
): Promise<TripPlan | null> {
  const { data: trip } = await db
    .from("trip")
    .select("*")
    .eq("id", tripId)
    .maybeSingle();
  if (!trip) return null;
  const t = trip as TripRow;

  const { data: dayData } = await db
    .from("day")
    .select("*")
    .eq("trip_id", tripId)
    .order("day_index", { ascending: true });
  const dayRows = (dayData ?? []) as DayRow[];

  const dayIds = dayRows.map((d) => d.id);
  const { data: itemData } = dayIds.length
    ? await db
        .from("item")
        .select("*")
        .in("day_id", dayIds)
        .order("position", { ascending: true })
    : { data: [] as ItemRow[] };
  const itemRows = (itemData ?? []) as ItemRow[];

  const itemsByDay = new Map<string, ItemRow[]>();
  for (const it of itemRows) {
    const list = itemsByDay.get(it.day_id) ?? [];
    list.push(it);
    itemsByDay.set(it.day_id, list);
  }

  const destLabel = t.dest_label ?? t.destination;
  const days: ComposedDay[] = dayRows.map((d) => {
    const items = (itemsByDay.get(d.id) ?? []).map(composeItem);
    return {
      id: d.id,
      dayIndex: d.day_index,
      date: d.day_date,
      rhythm: d.rhythm,
      destLabel,
      currency: t.currency,
      weather: d.weather,
      items,
      total: rollup(
        items.map((it) => ({
          price: it.price,
          priceMax: it.priceMax,
          isEstimated: it.isEstimated,
        }))
      ),
    };
  });

  return { trip: t, days };
}

// Context for a single item, so a swap knows where to look and for whom.
export async function loadItemContext(
  db: DB,
  itemId: number
): Promise<{ item: ItemRow; trip: TripRow } | null> {
  const { data: item } = await db
    .from("item")
    .select("*")
    .eq("id", itemId)
    .maybeSingle();
  if (!item) return null;
  const itemRow = item as ItemRow;

  const { data: day } = await db
    .from("day")
    .select("trip_id")
    .eq("id", itemRow.day_id)
    .maybeSingle();
  if (!day) return null;

  const { data: trip } = await db
    .from("trip")
    .select("*")
    .eq("id", (day as { trip_id: string }).trip_id)
    .maybeSingle();
  if (!trip) return null;

  return { item: itemRow, trip: trip as TripRow };
}

export type ItemUpdate = {
  category?: string;
  title?: string;
  venue?: string | null;
  address?: string | null;
  lat?: number | null;
  lon?: number | null;
  price?: number | null;
  price_max?: number | null;
  currency?: string;
  is_estimated?: boolean;
  price_source?: string | null;
  source_url?: string | null;
  notes?: string | null;
  locked?: boolean;
};

export async function getItem(db: DB, itemId: number): Promise<ItemRow | null> {
  const { data } = await db
    .from("item")
    .select("*")
    .eq("id", itemId)
    .maybeSingle();
  return (data as ItemRow) ?? null;
}

export async function deleteItem(db: DB, itemId: number): Promise<boolean> {
  const { error, count } = await db
    .from("item")
    .delete({ count: "exact" })
    .eq("id", itemId);
  if (error) {
    throw new PlannerError(`Could not remove the item. ${error.message}`);
  }
  return (count ?? 0) > 0;
}

// One day with its trip, so an add knows where to look and for whom.
export async function loadDayContext(
  db: DB,
  dayId: string
): Promise<{ day: DayRow; trip: TripRow } | null> {
  const { data: day } = await db
    .from("day")
    .select("*")
    .eq("id", dayId)
    .maybeSingle();
  if (!day) return null;
  const dayRow = day as DayRow;

  const { data: trip } = await db
    .from("trip")
    .select("*")
    .eq("id", dayRow.trip_id)
    .maybeSingle();
  if (!trip) return null;

  return { day: dayRow, trip: trip as TripRow };
}

// Insert one item at the end of a day's sequence.
export async function appendItem(
  db: DB,
  dayId: string,
  fields: Omit<ItemInsert, "day_id" | "position">
): Promise<ItemRow> {
  const { data: last } = await db
    .from("item")
    .select("position")
    .eq("day_id", dayId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = ((last as { position: number } | null)?.position ?? -1) + 1;

  const { data, error } = await db
    .from("item")
    .insert({ ...fields, day_id: dayId, position })
    .select()
    .single();
  if (error || !data) {
    throw new PlannerError(`Could not add the item. ${error?.message ?? ""}`.trim());
  }
  return data as ItemRow;
}

export async function updateItem(
  db: DB,
  itemId: number,
  fields: ItemUpdate
): Promise<ItemRow | null> {
  const { data, error } = await db
    .from("item")
    .update(fields)
    .eq("id", itemId)
    .select()
    .maybeSingle();
  if (error) {
    throw new PlannerError(`Could not update the item. ${error.message}`);
  }
  return (data as ItemRow) ?? null;
}

export type TripSummary = {
  id: string;
  destination: string;
  destLabel: string | null;
  startDate: string | null;
  endDate: string | null;
  lengthDays: number | null;
  travellers: number;
  currency: string;
  createdAt: string;
};

export type NextTrip = {
  id: string;
  destination: string;
  destLabel: string | null;
  destLat: number | null;
  destLon: number | null;
  startDate: string;
  endDate: string | null;
};

// The soonest trip that has not started yet, with coordinates so the caller
// can look up its weather. Null when nothing is ahead.
export async function nextUpcomingTrip(db: DB): Promise<NextTrip | null> {
  const today = new Date().toLocaleDateString("en-CA");
  const { data } = await db
    .from("trip")
    .select("id, destination, dest_label, dest_lat, dest_lon, start_date, end_date")
    .gte("start_date", today)
    .order("start_date", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!data) return null;

  const r = data as Record<string, unknown>;
  return {
    id: r.id as string,
    destination: r.destination as string,
    destLabel: (r.dest_label as string | null) ?? null,
    destLat: (r.dest_lat as number | null) ?? null,
    destLon: (r.dest_lon as number | null) ?? null,
    startDate: r.start_date as string,
    endDate: (r.end_date as string | null) ?? null,
  };
}

export async function listTrips(
  db: DB,
  userId: string | null
): Promise<TripSummary[]> {
  const base = db
    .from("trip")
    .select(
      "id, destination, dest_label, start_date, end_date, length_days, travellers, currency, created_at"
    );
  // Pre-auth, with no owner resolved, return every trip, the same way the
  // tracker returns every watch until auth scopes the reads.
  const scoped = userId ? base.eq("user_id", userId) : base;
  const { data } = await scoped.order("created_at", { ascending: false });

  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    destination: r.destination as string,
    destLabel: (r.dest_label as string | null) ?? null,
    startDate: (r.start_date as string | null) ?? null,
    endDate: (r.end_date as string | null) ?? null,
    lengthDays: (r.length_days as number | null) ?? null,
    travellers: r.travellers as number,
    currency: r.currency as string,
    createdAt: r.created_at as string,
  }));
}
