"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from "react";

const MAX_PULL_PX = 4;

type MagneticButtonProps = {
  href?: string;
  onClick?: () => void;
  className?: string;
  children: ReactNode;
  type?: "button" | "submit";
  disabled?: boolean;
  ariaLabel?: string;
};

// A link or button that leans toward the cursor while it sits inside the
// element's bounds, up to 4px, then springs back on leave. The pull itself
// writes to the element's style directly on mousemove so it tracks the
// pointer without waiting on a React render. Off on touch and reduced
// motion, where it behaves as a plain link or button.
export function MagneticButton({
  href,
  onClick,
  className,
  children,
  type = "button",
  disabled = false,
  ariaLabel,
}: MagneticButtonProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const raf = requestAnimationFrame(() => setEnabled(!reduced && !coarse));
    return () => cancelAnimationFrame(raf);
  }, []);

  function handleMouseMove(event: MouseEvent<HTMLElement>) {
    if (!enabled || disabled) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (event.clientX - cx) / (rect.width / 2);
    const dy = (event.clientY - cy) / (rect.height / 2);
    el.style.transition = "none";
    el.style.transform = `translate(${dx * MAX_PULL_PX}px, ${dy * MAX_PULL_PX}px)`;
  }

  function handleMouseLeave() {
    if (!enabled || disabled) return;
    const el = ref.current;
    if (!el) return;
    el.style.transition = "transform var(--d3) cubic-bezier(0.34, 1.56, 0.64, 1)";
    el.style.transform = "translate(0px, 0px)";
  }

  function handleClick(event: MouseEvent<HTMLElement>) {
    if (disabled) {
      event.preventDefault();
      return;
    }
    try {
      navigator.vibrate?.(8);
    } catch {
      // some browsers throw calling vibrate outside a user gesture
    }
    onClick?.();
  }

  const classes = ["pressable", className].filter(Boolean).join(" ");

  if (href) {
    return (
      <Link
        ref={ref as Ref<HTMLAnchorElement>}
        href={href}
        className={classes}
        aria-label={ariaLabel}
        aria-disabled={disabled || undefined}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      ref={ref as Ref<HTMLButtonElement>}
      type={type}
      className={classes}
      aria-label={ariaLabel}
      disabled={disabled}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {children}
    </button>
  );
}
