import { ActivityProvider, ActivityQuery, PricedActivity } from "./types";
import {
  overpassQuery,
  elementCoords,
  elementAddress,
  overpassSelector,
  haversine,
} from "../osm";
import { categoryById, estimateParty } from "../categories";

// A real named venue near the destination for a single category, with a clearly
// marked estimate for its price. The venue is real, from OpenStreetMap. The
// number is an honest, labelled baseline for the party, never shown as
// confirmed. Used for one-off lookups and swaps; generation discovers venues in
// one batched pass instead.

const RADIUS_M = 20_000;
const DEFAULT_CATEGORY = "cinema";

export const osmVenue: ActivityProvider = {
  name: "osm",
  async find(q: ActivityQuery): Promise<PricedActivity | null> {
    const categoryId = q.category ?? DEFAULT_CATEGORY;
    const category = categoryById(categoryId) ?? categoryById(DEFAULT_CATEGORY);
    if (!category) return null;

    const selectors = category.osm
      .map((tag) => overpassSelector(tag, q.lat, q.lon, RADIUS_M))
      .join("");
    const query = `[out:json][timeout:25];(${selectors});out center 40;`;

    const elements = await overpassQuery(query);
    const nearest = elements
      .filter((el) => el.tags?.name)
      .map((el) => ({ el, coords: elementCoords(el) }))
      .filter(
        (x): x is { el: (typeof elements)[number]; coords: { lat: number; lon: number } } =>
          x.coords != null
      )
      .sort(
        (a, b) =>
          haversine(q.lat, q.lon, a.coords.lat, a.coords.lon) -
          haversine(q.lat, q.lon, b.coords.lat, b.coords.lon)
      )[0];

    if (!nearest) return null;

    const { price, priceMax } = estimateParty(category.id, q.travellers);
    return {
      category: category.id,
      title: category.label,
      venue: nearest.el.tags?.name ?? null,
      address: elementAddress(nearest.el.tags),
      priceParty: price,
      pricePartyMax: priceMax,
      currency: q.currency,
      isEstimated: true,
      priceSource: "estimate",
      sourceUrl: `https://www.openstreetmap.org/${nearest.el.type}/${nearest.el.id}`,
      note: "Estimated. No published price found, typical local range for the party.",
    };
  },
};
