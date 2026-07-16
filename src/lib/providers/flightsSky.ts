import { FareProvider, FareQuote, ProviderResult, WatchInput } from "./types";

const HOST = process.env.RAPIDAPI_HOST ?? "flights-sky.p.rapidapi.com";

function normalise(it: any, ccy: string): FareQuote {
  return {
    provider: "flights-sky",
    price: it.price,
    currency: ccy,
    departDate: it.departureDate,
    returnDate: it.arrivalDate, // round-trip outbound arrival date; return leg via token
    stops: it.stops ?? Math.max(0, (it.segments?.length ?? 1) - 1),
    carriers: it.airlineNames ?? (it.airlineCode ? [it.airlineCode] : []),
    // A booking-grade deep link needs the return-leg call. As a first cut, link
    // to a Google Flights search for the route; refine with the token later.
    deepLink: `https://www.google.com/travel/flights?q=flights%20from%20${it.departureAirportCode}%20to%20${it.arrivalAirportCode}`,
    token: it.returningToken,
  };
}

// The history point shape was never pinned down: the reference script only ever
// read its price, never its time. Accept the tuple form and the field names the
// provider is likely to use, and reject anything without both numbers.
function parseHistoryPoint(h: any): { time: number; price: number } | null {
  let time: any;
  let price: any;
  if (Array.isArray(h)) {
    [time, price] = h;
  } else if (h && typeof h === "object") {
    time = h.time ?? h.timestamp ?? h.ts ?? h.date ?? h.day ?? h.t ?? h.x;
    price = h.price ?? h.value ?? h.fare ?? h.amount ?? h.y;
  }
  const t = Number(time);
  const p = Number(price);
  if (!Number.isFinite(t) || !Number.isFinite(p)) return null;
  return { time: t, price: p };
}

export const flightsSky: FareProvider = {
  name: "flights-sky",
  async search(input: WatchInput): Promise<ProviderResult> {
    const params = new URLSearchParams({
      departureId: input.origin,
      arrivalId: input.destination,
      departureDate: input.departDate,
      arrivalDate: input.returnDate,
      cabinClass: input.cabin,
      adults: String(input.adults),
      currency: input.currency,
      sort: "2",                       // price
      // The endpoint drops the route-level priceHistory when a stops filter is
      // applied, so always ask for any stops and enforce max_stops locally below.
      stops: "0",
    });

    const res = await fetch(
      `https://${HOST}/google/flights/search-roundtrip?${params}`,
      { headers: { "x-rapidapi-key": process.env.RAPIDAPI_KEY!, "x-rapidapi-host": HOST } }
    );

    if (!res.ok) {
      throw new Error(`flights-sky search failed ${res.status}`);
    }

    const json = await res.json();
    if (json.status === false) {
      throw new Error(`flights-sky reported failure: ${json.message ?? "unknown"}`);
    }

    const data = json.data ?? {};
    const items = [...(data.topFlights ?? []), ...(data.otherFlights ?? [])];

    // max_stops: 0 any, 1 nonstop, 2 max one stop, 3 max two stops. Convert to a
    // ceiling on an itinerary's own stop count so the any-stops response can be
    // filtered here rather than at the endpoint, which keeps priceHistory intact.
    const maxStopCount = input.maxStops === 0 ? Infinity : input.maxStops - 1;

    const quotes = items
      .map((it: any) => normalise(it, input.currency))
      .filter((q: FareQuote) => q.price != null)
      .filter((q: FareQuote) => q.stops <= maxStopCount)
      .sort((a: FareQuote, b: FareQuote) => a.price - b.price);

    // History lives at data.priceHistory, sibling of topFlights and otherFlights.
    const rawHistory: any[] = Array.isArray(data.priceHistory) ? data.priceHistory : [];
    console.log(`flights-sky: raw priceHistory length ${rawHistory.length}`);

    // If points are present but not a top-level array, the length above reads 0
    // with no parse warning. Show the real shape so the path can be corrected.
    if (data.priceHistory != null && !Array.isArray(data.priceHistory)) {
      console.warn(
        `flights-sky: priceHistory is ${typeof data.priceHistory}, not an array. ` +
          `data keys: ${Object.keys(data).join(",")}`
      );
    }

    const priceHistory = rawHistory
      .map(parseHistoryPoint)
      .filter((h): h is { time: number; price: number } => h !== null);

    // Loud only when the shape is not what we expect: points came back but none
    // parsed. The sample tells us the real field names without another poll.
    if (rawHistory.length && !priceHistory.length) {
      console.warn(
        `flights-sky: ${rawHistory.length} priceHistory points, none parsed. Sample: ` +
          JSON.stringify(rawHistory[0])
      );
    }

    return { quotes, priceHistory };
  },
};
