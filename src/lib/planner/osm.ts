// Shared OpenStreetMap access through the Overpass API, free and keyless. One
// place for the request and the small amount of parsing, so the discovery pass
// and the single venue lookup cannot drift apart.

export const OVERPASS = "https://overpass-api.de/api/interpreter";

export type OverpassTags = Record<string, string | undefined>;
export type OverpassElement = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: OverpassTags;
};
type OverpassResponse = { elements?: OverpassElement[] };

export async function overpassQuery(query: string): Promise<OverpassElement[]> {
  const res = await fetch(OVERPASS, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "FareWatch/1.0 (personal trip planner)",
    },
    body: `data=${encodeURIComponent(query)}`,
    cache: "no-store",
  });
  if (!res.ok) return [];
  const json = (await res.json()) as OverpassResponse;
  return json?.elements ?? [];
}

export function elementCoords(
  el: OverpassElement
): { lat: number; lon: number } | null {
  if (el.lat != null && el.lon != null) return { lat: el.lat, lon: el.lon };
  if (el.center?.lat != null && el.center?.lon != null) return el.center;
  return null;
}

export function elementAddress(tags: OverpassTags | undefined): string | null {
  if (!tags) return null;
  const line = [tags["addr:housenumber"], tags["addr:street"]]
    .filter(Boolean)
    .join(" ");
  const parts = [line, tags["addr:city"], tags["addr:postcode"]].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

// Proportional to distance, enough to rank nearest first.
export function haversine(
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * Math.asin(Math.sqrt(s));
}

// A union selector fragment for one tag=value, both nodes and ways.
export function overpassSelector(
  tag: string,
  lat: number,
  lon: number,
  radiusM: number
): string {
  const [k, v] = tag.split("=");
  return (
    `node[${k}=${v}](around:${radiusM},${lat},${lon});` +
    `way[${k}=${v}](around:${radiusM},${lat},${lon});`
  );
}
