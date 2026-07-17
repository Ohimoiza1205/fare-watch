"use client";

import { useEffect, useId, useRef, useState } from "react";
import { DURATION_DRAW } from "@/lib/motion";

// The price line is the anchor of a row. A smooth path with a soft area fill
// carries presence, while colour still does one job: the line and current point
// take the status accent only when the fare sits at or below its tenth
// percentile. The historical low is marked subtly so the eye reads where the
// current fare sits within its own range. The line draws in once on first load.
type Point = { x: number; y: number };

function smoothPath(pts: Point[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

export function Sparkline({
  prices,
  belowNormal,
  width = 200,
  height = 52,
  animate = true,
}: {
  prices: number[];
  belowNormal: boolean;
  width?: number;
  height?: number;
  animate?: boolean;
}) {
  const gradientId = useId();
  const lineRef = useRef<SVGPathElement>(null);
  const [drawn, setDrawn] = useState(!animate);

  useEffect(() => {
    if (!animate) return;
    const path = lineRef.current;
    if (!path) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      const raf = requestAnimationFrame(() => setDrawn(true));
      return () => cancelAnimationFrame(raf);
    }

    const len = path.getTotalLength();
    path.style.strokeDasharray = `${len}`;
    path.style.strokeDashoffset = `${len}`;

    let raf = 0;
    let start: number | null = null;
    const duration = DURATION_DRAW;
    const step = (now: number) => {
      if (start === null) start = now;
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      path.style.strokeDashoffset = `${len * (1 - eased)}`;
      if (t < 1) raf = requestAnimationFrame(step);
      else {
        path.style.strokeDasharray = "";
        path.style.strokeDashoffset = "";
        setDrawn(true);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [animate]);

  if (prices.length < 2) {
    return <svg width={width} height={height} aria-hidden="true" />;
  }

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || 1;
  const pad = 5;
  const innerH = height - pad * 2;

  const x = (i: number) => (i / (prices.length - 1)) * (width - pad * 2) + pad;
  const y = (p: number) => pad + innerH - ((p - min) / span) * innerH;

  const pts = prices.map((p, i) => ({ x: x(i), y: y(p) }));
  const line = smoothPath(pts);
  const area = `${line} L ${pts[pts.length - 1].x.toFixed(1)} ${height} L ${pts[0].x.toFixed(1)} ${height} Z`;

  const lowIndex = prices.indexOf(min);
  const stroke = belowNormal ? "var(--accent)" : "var(--ink-1)";

  return (
    <svg width={width} height={height} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>

      <path
        d={area}
        fill={`url(#${gradientId})`}
        style={{ opacity: drawn ? 1 : 0, transition: "opacity var(--d-fade) var(--ease)" }}
      />

      <path
        ref={lineRef}
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.9"
      />

      {/* historical low, marked subtly */}
      <circle
        cx={x(lowIndex).toFixed(1)}
        cy={y(min).toFixed(1)}
        r="2"
        fill="none"
        stroke="var(--ink-2)"
        strokeOpacity="0.5"
      />

      {/* current point */}
      <circle
        cx={pts[pts.length - 1].x.toFixed(1)}
        cy={pts[pts.length - 1].y.toFixed(1)}
        r="4.5"
        style={{ fill: stroke, opacity: 0.18 }}
      />
      <circle
        cx={pts[pts.length - 1].x.toFixed(1)}
        cy={pts[pts.length - 1].y.toFixed(1)}
        r="2.5"
        style={{ fill: stroke }}
      />
    </svg>
  );
}
