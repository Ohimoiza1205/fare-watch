"use client";

import { useEffect, useRef } from "react";

// The ambient backdrop for the dark tracker canvas, per REBRAND-SPEC Part 2:
// a single slow gradient wash, one soft radial light source drifting across
// roughly 90 seconds per loop, barely perceptible, one colour at a time.
// No particles, no grain. Absent under reduced motion (the .atmosphere CSS
// rule removes it), paused while the tab is hidden, never mounted on the
// planner canvas. The warm prop keeps the evening hue shift.

const COOL = "rgba(109, 123, 216, 0.5)";
const WARM = "rgba(255, 122, 69, 0.45)";

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
          background: `radial-gradient(circle, ${warm ? WARM : COOL} 0%, transparent 65%)`,
        }}
      />
    </div>
  );
}
