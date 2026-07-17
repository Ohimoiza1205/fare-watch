"use client";

import { useEffect, useRef, useState } from "react";
import type { ComposedItem } from "@/lib/planner/day";
import type { AlternativeOption } from "@/lib/planner/alternatives";
import { formatMoney } from "@/lib/planner/format";
import { categoryTags } from "@/lib/planner/schedule";
import { categoryTagStyle } from "@/lib/planner/categoryColor";
import { PriceTag } from "./PriceTag";
import { VenueImage } from "./VenueImage";

// One activity as a schedule row. The time and a numbered node sit in the left
// rail, joined by a connector so a day reads top to bottom. The card lifts on
// hover and opens to its detail on click, where the swap control fetches real
// alternatives in the same category and lets the traveller replace the item.
// A lock holds the item against swaps; the overflow menu carries swap and
// remove, the only two mutations the item supports.

function Node({ number, isFirst, isLast }: { number: number; isFirst: boolean; isLast: boolean }) {
  return (
    <div className="relative flex h-full flex-col items-center">
      <span
        className="w-px flex-1"
        style={{ background: isFirst ? "transparent" : "var(--hairline-strong)" }}
      />
      <span
        className="num flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[0.625rem] ink-2"
        style={{ background: "var(--surface-2)", boxShadow: "0 0 0 1px var(--hairline-strong)" }}
      >
        {number}
      </span>
      <span
        className="w-px flex-1"
        style={{ background: isLast ? "transparent" : "var(--hairline-strong)" }}
      />
    </div>
  );
}

function Tag({
  children,
  style,
}: {
  children: React.ReactNode;
  style: { background: string; color: string };
}) {
  return (
    <span
      className="rounded-full px-1.5 py-px text-[0.625rem] font-medium"
      style={style}
    >
      {children}
    </span>
  );
}

function LockIcon({ locked }: { locked: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
      {locked ? (
        <>
          <rect x="3" y="7" width="10" height="7" rx="1.5" fill="currentColor" />
          <path
            d="M5 7V5a3 3 0 0 1 6 0v2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </>
      ) : (
        <>
          <rect
            x="3"
            y="7"
            width="10"
            height="7"
            rx="1.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M5 7V5a3 3 0 0 1 6 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </>
      )}
    </svg>
  );
}

function DotsIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
      <circle cx="8" cy="3" r="1.4" />
      <circle cx="8" cy="8" r="1.4" />
      <circle cx="8" cy="13" r="1.4" />
    </svg>
  );
}

export function ActivityRow({
  item,
  number,
  time,
  travellers,
  isFirst,
  isLast,
  onReplace,
  onRemove,
}: {
  item: ComposedItem;
  number: number;
  time: string;
  travellers: number;
  isFirst: boolean;
  isLast: boolean;
  onReplace: (next: ComposedItem) => void;
  onRemove: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [alts, setAlts] = useState<AlternativeOption[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const title = item.venue ?? item.title;
  const hasPrice = item.price != null || item.priceMax != null;
  const perTraveller =
    item.price != null && travellers > 0 ? item.price / travellers : null;
  const basis = item.isEstimated
    ? item.note ?? "Estimated, typical local range for the party."
    : `Confirmed price via ${item.priceSource ?? "a real source"}.`;

  // Close the overflow menu on outside click or Escape; Escape hands focus
  // back to the trigger so the keyboard does not fall off the row.
  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: MouseEvent) {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !triggerRef.current?.contains(t)) {
        setMenuOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  async function loadAlternatives() {
    setLoading(true);
    try {
      const res = await fetch(`/api/items/${item.id}/alternatives`);
      const data = (await res.json()) as { options?: AlternativeOption[] };
      setAlts(data.options ?? []);
    } catch {
      setAlts([]);
    } finally {
      setLoading(false);
    }
  }

  async function apply(option: AlternativeOption) {
    setApplying(option.venue);
    try {
      const res = await fetch(`/api/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(option),
      });
      const data = (await res.json()) as { item?: ComposedItem };
      if (data.item) {
        onReplace(data.item);
        setAlts(null);
        setOpen(false);
      }
    } finally {
      setApplying(null);
    }
  }

  // Optimistic hold: the row reads locked at once, the write follows, a
  // failure reverts to the truth.
  async function toggleLock() {
    const next = { ...item, locked: !item.locked };
    onReplace(next);
    try {
      const res = await fetch(`/api/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locked: next.locked }),
      });
      const data = (await res.json()) as { item?: ComposedItem };
      if (!res.ok || !data.item) onReplace(item);
    } catch {
      onReplace(item);
    }
  }

  function startSwap() {
    setMenuOpen(false);
    setOpen(true);
    if (alts === null && !loading) void loadAlternatives();
  }

  async function handleRemove() {
    setRemoving(true);
    try {
      await onRemove();
    } finally {
      setRemoving(false);
      setMenuOpen(false);
    }
  }

  const ghostControl =
    "flex h-6 w-6 items-center justify-center rounded-md transition-[opacity,color] duration-[var(--d1)] ease-[var(--ease)]";
  const ghostHidden =
    "opacity-0 ink-3 hover:text-[var(--ink-1)] group-hover/card:opacity-100 group-focus-within/card:opacity-100";

  return (
    <div className="grid grid-cols-[2.5rem_1.25rem_minmax(0,1fr)] gap-x-2">
      <span className="num pt-3 text-right text-[0.6875rem] ink-3">{time}</span>
      <Node number={number} isFirst={isFirst} isLast={isLast} />

      <div className="pb-3">
        <div className="group/card relative flex w-full gap-2 rounded-xl p-2.5 surface-2 shadow-[var(--elev-raise)] transition-[transform,box-shadow] duration-[var(--d1)] ease-[var(--ease)] hover:-translate-y-0.5 hover:shadow-[var(--elev-float)]">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex min-w-0 flex-1 gap-3 text-left"
          >
            <VenueImage
              category={item.category}
              venueName={item.venue}
              active={open}
              className="h-16 w-16 shrink-0 rounded-lg"
            />

            <div className="min-w-0 flex-1">
              <div className="eyebrow">{item.category}</div>
              <div className="mt-0.5 truncate text-sm ink-0">{title}</div>
              {item.address && (
                <div className="mt-0.5 truncate text-[0.6875rem] ink-3">
                  {item.address}
                </div>
              )}
              <div className="mt-1.5 flex flex-wrap gap-1">
                {categoryTags(item.category).map((t) => (
                  <Tag key={t} style={categoryTagStyle(item.category)}>
                    {t}
                  </Tag>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-end justify-between">
              <span className="flex flex-col items-end">
                <PriceTag
                  price={item.price}
                  priceMax={item.priceMax}
                  currency={item.currency}
                  isEstimated={item.isEstimated}
                  className="text-sm"
                />
                {hasPrice && (
                  <span className="num mt-0.5 text-[0.625rem] ink-3">
                    {travellers > 1 ? `for ${travellers} people` : "per person"}
                  </span>
                )}
              </span>
              <span className="text-[0.625rem] ink-3 opacity-0 transition-opacity duration-[var(--d1)] group-hover/card:opacity-100">
                details
              </span>
            </div>
          </button>

          <div className="flex shrink-0 items-start gap-0.5">
            <button
              type="button"
              onClick={toggleLock}
              aria-pressed={item.locked}
              aria-label="Lock activity"
              className={`${ghostControl} ${item.locked ? "" : ghostHidden}`}
              style={
                item.locked
                  ? { background: "var(--accent-soft)", color: "var(--accent)" }
                  : undefined
              }
            >
              <LockIcon locked={item.locked} />
            </button>

            <div className="relative">
              <button
                ref={triggerRef}
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="More actions"
                className={`${ghostControl} ${menuOpen ? "ink-1" : ghostHidden}`}
              >
                <DotsIcon />
              </button>

              {menuOpen && (
                <div
                  ref={menuRef}
                  role="menu"
                  aria-label="Activity actions"
                  className="absolute right-0 top-full z-10 mt-1 w-44 rounded-lg p-1 surface-3"
                  style={{
                    boxShadow: "var(--elev-float), 0 0 0 1px var(--hairline-strong)",
                  }}
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={startSwap}
                    disabled={item.locked}
                    className={`block w-full rounded-md px-2.5 py-1.5 text-left text-xs ${
                      item.locked
                        ? "ink-4"
                        : "ink-1 transition-colors duration-[var(--d1)] hover:text-[var(--ink-0)] hover:bg-[var(--surface-1)]"
                    }`}
                  >
                    Swap
                  </button>
                  {item.locked && (
                    <p className="px-2.5 pb-1 text-[0.625rem] ink-3">
                      Locked. Unlock to swap.
                    </p>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleRemove}
                    disabled={removing}
                    className="block w-full rounded-md px-2.5 py-1.5 text-left text-xs ink-1 transition-colors duration-[var(--d1)] hover:text-[var(--ink-0)] hover:bg-[var(--surface-1)]"
                  >
                    {removing ? "Removing" : "Remove"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          className={`grid transition-[grid-template-rows] duration-[var(--d2)] ease-[var(--ease)] ${
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <div className="px-2.5 pt-2 text-xs leading-relaxed ink-3">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span>{basis}</span>
                {perTraveller != null && (
                  <span className="num">
                    {formatMoney(perTraveller, item.currency)} per traveller
                  </span>
                )}
                {item.sourceUrl && (
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ink-2 underline decoration-[var(--hairline-strong)] underline-offset-2 transition-colors hover:text-[var(--ink-0)]"
                  >
                    {item.isEstimated ? "View place" : "Open booking"}
                  </a>
                )}
              </div>

              <div className="mt-3">
                {item.locked ? (
                  <p className="text-xs ink-3">Locked. Unlock to swap.</p>
                ) : alts === null ? (
                  <button
                    type="button"
                    onClick={loadAlternatives}
                    disabled={loading}
                    className="rounded-md border px-2.5 py-1 text-xs ink-1 transition-colors hover:text-[var(--ink-0)]"
                    style={{ borderColor: "var(--hairline-strong)" }}
                  >
                    {loading ? "Finding real options" : "Swap this activity"}
                  </button>
                ) : alts.length === 0 ? (
                  <p className="text-xs ink-3">No other real venues found nearby.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {alts.map((o) => (
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
                          onClick={() => apply(o)}
                          disabled={applying === o.venue}
                          className="rounded-md px-2 py-1 text-[0.6875rem] font-medium"
                          style={{ background: "var(--ink-1)", color: "var(--on-ink)" }}
                        >
                          {applying === o.venue ? "Using" : "Use"}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
