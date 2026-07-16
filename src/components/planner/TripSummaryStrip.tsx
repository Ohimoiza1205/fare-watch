"use client";

import { PriceRoll } from "@/components/PriceRoll";

// A compact strip of trip stats at the foot of the plan. Each stat has a small
// tinted icon, and the money figures roll to their new value when a swap changes
// them. Tinted purely to read at a glance, not to carry category or status.

function Icon({
  hue,
  children,
}: {
  hue: number;
  children: React.ReactNode;
}) {
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
      style={{ background: `hsl(${hue} 45% 92%)`, color: `hsl(${hue} 45% 38%)` }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {children}
      </svg>
    </span>
  );
}

function Stat({
  hue,
  icon,
  label,
  children,
}: {
  hue: number;
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-4 py-3 surface-2 shadow-[var(--elev-raise)]">
      <Icon hue={hue}>{icon}</Icon>
      <span className="min-w-0">
        <span className="block eyebrow">{label}</span>
        <span className="mt-0.5 block num text-lg ink-0">{children}</span>
      </span>
    </div>
  );
}

export function TripSummaryStrip({
  durationDays,
  activityCount,
  estimatedTotal,
  dailyAverage,
  currency,
}: {
  durationDays: number;
  activityCount: number;
  estimatedTotal: number;
  dailyAverage: number;
  currency: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Stat
        hue={214}
        label="Duration"
        icon={<><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M4 9h16M8 3v4M16 3v4" /></>}
      >
        {durationDays} days
      </Stat>
      <Stat
        hue={192}
        label="Activities planned"
        icon={<><path d="M12 21s-7-5.2-7-11a7 7 0 0 1 14 0c0 5.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></>}
      >
        {activityCount}
      </Stat>
      <Stat
        hue={40}
        label="Estimated total"
        icon={<><ellipse cx="12" cy="7" rx="7" ry="3" /><path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" /></>}
      >
        <span className="mr-1 text-sm ink-3">{currency}</span>
        <PriceRoll value={estimatedTotal} />
      </Stat>
      <Stat
        hue={150}
        label="Daily average"
        icon={<><path d="M4 19V5M4 19h16M8 16l3-4 3 2 4-6" /></>}
      >
        <span className="mr-1 text-sm ink-3">{currency}</span>
        <PriceRoll value={dailyAverage} />
      </Stat>
    </div>
  );
}
