// Real, priced live events near the destination, from Ticketmaster's Discovery
// API. This is where a confirmed price enters the itinerary: a real venue, a
// real published price range, a real booking link. It needs a free key in
// TICKETMASTER_API_KEY. Without the key, or with no priced events, it returns
// nothing and the trip is arranged from real venues with marked estimates.
//
// One call fetches the whole trip window, so the itinerary can place each event
// on its real date without hitting the free tier per day.

import { IDENT_HEADERS } from "./http";

const DISCOVERY = "https://app.ticketmaster.com/discovery/v2/events.json";

// Per ticket, not per party. The arranger scales by the number of travellers.
export type NormalizedEvent = {
  date: string; // yyyy-mm-dd, the event's local date
  category: string;
  title: string;
  venue: string | null;
  address: string | null;
  lat: number | null;
  lon: number | null;
  perMin: number;
  perMax: number;
  currency: string;
  url: string | null;
};

type TmPriceRange = { min?: number; max?: number; currency?: string };
type TmVenue = {
  name?: string;
  address?: { line1?: string };
  city?: { name?: string };
  state?: { stateCode?: string };
  postalCode?: string;
  location?: { latitude?: string; longitude?: string };
};
type TmEvent = {
  name: string;
  url?: string;
  dates?: { start?: { localDate?: string } };
  priceRanges?: TmPriceRange[];
  classifications?: { segment?: { name?: string } }[];
  _embedded?: { venues?: TmVenue[] };
};
type TmResponse = { _embedded?: { events?: TmEvent[] } };

function segmentToCategory(segment: string | undefined): string {
  switch (segment) {
    case "Music":
      return "concert";
    case "Sports":
      return "sports";
    case "Arts & Theatre":
      return "theatre";
    case "Film":
      return "cinema";
    default:
      return "event";
  }
}

function venueAddress(venue: TmVenue | undefined): string | null {
  if (!venue) return null;
  const parts = [
    venue.address?.line1,
    venue.city?.name,
    venue.state?.stateCode,
    venue.postalCode,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

function normalise(e: TmEvent, fallbackCurrency: string): NormalizedEvent | null {
  const range = (e.priceRanges ?? []).find((p) => p?.min != null);
  const date = e.dates?.start?.localDate;
  if (!range || !date) return null; // a real price and a real date are required

  const venue = e._embedded?.venues?.[0];
  const perMin = range.min ?? 0;
  const lat = venue?.location?.latitude != null ? Number(venue.location.latitude) : null;
  const lon = venue?.location?.longitude != null ? Number(venue.location.longitude) : null;
  return {
    date,
    category: segmentToCategory(e.classifications?.[0]?.segment?.name),
    title: e.name,
    venue: venue?.name ?? null,
    address: venueAddress(venue),
    lat: lat != null && Number.isFinite(lat) ? lat : null,
    lon: lon != null && Number.isFinite(lon) ? lon : null,
    perMin,
    perMax: range.max ?? perMin,
    currency: range.currency ?? fallbackCurrency,
    url: e.url ?? null,
  };
}

// A window of real events, keyed by local date. Empty map when the key is
// absent or nothing priced is on.
export async function fetchEventsByDate(opts: {
  lat: number;
  lon: number;
  startDate: string;
  endDate: string;
  currency: string;
}): Promise<Map<string, NormalizedEvent[]>> {
  const key = process.env.TICKETMASTER_API_KEY;
  const out = new Map<string, NormalizedEvent[]>();
  if (!key) return out;

  const params = new URLSearchParams({
    apikey: key,
    latlong: `${opts.lat},${opts.lon}`,
    radius: "50",
    unit: "miles",
    startDateTime: `${opts.startDate}T00:00:00Z`,
    endDateTime: `${opts.endDate}T23:59:59Z`,
    size: "100",
    sort: "date,asc",
  });

  const res = await fetch(`${DISCOVERY}?${params}`, {
    headers: IDENT_HEADERS,
    next: { revalidate: 3600 },
  });
  if (!res.ok) return out;

  const json = (await res.json()) as TmResponse;
  for (const e of json?._embedded?.events ?? []) {
    const ev = normalise(e, opts.currency);
    if (!ev) continue;
    const list = out.get(ev.date) ?? [];
    list.push(ev);
    out.set(ev.date, list);
  }
  return out;
}
