"use client";

import { useState } from "react";

// The one chat surface, mounted by both views and pointed at a view-scoped
// route. The server does all grounding; this component only renders what comes
// back: the reply as plain text, and one static past-tense line per completed
// tool call. No streaming, no typing indicators. While a reply is pending, a
// static "Working." line.

type ChatTurn = { role: "user" | "assistant"; content: string };
type Entry = { kind: "user" | "assistant" | "tool"; text: string };

export function AssistantChat({
  endpoint,
  emptyText,
  inputId,
}: {
  endpoint: string;
  emptyText: string;
  inputId?: string;
}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const turns: ChatTurn[] = [
      ...entries
        .filter((e) => e.kind !== "tool")
        .map((e): ChatTurn => ({
          role: e.kind === "user" ? "user" : "assistant",
          content: e.text,
        })),
      { role: "user", content: text },
    ];
    setEntries((e) => [...e, { kind: "user", text }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: turns }),
      });
      const data = (await res.json()) as { reply?: string; toolLog?: string[] };
      setEntries((e) => [
        ...e,
        ...(data.toolLog ?? []).map(
          (t): Entry => ({ kind: "tool", text: t })
        ),
        { kind: "assistant", text: data.reply ?? "No reply." },
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

  return (
    <div>
      {entries.length === 0 && !busy ? (
        <p className="mt-3 text-xs leading-relaxed ink-3">{emptyText}</p>
      ) : (
        <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
          {entries.map((e, i) =>
            e.kind === "tool" ? (
              <div key={i} className="text-[0.6875rem] ink-3">
                {e.text}
              </div>
            ) : (
              <div key={i} className={e.kind === "user" ? "text-right" : ""}>
                <span
                  className="inline-block max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-left text-xs leading-relaxed ink-1"
                  style={{ background: "var(--surface-1)" }}
                >
                  {e.text}
                </span>
              </div>
            )
          )}
          {busy && <div className="text-[0.6875rem] ink-3">Working.</div>}
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
          className="rounded-md px-3 py-2 text-xs font-medium disabled:opacity-50"
          style={{ background: "var(--ink-0)", color: "var(--on-ink)" }}
        >
          Ask
        </button>
      </form>
    </div>
  );
}
