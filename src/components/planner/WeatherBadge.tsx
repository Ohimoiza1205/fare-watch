import type { WeatherSnapshot } from "@/lib/planner/types";
import { isWetWeather } from "@/lib/planner/weather";

// Weather kept quiet. The high and low sit in tabular figures, the condition in
// plain words. A wet day carries a small mark so it reads as a different day
// without leaning on colour. The fuller line, precipitation and wind, belongs to
// the expanded detail, not the collapsed run.

function WetMark() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" className="translate-y-[1px]">
      <circle cx="2" cy="3" r="0.9" fill="var(--ink-2)" />
      <circle cx="5" cy="3" r="0.9" fill="var(--ink-2)" />
      <circle cx="8" cy="3" r="0.9" fill="var(--ink-2)" />
      <circle cx="2" cy="6.5" r="0.9" fill="var(--ink-3)" />
      <circle cx="5" cy="6.5" r="0.9" fill="var(--ink-3)" />
      <circle cx="8" cy="6.5" r="0.9" fill="var(--ink-3)" />
    </svg>
  );
}

export function WeatherBadge({
  weather,
  detailed = false,
}: {
  weather: WeatherSnapshot | null;
  detailed?: boolean;
}) {
  if (!weather) {
    return <span className="text-xs ink-4">weather unavailable</span>;
  }

  const { tempMax, tempMin, unit, precipitationChance, windMax, summary, estimated } =
    weather;
  const wet = isWetWeather(weather);

  return (
    <div className="flex items-center gap-2.5 text-xs ink-3">
      <span className="num ink-1">{tempMax != null ? Math.round(tempMax) : "--"}</span>
      <span className="num ink-3">{tempMin != null ? Math.round(tempMin) : "--"}</span>
      <span className="ink-4">{unit}</span>
      <span className="flex items-center gap-1.5 ink-2">
        {wet && <WetMark />}
        <span className="lowercase">{summary}</span>
      </span>
      {detailed && (
        <>
          {precipitationChance != null && (
            <span className="num ink-3">{precipitationChance}% rain</span>
          )}
          {windMax != null && (
            <span className="num ink-3">wind {Math.round(windMax)}</span>
          )}
        </>
      )}
      {estimated && (
        <span
          className="rounded-[3px] border px-1 py-px text-[0.6rem] uppercase leading-none tracking-wide ink-3"
          style={{ borderColor: "var(--hairline-strong)" }}
          title="Estimated from a climate normal, not a forecast"
        >
          typical
        </span>
      )}
    </div>
  );
}
