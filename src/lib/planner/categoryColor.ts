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
// stays readable on each. The hue table lives here rather than globals.css
// because it is pictorial category identity, constant across themes, not theme
// chrome.
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

// A warm hue per category, kept in a narrow band so image tiles feel like one
// set. Hashed from the name so unmapped categories still get a tile.
function warmHue(category: string): number {
  let h = 0;
  for (const c of category) h = (h * 31 + c.charCodeAt(0)) % 360;
  return 22 + (h % 26); // 22 to 47 degrees, amber to clay
}

// The placeholder tile that sits under a venue photo: a warm gradient with a
// darker same-hue glyph, so a card is never a broken or grey box.
export function categoryPlaceholderStyle(category: string): {
  background: string;
  color: string;
} {
  const hue = warmHue(category);
  return {
    background: `linear-gradient(150deg, hsl(${hue} 46% 84%), hsl(${hue} 40% 73%))`,
    color: `hsl(${hue} 40% 38%)`,
  };
}

// A soft badge tint for a caller-chosen hue: pale fill, darker same-hue glyph.
export function hueBadgeStyle(hue: number): {
  background: string;
  color: string;
} {
  return {
    background: `hsl(${hue} 45% 92%)`,
    color: `hsl(${hue} 45% 38%)`,
  };
}
