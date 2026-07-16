"use client";

import { useMemo, useState } from "react";
import { computeTripBudget, type Priced } from "@/lib/planner/budget";
import { PriceRoll } from "@/components/PriceRoll";

// The budget as a quiet readout that floats a step above the run of days. It
// sums the plan two ways and rolls each figure to its new value when the plan
// changes, never on load. The traveller's maximum is editable, and crossing it
// reads in the one status accent. Numbers are the loudest thing here; nothing
// shouts.

function Figure({
  currency,
  value,
  tone,
  lead,
}: {
  currency: string;
  value: number;
  tone: string;
  lead?: boolean;
}) {
  return (
    <span
      className={`num ${lead ? "text-[1.875rem] leading-none" : "text-lg"}`}
      style={{ color: tone }}
    >
      <span className="mr-1 text-sm ink-3">{currency}</span>
      <PriceRoll value={value} />
    </span>
  );
}

export function TripBudgetPanel({
  items,
  currency,
  initialLimit = null,
}: {
  items: Priced[];
  currency: string;
  initialLimit?: number | null;
}) {
  const [limitText, setLimitText] = useState(
    initialLimit != null ? String(initialLimit) : ""
  );

  const limit = useMemo(() => {
    const n = Number.parseFloat(limitText);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [limitText]);

  const budget = useMemo(
    () => computeTripBudget(items, { currency, limit }),
    [items, currency, limit]
  );

  const headroom = limit != null ? Math.round(limit - budget.average) : null;

  return (
    <div
      className="surface-2 elev-float hairline-t rounded-xl p-5"
      aria-label="Trip budget"
    >
      <h2 className="eyebrow">Trip budget</h2>

      <div className="mt-4">
        <div className="eyebrow ink-4">Average estimate</div>
        <div className="mt-1.5">
          <Figure
            currency={currency}
            value={budget.average}
            tone={budget.overLimit ? "var(--warn)" : "var(--ink-0)"}
            lead
          />
        </div>
      </div>

      <div className="mt-5">
        <div className="eyebrow ink-4">Conservative ceiling</div>
        <div className="mt-1.5">
          <Figure currency={currency} value={budget.ceiling} tone="var(--ink-2)" />
        </div>
      </div>

      {budget.hasEstimate && (
        <p className="mt-4 text-xs leading-relaxed ink-3">
          {budget.allEstimated
            ? "Every figure here is an estimate."
            : "Some figures are estimates, marked in the plan."}
        </p>
      )}

      <div
        className="mt-5 border-t pt-5"
        style={{ borderColor: "var(--hairline)" }}
      >
        <label className="flex flex-col gap-2">
          <span className="eyebrow">Your maximum</span>
          <span className="flex items-baseline gap-2">
            <span className="text-sm ink-3">{currency}</span>
            <input
              inputMode="numeric"
              value={limitText}
              onChange={(e) => setLimitText(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="none"
              aria-label={`Maximum budget in ${currency}`}
              className="w-full border-b bg-transparent pb-1 num text-lg ink-0 outline-none transition-colors"
              style={{ borderColor: "var(--hairline-strong)" }}
            />
          </span>
        </label>

        {headroom != null && (
          <p
            className="mt-3 num text-xs"
            style={{ color: budget.overLimit ? "var(--warn)" : "var(--ink-3)" }}
            role="status"
          >
            {budget.overLimit
              ? `${currency} ${Math.abs(headroom).toLocaleString("en-GB")} over your maximum`
              : `${currency} ${headroom.toLocaleString("en-GB")} under your maximum`}
          </p>
        )}
      </div>
    </div>
  );
}
