"use client";

import { AssistantChat } from "@/components/AssistantChat";
import type { ComposedItem } from "@/lib/planner/day";

// The planner's mount of the shared assistant surface. Replies are grounded
// server side: every figure comes from the trip data or the app's real
// lookups, never from the model. A swap asked for here arrives as a staged
// proposal card; confirming it applies server side and hands the updated item
// back to the board, so the budget rolls without a refetch.

export function AssistantPanel({
  tripId,
  onItemReplaced,
}: {
  tripId: string;
  onItemReplaced?: (item: ComposedItem) => void;
}) {
  return (
    <div className="surface-2 rounded-xl p-4 shadow-[var(--elev-raise)]">
      <h3 className="eyebrow">Plan assistant</h3>
      <AssistantChat
        endpoint={`/api/trips/${tripId}/assistant`}
        confirmEndpoint={`/api/trips/${tripId}/assistant/confirm`}
        onItemReplaced={onItemReplaced}
        inputId="assistant-input"
        emptyText="Ask about the plan, the budget, or real alternatives for an activity. Figures come from stored data and live lookups, never from the assistant."
      />
    </div>
  );
}
