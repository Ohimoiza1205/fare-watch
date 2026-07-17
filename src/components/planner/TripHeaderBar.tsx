"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { VenueImage } from "./VenueImage";

// The bar above the plan. A back control, a small destination thumbnail, the
// trip title as an editable field with the date, traveller, and budget chips
// stacked under it, then a quiet share control and the primary action on the
// right. The brief opens in place from the real trip facts.

type Brief = {
  destination: string;
  dates: string;
  travellers: number;
  pace: string;
  taste: string[];
  maximum: string | null;
};

// How long the copied note holds before the label reverts. A reading pause,
// not a motion duration, so it does not come from the motion tokens.
const LINK_COPIED_HOLD = 2000;

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full px-2.5 py-1 text-xs ink-2 surface-1">
      {children}
    </span>
  );
}

// The dates chip opens a small popover with the two native date fields. Apply
// stays disabled: changing the range would desync the generated days, and the
// re-flow that makes it safe is a later task. No silent partial updates.
function DatesChip({
  dates,
  startDate,
  endDate,
}: {
  dates: string;
  startDate: string | null;
  endDate: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [depart, setDepart] = useState(startDate ?? "");
  const [ret, setRet] = useState(endDate ?? "");
  const chipRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const departRef = useRef<HTMLInputElement>(null);

  function close() {
    setOpen(false);
    chipRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    departRef.current?.focus();
    function onDown(e: PointerEvent) {
      const t = e.target as Node;
      if (popRef.current?.contains(t) || chipRef.current?.contains(t)) return;
      setOpen(false);
      chipRef.current?.focus();
    }
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={chipRef}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ink-2 surface-1 transition-colors duration-[var(--d1)] hover:text-[var(--ink-0)]"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        <span className="num">{dates}</span>
      </button>

      {open && (
        <div
          ref={popRef}
          role="dialog"
          aria-label="Trip dates"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              close();
            }
          }}
          className="absolute left-0 top-full z-20 mt-2 w-60 rounded-xl border p-3 surface-2 shadow-[var(--elev-float)]"
          style={{ borderColor: "var(--hairline)" }}
        >
          <label className="block">
            <span className="eyebrow">Depart</span>
            <input
              ref={departRef}
              type="date"
              value={depart}
              onChange={(e) => setDepart(e.target.value)}
              className="mt-1 w-full rounded-md border bg-transparent px-2 py-1.5 text-xs num ink-0 outline-none focus:border-[var(--ink-3)]"
              style={{ borderColor: "var(--hairline-strong)" }}
            />
          </label>
          <label className="mt-2.5 block">
            <span className="eyebrow">Return</span>
            <input
              type="date"
              value={ret}
              onChange={(e) => setRet(e.target.value)}
              className="mt-1 w-full rounded-md border bg-transparent px-2 py-1.5 text-xs num ink-0 outline-none focus:border-[var(--ink-3)]"
              style={{ borderColor: "var(--hairline-strong)" }}
            />
          </label>
          <button
            type="button"
            disabled
            className="mt-3 w-full rounded-md px-3 py-1.5 text-xs font-medium opacity-50"
            style={{ background: "var(--ink-0)", color: "var(--on-ink)" }}
          >
            Apply
          </button>
          <p className="mt-2 text-[0.6875rem] leading-relaxed ink-3">
            Date changes rebuild the plan. Not built yet.
          </p>
        </div>
      )}
    </div>
  );
}

export function TripHeaderBar({
  defaultTitle,
  destination,
  dates,
  startDate,
  endDate,
  travellers,
  budget,
  brief,
  backHref = "/plan",
}: {
  defaultTitle: string;
  destination: string;
  dates: string;
  startDate: string | null;
  endDate: string | null;
  travellers: number;
  budget: string | null;
  brief: Brief;
  backHref?: string;
}) {
  const [title, setTitle] = useState(defaultTitle);
  const [showBrief, setShowBrief] = useState(false);
  const [shared, setShared] = useState(false);

  async function share() {
    const url = window.location.href;
    if (typeof navigator.share === "function") {
      // Cancelling the share sheet is not an error worth surfacing.
      try {
        await navigator.share({ url });
      } catch {}
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
      window.setTimeout(() => setShared(false), LINK_COPIED_HOLD);
    } catch {
      setShared(false);
    }
  }

  // The assistant is the page's working control surface, so the primary action
  // takes the eye there and puts the cursor in its input.
  function goToAssistant() {
    const el = document.getElementById("assistant-input");
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    el.focus({ preventScroll: true });
  }

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <Link
          href={backHref}
          className="flex items-center gap-1.5 text-sm ink-2 transition-colors duration-[var(--d1)] hover:text-[var(--ink-0)]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Back
        </Link>

        {/* The destination stands in for a venue: no category of its own, so the
            outdoors tile carries it, and the seam keeps it from ever being a
            broken box. */}
        <VenueImage
          category="outdoors"
          venueName={destination}
          active
          className="h-14 w-14 shrink-0 rounded-lg"
        />

        <div className="min-w-0 flex-1">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-label="Trip title"
            className="w-full border-b border-transparent bg-transparent pb-0.5 text-lg ink-0 outline-none transition-colors duration-[var(--d1)] focus:border-[var(--hairline-strong)]"
          />

          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <DatesChip dates={dates} startDate={startDate} endDate={endDate} />
            <Chip>
              <span className="num">{travellers}</span> travellers
            </Chip>
            {budget && (
              <Chip>
                Budget <span className="num">{budget}</span>
              </Chip>
            )}
            <button
              type="button"
              onClick={() => setShowBrief((v) => !v)}
              aria-expanded={showBrief}
              className="rounded-full px-2.5 py-1 text-xs ink-2 surface-1 transition-colors duration-[var(--d1)] hover:text-[var(--ink-0)]"
            >
              {showBrief ? "Hide trip brief" : "View trip brief"}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={share}
            className="rounded-md border px-3 py-1.5 text-sm ink-1 transition-colors duration-[var(--d1)] hover:text-[var(--ink-0)]"
            style={{ borderColor: "var(--hairline-strong)" }}
          >
            <span aria-live="polite">{shared ? "Link copied" : "Share trip"}</span>
          </button>
          <button
            type="button"
            onClick={goToAssistant}
            className="rounded-md px-3 py-1.5 text-sm font-medium transition-opacity duration-[var(--d1)] hover:opacity-90"
            style={{ background: "var(--ink-0)", color: "var(--on-ink)" }}
          >
            Ask the assistant
          </button>
        </div>
      </div>

      <div
        className={`grid transition-[grid-template-rows] duration-[var(--d2)] ease-[var(--ease)] ${
          showBrief ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <dl className="mt-3 grid gap-x-8 gap-y-2 rounded-xl p-4 text-sm surface-2 shadow-[var(--elev-raise)] sm:grid-cols-2">
            <BriefRow label="Destination" value={brief.destination} />
            <BriefRow label="Dates" value={brief.dates} />
            <BriefRow label="Travellers" value={String(brief.travellers)} />
            <BriefRow label="Pace" value={brief.pace} />
            <BriefRow
              label="Taste"
              value={brief.taste.length ? brief.taste.join(", ") : "no preference set"}
            />
            {brief.maximum && <BriefRow label="Maximum" value={brief.maximum} />}
          </dl>
        </div>
      </div>
    </div>
  );
}

function BriefRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="eyebrow">{label}</dt>
      <dd className="min-w-0 truncate text-right ink-1">{value}</dd>
    </div>
  );
}
