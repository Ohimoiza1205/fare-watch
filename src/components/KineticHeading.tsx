"use client";

import type { ReactNode } from "react";

export function KineticHeading({
  children,
  className,
  as = "h1",
}: {
  children: ReactNode;
  className?: string;
  as?: "h1" | "h2";
}) {
  const Tag = as;
  return (
    <Tag className={`heading kinetic ${className ?? ""}`} style={{ color: "var(--ink-0)" }}>
      {children}
    </Tag>
  );
}
