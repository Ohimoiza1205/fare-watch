"use client";

import { useState } from "react";
import Link from "next/link";

// The bar above the plan. A back control, the trip title as an editable field,
// chips for the dates, the travellers, and the trip brief, and a share control on
// the right. The brief opens in place from the real trip facts.

type Brief = {
  destination: string;
  dates: string;
  travellers: number;
  pace: string;
  taste: string[];
  maximum: string | null;
};

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full px-2.5 py-1 text-xs ink-2 surface-1">
      {children}
    </span>
  );
}

export function TripHeaderBar({
  defaultTitle,
  dates,
  travellers,
  brief,
  backHref = "/plan",
}: {
  defaultTitle: string;
  dates: string;
  travellers: number;
  brief: Brief;
  backHref?: string;
}) {
  const [title, setTitle] = useState(defaultTitle);
  const [showBrief, setShowBrief] = useState(false);
  const [shared, setShared] = useState(false);

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShared(true);
      window.setTimeout(() => setShared(false), 2000);
    } catch {
      setShared(false);
    }
  }

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <Link
          href={backHref}
          className="flex items-center gap-1.5 text-sm ink-2 transition-colors hover:text-[var(--ink-0)]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Back
        </Link>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Trip title"
          className="min-w-0 flex-1 border-b border-transparent bg-transparent pb-0.5 text-lg ink-0 outline-none transition-colors focus:border-[var(--hairline-strong)]"
        />

        <button
          type="button"
          onClick={share}
          className="rounded-md px-3 py-1.5 text-sm font-medium transition-opacity hover:opacity-90"
          style={{ background: "var(--ink-0)", color: "var(--on-ink)" }}
        >
          {shared ? "Link copied" : "Share trip"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Chip>{dates}</Chip>
        <Chip>{travellers} travellers</Chip>
        <button
          type="button"
          onClick={() => setShowBrief((v) => !v)}
          aria-expanded={showBrief}
          className="rounded-full px-2.5 py-1 text-xs ink-2 surface-1 transition-colors hover:text-[var(--ink-0)]"
        >
          {showBrief ? "Hide trip brief" : "View trip brief"}
        </button>
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
