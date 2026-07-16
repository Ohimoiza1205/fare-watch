"use client";

import type { ComposedDay, ComposedItem } from "@/lib/planner/day";
import { rollup } from "@/lib/planner/budget";
import { formatDayDate, formatMoney } from "@/lib/planner/format";
import { scheduleTime } from "@/lib/planner/schedule";
import { PriceRoll } from "@/components/PriceRoll";
import { ActivityRow } from "./ActivityRow";

// The centre column, the selected day read as a schedule. The header carries the
// date and the day total, which rolls when a swap changes it. Each activity is a
// row on the time rail.
export function ItineraryDay({
  day,
  travellers,
  onReplace,
}: {
  day: ComposedDay;
  travellers: number;
  onReplace: (next: ComposedItem) => void;
}) {
  const total = rollup(
    day.items.map((it) => ({
      price: it.price,
      priceMax: it.priceMax,
      isEstimated: it.isEstimated,
    }))
  );
  const count = day.items.length;

  return (
    <div>
      <header className="flex items-baseline justify-between">
        <div>
          <div className="eyebrow">Day {day.dayIndex + 1}</div>
          <div className="mt-1 num text-lg ink-0">{formatDayDate(day.date)}</div>
        </div>
        <div className="text-right">
          <div className="eyebrow">Day total</div>
          <div className="mt-1 num text-lg ink-0">
            <span className="mr-1 text-sm ink-3">{day.currency}</span>
            <PriceRoll value={total.average} />
          </div>
          {Math.round(total.ceiling) > Math.round(total.average) && (
            <div className="num text-[0.6875rem] ink-3">
              up to {formatMoney(total.ceiling, day.currency)}
            </div>
          )}
        </div>
      </header>

      <div className="mt-6">
        {count === 0 ? (
          <p className="rounded-xl p-6 text-sm ink-3 surface-2 shadow-[var(--elev-raise)]">
            {day.rhythm === "rest"
              ? "Rest day, nothing planned."
              : "No activity found for this day."}
          </p>
        ) : (
          day.items.map((item, i) => (
            <ActivityRow
              key={item.id || `${item.category}-${i}`}
              item={item}
              number={i + 1}
              time={scheduleTime(i, count)}
              travellers={travellers}
              isFirst={i === 0}
              isLast={i === count - 1}
              onReplace={onReplace}
            />
          ))
        )}
      </div>
    </div>
  );
}
