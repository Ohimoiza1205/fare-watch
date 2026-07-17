"use client";

import { useState } from "react";
import type { ComposedDay, ComposedItem } from "@/lib/planner/day";
import type { AlternativeOption } from "@/lib/planner/alternatives";
import { CATEGORIES, categoryById } from "@/lib/planner/categories";
import { rollup } from "@/lib/planner/budget";
import { formatDayDate, formatMoney } from "@/lib/planner/format";
import { scheduleTime } from "@/lib/planner/schedule";
import { PriceRoll } from "@/components/PriceRoll";
import { PriceTag } from "./PriceTag";
import { ActivityRow } from "./ActivityRow";

// One day as a disclosure section. The header is the toggle: expanded it reads
// as the full schedule on the time rail, collapsed it keeps the date, the item
// count, and the day total, so closed days still column-align their totals
// down the page. The add row at the foot reuses the swap flow's lookup, so an
// added activity is always a real venue.

// The schedule grid columns, shared so the add row aligns under the cards.
const RAIL = "grid grid-cols-[2.5rem_1.25rem_minmax(0,1fr)] gap-x-2";

function AddActivity({
  dayId,
  onAdd,
}: {
  dayId: string;
  onAdd: (item: ComposedItem) => void;
}) {
  const [mode, setMode] = useState<"idle" | "pick" | "options">("idle");
  const [category, setCategory] = useState<string | null>(null);
  const [options, setOptions] = useState<AlternativeOption[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setMode("idle");
    setCategory(null);
    setOptions(null);
    setError(null);
  }

  async function pick(catId: string) {
    setCategory(catId);
    setMode("options");
    setOptions(null);
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/days/${dayId}/items?category=${encodeURIComponent(catId)}`
      );
      const data = (await res.json()) as { options?: AlternativeOption[] };
      setOptions(data.options ?? []);
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }

  async function add(o: AlternativeOption) {
    setAdding(o.venue);
    setError(null);
    try {
      const res = await fetch(`/api/days/${dayId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(o),
      });
      const data = (await res.json()) as { item?: ComposedItem; error?: string };
      if (res.ok && data.item) {
        onAdd(data.item);
        reset();
      } else {
        setError(data.error ?? "Could not add the activity.");
      }
    } catch {
      setError("Could not add the activity.");
    } finally {
      setAdding(null);
    }
  }

  if (mode === "idle") {
    return (
      <button
        type="button"
        onClick={() => setMode("pick")}
        className="w-full rounded-xl border border-dashed px-3 py-2.5 text-left text-sm ink-3 transition-colors duration-[var(--d1)] hover:text-[var(--ink-2)]"
        style={{ borderColor: "var(--hairline-strong)" }}
      >
        + Add activity
      </button>
    );
  }

  return (
    <div className="rounded-xl p-3 surface-2 shadow-[var(--elev-raise)]">
      {mode === "pick" ? (
        <>
          <div className="eyebrow">Add activity</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => pick(c.id)}
                className="rounded-md border px-2 py-1 text-xs ink-1 transition-colors duration-[var(--d1)] hover:text-[var(--ink-0)]"
                style={{ borderColor: "var(--hairline-strong)" }}
              >
                {c.label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="eyebrow">
            {category ? categoryById(category)?.label ?? category : "Options"}
          </div>
          <div className="mt-2">
            {loading ? (
              <p className="text-xs ink-3">Finding real venues</p>
            ) : options && options.length > 0 ? (
              <ul className="space-y-1.5">
                {options.map((o) => (
                  <li
                    key={o.sourceUrl ?? o.venue}
                    className="flex items-center gap-3 rounded-lg p-2 surface-1"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs ink-1">{o.venue}</span>
                      {o.address && (
                        <span className="block truncate text-[0.625rem] ink-3">
                          {o.address}
                        </span>
                      )}
                    </span>
                    <PriceTag
                      price={o.price}
                      priceMax={o.priceMax}
                      currency={o.currency}
                      isEstimated={o.isEstimated}
                      className="text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => add(o)}
                      disabled={adding === o.venue}
                      className="rounded-md px-2 py-1 text-[0.6875rem] font-medium"
                      style={{ background: "var(--ink-1)", color: "var(--on-ink)" }}
                    >
                      {adding === o.venue ? "Adding" : "Add"}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs ink-3">No real venues found for this category.</p>
            )}
            {error && <p className="mt-2 text-xs ink-3">{error}</p>}
          </div>
        </>
      )}
      <button
        type="button"
        onClick={mode === "options" ? () => setMode("pick") : reset}
        className="mt-3 text-xs ink-3 transition-colors duration-[var(--d1)] hover:text-[var(--ink-1)]"
      >
        {mode === "options" ? "Back to categories" : "Cancel"}
      </button>
    </div>
  );
}

export function ItineraryDay({
  day,
  travellers,
  expanded,
  animate,
  onToggle,
  onReplace,
  onRemove,
  onAdd,
  selectedStopId = null,
  onSelectStop,
  highlightId = null,
  onHighlightEnd,
}: {
  day: ComposedDay;
  travellers: number;
  expanded: boolean;
  animate: boolean;
  onToggle: () => void;
  onReplace: (next: ComposedItem) => void;
  onRemove: (itemId: number) => Promise<void>;
  onAdd: (dayId: string, item: ComposedItem) => void;
  selectedStopId?: number | null;
  onSelectStop?: (itemId: number) => void;
  highlightId?: number | null;
  onHighlightEnd?: () => void;
}) {
  const total = rollup(
    day.items.map((it) => ({
      price: it.price,
      priceMax: it.priceMax,
      isEstimated: it.isEstimated,
    }))
  );
  const count = day.items.length;

  return (
    <section>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-start justify-between gap-4 text-left"
      >
        <span className="flex items-start gap-2">
          <span aria-hidden="true" className="mt-1.5 ink-3">
            <svg
              width="10"
              height="10"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className={`${
                animate
                  ? "transition-transform duration-[var(--d1)] ease-[var(--ease)]"
                  : ""
              } ${expanded ? "rotate-90" : ""}`}
            >
              <path d="M6 3l5 5-5 5" />
            </svg>
          </span>
          <span>
            <span className="eyebrow block">Day {day.dayIndex + 1}</span>
            <span className="mt-1 block num text-lg ink-0">
              {formatDayDate(day.date)}
            </span>
            {!expanded && (
              <span className="mt-0.5 block text-xs ink-3">
                {count} {count === 1 ? "activity" : "activities"}
              </span>
            )}
          </span>
        </span>
        <span className="text-right">
          <span className="eyebrow block">Day total</span>
          <span className="mt-1 block num text-lg ink-0">
            <span className="mr-1 text-sm ink-3">{day.currency}</span>
            <PriceRoll value={total.average} />
          </span>
          {expanded && Math.round(total.ceiling) > Math.round(total.average) && (
            <span className="block num text-[0.6875rem] ink-3">
              up to {formatMoney(total.ceiling, day.currency)}
            </span>
          )}
        </span>
      </button>

      <div
        className={`grid ${
          animate
            ? "transition-[grid-template-rows] duration-[var(--d2)] ease-[var(--ease)]"
            : ""
        } ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <div className="mt-6">
            {count === 0 ? (
              <p className="rounded-xl p-6 text-sm ink-3 surface-2 shadow-[var(--elev-raise)]">
                {day.rhythm === "rest"
                  ? "Rest day, nothing planned."
                  : "No activity found for this day."}
              </p>
            ) : (
              day.items.map((item, i) => (
                <ActivityRow
                  key={item.id || `${item.category}-${i}`}
                  item={item}
                  number={i + 1}
                  time={scheduleTime(i, count)}
                  travellers={travellers}
                  isFirst={i === 0}
                  isLast={i === count - 1}
                  onReplace={onReplace}
                  onRemove={() => onRemove(item.id)}
                  mapSelected={selectedStopId === item.id}
                  onShowOnMap={
                    onSelectStop && item.lat != null && item.lon != null
                      ? () => onSelectStop(item.id)
                      : undefined
                  }
                  highlighted={highlightId === item.id}
                  onHighlightEnd={onHighlightEnd}
                />
              ))
            )}
          </div>

          {day.id && (
            <div className={`${RAIL} ${count === 0 ? "mt-3" : ""}`}>
              <span />
              <span />
              <AddActivity dayId={day.id} onAdd={(it) => onAdd(day.id!, it)} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
