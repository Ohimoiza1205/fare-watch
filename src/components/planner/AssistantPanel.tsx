"use client";

import { useState } from "react";
import type { ComposedDay, ComposedItem } from "@/lib/planner/day";
import type { ChatTurn } from "@/lib/planner/assistant/provider";
import type {
  AssistantSuggestion,
  AlternativeOption,
} from "@/lib/planner/assistant/types";
import { PriceTag } from "./PriceTag";

// The assistant panel. The traveller asks in plain language; the model plans and
// answers but never prices. Any option shown here is a real lookup result the
// app fetched, applied through the same swap the rest of the plan uses, so a
// figure on screen is always real and carries its confirmed or estimate marking.

export function AssistantPanel({
  tripId,
  days,
  onReplace,
}: {
  tripId: string;
  days: ComposedDay[];
  onReplace: (next: ComposedItem) => void;
}) {
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [suggestion, setSuggestion] = useState<AssistantSuggestion | null>(null);
  const [applying, setApplying] = useState<string | null>(null);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const next: ChatTurn[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setSuggestion(null);
    try {
      const res = await fetch(`/api/trips/${tripId}/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = (await res.json()) as {
        reply?: string;
        suggestion?: AssistantSuggestion | null;
      };
      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.reply ?? "No reply." },
      ]);
      setSuggestion(data.suggestion ?? null);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "The assistant could not be reached." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function apply(option: AlternativeOption, ref: AssistantSuggestion["itemRef"]) {
    const item = days[ref.dayIndex]?.items[ref.position];
    if (!item) return;
    setApplying(option.venue);
    try {
      const res = await fetch(`/api/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(option),
      });
      const data = (await res.json()) as { item?: ComposedItem };
      if (data.item) {
        onReplace(data.item);
        setSuggestion(null);
      }
    } finally {
      setApplying(null);
    }
  }

  return (
    <div className="surface-2 rounded-xl p-4 shadow-[var(--elev-raise)]">
      <h3 className="eyebrow">Plan assistant</h3>

      {messages.length === 0 ? (
        <p className="mt-3 text-xs leading-relaxed ink-3">
          Ask to find cheaper options, swap an activity, or answer a question
          about the trip. Prices always come from the real lookups, never from the
          assistant.
        </p>
      ) : (
        <div className="mt-3 max-h-64 space-y-3 overflow-y-auto pr-1">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : ""}>
              <span
                className={`inline-block max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                  m.role === "user" ? "surface-1 ink-1" : "ink-1"
                }`}
                style={
                  m.role === "assistant"
                    ? { background: "var(--surface-1)" }
                    : undefined
                }
              >
                {m.content}
              </span>
            </div>
          ))}
        </div>
      )}

      {suggestion && suggestion.options.length > 0 && (
        <div className="mt-3 rounded-lg p-2.5 surface-1">
          <div className="eyebrow">Real options for {suggestion.currentName}</div>
          <ul className="mt-2 space-y-1.5">
            {suggestion.options.slice(0, 4).map((o) => (
              <li key={o.sourceUrl ?? o.venue} className="flex items-center gap-3">
                <span className="min-w-0 flex-1 truncate text-xs ink-1">
                  {o.venue}
                </span>
                <PriceTag
                  price={o.price}
                  priceMax={o.priceMax}
                  currency={o.currency}
                  isEstimated={o.isEstimated}
                  className="text-xs"
                />
                <button
                  type="button"
                  onClick={() => apply(o, suggestion.itemRef)}
                  disabled={applying === o.venue}
                  className="rounded-md px-2 py-1 text-[0.6875rem] font-medium text-white"
                  style={{ background: "var(--ink-1)" }}
                >
                  {applying === o.venue ? "Using" : "Use"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form
        className="mt-3 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          rows={1}
          placeholder="Ask about the plan"
          className="min-h-[2.25rem] flex-1 resize-none rounded-md border bg-transparent px-2.5 py-1.5 text-xs ink-0 outline-none focus:border-[var(--ink-3)]"
          style={{ borderColor: "var(--hairline-strong)" }}
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded-md px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
          style={{ background: "var(--ink-0)" }}
        >
          {busy ? "..." : "Ask"}
        </button>
      </form>
    </div>
  );
}
