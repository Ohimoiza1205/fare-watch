import {
  overpassQuery,
  elementCoords,
  elementAddress,
  overpassSelector,
} from "./osm";
import { allOsmSelectors, categoryForTags } from "./categories";

// The destination-adaptive step. One batched Overpass query unions every
// selector in the catalog around the destination, and the results are bucketed
// by category. A category is only offered if the place actually has a named
// venue for it, so the curated backbone becomes the real menu of this place.
// One network call, capped, to stay light on a shared free service.

export type Venue = {
  name: string;
  address: string | null;
  lat: number;
  lon: number;
  osmType: string;
  osmId: number;
  category: string;
};

export type VenueMap = Map<string, Venue[]>;

const RADIUS_M = 25_000;
const MAX_ELEMENTS = 400;
const MAX_PER_CATEGORY = 12;

export async function discoverVenues(
  lat: number,
  lon: number,
  radiusM = RADIUS_M
): Promise<VenueMap> {
  const selectors = allOsmSelectors()
    .map((tag) => overpassSelector(tag, lat, lon, radiusM))
    .join("");
  const query = `[out:json][timeout:60];(${selectors});out center ${MAX_ELEMENTS};`;

  const elements = await overpassQuery(query);
  const map: VenueMap = new Map();
  const seenNames = new Map<string, Set<string>>();

  for (const el of elements) {
    const name = el.tags?.name;
    if (!name) continue;
    const category = categoryForTags(el.tags);
    if (!category) continue;
    const coords = elementCoords(el);
    if (!coords) continue;

    const list = map.get(category) ?? [];
    if (list.length >= MAX_PER_CATEGORY) continue;

    const seen = seenNames.get(category) ?? new Set<string>();
    if (seen.has(name)) continue; // one entry per named place
    seen.add(name);
    seenNames.set(category, seen);

    list.push({
      name,
      address: elementAddress(el.tags),
      lat: coords.lat,
      lon: coords.lon,
      osmType: el.type,
      osmId: el.id,
      category,
    });
    map.set(category, list);
  }

  return map;
}
