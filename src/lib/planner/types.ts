// The planner data model in code, mirroring planner-schema.sql. Row types match
// the tables one to one. The budget is not a table and not a row type: it is
// derived by summing items, so it lives with the budget maths, not here.

export type Pace = "relaxed" | "balanced" | "packed";
export type Rhythm = "rest" | "light" | "full";
export type TripStatus = "draft" | "generated";

// The forecast snapshot stored on a day. Every field comes from a real weather
// lookup. source and fetched_at record where and when, so a stale snapshot is
// visible rather than silent.
export type WeatherSnapshot = {
  source: string; // e.g. 'open-meteo forecast'
  fetchedAt: string; // ISO timestamp
  tempMin: number | null; // in the trip's stored unit
  tempMax: number | null;
  unit: "C" | "F";
  precipitationChance: number | null; // percent, 0 to 100
  windMax: number | null; // same unit family as the source
  code: number | null; // WMO weather code
  summary: string; // plain label, e.g. 'light rain'
  // The same honesty the prices carry, applied to weather: false is a real
  // forecast, true is a climate normal used because the date is beyond the
  // forecast window. The interface marks an estimated forecast so it is never
  // mistaken for a real one.
  estimated: boolean;
};

export type TripRow = {
  id: string;
  user_id: string;
  watch_id: string | null;
  origin: string;
  destination: string;
  dest_label: string | null;
  dest_lat: number | null;
  dest_lon: number | null;
  start_date: string | null;
  end_date: string | null;
  length_days: number | null;
  rough_month: string | null;
  travellers: number;
  budget_ceiling: number | null;
  currency: string;
  pace: Pace;
  taste: string[];
  status: TripStatus;
  created_at: string;
};

export type DayRow = {
  id: string;
  trip_id: string;
  day_index: number;
  day_date: string;
  rhythm: Rhythm;
  weather: WeatherSnapshot | null;
  locked: boolean;
  notes: string | null;
  created_at: string;
};

export type ItemRow = {
  id: number;
  day_id: string;
  category: string;
  title: string;
  venue: string | null;
  address: string | null;
  price: number | null;
  price_max: number | null;
  currency: string;
  lat: number | null;
  lon: number | null;
  // The two load bearing flags. is_estimated false means a real looked up
  // figure and, by the confirmed_is_sourced constraint, a non null price and
  // price_source. true means a marked estimate the interface draws differently.
  is_estimated: boolean;
  price_source: string | null;
  source_url: string | null;
  locked: boolean;
  position: number;
  notes: string | null;
  created_at: string;
};

// Insert shapes: the columns a writer must or may set, with database defaults
// omitted. Kept alongside the row types so a single source defines the model.
export type TripInsert = Omit<TripRow, "id" | "created_at" | "status"> & {
  status?: TripStatus;
};

export type DayInsert = Omit<DayRow, "id" | "created_at" | "weather" | "locked"> & {
  weather?: WeatherSnapshot | null;
  locked?: boolean;
};

export type ItemInsert = Omit<
  ItemRow,
  "id" | "created_at" | "currency" | "is_estimated" | "locked" | "position"
> & {
  currency?: string;
  is_estimated: boolean;
  locked?: boolean;
  position?: number;
};
