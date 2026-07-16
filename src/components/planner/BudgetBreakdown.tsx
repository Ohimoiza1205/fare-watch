"use client";

import { useMemo, useState } from "react";
import { PriceRoll } from "@/components/PriceRoll";
import { categoryBreakdown, type BreakdownItem } from "@/lib/planner/breakdown";
import { categoryById } from "@/lib/planner/categories";

// The per category rows below the donut, in the same colours, amounts, and
// percents. The figures come from the real items, so a confirmed price and an
// estimate both count at their own value. The control at the bottom switches
// between the selected day and the whole trip.

function label(category: string): string {
  return categoryById(category)?.label ?? category;
}

export function BudgetBreakdown({
  dayItems,
  tripItems,
  currency,
}: {
  dayItems: BreakdownItem[];
  tripItems: BreakdownItem[];
  currency: string;
}) {
  const [full, setFull] = useState(false);
  const source = full ? tripItems : dayItems;
  const { rows } = useMemo(() => categoryBreakdown(source), [source]);

  return (
    <div className="surface-2 rounded-xl p-4 shadow-[var(--elev-raise)]">
      <h3 className="eyebrow">{full ? "Trip breakdown" : "Day breakdown"}</h3>

      {rows.length === 0 ? (
        <p className="mt-3 text-xs ink-3">No priced items yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((row) => (
            <li key={row.category} className="flex items-center gap-2.5 text-xs">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ background: row.color }}
              />
              <span className="min-w-0 flex-1 truncate ink-2">
                {label(row.category)}
              </span>
              <span className="num ink-1">
                <span className="mr-1 ink-3">{currency}</span>
                <PriceRoll value={row.amount} />
              </span>
              <span className="num w-9 text-right ink-3">
                {Math.round(row.fraction * 100)}%
              </span>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setFull((v) => !v)}
        className="mt-4 text-xs ink-2 underline decoration-[var(--hairline-strong)] underline-offset-2 transition-colors hover:text-[var(--ink-0)]"
      >
        {full ? "View day budget" : "View full budget"}
      </button>
    </div>
  );
}
