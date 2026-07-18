"use client";

import { useEffect, useId, useRef, useState } from "react";
import { DURATION_DRAW } from "@/lib/motion";

// An upgraded Sparkline for surfaces that want a hover readout: scrubbing
// finds the nearest point by time (not index), so a route with a data gap
// still reads its true shape rather than compressing the gap away. The draw-in
// and the reduced-motion pattern below mirror Sparkline.tsx.
type ScrubPoint = { t: number; v: number };
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

function fmtDate(t: number): string {
  return new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function ScrubSparkline({
  points,
  width = 200,
  height = 52,
  stroke = "var(--ink-1)",
  area = true,
  baseline,
  gapMs = Infinity,
  formatValue = (v: number) => String(Math.round(v)),
  animate = true,
  className,
}: {
  points: ScrubPoint[];
  width?: number;
  height?: number;
  stroke?: string;
  area?: boolean;
  baseline?: number;
  gapMs?: number;
  formatValue?: (v: number) => string;
  animate?: boolean;
  className?: string;
}) {
  const gradientId = useId();
  const groupRef = useRef<SVGGElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [drawn, setDrawn] = useState(!animate);
  const [ping, setPing] = useState(false);
  const [pingGrown, setPingGrown] = useState(false);
  const [hover, setHover] = useState<(Point & ScrubPoint) | null>(null);

  useEffect(() => {
    if (!animate) return;
    const group = groupRef.current;
    if (!group) return;
    const paths = Array.from(group.querySelectorAll<SVGPathElement>("[data-line]"));
    if (paths.length === 0) {
      setDrawn(true);
      return;
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      const raf = requestAnimationFrame(() => setDrawn(true));
      return () => cancelAnimationFrame(raf);
    }

    const lens = paths.map((p) => p.getTotalLength());
    paths.forEach((p, i) => {
      p.style.strokeDasharray = `${lens[i]}`;
      p.style.strokeDashoffset = `${lens[i]}`;
    });

    let raf = 0;
    let start: number | null = null;
    const duration = DURATION_DRAW;
    const step = (now: number) => {
      if (start === null) start = now;
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      paths.forEach((p, i) => {
        p.style.strokeDashoffset = `${lens[i] * (1 - eased)}`;
      });
      if (t < 1) {
        raf = requestAnimationFrame(step);
      } else {
        paths.forEach((p) => {
          p.style.strokeDasharray = "";
          p.style.strokeDashoffset = "";
        });
        setDrawn(true);
        setPing(true);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [animate]);

  // The glow ping fires once, right after the draw completes.
  useEffect(() => {
    if (!ping) return;
    const raf = requestAnimationFrame(() => setPingGrown(true));
    return () => cancelAnimationFrame(raf);
  }, [ping]);

  if (points.length < 2) {
    return <svg width={width} height={height} aria-hidden="true" />;
  }

  const minT = points[0].t;
  const maxT = points[points.length - 1].t;
  const spanT = maxT - minT || 1;
  const values = points.map((p) => p.v);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const spanV = maxV - minV || 1;
  const pad = 5;
  const innerH = height - pad * 2;

  const x = (t: number) => pad + ((t - minT) / spanT) * (width - pad * 2);
  const y = (v: number) => pad + innerH - ((v - minV) / spanV) * innerH;

  const px = points.map((p) => ({ x: x(p.t), y: y(p.v), t: p.t, v: p.v }));

  const segments: (typeof px)[] = [];
  let current: typeof px = [];
  for (let i = 0; i < px.length; i++) {
    if (i > 0 && px[i].t - px[i - 1].t > gapMs) {
      segments.push(current);
      current = [];
    }
    current.push(px[i]);
  }
  if (current.length) segments.push(current);

  const last = px[px.length - 1];

  const handleMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = width / rect.width;
    const localX = (e.clientX - rect.left) * scaleX;
    let nearest = px[0];
    let nearestDist = Math.abs(px[0].x - localX);
    for (const p of px) {
      const d = Math.abs(p.x - localX);
      if (d < nearestDist) {
        nearest = p;
        nearestDist = d;
      }
    }
    setHover(nearest);
  };

  const handleLeave = () => setHover(null);

  const chipValueText = hover ? formatValue(hover.v) : "";
  const chipDateText = hover ? fmtDate(hover.t) : "";
  const chipW = Math.max(48, Math.max(chipValueText.length, chipDateText.length) * 6.4 + 16);
  const chipH = 30;
  const chipX = hover ? Math.min(Math.max(hover.x - chipW / 2, 2), width - chipW - 2) : 0;
  const chipY = hover ? Math.max(hover.y - chipH - 10, 2) : 0;

  return (
    <div className={className}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        aria-hidden="true"
        onPointerMove={handleMove}
        onPointerLeave={handleLeave}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>

        {baseline != null && (
          <line
            x1={pad}
            x2={width - pad}
            y1={y(baseline).toFixed(1)}
            y2={y(baseline).toFixed(1)}
            stroke="var(--ink-4)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        )}

        <g ref={groupRef}>
          {segments.map((seg, i) => {
            if (seg.length === 1) {
              return (
                <circle
                  key={i}
                  cx={seg[0].x.toFixed(1)}
                  cy={seg[0].y.toFixed(1)}
                  r="2.5"
                  fill={stroke}
                />
              );
            }
            const line = smoothPath(seg);
            const areaPath = `${line} L ${seg[seg.length - 1].x.toFixed(1)} ${height} L ${seg[0].x.toFixed(1)} ${height} Z`;
            return (
              <g key={i}>
                {area && (
                  <path
                    d={areaPath}
                    fill={`url(#${gradientId})`}
                    style={{ opacity: drawn ? 1 : 0, transition: "opacity var(--d-fade) var(--ease)" }}
                  />
                )}
                <path
                  data-line
                  d={line}
                  fill="none"
                  stroke={stroke}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeOpacity="0.9"
                />
              </g>
            );
          })}
        </g>

        {/* current point, a quiet marker under the one-shot ping */}
        <circle cx={last.x.toFixed(1)} cy={last.y.toFixed(1)} r="2.5" fill={stroke} />

        {ping && (
          <circle
            cx={last.x.toFixed(1)}
            cy={last.y.toFixed(1)}
            r={pingGrown ? 9 : 3}
            fill="none"
            stroke={stroke}
            strokeWidth="1.5"
            style={{
              opacity: pingGrown ? 0 : 0.55,
              transition: "r var(--d-fade) var(--ease), opacity var(--d-fade) var(--ease)",
              pointerEvents: "none",
            }}
          />
        )}

        {hover && (
          <g pointerEvents="none">
            <line
              x1={hover.x.toFixed(1)}
              x2={hover.x.toFixed(1)}
              y1={pad}
              y2={height - pad}
              stroke="var(--ink-3)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <circle cx={hover.x.toFixed(1)} cy={hover.y.toFixed(1)} r="3" fill={stroke} />

            <rect
              x={chipX.toFixed(1)}
              y={chipY.toFixed(1)}
              width={chipW.toFixed(1)}
              height={chipH}
              rx="4"
              fill="var(--surface-3)"
              stroke="var(--hairline)"
              strokeWidth="1"
            />
            <text
              x={(chipX + chipW / 2).toFixed(1)}
              y={(chipY + 12).toFixed(1)}
              textAnchor="middle"
              fontFamily="var(--font-jetbrains-mono), ui-monospace, monospace"
              fontSize="10"
              fill="var(--ink-0)"
            >
              {chipValueText}
            </text>
            <text
              x={(chipX + chipW / 2).toFixed(1)}
              y={(chipY + 23).toFixed(1)}
              textAnchor="middle"
              fontFamily="var(--font-jetbrains-mono), ui-monospace, monospace"
              fontSize="10"
              fill="var(--ink-3)"
            >
              {chipDateText}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
