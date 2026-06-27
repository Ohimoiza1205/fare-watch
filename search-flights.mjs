// search-flights.mjs
//
// Working flight search against the proven endpoint:
//   flights-sky.p.rapidapi.com  /google/flights/search-roundtrip
//
// This is the reference implementation the app's data layer is built from.
// It resolves airports, runs one round-trip search, prints the cheapest
// itineraries, and shows the built-in price history the API returns.
//
// Run (Git Bash):
//   RAPIDAPI_KEY=your_key node search-flights.mjs
//
// Node 20+ (built-in fetch, no dependencies).
//
// Quota note: free plan is 50 requests/month. This script uses 1 request per
// run (the Google endpoint returns results directly, no airport lookup needed
// when you pass IATA codes, no polling). Run sparingly.

const HOST = "flights-sky.p.rapidapi.com";
const KEY = process.env.RAPIDAPI_KEY;

// Edit these to test any route. departureId / arrivalId are plain IATA codes.
const TRIP = {
  departureId: "JFK",
  arrivalId: "LOS",
  departureDate: "2027-05-05", // yyyy-mm-dd
  arrivalDate: "2027-05-19",   // the return date
  cabinClass: "1",             // 1 economy, 2 premium economy, 3 business, 4 first
  adults: "1",
  currency: "GBP",
  sort: "2",                   // 1 top, 2 price, 3 departure, 4 arrival, 5 duration, 6 emissions
  stops: "0",                  // 0 any, 1 nonstop, 2 max1, 3 max2
};

function requireKey() {
  if (!KEY) {
    console.error("Missing RAPIDAPI_KEY. Run again like this:");
    console.error("  RAPIDAPI_KEY=your_key node search-flights.mjs");
    process.exit(1);
  }
}

function explain(httpStatus, body) {
  if (httpStatus === 401 || httpStatus === 403) {
    return "Key rejected or not subscribed to Flights Scraper Sky.";
  }
  if (httpStatus === 429) {
    return "Quota hit (429). Free plan is 50 requests/month.";
  }
  return `Unexpected HTTP ${httpStatus}. Raw: ${String(body).slice(0, 300)}`;
}

async function get(path) {
  const res = await fetch(`https://${HOST}${path}`, {
    headers: { "x-rapidapi-key": KEY, "x-rapidapi-host": HOST },
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(explain(res.status, text));
    process.exit(1);
  }
  try {
    return JSON.parse(text);
  } catch {
    console.error("Response was not JSON:\n" + text.slice(0, 300));
    process.exit(1);
  }
}

function fmtMoney(n, ccy) {
  if (n == null) return "?";
  return `${ccy} ${Number(n).toLocaleString("en-GB")}`;
}

// Normalise one itinerary from topFlights or otherFlights into a flat row.
function normalise(it, ccy) {
  return {
    price: it.price ?? null,
    currency: ccy,
    carriers: it.airlineNames ?? (it.airlineCode ? [it.airlineCode] : []),
    stops: it.stops ?? null,
    departAirport: it.departureAirportCode,
    arriveAirport: it.arrivalAirportCode,
    departDate: it.departureDate,
    arriveDate: it.arrivalDate,
    durationMin: it.duration ?? null,
    token: it.returningToken ?? null, // needed later to fetch the return leg + booking
  };
}

async function main() {
  requireKey();

  const params = new URLSearchParams({
    departureId: TRIP.departureId,
    arrivalId: TRIP.arrivalId,
    departureDate: TRIP.departureDate,
    arrivalDate: TRIP.arrivalDate,
    cabinClass: TRIP.cabinClass,
    adults: TRIP.adults,
    currency: TRIP.currency,
    sort: TRIP.sort,
    stops: TRIP.stops,
  });

  console.log(`Searching ${TRIP.departureId} to ${TRIP.arrivalId}, ${TRIP.departureDate} / ${TRIP.arrivalDate}\n`);
  const json = await get(`/google/flights/search-roundtrip?${params}`);

  if (json.status === false) {
    console.error("API reported failure:", json.message ?? "unknown");
    process.exit(1);
  }

  const data = json.data ?? {};
  const top = data.topFlights ?? [];
  const other = data.otherFlights ?? [];
  const all = [...top, ...other]
    .map((it) => normalise(it, TRIP.currency))
    .filter((r) => r.price != null)
    .sort((a, b) => a.price - b.price);

  if (!all.length) {
    console.log("Search completed but returned zero priced itineraries for this route and dates.");
    console.log("For a thin route, widen dates or route through a hub. Keys returned:", Object.keys(data));
    return;
  }

  console.log(`Found ${all.length} itineraries. Cheapest:\n`);
  for (const r of all.slice(0, 10)) {
    const dur = r.durationMin != null ? `${Math.floor(r.durationMin / 60)}h${String(r.durationMin % 60).padStart(2, "0")}` : "";
    console.log(
      `${fmtMoney(r.price, r.currency).padEnd(12)}  ${(r.carriers.join(" ") || "?").padEnd(30)}  ${r.stops != null ? r.stops + " stop" : ""}  ${dur}`
    );
  }

  // The API hands us a built-in price history for the route. Show its range.
  const hist = data.priceHistory ?? [];
  if (hist.length) {
    const prices = hist.map((h) => h.price).filter((p) => p != null);
    const lo = Math.min(...prices);
    const hi = Math.max(...prices);
    console.log(`\nBuilt-in price history: ${hist.length} points, range ${fmtMoney(lo, TRIP.currency)} to ${fmtMoney(hi, TRIP.currency)}`);
  }

  console.log("\n---");
  console.log(`Cheapest right now: ${fmtMoney(all[0].price, TRIP.currency)} on ${all[0].carriers.join(" ")}`);
  console.log("Pipeline confirmed. This endpoint and shape are what the app is built on.");
}

main();
