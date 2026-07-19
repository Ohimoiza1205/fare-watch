"use client";

import type { CSSProperties, ReactNode } from "react";

type Tone = "cool" | "warm" | "amber" | "indigo" | "neutral";

const TONE_STYLE: Record<Tone, CSSProperties> = {
  cool: { background: "var(--cool-soft)", color: "var(--cool)" },
  warm: { background: "var(--warm-soft)", color: "var(--warm)" },
  amber: { background: "var(--amber-soft)", color: "var(--amber)" },
  indigo: { background: "color-mix(in srgb, var(--indigo) 14%, transparent)", color: "var(--indigo)" },
  neutral: { color: "var(--ink-2)" },
};

export function IconTile({
  tone = "neutral",
  size = 34,
  children,
  className,
}: {
  tone?: Tone;
  size?: number;
  children: ReactNode;
  className?: string;
}) {
  const toneStyle = TONE_STYLE[tone];
  return (
    <div
      className={`flex items-center justify-center ${tone === "neutral" ? "surface-3 " : ""}${className ?? ""}`}
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        ...toneStyle,
      }}
    >
      {children}
    </div>
  );
}
