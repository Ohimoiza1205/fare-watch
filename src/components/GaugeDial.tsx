"use client";

import { useEffect, useRef, useState } from "react";

// A semicircular readout: flat side down, value sweeps from 180deg (left) to
// 0deg (right) through the top. First mount lands instantly; a later value
// change sweeps the arc so the eye can track how far it moved, not just where
// it landed.
const SWEEP_MS = 1100;

function pointAt(cx: number, cy: number, r: number, value: number): { x: number; y: number } {
  const theta = ((180 - value * 180) * Math.PI) / 180;
  return { x: cx + r * Math.cos(theta), y: cy - r * Math.sin(theta) };
}

function arcPath(cx: number, cy: number, r: number, from: number, to: number): string {
  const start = pointAt(cx, cy, r, from);
  const end = pointAt(cx, cy, r, to);
  const sweptDeg = Math.abs(to - from) * 180;
  const largeArc = sweptDeg > 180 ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

export function GaugeDial({
  value,
  size = 120,
  color = "var(--accent)",
  label,
  className,
}: {
  value: number;
  size?: number;
  color?: string;
  label?: string;
  className?: string;
}) {
  const clamped = Math.min(1, Math.max(0, value));
  const mounted = useRef(false);
  const shownRef = useRef(clamped);
  const [shown, setShown] = useState(clamped);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (!mounted.current) {
      // first paint: land on the given value at once, no sweep
      mounted.current = true;
      shownRef.current = clamped;
      setShown(clamped);
      return;
    }

    const from = shownRef.current;
    const to = clamped;
    if (from === to) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      shownRef.current = to;
      const raf = requestAnimationFrame(() => setShown(to));
      return () => cancelAnimationFrame(raf);
    }

    let start: number | null = null;
    const step = (now: number) => {
      if (start === null) start = now;
      const t = Math.min(1, (now - start) / SWEEP_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = from + (to - from) * eased;
      shownRef.current = next;
      setShown(next);
      if (t < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [clamped]);

  const strokeW = Math.max(6, size * 0.09);
  const pad = strokeW / 2 + 1;
  const r = size / 2 - pad;
  const cx = size / 2;
  const cy = r + pad;
  const svgHeight = cy + pad;

  const trackPath = arcPath(cx, cy, r, 0, 1);
  const valuePath = arcPath(cx, cy, r, 0, shown);

  return (
    <div className={`relative ${className ?? ""}`} style={{ width: size }}>
      <svg width={size} height={svgHeight} aria-hidden="true">
        <path d={trackPath} fill="none" stroke="var(--hairline-strong)" strokeWidth={strokeW} strokeLinecap="round" />
        <path d={valuePath} fill="none" stroke={color} strokeWidth={strokeW} strokeLinecap="round" />
      </svg>
      <div
        className="absolute inset-x-0 flex flex-col items-center"
        style={{ top: Math.max(cy - r * 0.6, 0) }}
      >
        <span className="num" style={{ fontSize: size * 0.18, color: "var(--ink-0)", lineHeight: 1 }}>
          {Math.round(shown * 100)}%
        </span>
        {label && (
          <span className="mt-1" style={{ fontSize: 10, color: "var(--ink-3)" }}>
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
