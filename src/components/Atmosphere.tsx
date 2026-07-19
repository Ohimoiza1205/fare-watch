"use client";

import { useEffect, useRef } from "react";

// The ambient backdrop for the dark tracker canvas, per REBRAND-SPEC Part 2:
// a single slow gradient wash, one soft radial light source drifting across
// roughly 90 seconds per loop, barely perceptible, one colour at a time.
// No particles, no grain. Absent under reduced motion (the .atmosphere CSS
// rule removes it), paused while the tab is hidden, never mounted on the
// planner canvas. TONE-SPEC Part 1 retints the base toward the warm accent;
// the warm prop keeps the evening hue shift, a softer coral.

const BASE = "rgba(255, 87, 34, 0.4)";
const EVENING = "rgba(255, 122, 69, 0.5)";

export function Atmosphere({ warm = false }: { warm?: boolean }) {
  const washRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onVisibility() {
      const el = washRef.current;
      if (el) el.style.animationPlayState = document.hidden ? "paused" : "running";
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return (
    <div
      className="atmosphere fixed inset-0 z-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      <div
        ref={washRef}
        className="atmo-wash absolute"
        style={{
          background: `radial-gradient(circle, ${warm ? EVENING : BASE} 0%, transparent 65%)`,
        }}
      />
    </div>
  );
}
