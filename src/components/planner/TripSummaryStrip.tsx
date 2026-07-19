"use client";

import { PriceRoll } from "@/components/PriceRoll";

// The trip in four figures, set as one quiet line: a small grey label over a
// tabular figure, separated by spacing alone. No boxes, no icons. The money
// figures roll to their new value when a swap changes them, and the total
// keeps the honesty convention, a tilde and dimmer ink when any figure in it
// is an estimate.

function Fact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[0.6875rem] ink-3">{label}</div>
      <div className="mt-1 num text-sm leading-none ink-0">{children}</div>
    </div>
  );
}

export function TripSummaryStrip({
  durationDays,
  activityCount,
  estimatedTotal,
  dailyAverage,
  currency,
  hasEstimate,
}: {
  durationDays: number;
  activityCount: number;
  estimatedTotal: number;
  dailyAverage: number;
  currency: string;
  hasEstimate: boolean;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-8 gap-y-3 px-1">
      <Fact label="Duration">
        {durationDays} {durationDays === 1 ? "day" : "days"}
      </Fact>
      <Fact label="Activities">{activityCount}</Fact>
      <Fact label="Estimated total">
        <span className={hasEstimate ? "ink-2" : undefined}>
          {hasEstimate && (
            <span aria-hidden="true" className="mr-0.5 ink-3">
              ~
            </span>
          )}
          <span className="mr-1 text-xs ink-3">{currency}</span>
          <PriceRoll value={estimatedTotal} />
        </span>
      </Fact>
      <Fact label="Daily average">
        <span className="mr-1 text-xs ink-3">{currency}</span>
        <PriceRoll value={dailyAverage} />
      </Fact>
    </div>
  );
}
