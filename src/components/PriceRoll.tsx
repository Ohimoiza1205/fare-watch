"use client";

import { useEffect, useRef, useState } from "react";
import { DURATION_ROLL } from "@/lib/motion";

// Counts from the old fare to the new one when a poll changes the price,
// decelerating as it lands. It does not animate on first paint: the initial
// value is rendered as is, and motion happens only on a real change.
export function PriceRoll({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const from = prev.current;
    const to = value;
    if (from === to) return; // no change, no motion
    prev.current = to;

    // Reduced motion: land on the new value at once, no counting.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      frame.current = requestAnimationFrame(() => setDisplay(to));
      return () => {
        if (frame.current) cancelAnimationFrame(frame.current);
      };
    }

    const duration = DURATION_ROLL;
    let started: number | null = null;
    const step = (now: number) => {
      if (started === null) started = now;
      const t = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - t, 4); // decelerate hard, settle onto the value
      setDisplay(from + (to - from) * eased);
      if (t < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);

    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [value]);

  return (
    <span className={className}>{Math.round(display).toLocaleString("en-GB")}</span>
  );
}
