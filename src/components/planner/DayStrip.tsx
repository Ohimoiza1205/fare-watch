"use client";

import { useEffect, useRef } from "react";
import type { ComposedDay } from "@/lib/planner/day";
import { isWetWeather } from "@/lib/planner/weather";
import { RhythmMark } from "./RhythmMark";

// The whole trip in one horizontal run, a compact tile per day with its number,
// date, weather, and rhythm. Tapping a tile selects that day and scrolls the
// plan onto it. Rest days read by their ring, the same mark the plan uses.

function parts(date: string) {
  const d = new Date(`${date}T12:00:00`);
  return {
    weekday: d.toLocaleDateString("en-GB", { weekday: "short" }),
    dom: d.toLocaleDateString("en-GB", { day: "2-digit" }),
    mon: d.toLocaleDateString("en-GB", { month: "short" }),
  };
}

export function DayStrip({
  days,
  selected,
  onSelect,
}: {
  days: ComposedDay[];
  selected: number | null;
  onSelect: (index: number) => void;
}) {
  const tiles = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (selected == null) return;
    const el = tiles.current[selected];
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [selected]);

  return (
    <div
      className="flex gap-2 overflow-x-auto pb-2"
      role="tablist"
      aria-label="Days"
    >
      {days.map((day) => {
        const p = parts(day.date);
        const wet = isWetWeather(day.weather);
        const isSelected = selected === day.dayIndex;
        const temp = day.weather?.tempMax;

        return (
          <button
            key={day.date}
            ref={(el) => {
              tiles.current[day.dayIndex] = el;
            }}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onSelect(day.dayIndex)}
            className={`w-[4.75rem] shrink-0 rounded-lg px-2.5 py-2 text-left transition-[transform,box-shadow,background-color] duration-200 ease-[var(--ease)] ${
              isSelected
                ? "surface-2 -translate-y-0.5 shadow-[var(--elev-raise)]"
                : "surface-1 hover:-translate-y-0.5"
            }`}
            style={{
              boxShadow: isSelected ? undefined : "0 0 0 1px var(--hairline)",
            }}
          >
            <div className="flex items-center justify-between">
              <span className="num text-[0.625rem] ink-3">
                {String(day.dayIndex + 1).padStart(2, "0")}
              </span>
              <RhythmMark rhythm={day.rhythm} />
            </div>
            <div className="mt-1.5 text-[0.625rem] uppercase tracking-wide ink-3">
              {p.weekday}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="num text-base ink-0">{p.dom}</span>
              <span className="text-[0.625rem] ink-3">{p.mon}</span>
            </div>
            <div className="mt-1 flex items-center gap-1 text-[0.625rem] ink-2">
              <span className="num">{temp != null ? `${Math.round(temp)}°` : "--"}</span>
              {wet && (
                <span aria-hidden="true" className="ink-3">
                  wet
                </span>
              )}
              {day.rhythm === "rest" && <span className="ink-3">rest</span>}
            </div>
          </button>
        );
      })}
    </div>
  );
}
