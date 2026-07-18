"use client";

import { useMemo, useState } from "react";

type Day = { date: string; total: number; estimated?: boolean };

const WEEKDAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function defaultFormat(n: number): string {
  return Math.round(n).toLocaleString("en-GB");
}

// Parsed in local time from the yyyy-mm-dd string so the grid never drifts a
// day relative to what the caller means, the way a UTC parse can.
function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

// Monday-first weekday index, 0 through 6.
function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export function HeatCalendar({
  days,
  formatTotal = defaultFormat,
  className,
}: {
  days: Day[];
  formatTotal?: (n: number) => string;
  className?: string;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  const { months, maxTotal, byDate } = useMemo(() => {
    const map = new Map<string, Day>();
    for (const d of days) map.set(d.date, d);

    const max = days.reduce((m, d) => Math.max(m, d.total), 0);

    const monthMap = new Map<string, Date>();
    for (const d of days) {
      const parsed = parseISODate(d.date);
      const key = monthKey(parsed);
      if (!monthMap.has(key)) monthMap.set(key, new Date(parsed.getFullYear(), parsed.getMonth(), 1));
    }
    const sortedMonths = [...monthMap.values()].sort((a, b) => a.getTime() - b.getTime());

    return { months: sortedMonths, maxTotal: max, byDate: map };
  }, [days]);

  if (months.length === 0) {
    return (
      <div className={className}>
        <div className="text-sm" style={{ color: "var(--ink-3)" }}>
          No days to show.
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex flex-col gap-6">
        {months.map((monthStart) => {
          const year = monthStart.getFullYear();
          const month = monthStart.getMonth();
          const daysInMonth = new Date(year, month + 1, 0).getDate();
          const leading = mondayIndex(monthStart);

          const cells: (Date | null)[] = [];
          for (let i = 0; i < leading; i++) cells.push(null);
          for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

          return (
            <div key={monthKey(monthStart)}>
              <div
                className="mb-2 text-[11px]"
                style={{ letterSpacing: "0.06em", color: "var(--ink-3)", textTransform: "uppercase" }}
              >
                {MONTH_LABELS[month]} {year}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {WEEKDAY_LABELS.map((w) => (
                  <div key={w} className="text-center text-[10px]" style={{ color: "var(--ink-4)" }}>
                    {w}
                  </div>
                ))}

                {cells.map((cellDate, i) => {
                  if (!cellDate) return <div key={`blank-${i}`} />;
                  const iso = `${cellDate.getFullYear()}-${String(cellDate.getMonth() + 1).padStart(2, "0")}-${String(cellDate.getDate()).padStart(2, "0")}`;
                  const entry = byDate.get(iso);
                  const isHovered = hovered === iso;

                  const alpha = entry && maxTotal > 0 ? 0.1 + (entry.total / maxTotal) * 0.45 : 0;
                  const background = entry
                    ? `color-mix(in srgb, var(--accent) ${(alpha * 100).toFixed(1)}%, transparent)`
                    : "transparent";

                  return (
                    <div
                      key={iso}
                      className="relative flex aspect-square items-center justify-center rounded-md"
                      style={{ background }}
                      onMouseEnter={() => entry && setHovered(iso)}
                      onMouseLeave={() => setHovered((h) => (h === iso ? null : h))}
                    >
                      <span
                        className="num text-[11px]"
                        style={{ color: entry ? "var(--ink-0)" : "var(--ink-4)" }}
                      >
                        {cellDate.getDate()}
                      </span>

                      {entry && isHovered && (
                        <div
                          className="num absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-1 text-[11px]"
                          style={{
                            background: "var(--surface-3)",
                            border: "1px solid var(--hairline)",
                            color: "var(--ink-0)",
                          }}
                        >
                          {entry.estimated ? "~" : ""}
                          {formatTotal(entry.total)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
