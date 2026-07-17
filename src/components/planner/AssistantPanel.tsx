"use client";

import { AssistantChat } from "@/components/AssistantChat";

// The planner's mount of the shared assistant surface. Replies are grounded
// server side: every figure comes from the trip data or the app's real
// lookups, never from the model. Applying a swap through the assistant is a
// later phase; today it reads and reports only.

export function AssistantPanel({ tripId }: { tripId: string }) {
  return (
    <div className="surface-2 rounded-xl p-4 shadow-[var(--elev-raise)]">
      <h3 className="eyebrow">Plan assistant</h3>
      <AssistantChat
        endpoint={`/api/trips/${tripId}/assistant`}
        inputId="assistant-input"
        emptyText="Ask about the plan, the budget, or real alternatives for an activity. Figures come from stored data and live lookups, never from the assistant."
      />
    </div>
  );
}
