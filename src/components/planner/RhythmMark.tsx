import type { Rhythm } from "@/lib/planner/types";

// How full a day is, read as a level rather than a colour. A rest day is a
// hollow ring, a light day one bar, a full day three rising bars. The eye reads
// the trip's cadence down the rail without a legend.

export function RhythmMark({ rhythm }: { rhythm: Rhythm }) {
  const stroke = "var(--ink-3)";
  const fill = "var(--ink-2)";

  if (rhythm === "rest") {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <circle cx="6" cy="6" r="3.2" fill="none" stroke={stroke} strokeWidth="1.2" />
      </svg>
    );
  }

  if (rhythm === "light") {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <rect x="5" y="4" width="2" height="4" rx="0.5" fill={fill} />
      </svg>
    );
  }

  // full: three rising bars, a signal at strength
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <rect x="1.5" y="7" width="2" height="3" rx="0.5" fill={fill} />
      <rect x="5" y="5" width="2" height="5" rx="0.5" fill={fill} />
      <rect x="8.5" y="2.5" width="2" height="7.5" rx="0.5" fill={fill} />
    </svg>
  );
}

export function rhythmLabel(rhythm: Rhythm): string {
  return rhythm === "rest" ? "Rest" : rhythm === "full" ? "Full" : "Light";
}
