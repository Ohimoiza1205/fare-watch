"use client";

import { usePathname } from "next/navigation";

// The planner wears the cool light theme, the tracker keeps the dark one. The
// scope switches by route, wrapping the shared chrome and the page together so
// the navigation matches the view under it.
export function ThemeScope({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const planner = pathname.startsWith("/plan");

  return (
    <div className={`min-h-screen ${planner ? "theme-planner" : ""}`}>{children}</div>
  );
}
