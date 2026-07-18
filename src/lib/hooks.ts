"use client";

import { useEffect, useRef, useState } from "react";

// A clock for anything that needs to re-render on a wall-clock interval,
// e.g. "last polled 4m ago" style labels. Resets the interval if it changes.
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}

// Flips true once an element first enters the viewport, then stops watching.
// Starts true under reduced motion or when IntersectionObserver is missing,
// so content can never be stuck hidden waiting on a reveal that won't fire.
export function useReveal<T extends HTMLElement>(
  threshold = 0.2
): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  // Starts false on server and client alike so hydration matches; the effect
  // reveals at once under reduced motion or when the observer is missing, so
  // content can never be stuck hidden waiting on a reveal that won't fire.
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const el = ref.current;
    if (prefersReduced || !("IntersectionObserver" in window) || !el) {
      const raf = requestAnimationFrame(() => setRevealed(true));
      return () => cancelAnimationFrame(raf);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, revealed];
}
