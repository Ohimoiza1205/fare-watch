// One gentle hue per category family, so a stop, its map pin, and its donut
// slice read as the same colour. Categories are grouped into a few families so a
// day shows two or three hues, not a rainbow. These are identity colours, kept
// low in saturation to stay calm. They never carry price basis (that stays in
// form) and never carry status (over budget and held keep their own colours).

const FAMILY: Record<string, string> = {
  dining: "food",
  buffet: "food",
  cafe: "cafe",
  golf: "outdoors",
  outdoors: "outdoors",
  market: "outdoors",
  museum: "culture",
  cinema: "culture",
  theatre: "culture",
  concert: "culture",
  bowling: "activities",
  arcade: "activities",
  sports: "activities",
  event: "activities",
  shopping: "shopping",
  nightlife: "nightlife",
  groceries: "errands",
  pharmacy: "errands",
  laundry: "errands",
};

// hue and saturation per family. Lightness is chosen per surface below so text
// stays readable on each.
const FAMILY_STYLE: Record<string, { h: number; s: number }> = {
  food: { h: 24, s: 60 },
  cafe: { h: 44, s: 50 },
  outdoors: { h: 152, s: 40 },
  culture: { h: 262, s: 38 },
  activities: { h: 194, s: 44 },
  shopping: { h: 330, s: 48 },
  nightlife: { h: 288, s: 40 },
  errands: { h: 218, s: 20 },
};

function styleFor(category: string): { h: number; s: number } {
  const family = FAMILY[category] ?? "errands";
  return FAMILY_STYLE[family] ?? FAMILY_STYLE.errands;
}

// A soft tint with dark same hue text, so the tag reads clearly on the canvas.
export function categoryTagStyle(category: string): {
  background: string;
  color: string;
} {
  const { h, s } = styleFor(category);
  return {
    background: `hsl(${h} ${s}% 91%)`,
    color: `hsl(${h} ${Math.min(s + 10, 72)}% 28%)`,
  };
}

// A solid mid tone for the map marker, dark enough for white numerals.
export function categoryMarkerColor(category: string): string {
  const { h, s } = styleFor(category);
  return `hsl(${h} ${s}% 42%)`;
}

// A gentle mid tone for the donut slice and its legend swatch.
export function categoryDonutColor(category: string): string {
  const { h, s } = styleFor(category);
  return `hsl(${h} ${s}% 56%)`;
}
