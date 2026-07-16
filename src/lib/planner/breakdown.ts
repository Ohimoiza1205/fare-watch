import { categoryDonutColor } from "./categoryColor";

// Where the money goes, summed by category from the real item figures. The donut
// and the breakdown panel both read this, so their amounts, percents, and
// colours always agree. Representative figures only, so a missing price counts
// as nothing rather than distorting the split.

export type BreakdownItem = {
  category: string;
  price: number | null;
  priceMax: number | null;
};

export type BreakdownRow = {
  category: string;
  amount: number;
  fraction: number;
  offset: number; // cumulative fraction before this row, for the donut arcs
  color: string;
};

export function categoryBreakdown(items: BreakdownItem[]): {
  rows: BreakdownRow[];
  total: number;
} {
  const byCat = new Map<string, number>();
  for (const it of items) {
    const rep = it.price ?? it.priceMax ?? 0;
    if (rep <= 0) continue;
    byCat.set(it.category, (byCat.get(it.category) ?? 0) + rep);
  }

  const entries = [...byCat.entries()].sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  const fractions = entries.map(([, amount]) => (total ? amount / total : 0));

  const rows = entries.map(([category, amount], i) => ({
    category,
    amount,
    fraction: fractions[i],
    offset: fractions.slice(0, i).reduce((s, f) => s + f, 0),
    color: categoryDonutColor(category),
  }));

  return { rows, total };
}
