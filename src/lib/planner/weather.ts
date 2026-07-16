import { WeatherSnapshot } from "./types";

// Weather comes from Open-Meteo, which is free and needs no key. A date inside
// the forecast window gets a real forecast. A date beyond it gets a climate
// normal built from the same calendar day across recent years, marked as an
// estimate, because a real forecast that far out does not exist.

const FORECAST = "https://api.open-meteo.com/v1/forecast";
const ARCHIVE = "https://archive-api.open-meteo.com/v1/archive";
const FORECAST_HORIZON_DAYS = 15;

// WMO weather codes to a plain label. The standard set Open-Meteo returns.
function codeSummary(code: number | null): string {
  if (code == null) return "unknown";
  if (code === 0) return "clear";
  if (code <= 2) return "mostly clear";
  if (code === 3) return "overcast";
  if (code <= 48) return "fog";
  if (code <= 55) return "drizzle";
  if (code <= 57) return "freezing drizzle";
  if (code <= 65) return "rain";
  if (code <= 67) return "freezing rain";
  if (code <= 75) return "snow";
  if (code === 77) return "snow grains";
  if (code <= 82) return "rain showers";
  if (code <= 86) return "snow showers";
  if (code === 95) return "thunderstorm";
  if (code <= 99) return "thunderstorm with hail";
  return "unknown";
}

function daysFromToday(isoDate: string): number {
  const target = new Date(`${isoDate}T12:00:00`).getTime();
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  return Math.round((target - now.getTime()) / 86_400_000);
}

function tempUnitParam(unit: "C" | "F"): string {
  return unit === "F" ? "fahrenheit" : "celsius";
}

function windUnitParam(unit: "C" | "F"): string {
  return unit === "F" ? "mph" : "kmh";
}

type FetchOpts = { lat: number; lon: number; date: string; unit?: "C" | "F" };

async function fetchForecast(
  opts: FetchOpts,
  unit: "C" | "F"
): Promise<WeatherSnapshot | null> {
  const params = new URLSearchParams({
    latitude: String(opts.lat),
    longitude: String(opts.lon),
    daily:
      "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code,wind_speed_10m_max",
    temperature_unit: tempUnitParam(unit),
    wind_speed_unit: windUnitParam(unit),
    timezone: "auto",
    start_date: opts.date,
    end_date: opts.date,
  });

  const res = await fetch(`${FORECAST}?${params}`, { cache: "no-store" });
  if (!res.ok) return null;
  const json = await res.json();
  const d = json?.daily;
  if (!d?.time?.length) return null;

  const code = d.weather_code?.[0] ?? null;
  return {
    source: "open-meteo forecast",
    fetchedAt: new Date().toISOString(),
    tempMax: d.temperature_2m_max?.[0] ?? null,
    tempMin: d.temperature_2m_min?.[0] ?? null,
    unit,
    precipitationChance: d.precipitation_probability_max?.[0] ?? null,
    windMax: d.wind_speed_10m_max?.[0] ?? null,
    code,
    summary: codeSummary(code),
    estimated: false,
  };
}

type ArchiveDay = {
  tempMax: number | null;
  tempMin: number | null;
  wind: number | null;
  code: number | null;
  precipSum: number | null;
};

async function fetchArchiveDay(
  opts: FetchOpts,
  isoDate: string,
  unit: "C" | "F"
): Promise<ArchiveDay | null> {
  const params = new URLSearchParams({
    latitude: String(opts.lat),
    longitude: String(opts.lon),
    daily:
      "temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code,wind_speed_10m_max",
    temperature_unit: tempUnitParam(unit),
    wind_speed_unit: windUnitParam(unit),
    timezone: "auto",
    start_date: isoDate,
    end_date: isoDate,
  });
  const res = await fetch(`${ARCHIVE}?${params}`, { cache: "no-store" });
  if (!res.ok) return null;
  const json = await res.json();
  const d = json?.daily;
  if (!d?.time?.length) return null;
  return {
    tempMax: d.temperature_2m_max?.[0] ?? null,
    tempMin: d.temperature_2m_min?.[0] ?? null,
    wind: d.wind_speed_10m_max?.[0] ?? null,
    code: d.weather_code?.[0] ?? null,
    precipSum: d.precipitation_sum?.[0] ?? null,
  };
}

function mean(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v != null);
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

// A climate normal for the target calendar day, averaged across the three most
// recent complete years. Precipitation chance is the share of those years that
// saw any rain on the day. This is real historical data used as a marked
// estimate, never dressed up as a forecast.
async function fetchClimateEstimate(
  opts: FetchOpts,
  unit: "C" | "F"
): Promise<WeatherSnapshot | null> {
  const [, mm, dd] = opts.date.split("-");
  const base = new Date().getFullYear();
  const years = [base - 1, base - 2, base - 3];
  const samples = (
    await Promise.all(
      years.map((y) => fetchArchiveDay(opts, `${y}-${mm}-${dd}`, unit))
    )
  ).filter((s): s is ArchiveDay => s != null);

  if (!samples.length) return null;

  const wetDays = samples.filter((s) => (s.precipSum ?? 0) > 0).length;
  const code = samples[0].code;
  return {
    source: "open-meteo climate normal, three year",
    fetchedAt: new Date().toISOString(),
    tempMax: mean(samples.map((s) => s.tempMax)),
    tempMin: mean(samples.map((s) => s.tempMin)),
    unit,
    precipitationChance: Math.round((wetDays / samples.length) * 100),
    windMax: mean(samples.map((s) => s.wind)),
    code,
    summary: `${codeSummary(code)}, typical`,
    estimated: true,
  };
}

export async function fetchWeather(opts: FetchOpts): Promise<WeatherSnapshot | null> {
  const unit = opts.unit ?? "F";
  const offset = daysFromToday(opts.date);
  if (offset >= 0 && offset <= FORECAST_HORIZON_DAYS) {
    const forecast = await fetchForecast(opts, unit);
    if (forecast) return forecast;
  }
  return fetchClimateEstimate(opts, unit);
}

// A whole trip's weather in a handful of calls rather than one per day. Days
// inside the forecast window come from a single forecast request covering their
// range; days beyond it come from three archive requests, one per recent year,
// averaged per calendar day into a marked climate normal. At most four calls for
// any trip length, to stay light on a free service.
export async function fetchWeatherRange(opts: {
  lat: number;
  lon: number;
  dates: string[];
  unit?: "C" | "F";
}): Promise<Map<string, WeatherSnapshot>> {
  const unit = opts.unit ?? "F";
  const out = new Map<string, WeatherSnapshot>();
  if (!opts.dates.length) return out;

  const near = opts.dates.filter((d) => {
    const o = daysFromToday(d);
    return o >= 0 && o <= FORECAST_HORIZON_DAYS;
  });
  const far = opts.dates.filter((d) => !near.includes(d));

  const tasks: Promise<void>[] = [];

  if (near.length) {
    tasks.push(
      fetchForecastRange({ lat: opts.lat, lon: opts.lon }, near, unit).then((m) => {
        for (const [k, v] of m) out.set(k, v);
      })
    );
  }
  if (far.length) {
    tasks.push(
      fetchClimateRange({ lat: opts.lat, lon: opts.lon }, far, unit).then((m) => {
        for (const [k, v] of m) out.set(k, v);
      })
    );
  }

  await Promise.all(tasks);
  return out;
}

function toForecast(d: DailyBlock, i: number, unit: "C" | "F"): WeatherSnapshot {
  const code = d.weather_code?.[i] ?? null;
  return {
    source: "open-meteo forecast",
    fetchedAt: new Date().toISOString(),
    tempMax: d.temperature_2m_max?.[i] ?? null,
    tempMin: d.temperature_2m_min?.[i] ?? null,
    unit,
    precipitationChance: d.precipitation_probability_max?.[i] ?? null,
    windMax: d.wind_speed_10m_max?.[i] ?? null,
    code,
    summary: codeSummary(code),
    estimated: false,
  };
}

type DailyBlock = {
  time?: string[];
  temperature_2m_max?: number[];
  temperature_2m_min?: number[];
  precipitation_probability_max?: number[];
  precipitation_sum?: number[];
  weather_code?: number[];
  wind_speed_10m_max?: number[];
};

async function fetchForecastRange(
  loc: { lat: number; lon: number },
  dates: string[],
  unit: "C" | "F"
): Promise<Map<string, WeatherSnapshot>> {
  const out = new Map<string, WeatherSnapshot>();
  const sorted = [...dates].sort();
  const params = new URLSearchParams({
    latitude: String(loc.lat),
    longitude: String(loc.lon),
    daily:
      "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code,wind_speed_10m_max",
    temperature_unit: tempUnitParam(unit),
    wind_speed_unit: windUnitParam(unit),
    timezone: "auto",
    start_date: sorted[0],
    end_date: sorted[sorted.length - 1],
  });

  const res = await fetch(`${FORECAST}?${params}`, { cache: "no-store" });
  if (!res.ok) return out;
  const json = await res.json();
  const d: DailyBlock = json?.daily ?? {};
  const times = d.time ?? [];
  const wanted = new Set(dates);
  times.forEach((t, i) => {
    if (wanted.has(t)) out.set(t, toForecast(d, i, unit));
  });
  return out;
}

async function fetchClimateRange(
  loc: { lat: number; lon: number },
  dates: string[],
  unit: "C" | "F"
): Promise<Map<string, WeatherSnapshot>> {
  const out = new Map<string, WeatherSnapshot>();
  const sorted = [...dates].sort();
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const base = new Date().getFullYear();
  const years = [base - 1, base - 2, base - 3];

  // Accumulate each calendar day (month-day) across the sampled years.
  const acc = new Map<
    string,
    { maxes: number[]; mins: number[]; winds: number[]; codes: number[]; wet: number; total: number }
  >();
  for (const d of dates) acc.set(d.slice(5), { maxes: [], mins: [], winds: [], codes: [], wet: 0, total: 0 });

  const blocks = await Promise.all(
    years.map((y) =>
      fetchArchiveBlock(loc, shiftYear(first, y), shiftYear(last, y), unit)
    )
  );

  for (const block of blocks) {
    const times = block?.time ?? [];
    times.forEach((t, i) => {
      const md = t.slice(5);
      const a = acc.get(md);
      if (!a) return;
      const mx = block!.temperature_2m_max?.[i];
      const mn = block!.temperature_2m_min?.[i];
      const wd = block!.wind_speed_10m_max?.[i];
      const cd = block!.weather_code?.[i];
      const ps = block!.precipitation_sum?.[i];
      if (mx != null) a.maxes.push(mx);
      if (mn != null) a.mins.push(mn);
      if (wd != null) a.winds.push(wd);
      if (cd != null) a.codes.push(cd);
      if (ps != null) {
        a.total += 1;
        if (ps > 0) a.wet += 1;
      }
    });
  }

  for (const date of dates) {
    const a = acc.get(date.slice(5));
    if (!a || (!a.maxes.length && !a.mins.length)) continue;
    const code = a.codes[0] ?? null;
    out.set(date, {
      source: "open-meteo climate normal, three year",
      fetchedAt: new Date().toISOString(),
      tempMax: mean(a.maxes),
      tempMin: mean(a.mins),
      unit,
      precipitationChance: a.total ? Math.round((a.wet / a.total) * 100) : null,
      windMax: mean(a.winds),
      code,
      summary: `${codeSummary(code)}, typical`,
      estimated: true,
    });
  }
  return out;
}

function shiftYear(iso: string, year: number): string {
  return `${year}-${iso.slice(5)}`;
}

async function fetchArchiveBlock(
  loc: { lat: number; lon: number },
  startIso: string,
  endIso: string,
  unit: "C" | "F"
): Promise<DailyBlock | null> {
  const params = new URLSearchParams({
    latitude: String(loc.lat),
    longitude: String(loc.lon),
    daily:
      "temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code,wind_speed_10m_max",
    temperature_unit: tempUnitParam(unit),
    wind_speed_unit: windUnitParam(unit),
    timezone: "auto",
    start_date: startIso,
    end_date: endIso,
  });
  const res = await fetch(`${ARCHIVE}?${params}`, { cache: "no-store" });
  if (!res.ok) return null;
  const json = await res.json();
  return (json?.daily ?? null) as DailyBlock | null;
}

// Exposed for the arranging intelligence: a wet or stormy day should not carry
// an outdoor plan. Used from Slice 4 onward.
export function isWetWeather(w: WeatherSnapshot | null): boolean {
  if (!w) return false;
  if ((w.precipitationChance ?? 0) >= 50) return true;
  const code = w.code ?? 0;
  return code >= 51; // drizzle and worse in the WMO scale
}
