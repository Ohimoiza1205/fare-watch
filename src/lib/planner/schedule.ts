import { categoryById } from "./categories";

// Presentation only. The arranger sets the order of a day; this reads that order
// as a rough time of day so a day looks like a schedule. It invents no data, it
// only labels the sequence the arranger already produced.

export function scheduleTime(index: number, count: number): string {
  const startMin = 9.5 * 60;
  const endMin = 20 * 60;
  const t = count <= 1 ? 0.3 : index / (count - 1);
  const mins = Math.round(startMin + (endMin - startMin) * t);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// One or two small tags for a category, from the catalog. Kind first, then
// indoor or outdoors. Events are not in the catalog, so they read as live.
export function categoryTags(category: string): string[] {
  const c = categoryById(category);
  if (!c) return ["live"];
  const kind =
    c.kind === "meal" ? "meal" : c.kind === "basic" ? "errand" : "activity";
  return [kind, c.indoor ? "indoor" : "outdoors"];
}
