"use client";

import { useMemo } from "react";
import { PriceRoll } from "@/components/PriceRoll";
import { formatMoney } from "@/lib/planner/format";
import { categoryBreakdown, type BreakdownItem } from "@/lib/planner/breakdown";

// The trip budget as a thin ring. The arcs show where the money goes by
// category, largest first from twelve o'clock, separated by small gaps of bare
// surface; the centre carries the one figure that matters, how much of the
// ceiling is used, or the planned total when no ceiling is set. The breakdown
// rows below are the legend, and hovering one dims the other arcs. A long tail
// of categories folds into a neutral Other so the ring never turns into
// confetti.

type Slice = {
  category: string;
  fraction: number;
  offset: number;
  color: string;
};

const MAX_SLICES = 6;

export function BudgetDonut({
  items,
  currency,
  planned,
  ceiling,
  overLimit,
  hasEstimate = false,
  emphasis = null,
}: {
  items: BreakdownItem[];
  currency: string;
  planned: number;
  ceiling: number | null;
  overLimit: boolean;
  hasEstimate?: boolean;
  emphasis?: string | null;
}) {
  const { rows, total } = useMemo(() => categoryBreakdown(items), [items]);

  const slices: Slice[] = useMemo(() => {
    const kept = rows.length > MAX_SLICES ? rows.slice(0, MAX_SLICES - 1) : rows;
    const tailFraction = rows
      .slice(kept.length)
      .reduce((sum, r) => sum + r.fraction, 0);
    const parts = kept.map((r) => ({
      category: r.category,
      fraction: r.fraction,
      color: r.color,
    }));
    if (tailFraction > 0) {
      parts.push({
        category: "other",
        fraction: tailFraction,
        color: "var(--ink-4)",
      });
    }
    const out: Slice[] = [];
    let acc = 0;
    for (const p of parts) {
      out.push({ ...p, offset: acc });
      acc += p.fraction;
    }
    return out;
  }, [rows]);

  const r = 56;
  const stroke = 8;
  const c = 2 * Math.PI * r;
  const gap = slices.length > 1 ? 2 : 0;

  const hasCeiling = ceiling != null && ceiling > 0;
  const pct = hasCeiling ? (planned / (ceiling as number)) * 100 : 0;

  // A hovered breakdown row maps to its arc, or to Other when it sits in the
  // folded tail.
  const target =
    emphasis == null
      ? null
      : slices.some((s) => s.category === emphasis)
        ? emphasis
        : slices.some((s) => s.category === "other")
          ? "other"
          : null;

  return (
    <div className="surface-2 rounded-xl p-4 shadow-[var(--elev-raise)]">
      <h3 className="eyebrow">Budget overview</h3>

      {total <= 0 ? (
        <p className="mt-3 text-xs ink-3">No priced items yet.</p>
      ) : (
        <div className="mt-3 flex items-center justify-center">
          <div className="relative">
            <svg width="132" height="132" viewBox="0 0 132 132">
              <g transform="rotate(-90 66 66)">
                {slices.map((s) => {
                  const dash = Math.max(s.fraction * c - gap, 0.5);
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
                      strokeDashoffset={-(s.offset * c + gap / 2)}
                      className="transition-opacity duration-[var(--d1)] ease-[var(--ease)]"
                      style={{
                        opacity:
                          target != null && s.category !== target ? 0.25 : 1,
                      }}
                    />
                  );
                })}
              </g>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {/* the spent total, carried in the same estimate form as every
                  other money figure; percent of ceiling lives in the stat
                  card's gauge */}
              <span
                className={`num text-xl leading-none ${hasEstimate ? "ink-2" : "ink-0"}`}
                style={overLimit ? { color: "var(--warn)" } : undefined}
              >
                {hasEstimate && (
                  <span aria-hidden="true" className="mr-0.5 ink-3">
                    ~
                  </span>
                )}
                <span className="mr-1 text-sm ink-3">{currency}</span>
                <PriceRoll value={planned} />
              </span>
              <span className="mt-1 num text-[0.625rem] ink-3">
                {hasCeiling
                  ? `of ${formatMoney(ceiling as number, currency)} (${Math.round(pct)}%)`
                  : "planned"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
