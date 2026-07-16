import {
  overpassQuery,
  overpassSelector,
  elementCoords,
  elementAddress,
  haversine,
} from "./osm";
import { categoryById, estimateParty } from "./categories";

// Real alternatives for an activity, in the same category, from the same live
// venue lookups the rest of the app uses. Every option is a real named place
// with a real or clearly estimated price. Nothing here is invented, so a swap
// can only ever replace an item with real data.

export type AlternativeOption = {
  category: string;
  title: string;
  venue: string;
  address: string | null;
  lat: number | null;
  lon: number | null;
  price: number | null;
  priceMax: number | null;
  currency: string;
  isEstimated: boolean;
  priceSource: string | null;
  sourceUrl: string | null;
  note: string | null;
};

const RADIUS_M = 20_000;
const MAX_OPTIONS = 8;

export async function findAlternatives(opts: {
  lat: number;
  lon: number;
  category: string;
  travellers: number;
  currency: string;
  excludeVenue?: string | null;
}): Promise<AlternativeOption[]> {
  const category = categoryById(opts.category);
  if (!category) return [];

  const selectors = category.osm
    .map((tag) => overpassSelector(tag, opts.lat, opts.lon, RADIUS_M))
    .join("");
  const query = `[out:json][timeout:25];(${selectors});out center 60;`;

  const elements = await overpassQuery(query);
  const { price, priceMax } = estimateParty(category.id, opts.travellers);

  const seen = new Set<string>();
  const options: AlternativeOption[] = [];

  const ranked = elements
    .filter((el) => el.tags?.name)
    .map((el) => ({ el, coords: elementCoords(el) }))
    .filter(
      (x): x is { el: (typeof elements)[number]; coords: { lat: number; lon: number } } =>
        x.coords != null
    )
    .sort(
      (a, b) =>
        haversine(opts.lat, opts.lon, a.coords.lat, a.coords.lon) -
        haversine(opts.lat, opts.lon, b.coords.lat, b.coords.lon)
    );

  for (const { el, coords } of ranked) {
    const name = el.tags?.name;
    if (!name || seen.has(name)) continue;
    if (opts.excludeVenue && name === opts.excludeVenue) continue;
    seen.add(name);

    options.push({
      category: category.id,
      title: category.label,
      venue: name,
      address: elementAddress(el.tags),
      lat: coords.lat,
      lon: coords.lon,
      price,
      priceMax,
      currency: opts.currency,
      isEstimated: true,
      priceSource: "estimate",
      sourceUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
      note: "Estimated. Typical local range for the party.",
    });

    if (options.length >= MAX_OPTIONS) break;
  }

  return options;
}
