"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Atmosphere } from "@/components/Atmosphere";

// The planner wears the cool light theme, the tracker keeps the dark one. The
// scope switches by route and wraps only the page content; the sidebar sits
// outside so it stays dark in both views. The atmosphere layer mounts behind
// tracker pages only, never on the light planner canvas, and warms slightly
// in the evening and early morning. The warmth resolves after mount because
// the server cannot know the local hour.
export function ThemeScope({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const planner = pathname.startsWith("/app/plan");
  const [warm, setWarm] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const hour = new Date().getHours();
      setWarm(hour >= 17 || hour < 7);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className={`relative min-w-0 flex-1 ${planner ? "theme-planner" : ""}`}>
      {!planner && <Atmosphere warm={warm} />}
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}
