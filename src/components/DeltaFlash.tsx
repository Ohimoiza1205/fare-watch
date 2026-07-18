"use client";

import { useEffect, useRef, useState } from "react";

// A signed delta beside a figure that just moved. The host renders the figure
// itself; this renders only the chip, and only while the change is recent.
const HOLD_MS = 2000;
const FADE_MS = 500; // mirrors --d-fade

function defaultFormat(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

export function DeltaFlash({
  value,
  format = defaultFormat,
  className,
}: {
  value: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const prev = useRef(value);
  const [delta, setDelta] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const from = prev.current;
    const to = value;
    if (from === to) return; // no change, nothing to flash
    prev.current = to;

    setDelta(to - from);
    setVisible(true);

    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (clearTimer.current) clearTimeout(clearTimer.current);

    hideTimer.current = setTimeout(() => {
      setVisible(false);
      clearTimer.current = setTimeout(() => setDelta(null), FADE_MS);
    }, HOLD_MS);

    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (clearTimer.current) clearTimeout(clearTimer.current);
    };
  }, [value]);

  if (delta === null) return null;

  const color = delta < 0 ? "var(--cool)" : "var(--warm)";

  return (
    <span
      className={`num inline-block ${className ?? ""}`}
      style={{
        fontSize: 11,
        color,
        opacity: visible ? 1 : 0,
        transition: "opacity var(--d-fade) var(--ease)",
      }}
    >
      {format(delta)}
    </span>
  );
}
