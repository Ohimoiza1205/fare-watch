// Shared column geometry for the plan, so every price lands in one true column
// down the whole run and the day totals align to the same right edge. The left
// rail carries the day number and its rhythm mark; the content column holds the
// header and the item lines.

export const DAY_GRID = "grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-3";

// Item and total rows share this, so a figure never drifts from the column.
export const ITEM_GRID =
  "grid grid-cols-[minmax(0,1fr)_8.5rem] items-baseline gap-x-4";
