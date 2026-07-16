// The activity lookup layer mirrors the provider-agnostic fare layer. Every
// source conforms to one interface, so a source that dies or rate limits is
// swapped in one file. A provider returns a real, self-consistent activity or
// null. It never returns an invented venue and never returns a confirmed price
// it did not actually read.

export type PricedActivity = {
  category: string;
  title: string; // short label, e.g. 'Cinema' or the event name
  venue: string | null; // the real named place
  address: string | null;
  priceParty: number | null; // representative price for the whole party
  pricePartyMax: number | null; // conservative price for the whole party
  currency: string;
  isEstimated: boolean; // false only when a real figure was read
  priceSource: string | null; // where the figure came from, load bearing
  sourceUrl: string | null; // link to the real source or booking
  note: string | null; // plain reason when a price is estimated
};

export type ActivityQuery = {
  lat: number;
  lon: number;
  destLabel: string;
  date: string; // yyyy-mm-dd
  travellers: number;
  currency: string;
  category?: string; // a preferred category, when the arranger has one in mind
};

export interface ActivityProvider {
  name: string;
  find(q: ActivityQuery): Promise<PricedActivity | null>;
}
