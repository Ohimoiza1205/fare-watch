"use client";

import { useEffect, useRef, useState } from "react";
import type { ComposedDay, ComposedItem } from "@/lib/planner/day";
import { computeTripBudget, type Priced } from "@/lib/planner/budget";
import { formatDayDate } from "@/lib/planner/format";
import { StatCards } from "./StatCards";
import { DayStrip } from "./DayStrip";
import { ItineraryDay } from "./ItineraryDay";
import { BudgetDonut } from "./BudgetDonut";
import { BudgetBreakdown } from "./BudgetBreakdown";
import { DayMap, type MapStop } from "./DayMap";
import { AssistantPanel } from "./AssistantPanel";
import { TripSummaryStrip } from "./TripSummaryStrip";
import { categoryMarkerColor } from "@/lib/planner/categoryColor";
import { categoryById } from "@/lib/planner/categories";
import { scheduleTime } from "@/lib/planner/schedule";
import { formatMoneyRange } from "@/lib/planner/format";
import type { BreakdownItem } from "@/lib/planner/breakdown";

// The planner dashboard. Stats on top, the day strip as a selector, the days
// stacked in the centre, and the right rail with the budget ring and the street
// map. Selecting a day moves the centre, the map, and the weather together.
// One selected stop drives both the list and the map: a pin click opens its
// card on the map, a row's number selects its pin, and the card's one action
// leads back to the row. The days live in state so a swap updates every figure
// live, and the numbers roll to their new value.
export function PlannerBoard({
  tripId,
  days: initialDays,
  travellers,
  currency,
  budgetCeiling,
  taste,
}: {
  tripId: string;
  days: ComposedDay[];
  travellers: number;
  currency: string;
  budgetCeiling: number | null;
  taste: string[];
}) {
  const [days, setDays] = useState<ComposedDay[]>(initialDays);
  const [selected, setSelected] = useState(0);

  // One selected stop shared by the map and the rows; a hovered breakdown row
  // for the ring; a row briefly ringed after the map card's show in plan.
  const [selectedStopId, setSelectedStopId] = useState<number | null>(null);
  const [hoverCategory, setHoverCategory] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<number | null>(null);

  // Which day sections are closed, keyed by day id so the state survives a
  // re-generation of the composed view. Restored after mount, and the
  // disclosure motion is enabled only after the restore has painted, so
  // nothing animates on load.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [disclosureReady, setDisclosureReady] = useState(false);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const storageKey = `planner.collapsed.${tripId}`;

  useEffect(() => {
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (raw) setCollapsed(JSON.parse(raw) as Record<string, boolean>);
      } catch {
        // unreadable state simply falls back to all expanded
      }
      raf2 = requestAnimationFrame(() => setDisclosureReady(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [storageKey]);

  function dayKey(d: ComposedDay): string {
    return d.id ?? d.date;
  }

  function toggleDay(key: string) {
    setCollapsed((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // storage full or blocked; the session state still works
      }
      return next;
    });
  }

  const priced: Priced[] = days.flatMap((d) =>
    d.items.map((it) => ({
      price: it.price,
      priceMax: it.priceMax,
      isEstimated: it.isEstimated,
    }))
  );
  const budget = computeTripBudget(priced, { currency, limit: budgetCeiling });
  const dailyAverage = days.length ? budget.average / days.length : 0;
  const activityCount = days.reduce((sum, d) => sum + d.items.length, 0);

  // Per day sums, recomputed from items so a swap moves the bars too. The
  // estimate share keeps the trip total honest about how much is marked.
  const dayTotals = days.map((d) =>
    d.items.reduce((sum, it) => sum + (it.price ?? it.priceMax ?? 0), 0)
  );
  const estimatedShare = days
    .flatMap((d) => d.items)
    .filter((it) => it.isEstimated)
    .reduce((sum, it) => sum + (it.price ?? it.priceMax ?? 0), 0);

  // Today's bar and weather when the trip is underway; otherwise the heaviest
  // day carries the accent and the first day carries the forecast.
  const today = new Date().toLocaleDateString("en-CA");
  const todayIndex = days.findIndex((d) => d.date === today);
  const underway = todayIndex >= 0;
  const accentDayIndex = underway
    ? todayIndex
    : dayTotals.indexOf(Math.max(...dayTotals, 0));
  const weatherDay = underway ? days[todayIndex] : days[0];

  const tripBreakdown: BreakdownItem[] = days.flatMap((d) =>
    d.items.map((it) => ({
      category: it.category,
      price: it.price,
      priceMax: it.priceMax,
    }))
  );

  const day = days[selected] ?? days[0];

  const dayBreakdown: BreakdownItem[] = day.items.map((it) => ({
    category: it.category,
    price: it.price,
    priceMax: it.priceMax,
  }));

  const stops: MapStop[] = day.items
    .map((it, i) => {
      if (it.lat == null || it.lon == null) return null;
      const lo = it.price ?? it.priceMax;
      const hi = it.priceMax ?? it.price;
      return {
        id: it.id,
        name: it.venue ?? it.title,
        lat: it.lat,
        lon: it.lon,
        number: i + 1,
        color: categoryMarkerColor(it.category),
        category: it.category,
        categoryLabel: categoryById(it.category)?.label ?? it.category,
        time: scheduleTime(i, day.items.length),
        priceText: lo != null ? formatMoneyRange(lo, hi as number, it.currency) : null,
        priceContext:
          lo != null
            ? travellers > 1
              ? `for ${travellers} people`
              : "per person"
            : null,
        isEstimated: it.isEstimated,
      };
    })
    .filter((s): s is MapStop => s != null);

  // The map remounts when the stops themselves change, so a swap or an add
  // moves the pins and the card as immediately as it moves the figures.
  const mapKey = `${day.date}|${stops
    .map((s) => `${s.id}:${s.name}:${s.lat}:${s.lon}:${s.priceText ?? ""}`)
    .join("|")}`;

  function replaceItem(next: ComposedItem) {
    setDays((prev) =>
      prev.map((d) => ({
        ...d,
        items: d.items.map((it) => (it.id === next.id ? next : it)),
      }))
    );
  }

  async function removeItem(itemId: number) {
    const res = await fetch(`/api/items/${itemId}`, { method: "DELETE" });
    if (!res.ok) return;
    setSelectedStopId((s) => (s === itemId ? null : s));
    setDays((prev) =>
      prev.map((d) => ({
        ...d,
        items: d.items.filter((it) => it.id !== itemId),
      }))
    );
  }

  function addItem(dayId: string, item: ComposedItem) {
    setDays((prev) =>
      prev.map((d) =>
        d.id === dayId ? { ...d, items: [...d.items, item] } : d
      )
    );
  }

  // Selecting from the strip aims the rail at that day and opens its section.
  // The scroll is user-driven, so smooth motion is allowed, and it still
  // honours reduced motion.
  function selectDay(index: number) {
    setSelected(index);
    setSelectedStopId(null);
    const target = days[index];
    if (target && collapsed[dayKey(target)]) toggleDay(dayKey(target));
    const el = sectionRefs.current[index];
    if (el) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    }
  }

  // A row's number selects its pin. The rail is aimed at that row's day first,
  // so the map showing the pin is always the map on screen. Clicking the same
  // number again clears the selection.
  function selectStopFromRow(dayIndex: number, itemId: number) {
    setSelected(dayIndex);
    setSelectedStopId((cur) => (cur === itemId ? null : itemId));
  }

  // The map card's one action: open the day section if it is closed, scroll to
  // the row, and ring it once. The ring clears itself when its animation ends.
  function showInPlan(itemId: number) {
    const di = days.findIndex((d) => d.items.some((it) => it.id === itemId));
    if (di < 0) return;
    const key = dayKey(days[di]);
    if (collapsed[key]) toggleDay(key);
    setHighlightId(itemId);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const el = document.querySelector(`[data-item-id="${itemId}"]`);
        const reduce = window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        ).matches;
        el?.scrollIntoView({
          behavior: reduce ? "auto" : "smooth",
          block: "center",
        });
      })
    );
  }

  return (
    <div>
      <StatCards
        planned={budget.average}
        ceiling={budget.limit}
        estimatedShare={estimatedShare}
        overLimit={budget.overLimit}
        dailyAverage={dailyAverage}
        dayTotals={dayTotals}
        accentDayIndex={accentDayIndex}
        currency={currency}
        taste={taste}
        weather={weatherDay?.weather ?? null}
        weatherDate={weatherDay ? formatDayDate(weatherDay.date) : ""}
      />

      <div className="mt-4">
        <DayStrip days={days} selected={selected} onSelect={selectDay} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-8">
          {days.map((d, i) => (
            <div
              key={dayKey(d)}
              ref={(el) => {
                sectionRefs.current[i] = el;
              }}
            >
              <ItineraryDay
                day={d}
                travellers={travellers}
                expanded={!collapsed[dayKey(d)]}
                animate={disclosureReady}
                onToggle={() => toggleDay(dayKey(d))}
                onReplace={replaceItem}
                onRemove={removeItem}
                onAdd={addItem}
                selectedStopId={i === selected ? selectedStopId : null}
                onSelectStop={(id) => selectStopFromRow(i, id)}
                highlightId={highlightId}
                onHighlightEnd={() => setHighlightId(null)}
              />
            </div>
          ))}
        </div>

        <aside className="space-y-4">
          <BudgetDonut
            items={tripBreakdown}
            currency={currency}
            planned={budget.average}
            ceiling={budget.limit}
            overLimit={budget.overLimit}
            emphasis={hoverCategory}
          />

          <BudgetBreakdown
            dayItems={dayBreakdown}
            tripItems={tripBreakdown}
            currency={currency}
            onHoverCategory={setHoverCategory}
          />

          <div className="surface-2 rounded-xl p-4 shadow-[var(--elev-raise)]">
            <h3 className="eyebrow">Street map, day {day.dayIndex + 1}</h3>
            <div className="mt-3">
              <DayMap
                key={mapKey}
                stops={stops}
                selectedId={selectedStopId}
                onSelect={setSelectedStopId}
                onShowInPlan={showInPlan}
              />
            </div>
          </div>
        </aside>
      </div>

      <div className="mt-6">
        <AssistantPanel tripId={tripId} onItemReplaced={replaceItem} />
      </div>

      <div className="mt-6">
        <TripSummaryStrip
          durationDays={days.length}
          activityCount={activityCount}
          estimatedTotal={budget.average}
          dailyAverage={dailyAverage}
          currency={currency}
          hasEstimate={budget.hasEstimate}
        />
      </div>
    </div>
  );
}
