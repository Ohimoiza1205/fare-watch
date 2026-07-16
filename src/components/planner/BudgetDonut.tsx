"use client";

import { useMemo } from "react";
import { PriceRoll } from "@/components/PriceRoll";
import { categoryBreakdown, type BreakdownItem } from "@/lib/planner/breakdown";

// A hand drawn donut of where a day's money goes, by category, in the shared
// category colours. The ring and its rolling total live here; the per category
// rows sit in the breakdown panel below, reading the same figures.
export function BudgetDonut({
  items,
  currency,
}: {
  items: BreakdownItem[];
  currency: string;
}) {
  const { rows, total } = useMemo(() => categoryBreakdown(items), [items]);

  const r = 52;
  const stroke = 16;
  const c = 2 * Math.PI * r;

  return (
    <div className="surface-2 rounded-xl p-4 shadow-[var(--elev-raise)]">
      <h3 className="eyebrow">Where the day goes</h3>

      {total <= 0 ? (
        <p className="mt-3 text-xs ink-3">No priced items for this day.</p>
      ) : (
        <div className="mt-3 flex items-center justify-center">
          <div className="relative">
            <svg width="132" height="132" viewBox="0 0 132 132">
              <g transform="rotate(-90 66 66)">
                <circle
                  cx="66"
                  cy="66"
                  r={r}
                  fill="none"
                  stroke="var(--hairline)"
                  strokeWidth={stroke}
                />
                {rows.map((s) => {
                  const dash = s.fraction * c;
                  return (
                    <circle
                      key={s.category}
                      cx="66"
                      cy="66"
                      r={r}
                      fill="none"
                      stroke={s.color}
                      strokeWidth={stroke}
                      strokeDasharray={`${dash} ${c - dash}`}
                      strokeDashoffset={-s.offset * c}
                    />
                  );
                })}
              </g>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="num text-xl ink-0">
                <PriceRoll value={total} />
              </span>
              <span className="text-[0.625rem] ink-3">{currency}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
