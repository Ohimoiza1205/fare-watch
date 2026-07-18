"use client";

import type { WeatherSnapshot } from "@/lib/planner/types";
import { isWetWeather } from "@/lib/planner/weather";
import { PriceRoll } from "@/components/PriceRoll";
import { GaugeDial } from "@/components/GaugeDial";
import { ScrubSparkline } from "@/components/ScrubSparkline";
import { formatMoney } from "@/lib/planner/format";
import { categoryTagStyle, hueBadgeStyle } from "@/lib/planner/categoryColor";

// Four white cards. Numbers prominent in tabular figures, rolling on real
// change. The gauge states percent of ceiling; the on-track line is green and
// flips to the reserved status colour only when the plan is over its own
// ceiling. Estimates keep the tilde and dim treatment on the figure itself.

const TASTE_CATEGORY: Record<string, string> = {
  foodie: "dining",
  outdoors: "outdoors",
  nightlife: "nightlife",
  culture: "museum",
  cheap: "groceries",
  treat: "shopping",
};

function Card({
  children,
  haze,
}: {
  children: React.ReactNode;
  haze?: "warm" | "cool" | null;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl surface-2 px-4 py-3.5 shadow-[var(--elev-raise)]">
      {haze && (
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              haze === "warm"
                ? "radial-gradient(120% 90% at 85% 0%, rgba(232, 150, 58, 0.14), transparent 60%)"
                : "radial-gradient(120% 90% at 85% 0%, rgba(58, 159, 217, 0.14), transparent 60%)",
          }}
        />
      )}
      <div className="relative">{children}</div>
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

export function StatCards({
  planned,
  ceiling,
  estimatedShare,
  overLimit,
  dailyAverage,
  dayTotals,
  dayDates,
  currency,
  pace,
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
  dayDates: string[];
  currency: string;
  pace: string;
  taste: string[];
  weather: WeatherSnapshot | null;
  weatherDate: string;
}) {
  const hasCeiling = ceiling != null && ceiling > 0;
  const pctOfCeiling = hasCeiling ? planned / ceiling : 0;

  const estimatedForecast = weather?.estimated ?? false;
  const high = weather?.tempMax != null ? Math.round(weather.tempMax) : null;
  const low = weather?.tempMin != null ? Math.round(weather.tempMin) : null;
  const wet = isWetWeather(weather);

  const sparkPoints = dayTotals.map((v, i) => ({
    t: new Date(`${dayDates[i]}T12:00:00`).getTime(),
    v,
  }));

  const shownTastes = taste.slice(0, 2);
  const overflow = taste.length - shownTastes.length;

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
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
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <BigMoney
              value={planned}
              currency={currency}
              tone={overLimit ? "var(--warn)" : "var(--ink-0)"}
            />
            {hasCeiling ? (
              <div className="mt-1 num text-xs ink-3">
                / {formatMoney(ceiling, currency)}
              </div>
            ) : (
              <div className="mt-1 text-xs ink-4">no ceiling set</div>
            )}
            {estimatedShare > 0 && (
              <div className="mt-1 num text-xs ink-3">
                ~{formatMoney(estimatedShare, currency)} of this is estimate
              </div>
            )}
            {hasCeiling && (
              <div
                className="mt-1 text-xs"
                style={{ color: overLimit ? "var(--warn)" : "var(--ok)" }}
              >
                {overLimit
                  ? `over the ceiling by ${formatMoney(planned - ceiling, currency)}`
                  : "on track"}
              </div>
            )}
          </div>
          {hasCeiling && (
            <GaugeDial
              value={pctOfCeiling}
              size={76}
              color={overLimit ? "var(--warn)" : "var(--accent)"}
              className="shrink-0"
            />
          )}
        </div>
      </Card>

      <Card>
        <CardLabel hue={194} icon={<path d="M5 20v-8M10 20V6M15 20v-10M20 20v-5" />}>
          Daily average
        </CardLabel>
        <BigMoney value={dailyAverage} currency={currency} />
        {sparkPoints.length >= 2 && (
          <ScrubSparkline
            points={sparkPoints}
            width={210}
            height={36}
            stroke="var(--accent)"
            formatValue={(v) => formatMoney(v, currency)}
            className="mt-2"
          />
        )}
        <div className="mt-1.5 num text-xs ink-3">
          per day over {dayTotals.length} days
        </div>
      </Card>

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
        <div className="mt-1.5 text-2xl capitalize leading-none" style={{ color: "var(--ink-0)" }}>
          {pace}
        </div>
        {taste.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {shownTastes.map((t) => (
              <span
                key={t}
                className="rounded-full px-2 py-0.5 text-[0.6875rem] capitalize leading-none"
                style={categoryTagStyle(TASTE_CATEGORY[t] ?? "errands")}
              >
                {t}
              </span>
            ))}
            {overflow > 0 && (
              <span
                className="num rounded-full px-2 py-0.5 text-[0.6875rem] leading-none"
                style={{ background: "var(--surface-1)", color: "var(--ink-3)" }}
              >
                +{overflow}
              </span>
            )}
          </div>
        )}
      </Card>

      <Card haze={weather && high != null ? (wet ? "cool" : "warm") : null}>
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
