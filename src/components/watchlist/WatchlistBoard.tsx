"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KineticHeading } from "@/components/KineticHeading";
import { AssistantDock } from "@/components/AssistantDock";
import { WatchCard, type WatchCardExtras } from "@/components/watchlist/WatchCard";
import type { RouteSummary } from "@/lib/db/queries";

// The tracker's working surface: every watched route as a card, the add-route
// form, and the docked route assistant. The form posts to the real watches
// endpoint and refreshes the server data on success.

type FormState = {
  origin: string;
  destination: string;
  departDate: string;
  returnDate: string;
  cabin: string;
  maxStops: string;
  currency: string;
  targetPrice: string;
};

const EMPTY_FORM: FormState = {
  origin: "",
  destination: "",
  departDate: "",
  returnDate: "",
  cabin: "1",
  maxStops: "0",
  currency: "GBP",
  targetPrice: "",
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="eyebrow">{label}</span>
      {children}
    </label>
  );
}

const INPUT_STYLE = {
  border: "1px solid var(--hairline-strong)",
  color: "var(--ink-0)",
} as const;

function AddWatchForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof FormState) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/watches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: form.origin,
          destination: form.destination,
          departDate: form.departDate,
          returnDate: form.returnDate,
          cabin: form.cabin,
          maxStops: Number(form.maxStops),
          currency: form.currency,
          targetPrice: form.targetPrice || null,
          adults: 1,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "The watch could not be saved.");
        return;
      }
      onDone();
      router.refresh();
    } catch {
      setError("The watch could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="surface-2 elev-raise mt-6 rounded-[var(--r-card)] p-5"
      style={{ border: "1px solid var(--hairline)" }}
    >
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Field label="From">
          <input
            value={form.origin}
            onChange={(e) => set("origin")(e.target.value.toUpperCase())}
            placeholder="LHR"
            maxLength={3}
            className="surface-1 num rounded-lg px-3 py-2 text-sm outline-none"
            style={INPUT_STYLE}
            required
          />
        </Field>
        <Field label="To">
          <input
            value={form.destination}
            onChange={(e) => set("destination")(e.target.value.toUpperCase())}
            placeholder="JFK"
            maxLength={3}
            className="surface-1 num rounded-lg px-3 py-2 text-sm outline-none"
            style={INPUT_STYLE}
            required
          />
        </Field>
        <Field label="Depart">
          <input
            type="date"
            value={form.departDate}
            onChange={(e) => set("departDate")(e.target.value)}
            className="surface-1 num rounded-lg px-3 py-2 text-sm outline-none"
            style={INPUT_STYLE}
            required
          />
        </Field>
        <Field label="Return">
          <input
            type="date"
            value={form.returnDate}
            onChange={(e) => set("returnDate")(e.target.value)}
            className="surface-1 num rounded-lg px-3 py-2 text-sm outline-none"
            style={INPUT_STYLE}
            required
          />
        </Field>
        <Field label="Cabin">
          <select
            value={form.cabin}
            onChange={(e) => set("cabin")(e.target.value)}
            className="surface-1 rounded-lg px-3 py-2 text-sm outline-none"
            style={INPUT_STYLE}
          >
            <option value="1">Economy</option>
            <option value="2">Premium economy</option>
            <option value="3">Business</option>
            <option value="4">First</option>
          </select>
        </Field>
        <Field label="Stops">
          <select
            value={form.maxStops}
            onChange={(e) => set("maxStops")(e.target.value)}
            className="surface-1 rounded-lg px-3 py-2 text-sm outline-none"
            style={INPUT_STYLE}
          >
            <option value="0">Any</option>
            <option value="1">Nonstop</option>
            <option value="2">Max 1 stop</option>
            <option value="3">Max 2 stops</option>
          </select>
        </Field>
        <Field label="Currency">
          <select
            value={form.currency}
            onChange={(e) => set("currency")(e.target.value)}
            className="surface-1 rounded-lg px-3 py-2 text-sm outline-none"
            style={INPUT_STYLE}
          >
            <option value="GBP">GBP</option>
            <option value="USD">USD</option>
            <option value="NGN">NGN</option>
            <option value="EUR">EUR</option>
          </select>
        </Field>
        <Field label="Target price, optional">
          <input
            inputMode="numeric"
            value={form.targetPrice}
            onChange={(e) => set("targetPrice")(e.target.value.replace(/[^\d.]/g, ""))}
            placeholder="none"
            className="surface-1 num rounded-lg px-3 py-2 text-sm outline-none"
            style={INPUT_STYLE}
          />
        </Field>
      </div>

      {error && (
        <p className="mt-3 text-xs" style={{ color: "var(--warn)" }}>
          {error}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="pressable rounded-full px-4 py-2 text-sm font-medium disabled:opacity-50"
          style={{ background: "var(--cool)", color: "var(--on-accent)" }}
        >
          {busy ? "Saving" : "Add route"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="pressable rounded-full px-4 py-2 text-sm"
          style={{ border: "1px solid var(--hairline-strong)", color: "var(--ink-2)" }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export function WatchlistBoard({
  summaries,
  extras,
  assistantOnline,
  suggestions,
}: {
  summaries: RouteSummary[];
  extras: Record<string, WatchCardExtras>;
  assistantOnline: boolean;
  suggestions: string[];
}) {
  const [adding, setAdding] = useState(false);

  // The command palette routes to /watchlist#add. Honour the anchor on mount
  // and on hash change, so the action also works while already on this page.
  useEffect(() => {
    const openIfAnchored = () => {
      if (window.location.hash === "#add") setAdding(true);
    };
    const raf = requestAnimationFrame(openIfAnchored);
    window.addEventListener("hashchange", openIfAnchored);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("hashchange", openIfAnchored);
    };
  }, []);

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Monitored routes</span>
          <KineticHeading className="mt-2 text-3xl">Watchlist</KineticHeading>
        </div>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="pressable rounded-full px-4 py-2 text-sm"
          style={{ border: "1px solid var(--cool)", color: "var(--cool)" }}
        >
          + Add route
        </button>
      </div>

      {adding && <AddWatchForm onDone={() => setAdding(false)} />}

      {summaries.length === 0 ? (
        <div
          className="surface-2 elev-raise mt-6 flex min-h-40 items-center justify-center rounded-[var(--r-card)] p-8"
          style={{ border: "1px solid var(--hairline)" }}
        >
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>
            No routes watched. Add one to start.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
          {summaries.map((s) => (
            <WatchCard key={s.watch.id} summary={s} extras={extras[s.watch.id]} />
          ))}
        </div>
      )}

      <AssistantDock
        className="mt-8"
        title="Route assistant"
        online={assistantOnline}
        endpoint="/api/assistant"
        emptyText="Ask about a watched route, its history, or the alerts that fired. Answers come only from stored data."
        suggestions={suggestions}
      />
    </main>
  );
}
