"use client";

import type { ComposedDay } from "@/lib/planner/day";
import { formatMoney } from "@/lib/planner/format";

// The trip as a month grid, one cell per calendar day, the trip's own days
// carrying their planned totals. Trip membership reads by tone, the figure is
// the loudest mark in a cell, an estimated day keeps the tilde and the dimmer
// ink. Picking a trip day returns to the itinerary aimed at that day.

type TripDayCell = { index: number; total: number; estimated: boolean };

function monthsBetween(
  first: string,
  last: string
): { year: number; month: number }[] {
  const out: { year: number; month: number }[] = [];
  const a = new Date(`${first}T12:00:00`);
  const b = new Date(`${last}T12:00:00`);
  const cur = new Date(a.getFullYear(), a.getMonth(), 1, 12);
  while (
    cur.getFullYear() < b.getFullYear() ||
    (cur.getFullYear() === b.getFullYear() && cur.getMonth() <= b.getMonth())
  ) {
    out.push({ year: cur.getFullYear(), month: cur.getMonth() });
    cur.setMonth(cur.getMonth() + 1);
  }
  return out;
}

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

export function TripCalendar({
  days,
  dayTotals,
  currency,
  onPickDay,
}: {
  days: ComposedDay[];
  dayTotals: number[];
  currency: string;
  onPickDay: (index: number) => void;
}) {
  if (!days.length) return null;

  const byDate = new Map<string, TripDayCell>();
  days.forEach((d, i) => {
    byDate.set(d.date, {
      index: i,
      total: dayTotals[i] ?? 0,
      estimated: d.items.some((it) => it.isEstimated),
    });
  });

  const months = monthsBetween(days[0].date, days[days.length - 1].date);

  return (
    <div className="space-y-6 surface-2 rounded-xl p-4 shadow-[var(--elev-raise)]">
      {months.map(({ year, month }) => {
        const label = new Date(year, month, 1, 12).toLocaleDateString("en-GB", {
          month: "long",
          year: "numeric",
        });
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        // Monday-start grid, so getDay's Sunday-first index shifts by six.
        const lead = (new Date(year, month, 1, 12).getDay() + 6) % 7;
        const cells: (number | null)[] = [
          ...Array.from({ length: lead }, () => null),
          ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
        ];

        return (
          <div key={`${year}-${month}`}>
            <h3 className="eyebrow">{label}</h3>
            <div className="mt-3 grid grid-cols-7 gap-1">
              {WEEKDAYS.map((w, i) => (
                <div
                  key={`w${i}`}
                  className="pb-1 text-center text-[0.625rem] uppercase tracking-wide ink-3"
                >
                  {w}
                </div>
              ))}
              {cells.map((dom, i) => {
                if (dom == null) return <div key={`b${i}`} aria-hidden="true" />;
                const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(
                  dom
                ).padStart(2, "0")}`;
                const trip = byDate.get(iso);

                if (!trip) {
                  return (
                    <div key={iso} className="flex h-14 flex-col p-1.5">
                      <span className="num text-xs ink-4">{dom}</span>
                    </div>
                  );
                }

                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => onPickDay(trip.index)}
                    aria-label={`Open day ${trip.index + 1} in the itinerary`}
                    className="pressable flex h-14 flex-col justify-between rounded-md surface-1 p-1.5 text-left hover:-translate-y-0.5"
                    style={{ boxShadow: "0 0 0 1px var(--hairline)" }}
                  >
                    <span className="num text-xs ink-1">{dom}</span>
                    {trip.total > 0 && (
                      <span
                        className={`num text-[0.6875rem] leading-none ${
                          trip.estimated ? "ink-2" : "ink-0"
                        }`}
                      >
                        {trip.estimated && <span className="ink-3">~ </span>}
                        {formatMoney(trip.total, currency)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
