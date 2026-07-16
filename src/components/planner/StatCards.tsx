"use client";

import type { WeatherSnapshot } from "@/lib/planner/types";
import { PriceRoll } from "@/components/PriceRoll";
import { WeatherBadge } from "./WeatherBadge";

// The top row of the dashboard. Compact white cards on the cool canvas, numbers
// prominent in tabular figures, rolling to their new value when the plan or the
// selected day changes.

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="surface-2 rounded-xl px-4 py-3.5 shadow-[var(--elev-raise)]">
      {children}
    </div>
  );
}

function MoneyStat({
  label,
  value,
  currency,
  tone = "var(--ink-0)",
}: {
  label: string;
  value: number;
  currency: string;
  tone?: string;
}) {
  return (
    <Card>
      <div className="eyebrow">{label}</div>
      <div className="mt-1.5 num text-2xl leading-none" style={{ color: tone }}>
        <span className="mr-1 text-sm ink-3">{currency}</span>
        <PriceRoll value={value} />
      </div>
    </Card>
  );
}

export function StatCards({
  average,
  ceiling,
  dailyAverage,
  currency,
  overLimit,
  weather,
  weatherDate,
}: {
  average: number;
  ceiling: number;
  dailyAverage: number;
  currency: string;
  overLimit: boolean;
  weather: WeatherSnapshot | null;
  weatherDate: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <MoneyStat
        label="Average estimate"
        value={average}
        currency={currency}
        tone={overLimit ? "var(--warn)" : "var(--ink-0)"}
      />
      <MoneyStat label="Conservative ceiling" value={ceiling} currency={currency} />
      <MoneyStat label="Daily average" value={dailyAverage} currency={currency} />
      <Card>
        <div className="eyebrow">Weather, {weatherDate}</div>
        <div className="mt-2.5">
          <WeatherBadge weather={weather} detailed />
        </div>
      </Card>
    </div>
  );
}
