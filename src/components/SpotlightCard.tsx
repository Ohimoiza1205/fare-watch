"use client";

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";

const MAX_TILT_DEG = 8;

type SpotlightCardProps = {
  children: ReactNode;
  className?: string;
  glow?: boolean;
  as?: "div";
};

// A card that tracks the cursor with a soft radial highlight and a slight
// tilt. Both are written straight to the element's own style on mousemove,
// bypassing React state, so the motion tracks the pointer at native speed;
// only the settle-back on leave runs through a CSS transition. Off entirely
// on touch and reduced motion, where this is just a card.
export function SpotlightCard({ children, className, glow = false, as = "div" }: SpotlightCardProps) {
  void as; // only "div" ships today; the prop exists so callers don't churn later

  const ref = useRef<HTMLDivElement | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const raf = requestAnimationFrame(() => setEnabled(!reduced && !coarse));
    return () => cancelAnimationFrame(raf);
  }, []);

  function handleMouseMove(event: MouseEvent<HTMLDivElement>) {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    el.style.setProperty("--spot-x", `${x}px`);
    el.style.setProperty("--spot-y", `${y}px`);

    const px = x / rect.width - 0.5;
    const py = y / rect.height - 0.5;
    const rotateY = px * MAX_TILT_DEG * 2;
    const rotateX = -py * MAX_TILT_DEG * 2;
    el.style.transition = "none";
    el.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  }

  function handleMouseEnter() {
    if (!enabled) return;
    setActive(true);
  }

  function handleMouseLeave() {
    if (!enabled) return;
    setActive(false);
    const el = ref.current;
    if (!el) return;
    el.style.transition = "transform var(--d3) cubic-bezier(0.34, 1.56, 0.64, 1)";
    el.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg)";
  }

  const classes = [className, "spotlight-card", glow ? "chameleon-border" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={ref}
      className={classes}
      style={{ position: "relative" }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {enabled && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "inherit",
            pointerEvents: "none",
            opacity: active ? 1 : 0,
            transition: "opacity var(--d2) var(--ease)",
            background:
              "radial-gradient(260px circle at var(--spot-x, 50%) var(--spot-y, 50%), var(--spot-color, rgba(255, 255, 255, 0.06)), transparent 70%)",
          }}
        />
      )}
    </div>
  );
}
