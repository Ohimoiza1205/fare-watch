"use client";

import type { WeatherSnapshot } from "@/lib/planner/types";
import { PriceRoll } from "@/components/PriceRoll";
import { formatMoney } from "@/lib/planner/format";
import { hueBadgeStyle } from "@/lib/planner/categoryColor";

// The top row of the dashboard. Compact cards on the cool canvas, numbers
// prominent in tabular figures, rolling to their new value when the plan
// changes. Each card carries one small tinted glyph beside its label, the same
// line weight as the sidebar glyphs. Colour is spent only on status: the warn
// fill when the plan is over its ceiling, the accent on the one bar that means
// today or the heaviest day.

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="surface-2 rounded-xl px-4 py-3.5 shadow-[var(--elev-raise)]">
      {children}
    </div>
  );
}

function CardLabel({
  hue,
  icon,
  children,
}: {
  hue: number;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="h-3 w-3 shrink-0"
        style={{ color: hueBadgeStyle(hue).color }}
      >
        {icon}
      </svg>
      <span className="eyebrow">{children}</span>
    </div>
  );
}

function BigMoney({
  value,
  currency,
  tone = "var(--ink-0)",
}: {
  value: number;
  currency: string;
  tone?: string;
}) {
  return (
    <div className="mt-1.5 num text-2xl leading-none" style={{ color: tone }}>
      <span className="mr-1 text-sm ink-3">{currency}</span>
      <PriceRoll value={value} />
    </div>
  );
}

// One bar per day of the trip, drawn by hand. Columns, not a line: fourteen
// discrete daily sums must not imply a continuous series. Axis free, label
// free. One bar stands out: today carries the status accent when the trip is
// underway; otherwise the heaviest day reads a step brighter in neutral ink,
// emphasis by tone because status colour stays reserved for status.
function DayBars({
  totals,
  emphasisIndex,
  emphasisIsToday,
}: {
  totals: number[];
  emphasisIndex: number;
  emphasisIsToday: boolean;
}) {
  const n = totals.length;
  if (n === 0) return null;
  const unit = 5; // bar of 4 plus a gap of 1, in viewBox units
  const w = n * unit - 1;
  const h = 18;
  const max = Math.max(...totals);
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height={h}
      preserveAspectRatio="none"
      aria-hidden="true"
      className="mt-2 block"
    >
      {totals.map((v, i) => {
        // a zero day keeps a faint stub so the trip length stays readable
        const bh =
          max > 0 ? Math.max((v / max) * (h - 2), v > 0 ? 1.5 : 0.75) : 0.75;
        return (
          <rect
            key={i}
            x={i * unit}
            y={h - bh}
            width={unit - 1}
            height={bh}
            fill={
              i === emphasisIndex
                ? emphasisIsToday
                  ? "var(--accent)"
                  : "var(--ink-1)"
                : "var(--ink-4)"
            }
          />
        );
      })}
    </svg>
  );
}

export function StatCards({
  planned,
  ceiling,
  estimatedShare,
  overLimit,
  dailyAverage,
  dayTotals,
  emphasisDayIndex,
  emphasisIsToday,
  currency,
  taste,
  weather,
  weatherDate,
}: {
  planned: number;
  ceiling: number | null;
  estimatedShare: number;
  overLimit: boolean;
  dailyAverage: number;
  dayTotals: number[];
  emphasisDayIndex: number;
  emphasisIsToday: boolean;
  currency: string;
  taste: string[];
  weather: WeatherSnapshot | null;
  weatherDate: string;
}) {
  const hasCeiling = ceiling != null && ceiling > 0;
  const pct = hasCeiling ? Math.round((planned / ceiling) * 100) : 0;
  const remaining = hasCeiling ? ceiling - planned : 0;

  const styleLabel =
    taste.length > 0
      ? taste.join(", ").charAt(0).toUpperCase() + taste.join(", ").slice(1)
      : null;

  const estimatedForecast = weather?.estimated ?? false;
  const high = weather?.tempMax != null ? Math.round(weather.tempMax) : null;
  const low = weather?.tempMin != null ? Math.round(weather.tempMin) : null;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-[repeat(auto-fit,minmax(10.5rem,1fr))]">
      <Card>
        <CardLabel
          hue={40}
          icon={
            <>
              <ellipse cx="12" cy="7" rx="7" ry="3" />
              <path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" />
            </>
          }
        >
          Budget
        </CardLabel>
        <BigMoney
          value={planned}
          currency={currency}
          tone={overLimit ? "var(--warn)" : "var(--ink-0)"}
        />
        {hasCeiling ? (
          <>
            <div
              className="mt-2 h-1 w-full overflow-hidden rounded-full"
              style={{ background: "var(--hairline)" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, pct)}%`,
                  background: overLimit ? "var(--warn)" : "var(--ink-2)",
                }}
              />
            </div>
            <div className="mt-1.5 num text-xs ink-3">
              of {formatMoney(ceiling, currency)} ({pct}% used)
            </div>
          </>
        ) : (
          <div className="mt-1.5 text-xs ink-4">no ceiling set</div>
        )}
        {estimatedShare > 0 && (
          <div className="mt-1 num text-xs ink-3">
            ~{formatMoney(estimatedShare, currency)} of this is estimate
          </div>
        )}
      </Card>

      <Card>
        <CardLabel hue={194} icon={<path d="M5 20v-8M10 20V6M15 20v-10M20 20v-5" />}>
          Daily average
        </CardLabel>
        <BigMoney value={dailyAverage} currency={currency} />
        <DayBars
          totals={dayTotals}
          emphasisIndex={emphasisDayIndex}
          emphasisIsToday={emphasisIsToday}
        />
        <div className="mt-1.5 num text-xs ink-3">
          per day over {dayTotals.length} days
        </div>
      </Card>

      {hasCeiling && (
        <Card>
          <CardLabel
            hue={214}
            icon={
              <>
                <path d="M3 8a2 2 0 0 1 2-2h12M3 8v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2H5a2 2 0 0 1-2-2z" />
                <path d="M16 13.5h2" />
              </>
            }
          >
            Remaining
          </CardLabel>
          <BigMoney
            value={remaining}
            currency={currency}
            tone={remaining < 0 ? "var(--warn)" : "var(--ink-0)"}
          />
          <div className="mt-1.5 num text-xs ink-3">
            of {formatMoney(ceiling, currency)}
          </div>
        </Card>
      )}

      {styleLabel && (
        <Card>
          <CardLabel
            hue={288}
            icon={
              <>
                <circle cx="12" cy="12" r="9" />
                <path d="M15 9l-2 5-4 2 2-5z" />
              </>
            }
          >
            Trip style
          </CardLabel>
          <div className="mt-2.5">
            <span
              className="inline-block rounded-full px-2.5 py-1 text-xs leading-none"
              style={hueBadgeStyle(288)}
            >
              {styleLabel}
            </span>
          </div>
        </Card>
      )}

      <Card>
        <CardLabel
          hue={24}
          icon={
            <>
              <circle cx="12" cy="12" r="4" />
              <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" />
            </>
          }
        >
          Weather, {weatherDate}
        </CardLabel>
        {weather && high != null ? (
          <>
            <div
              className={`mt-1.5 num text-2xl leading-none ${
                estimatedForecast ? "ink-2" : "ink-0"
              }`}
            >
              {estimatedForecast && (
                <span aria-hidden="true" className="mr-1 ink-3">
                  ~
                </span>
              )}
              <PriceRoll value={high} />
              <span className="ml-1 text-sm ink-3">{weather.unit}</span>
            </div>
            <div
              className={`mt-1.5 text-xs ${estimatedForecast ? "ink-3" : "ink-2"}`}
            >
              <span className="num">
                H {high} / L {low != null ? low : "--"}
              </span>{" "}
              <span className="lowercase">{weather.summary}</span>
            </div>
          </>
        ) : (
          <div className="mt-2 text-xs ink-2">No forecast yet</div>
        )}
      </Card>
    </div>
  );
}
