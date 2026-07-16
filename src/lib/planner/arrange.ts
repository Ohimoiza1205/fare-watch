import type { Rhythm } from "./types";
import type { Pace, TasteTag } from "./intake";
import { enumerateDates } from "./intake";
import {
  anchorCategoryIds,
  categoryById,
  categoryIndoor,
  categoryScore,
  estimateParty,
} from "./categories";
import type { VenueMap, Venue } from "./discover";
import type { NormalizedEvent } from "./events";
import type { WeatherSnapshot } from "./types";
import { isWetWeather } from "./weather";

// The arranging intelligence, and only arranging. It decides the rhythm of the
// trip, spreads categories for variety, keeps outdoor plans off wet days, spaces
// the date nights, and threads the errands through quiet days. It never sets a
// price: every figure comes from a real event or a marked estimate built
// elsewhere. Pure and deterministic, so the same trip always arranges the same.

export type ItemDraft = {
  category: string;
  title: string;
  venue: string | null;
  address: string | null;
  lat: number | null;
  lon: number | null;
  price: number | null;
  priceMax: number | null;
  currency: string;
  isEstimated: boolean;
  priceSource: string | null;
  sourceUrl: string | null;
  note: string | null;
  position: number;
};

export type PlannedDay = {
  dayIndex: number;
  date: string;
  rhythm: Rhythm;
  items: ItemDraft[];
};

export type ArrangeInput = {
  startDate: string;
  lengthDays: number;
  pace: Pace;
  taste: TasteTag[];
  travellers: number;
  currency: string;
  venuesByCategory: VenueMap;
  eventsByDate: Map<string, NormalizedEvent[]>;
  weatherByDate: Map<string, WeatherSnapshot>;
};

type PaceConfig = {
  restEvery: number;
  base: Rhythm;
  fullInMiddle: boolean;
  fullEvery: number;
};

// How full a trip feels, set by the taste signal's pace. The default sits in the
// middle: an anchor most days, real rest days, some bigger days through the
// centre.
const PACE: Record<Pace, PaceConfig> = {
  relaxed: { restEvery: 3, base: "light", fullInMiddle: false, fullEvery: 0 },
  balanced: { restEvery: 5, base: "light", fullInMiddle: true, fullEvery: 2 },
  packed: { restEvery: 8, base: "full", fullInMiddle: true, fullEvery: 1 },
};

// The shape of the trip: an easy first day after the flight, bigger days through
// the middle, a calm last day before flying home, and real rest days spaced
// between, never at the ends and never back to back.
function planRhythm(n: number, pace: Pace): Rhythm[] {
  const cfg = PACE[pace];
  const r: Rhythm[] = Array.from({ length: n }, () => cfg.base);

  if (n >= 1) r[0] = "light";
  if (n >= 3) r[n - 1] = "light";

  for (let i = cfg.restEvery; i < n - 1; i += cfg.restEvery) {
    if (r[i - 1] !== "rest") r[i] = "rest";
  }

  if (cfg.fullInMiddle && cfg.fullEvery > 0) {
    const from = Math.floor(n * 0.25);
    const to = Math.ceil(n * 0.75);
    let seen = 0;
    for (let i = from; i < to; i++) {
      if (r[i] === "rest") continue;
      if (seen % cfg.fullEvery === 0) r[i] = "full";
      seen++;
    }
  }

  return r;
}

// A deck of anchor categories, taste weighted: a preferred category appears
// twice so it recurs more often, others once. Round-robin over the deck spreads
// variety and avoids adjacent repeats.
function buildDeck(available: string[], taste: TasteTag[]): string[] {
  const scored = available
    .map((id) => ({ id, score: categoryScore(id, taste) }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const deck: string[] = [];
  for (const s of scored) {
    deck.push(s.id);
    if (s.score >= 2) deck.push(s.id);
  }
  return deck;
}

type DeckState = { ptr: number };

// The next anchor category, preferring one that both differs from yesterday and
// suits the weather, then relaxing those preferences in turn rather than failing.
function pickAnchor(
  deck: string[],
  state: DeckState,
  prevCat: string | null,
  wet: boolean
): string | null {
  const n = deck.length;
  if (!n) return null;
  const tiers: ((c: string) => boolean)[] = [
    (c) => c !== prevCat && (!wet || categoryIndoor(c)),
    (c) => !wet || categoryIndoor(c),
    (c) => c !== prevCat,
    () => true,
  ];
  for (const ok of tiers) {
    for (let k = 0; k < n; k++) {
      const idx = (state.ptr + k) % n;
      const c = deck[idx];
      if (ok(c)) {
        state.ptr = idx + 1;
        return c;
      }
    }
  }
  const c = deck[state.ptr % n];
  state.ptr += 1;
  return c;
}

function pickVenue(
  cat: string,
  venues: VenueMap,
  ptr: Map<string, number>
): Venue | null {
  const list = venues.get(cat);
  if (!list || !list.length) return null;
  const i = ptr.get(cat) ?? 0;
  ptr.set(cat, i + 1);
  return list[i % list.length];
}

function reindex(items: ItemDraft[]): ItemDraft[] {
  return items.map((it, i) => ({ ...it, position: i }));
}

function eventItem(ev: NormalizedEvent, travellers: number): ItemDraft {
  return {
    category: ev.category,
    title: ev.title,
    venue: ev.venue,
    address: ev.address,
    lat: ev.lat,
    lon: ev.lon,
    price: ev.perMin * travellers,
    priceMax: ev.perMax * travellers,
    currency: ev.currency,
    isEstimated: false,
    priceSource: "ticketmaster",
    sourceUrl: ev.url,
    note: null,
    position: 0,
  };
}

function estimatedItem(
  cat: string,
  title: string,
  v: Venue,
  input: ArrangeInput
): ItemDraft {
  const { price, priceMax } = estimateParty(cat, input.travellers);
  return {
    category: cat,
    title,
    venue: v.name,
    address: v.address,
    lat: v.lat,
    lon: v.lon,
    price,
    priceMax,
    currency: input.currency,
    isEstimated: true,
    priceSource: "estimate",
    sourceUrl: `https://www.openstreetmap.org/${v.osmType}/${v.osmId}`,
    note: "Estimated. Typical local range for the party.",
    position: 0,
  };
}

function hasCategory(input: ArrangeInput, cat: string): boolean {
  return (input.venuesByCategory.get(cat)?.length ?? 0) > 0;
}

function addMeal(
  items: ItemDraft[],
  r: Rhythm,
  dateNight: boolean,
  input: ArrangeInput,
  ptr: Map<string, number>
): void {
  const dining = hasCategory(input, "dining");
  const cafe = hasCategory(input, "cafe");

  if ((r === "full" || dateNight) && dining) {
    const v = pickVenue("dining", input.venuesByCategory, ptr);
    if (v) items.push(estimatedItem("dining", dateNight ? "Date night" : "Dinner", v, input));
    return;
  }
  if (cafe) {
    const v = pickVenue("cafe", input.venuesByCategory, ptr);
    if (v) items.push(estimatedItem("cafe", "Cafe", v, input));
    return;
  }
  if (dining) {
    const v = pickVenue("dining", input.venuesByCategory, ptr);
    if (v) items.push(estimatedItem("dining", "Dinner", v, input));
  }
}

// Errands land on quiet days near where they belong: groceries early, laundry
// and a pharmacy run through the middle, and only on a longer trip.
function placeBasics(
  days: PlannedDay[],
  input: ArrangeInput,
  ptr: Map<string, number>
): void {
  const n = days.length;
  const plan: { cat: string; title: string; around: number }[] = [
    { cat: "groceries", title: "Groceries", around: 1 },
    { cat: "laundry", title: "Laundry", around: Math.floor(n / 2) },
    { cat: "pharmacy", title: "Pharmacy", around: Math.floor(n / 2) },
  ];

  for (const b of plan) {
    if (!hasCategory(input, b.cat)) continue;
    if (b.cat === "pharmacy" && n < 7) continue;
    const idx = findQuietDay(days, b.around);
    if (idx == null) continue;
    const v = pickVenue(b.cat, input.venuesByCategory, ptr);
    if (!v) continue;
    days[idx].items.push(estimatedItem(b.cat, b.title, v, input));
    days[idx].items = reindex(days[idx].items);
  }
}

function findQuietDay(days: PlannedDay[], around: number): number | null {
  const n = days.length;
  const byNearest = [...days.keys()].sort(
    (a, b) => Math.abs(a - around) - Math.abs(b - around)
  );
  for (const i of byNearest) {
    if (i === 0 || i === n - 1) continue;
    if (days[i].rhythm !== "full") return i;
  }
  for (const i of byNearest) {
    if (days[i].rhythm !== "full") return i;
  }
  return null;
}

export function arrangeTrip(input: ArrangeInput): PlannedDay[] {
  const dates = enumerateDates(input.startDate, input.lengthDays);
  const rhythm = planRhythm(input.lengthDays, input.pace);
  const available = anchorCategoryIds().filter((id) => hasCategory(input, id));
  const deck = buildDeck(available, input.taste);
  const deckState: DeckState = { ptr: 0 };
  const venuePtr = new Map<string, number>();

  const days: PlannedDay[] = [];
  let prevAnchorCat: string | null = null;
  let nonRestCount = 0;
  const dateNightEvery = input.taste.includes("foodie") ? 3 : 4;

  for (let i = 0; i < input.lengthDays; i++) {
    const date = dates[i];
    const weather = input.weatherByDate.get(date) ?? null;
    const wet = isWetWeather(weather);
    let r = rhythm[i];
    const items: ItemDraft[] = [];
    let anchorCat: string | null = null;

    // A real event on this date takes the anchor and turns a rest day into a
    // light one, because a night out is not a rest day.
    const events = input.eventsByDate.get(date) ?? [];
    if (events.length) {
      const ev = events[0];
      if (r === "rest") r = "light";
      items.push(eventItem(ev, input.travellers));
      anchorCat = "event";
      prevAnchorCat = ev.category;
    } else if (r !== "rest" && deck.length) {
      const cat = pickAnchor(deck, deckState, prevAnchorCat, wet);
      if (cat) {
        const v = pickVenue(cat, input.venuesByCategory, venuePtr);
        if (v) {
          const c = categoryById(cat);
          items.push(estimatedItem(cat, c?.label ?? cat, v, input));
          anchorCat = cat;
          prevAnchorCat = cat;
        }
      }
    }

    // A full day earns a second, lighter activity in a different category.
    if (r === "full" && deck.length) {
      const cat = pickAnchor(deck, deckState, prevAnchorCat, wet);
      if (cat && cat !== anchorCat) {
        const v = pickVenue(cat, input.venuesByCategory, venuePtr);
        if (v) {
          const c = categoryById(cat);
          items.push(estimatedItem(cat, c?.label ?? cat, v, input));
          prevAnchorCat = cat;
        }
      }
    }

    // Non-rest days eat. Rest days are left to actually rest.
    if (r !== "rest") {
      nonRestCount++;
      const dateNight = nonRestCount % dateNightEvery === 0;
      addMeal(items, r, dateNight, input, venuePtr);
    }

    days.push({ dayIndex: i, date, rhythm: r, items: reindex(items) });
  }

  placeBasics(days, input, venuePtr);
  return days;
}
