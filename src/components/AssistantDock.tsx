"use client";

import { IconTile } from "@/components/IconTile";
import { AssistantChat } from "@/components/AssistantChat";
import type { ComposedItem } from "@/lib/planner/day";

// The docked assistant shell shared by both views: a glass panel with the
// sparkle tile, the view-scoped title, and an honest status pill tied to
// whether the model key is actually configured. The grounded chat inside is
// unchanged; this is only its housing.

function SparkleGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zM19 15l.9 2.6L22.5 18l-2.6.9L19 21.5l-.9-2.6L15.5 18l2.6-.9L19 15z" />
    </svg>
  );
}

export function AssistantDock({
  title,
  online,
  endpoint,
  emptyText,
  suggestions,
  inputId,
  confirmEndpoint,
  onItemReplaced,
  className,
}: {
  title: string;
  online: boolean;
  endpoint: string;
  emptyText: string;
  suggestions?: string[];
  inputId?: string;
  confirmEndpoint?: string;
  onItemReplaced?: (item: ComposedItem) => void;
  className?: string;
}) {
  return (
    <section
      className={`glass rounded-[var(--r-card)] p-4 ${className ?? ""}`}
      style={{ boxShadow: "var(--elev-raise)" }}
      aria-label={title}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <IconTile tone="cool" size={30}>
            <SparkleGlyph />
          </IconTile>
          <span className="text-sm font-medium" style={{ color: "var(--ink-0)" }}>
            {title}
          </span>
        </div>
        <span
          className="rounded-full px-2.5 py-1 text-[10px] uppercase"
          style={
            online
              ? {
                  letterSpacing: "0.06em",
                  background: "var(--cool-soft)",
                  color: "var(--cool)",
                }
              : {
                  letterSpacing: "0.06em",
                  border: "1px solid var(--hairline-strong)",
                  color: "var(--ink-3)",
                }
          }
        >
          {online ? "Online" : "Offline"}
        </span>
      </div>

      <AssistantChat
        endpoint={endpoint}
        emptyText={emptyText}
        suggestions={suggestions}
        inputId={inputId}
        confirmEndpoint={confirmEndpoint}
        onItemReplaced={onItemReplaced}
      />
    </section>
  );
}
