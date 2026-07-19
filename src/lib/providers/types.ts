export type WatchInput = {
  origin: string;        // IATA, e.g. "LHR"
  destination: string;   // IATA, e.g. "LBB"
  departDate: string;    // ISO yyyy-mm-dd
  returnDate: string;    // ISO yyyy-mm-dd
  adults: number;
  cabin: "1" | "2" | "3" | "4"; // 1 economy, 2 prem econ, 3 business, 4 first
  maxStops: number;      // 0 any, 1 nonstop, 2 max1, 3 max2
  currency: string;
};

export type FareQuote = {
  provider: string;
  price: number;
  currency: string;
  departDate: string;
  returnDate?: string;
  stops: number;
  carriers: string[];
  deepLink: string;       // built from the returningToken, or a search URL
  token?: string;         // returningToken, needed to fetch the return leg + booking
  // True when the itinerary is separately ticketed (self transfer, virtual
  // interline). The current flights-sky endpoint does not state this, so it
  // stays unset there; a provider that knows must say so, because a cheap
  // fare hiding this caveat is invented savings.
  virtualInterline?: boolean;
};

// The API hands back a short price history per route. Surface it so the app
// can seed its trend view immediately rather than waiting for its own history.
export type ProviderResult = {
  quotes: FareQuote[];
  priceHistory: { time: number; price: number }[];
};

export interface FareProvider {
  name: string;
  search(input: WatchInput): Promise<ProviderResult>;
}
