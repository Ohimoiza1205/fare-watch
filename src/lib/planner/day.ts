import { Rhythm, WeatherSnapshot } from "./types";
import { fetchWeather } from "./weather";
import { findOneActivity } from "./activities";
import { PricedActivity } from "./activities/types";
import { rollup, Rollup } from "./budget";

// A composed day is what the interface renders: the day's real weather, its
// items, and a day total derived from those items. It is built from live
// lookups and is not yet persisted. Persistence arrives with generation.

export type ComposedItem = {
  id: number;
  category: string;
  title: string;
  venue: string | null;
  address: string | null;
  lat: number | null;
  lon: number | null;
  price: number | null; // representative party figure
  priceMax: number | null; // conservative party figure
  currency: string;
  isEstimated: boolean;
  priceSource: string | null;
  sourceUrl: string | null;
  note: string | null;
  locked: boolean;
};

export type ComposedDay = {
  // Null until the day is persisted; a saved day carries its row id so edits
  // can address it.
  id: string | null;
  dayIndex: number;
  date: string;
  rhythm: Rhythm;
  destLabel: string;
  currency: string;
  weather: WeatherSnapshot | null;
  items: ComposedItem[];
  total: Rollup;
};

function toComposedItem(a: PricedActivity): ComposedItem {
  return {
    id: 0,
    category: a.category,
    title: a.title,
    venue: a.venue,
    address: a.address,
    lat: null,
    lon: null,
    price: a.priceParty,
    priceMax: a.pricePartyMax,
    currency: a.currency,
    isEstimated: a.isEstimated,
    priceSource: a.priceSource,
    sourceUrl: a.sourceUrl,
    note: a.note,
    locked: false,
  };
}

export type BuildDayOpts = {
  lat: number;
  lon: number;
  destLabel: string;
  date: string;
  travellers: number;
  currency: string;
  dayIndex?: number;
  rhythm?: Rhythm;
  category?: string;
};

// One real day, end to end. Weather and the activity are fetched together, each
// failing softly to null so the day still renders and states plainly what it
// could not find, rather than crashing or inventing a fill in.
export async function buildOneRealDay(opts: BuildDayOpts): Promise<ComposedDay> {
  const {
    lat,
    lon,
    destLabel,
    date,
    travellers,
    currency,
    dayIndex = 0,
    rhythm = "light",
    category,
  } = opts;

  const [weather, activity] = await Promise.all([
    fetchWeather({ lat, lon, date }).catch((e) => {
      console.error("weather lookup failed", e);
      return null;
    }),
    findOneActivity({ lat, lon, destLabel, date, travellers, currency, category }).catch(
      (e) => {
        console.error("activity lookup failed", e);
        return null;
      }
    ),
  ]);

  const items = activity ? [toComposedItem(activity)] : [];
  return {
    id: null,
    dayIndex,
    date,
    rhythm,
    destLabel,
    currency,
    weather,
    items,
    total: rollup(items),
  };
}
