// Resolve a destination name to real coordinates and a country, through
// Open-Meteo's geocoding, which is free and keyless. Cached for a week because
// a place does not move. Returns null when nothing matches, so generation can
// tell the traveller plainly rather than guessing a location.

export type GeoResult = {
  lat: number;
  lon: number;
  label: string;
  countryCode: string | null;
};

const GEOCODE = "https://geocoding-api.open-meteo.com/v1/search";

type GeocodeRow = {
  latitude: number;
  longitude: number;
  name: string;
  admin1?: string;
  country?: string;
  country_code?: string;
};

export async function geocode(name: string): Promise<GeoResult | null> {
  const query = name.trim();
  if (!query) return null;

  const params = new URLSearchParams({
    name: query,
    count: "1",
    language: "en",
    format: "json",
  });

  const res = await fetch(`${GEOCODE}?${params}`, {
    next: { revalidate: 604800 },
  });
  if (!res.ok) return null;

  const json = (await res.json()) as { results?: GeocodeRow[] };
  const row = json?.results?.[0];
  if (!row) return null;

  const label = [row.name, row.admin1, row.country].filter(Boolean).join(", ");
  return {
    lat: row.latitude,
    lon: row.longitude,
    label,
    countryCode: row.country_code ?? null,
  };
}
