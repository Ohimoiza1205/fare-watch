"use client";

import { useEffect, useRef } from "react";
import type { ComposedDay } from "@/lib/planner/day";
import { isWetWeather } from "@/lib/planner/weather";
import { RhythmMark } from "./RhythmMark";

// The whole trip in one light glass bar: a pill per day carrying its number,
// its date (the arranger gives days no area name, so the date is the honest
// label), the rhythm mark, and the wet marker. The active pill reads dark.
// Overflow scrolls; tapping selects the day and the plan follows.

function label(date: string) {
  const d = new Date(`${date}T12:00:00`);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
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
      className="glass flex gap-1.5 overflow-x-auto rounded-[var(--r-card)] p-1.5"
      role="tablist"
      aria-label="Days"
    >
      {days.map((day) => {
        const wet = isWetWeather(day.weather);
        const isSelected = selected === day.dayIndex;

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
            className="pressable flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5"
            style={
              isSelected
                ? { background: "var(--ink-0)", color: "var(--on-ink)" }
                : { color: "var(--ink-2)" }
            }
          >
            <span className="num text-xs font-medium">D{day.dayIndex + 1}</span>
            <span className="num text-xs">{label(day.date)}</span>
            <RhythmMark rhythm={day.rhythm} />
            {wet && (
              <span
                aria-hidden="true"
                className="text-[0.625rem]"
                style={{ color: isSelected ? "var(--on-ink)" : "var(--ink-3)" }}
              >
                wet
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
