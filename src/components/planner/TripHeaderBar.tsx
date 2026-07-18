"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DestinationImage } from "@/components/DestinationImage";

// The destination header band: a wide softly faded destination photo (the warm
// tile always underneath, so never a broken image) blending down into the blue
// canvas, with the itinerary eyebrow, the editable kinetic trip title, and the
// real dates, length, and country on a soft white scrim. Edit trip opens the
// brief in place; share and the assistant action keep their existing
// behaviour. The dates chip keeps its picker with apply disabled, because a
// silent desync would be worse than no edit.

type Brief = {
  destination: string;
  dates: string;
  travellers: number;
  pace: string;
  taste: string[];
  maximum: string | null;
};

const LINK_COPIED_HOLD = 2000;

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
        className="pressable flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ink-2 surface-1 hover:text-[var(--ink-0)]"
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
  city,
  country,
  lengthDays,
  dates,
  startDate,
  endDate,
  travellers,
  budget,
  brief,
  backHref = "/plan",
}: {
  defaultTitle: string;
  city: string;
  country: string | null;
  lengthDays: number;
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

  const subLine = [dates, `${lengthDays} ${lengthDays === 1 ? "day" : "days"}`, country]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mb-6">
      <div className="relative overflow-hidden rounded-[var(--r-card)]">
        <div className="absolute inset-0">
          <DestinationImage place={city} className="h-full w-full" />
        </div>
        {/* the photo fades down into the canvas so the band belongs to the page */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 35%, var(--bg) 100%)",
          }}
        />

        <div className="relative flex min-h-44 flex-col justify-between p-4">
          <div className="flex items-start justify-between gap-3">
            <Link
              href={backHref}
              className="pressable flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs"
              style={{
                background: "rgba(255,255,255,0.75)",
                color: "var(--ink-1)",
                backdropFilter: "blur(6px)",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Back
            </Link>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={share}
                className="pressable rounded-full px-3 py-1.5 text-xs"
                style={{
                  background: "rgba(255,255,255,0.75)",
                  color: "var(--ink-1)",
                  backdropFilter: "blur(6px)",
                }}
              >
                <span aria-live="polite">{shared ? "Link copied" : "Share trip"}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowBrief((v) => !v)}
                aria-expanded={showBrief}
                className="pressable rounded-full px-3 py-1.5 text-xs"
                style={{
                  background: "rgba(255,255,255,0.75)",
                  color: "var(--ink-1)",
                  backdropFilter: "blur(6px)",
                }}
              >
                Edit trip
              </button>
              <button
                type="button"
                onClick={goToAssistant}
                className="pressable rounded-full px-3 py-1.5 text-xs font-medium"
                style={{ background: "var(--ink-0)", color: "var(--on-ink)" }}
              >
                Ask the assistant
              </button>
            </div>
          </div>

          <div
            className="mt-6 w-fit max-w-full rounded-xl px-4 py-3"
            style={{
              background: "rgba(255,255,255,0.72)",
              backdropFilter: "blur(8px)",
            }}
          >
            <span className="eyebrow">Itinerary</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-label="Trip title"
              className="heading kinetic mt-0.5 w-full border-b border-transparent bg-transparent pb-0.5 text-2xl outline-none transition-colors duration-[var(--d1)] focus:border-[var(--hairline-strong)]"
              style={{ color: "var(--ink-0)" }}
            />
            <div className="num mt-1 text-sm" style={{ color: "var(--ink-1)" }}>
              {subLine}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <DatesChip dates={dates} startDate={startDate} endDate={endDate} />
              <span className="rounded-full px-2.5 py-1 text-xs ink-2 surface-1">
                <span className="num">{travellers}</span> travellers
              </span>
              {budget && (
                <span className="rounded-full px-2.5 py-1 text-xs ink-2 surface-1">
                  Budget <span className="num">{budget}</span>
                </span>
              )}
            </div>
          </div>
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
