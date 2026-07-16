import type { TasteTag } from "./intake";

// The curated master set of what a trip can hold. It is a backbone, not a menu:
// generation surfaces only the categories a destination actually offers, found
// through the real venue lookups. Each category knows how to be discovered
// (OpenStreetMap tags), how to be estimated when no real price is found (a
// per person baseline, used only for marked estimates), whether it belongs
// outdoors (so weather can sequence it), and which tastes lean toward it.

export type CategoryKind = "anchor" | "meal" | "basic";

export type Category = {
  id: string;
  label: string;
  kind: CategoryKind;
  indoor: boolean; // false means weather sensitive
  osm: string[]; // OpenStreetMap tag=value selectors that find the venue
  baseline: [number, number]; // per person, low to high, estimates only
  taste: TasteTag[]; // tastes that lean toward this category
};

export const CATEGORIES: Category[] = [
  // anchors, the fun a day is built around
  { id: "cinema", label: "Cinema", kind: "anchor", indoor: true, osm: ["amenity=cinema"], baseline: [10, 16], taste: ["culture"] },
  { id: "bowling", label: "Bowling", kind: "anchor", indoor: true, osm: ["leisure=bowling_alley"], baseline: [9, 18], taste: [] },
  { id: "golf", label: "Golf", kind: "anchor", indoor: false, osm: ["leisure=golf_course"], baseline: [30, 70], taste: ["outdoors", "treat"] },
  { id: "arcade", label: "Arcade", kind: "anchor", indoor: true, osm: ["leisure=amusement_arcade"], baseline: [15, 30], taste: ["nightlife"] },
  { id: "museum", label: "Museum", kind: "anchor", indoor: true, osm: ["tourism=museum", "tourism=gallery"], baseline: [8, 20], taste: ["culture"] },
  { id: "outdoors", label: "Parks and outdoors", kind: "anchor", indoor: false, osm: ["leisure=park", "tourism=viewpoint", "leisure=nature_reserve"], baseline: [0, 10], taste: ["outdoors", "cheap"] },
  { id: "shopping", label: "Shopping", kind: "anchor", indoor: true, osm: ["shop=mall", "shop=department_store"], baseline: [30, 90], taste: ["treat"] },
  { id: "market", label: "Market", kind: "anchor", indoor: false, osm: ["amenity=marketplace"], baseline: [10, 30], taste: ["foodie", "culture", "cheap"] },
  { id: "nightlife", label: "Nightlife", kind: "anchor", indoor: true, osm: ["amenity=nightclub", "amenity=bar", "amenity=pub"], baseline: [20, 50], taste: ["nightlife", "treat"] },

  // meals, the texture of eating somewhere for a while
  { id: "dining", label: "Dining", kind: "meal", indoor: true, osm: ["amenity=restaurant"], baseline: [22, 48], taste: ["foodie", "treat"] },
  { id: "cafe", label: "Cafe", kind: "meal", indoor: true, osm: ["amenity=cafe"], baseline: [6, 14], taste: ["foodie", "cheap"] },

  // basics, the practical errands of a real trip
  { id: "groceries", label: "Groceries", kind: "basic", indoor: true, osm: ["shop=supermarket"], baseline: [25, 60], taste: [] },
  { id: "pharmacy", label: "Pharmacy", kind: "basic", indoor: true, osm: ["amenity=pharmacy"], baseline: [8, 20], taste: [] },
  { id: "laundry", label: "Laundry", kind: "basic", indoor: true, osm: ["shop=laundry"], baseline: [6, 14], taste: [] },
];

const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

// Reverse index from an OpenStreetMap tag=value to the category it belongs to,
// so a discovered element can be bucketed. First declaration wins on overlap.
const BY_TAG = new Map<string, string>();
for (const c of CATEGORIES) {
  for (const t of c.osm) if (!BY_TAG.has(t)) BY_TAG.set(t, c.id);
}

export function categoryById(id: string): Category | undefined {
  return BY_ID.get(id);
}

export function categoryIndoor(id: string): boolean {
  return BY_ID.get(id)?.indoor ?? true;
}

export function anchorCategoryIds(): string[] {
  return CATEGORIES.filter((c) => c.kind === "anchor").map((c) => c.id);
}

// Every unique OpenStreetMap selector across the catalog, for one batched
// discovery query rather than one call per category.
export function allOsmSelectors(): string[] {
  return [...BY_TAG.keys()];
}

// Match a discovered element's tags to a category. Returns the first catalog
// category whose selector the element satisfies.
export function categoryForTags(
  tags: Record<string, string | undefined> | undefined
): string | undefined {
  if (!tags) return undefined;
  for (const [key, value] of Object.entries(tags)) {
    if (value == null) continue;
    const hit = BY_TAG.get(`${key}=${value}`);
    if (hit) return hit;
  }
  return undefined;
}

// The party price for an estimate: the middle of the baseline range as the
// representative figure, the top of it as the conservative ceiling. Real prices
// never come through here.
export function estimateParty(
  id: string,
  travellers: number
): { price: number; priceMax: number } {
  const c = BY_ID.get(id);
  const [lo, hi] = c?.baseline ?? [15, 35];
  const partyLo = lo * travellers;
  const partyHi = hi * travellers;
  return { price: Math.round((partyLo + partyHi) / 2), priceMax: partyHi };
}

function midBaseline(c: Category): number {
  return (c.baseline[0] + c.baseline[1]) / 2;
}

// How strongly a taste leans toward a category. A base of one, plus one for each
// matching taste, with cheap and treat nudging by price so a budget trip favours
// the low cost fun and a treat trip the higher end. Used to weight, never to
// invent.
export function categoryScore(id: string, taste: TasteTag[]): number {
  const c = BY_ID.get(id);
  if (!c) return 0;
  let score = 1;
  for (const t of c.taste) if (taste.includes(t)) score += 1;
  const mid = midBaseline(c);
  if (taste.includes("cheap")) score += mid <= 15 ? 1 : mid >= 35 ? -1 : 0;
  if (taste.includes("treat")) score += mid >= 35 ? 1 : mid <= 10 ? -1 : 0;
  return score;
}
