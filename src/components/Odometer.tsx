"use client";

import { useEffect, useState } from "react";
import { DURATION_ROLL } from "@/lib/motion";

// A vertical digit reel per character. Keys run from the right so the least
// significant digits hold their identity (and keep animating smoothly) when
// the number of characters changes, e.g. 999 to 1,000.
const CELL_H = 1.2; // em

type MotionState = "initial" | "reduced" | "animate";

export function Odometer({
  value,
  className,
  decimals = 0,
}: {
  value: number;
  className?: string;
  decimals?: number;
}) {
  const [motion, setMotion] = useState<MotionState>("initial");

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const raf = requestAnimationFrame(() => setMotion(reduce ? "reduced" : "animate"));
    return () => cancelAnimationFrame(raf);
  }, []);

  const animate = motion === "animate";

  const formatted = Math.abs(value).toLocaleString("en-GB", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const chars = formatted.split("");

  return (
    <span className={`num inline-flex items-baseline ${className ?? ""}`}>
      {chars.map((ch, i) => {
        const fromRight = chars.length - 1 - i;
        const key = `p${fromRight}`;
        const isDigit = ch >= "0" && ch <= "9";

        if (!isDigit) {
          return (
            <span key={key} className="inline-block text-center" style={{ width: ch === "," || ch === "." ? "0.35em" : "0.5em" }}>
              {ch}
            </span>
          );
        }

        const digit = Number(ch);
        return (
          <span
            key={key}
            className="relative inline-block overflow-hidden align-bottom"
            style={{ height: `${CELL_H}em`, width: "0.64em" }}
          >
            <span
              className="absolute inset-x-0 left-0 flex flex-col items-center"
              style={{
                transform: `translateY(-${digit * CELL_H}em)`,
                transition: animate ? `transform ${DURATION_ROLL}ms var(--ease)` : "none",
              }}
            >
              {Array.from({ length: 10 }, (_, d) => (
                <span key={d} style={{ height: `${CELL_H}em`, lineHeight: `${CELL_H}em` }}>
                  {d}
                </span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}
