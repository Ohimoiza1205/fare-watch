"use client";

import { useState } from "react";
import type { SwapProposal } from "@/lib/assistant/proposal";
import type { ComposedItem } from "@/lib/planner/day";
import { formatMoney, formatMoneyRange } from "@/lib/planner/format";
import { PriceTag } from "@/components/planner/PriceTag";

// The one chat surface, mounted by both views and pointed at a view-scoped
// route. The server does all grounding; this component only renders what comes
// back: the reply as plain text, one static past-tense line per completed tool
// call, and, on the planner mount only, a staged swap proposal as an inline
// card. Confirming the card posts the proposal back to the confirm endpoint;
// the model is never in that loop. No streaming; while a reply is pending, a
// quiet three dot typing indicator.

type ChatTurn = { role: "user" | "assistant"; content: string };

// A note is a system-side fact recorded after an applied swap. It renders as a
// dim line and travels in history as a user turn, so the model both knows the
// swap happened and can restate its figures without tripping the grounding.
type Entry =
  | { kind: "user" | "assistant" | "tool" | "note"; text: string }
  | { kind: "proposal"; proposal: SwapProposal; done: string | null };

function partyContext(travellers: number): string {
  return travellers > 1 ? `for ${travellers} people` : "per person";
}

function ProposalCard({
  proposal,
  confirmEndpoint,
  onResolved,
}: {
  proposal: SwapProposal;
  confirmEndpoint: string;
  onResolved: (
    doneText: string,
    applied?: { item: ComposedItem; note: string }
  ) => void;
}) {
  const [choice, setChoice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirm() {
    if (!choice || busy) return;
    setBusy(true);
    try {
      const res = await fetch(confirmEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposal, optionId: choice }),
      });
      const data = (await res.json()) as {
        item?: ComposedItem;
        budget?: { currency: string; average: number };
        error?: string;
      };
      if (res.ok && data.item && data.budget) {
        const total = formatMoney(data.budget.average, data.budget.currency);
        const priceText =
          data.item.price != null
            ? formatMoneyRange(
                data.item.price,
                data.item.priceMax ?? data.item.price,
                data.item.currency
              )
            : "no price";
        onResolved(`Swapped. Budget now ${total}.`, {
          item: data.item,
          note:
            `System note: swap applied on day ${proposal.dayIndex + 1}. ` +
            `${proposal.before.venue} replaced with ${data.item.venue ?? data.item.title}, ` +
            `${data.item.isEstimated ? "estimated " : ""}${priceText}. ` +
            `Trip total now ${total}.`,
        });
      } else {
        onResolved(data.error ?? "The swap could not be applied.");
      }
    } catch {
      onResolved("The swap could not be applied.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="rounded-xl border p-3 surface-2"
      style={{ borderColor: "var(--hairline)", boxShadow: "var(--elev-raise)" }}
    >
      <p className="text-xs ink-1">
        Replaces {proposal.before.venue}, day {proposal.dayIndex + 1}. Nothing
        else changes.
      </p>

      <div className="mt-2 space-y-1" role="radiogroup" aria-label="Swap options">
        {proposal.options.map((o) => {
          const selected = choice === o.id;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setChoice(o.id)}
              disabled={busy}
              className={`pressable flex w-full items-baseline gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs ${
                selected ? "ink-0" : "ink-1"
              }`}
              style={{
                borderColor: selected ? "var(--ink-2)" : "var(--hairline-strong)",
                background: selected ? "var(--surface-1)" : "transparent",
              }}
            >
              <span className={`min-w-0 flex-1 truncate ${selected ? "font-medium" : ""}`}>
                {o.venue}
                {o.fact && <span className="ink-3">{`, ${o.fact}`}</span>}
              </span>
              {o.price != null ? (
                <span className="flex shrink-0 items-baseline gap-1.5">
                  <PriceTag
                    price={o.price}
                    priceMax={o.priceMax}
                    currency={o.currency}
                    isEstimated={o.isEstimated}
                    className="text-xs"
                  />
                  <span className="text-[0.625rem] ink-3">
                    {partyContext(proposal.travellers)}
                  </span>
                </span>
              ) : (
                <span className="shrink-0 ink-4">no price</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-2.5 flex gap-2">
        <button
          type="button"
          onClick={() => void confirm()}
          disabled={!choice || busy}
          className="pressable rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-50"
          style={{ background: "var(--ink-0)", color: "var(--on-ink)" }}
        >
          Confirm
        </button>
        <button
          type="button"
          onClick={() => onResolved("Dismissed.")}
          disabled={busy}
          className="pressable rounded-md border px-3 py-1.5 text-xs ink-1 disabled:opacity-50"
          style={{ borderColor: "var(--hairline-strong)" }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

export function AssistantChat({
  endpoint,
  emptyText,
  inputId,
  confirmEndpoint,
  onItemReplaced,
  suggestions,
}: {
  endpoint: string;
  emptyText: string;
  inputId?: string;
  confirmEndpoint?: string;
  onItemReplaced?: (item: ComposedItem) => void;
  suggestions?: string[];
}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  function toTurns(list: Entry[]): ChatTurn[] {
    return list.flatMap((e): ChatTurn[] => {
      if (e.kind === "user" || e.kind === "note") {
        return [{ role: "user", content: e.text }];
      }
      if (e.kind === "assistant") {
        return [{ role: "assistant", content: e.text }];
      }
      return [];
    });
  }

  async function send(preset?: string) {
    const text = (preset ?? input).trim();
    if (!text || busy) return;
    const turns: ChatTurn[] = [...toTurns(entries), { role: "user", content: text }];
    setEntries((e) => [...e, { kind: "user", text }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: turns }),
      });
      const data = (await res.json()) as {
        reply?: string;
        toolLog?: string[];
        proposal?: SwapProposal | null;
      };
      setEntries((e) => [
        ...e,
        ...(data.toolLog ?? []).map((t): Entry => ({ kind: "tool", text: t })),
        { kind: "assistant", text: data.reply ?? "No reply." },
        ...(data.proposal && confirmEndpoint
          ? [{ kind: "proposal", proposal: data.proposal, done: null } as Entry]
          : []),
      ]);
    } catch {
      setEntries((e) => [
        ...e,
        { kind: "assistant", text: "The assistant could not be reached." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function resolveProposal(
    index: number,
    doneText: string,
    applied?: { item: ComposedItem; note: string }
  ) {
    setEntries((prev) => {
      const next = prev.map((e, i) =>
        i === index && e.kind === "proposal" ? { ...e, done: doneText } : e
      );
      if (applied) next.push({ kind: "note", text: applied.note });
      return next;
    });
    if (applied) onItemReplaced?.(applied.item);
  }

  return (
    <div>
      {entries.length === 0 && !busy ? (
        <p className="mt-3 text-xs leading-relaxed ink-3">{emptyText}</p>
      ) : (
        <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
          {entries.map((e, i) => {
            if (e.kind === "tool" || e.kind === "note") {
              return (
                <div key={i} className="num text-[0.6875rem] ink-3">
                  {e.text}
                </div>
              );
            }
            if (e.kind === "proposal") {
              return e.done ? (
                <div key={i} className="text-xs ink-2">
                  {e.done}
                </div>
              ) : confirmEndpoint ? (
                <ProposalCard
                  key={i}
                  proposal={e.proposal}
                  confirmEndpoint={confirmEndpoint}
                  onResolved={(text, applied) => resolveProposal(i, text, applied)}
                />
              ) : null;
            }
            return (
              <div key={i} className={e.kind === "user" ? "text-right" : ""}>
                <span
                  className="inline-block max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-left text-xs leading-relaxed ink-1"
                  style={{ background: "var(--surface-1)" }}
                >
                  {e.text}
                </span>
              </div>
            );
          })}
          {busy && (
            <div
              className="flex items-center gap-1.5 text-[0.6875rem] ink-3"
              aria-label="Working"
            >
              <span className="typing-dot" />
              <span className="typing-dot" style={{ animationDelay: "150ms" }} />
              <span className="typing-dot" style={{ animationDelay: "300ms" }} />
            </div>
          )}
        </div>
      )}

      {suggestions && suggestions.length > 0 && entries.length === 0 && !busy && (
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => void send(s)}
              className="pressable rounded-full px-3 py-1.5 text-[0.6875rem]"
              style={{
                border: "1px solid var(--hairline-strong)",
                color: "var(--ink-2)",
              }}
            >
              {s}
            </button>
          ))}
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
          id={inputId}
          aria-label="Ask the assistant"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          rows={1}
          placeholder="Ask a question"
          className="min-h-[2.25rem] flex-1 resize-none rounded-md border bg-transparent px-2.5 py-1.5 text-xs ink-0 outline-none focus:border-[var(--ink-3)]"
          style={{ borderColor: "var(--hairline-strong)" }}
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="pressable rounded-md px-3 py-2 text-xs font-medium disabled:opacity-50"
          style={{ background: "var(--ink-0)", color: "var(--on-ink)" }}
        >
          Ask
        </button>
      </form>
    </div>
  );
}
