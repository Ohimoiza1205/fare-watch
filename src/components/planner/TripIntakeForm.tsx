"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TASTE_TAGS, type Pace, type TasteTag } from "@/lib/planner/intake";

// A calm intake, not a long form. Origin and destination, dates or a length and
// a month, who is going, an optional ceiling, and a few taps of taste. On submit
// it asks the server to generate and then opens the trip.

const PACES: { id: Pace; label: string }[] = [
  { id: "relaxed", label: "Relaxed" },
  { id: "balanced", label: "Balanced" },
  { id: "packed", label: "Packed" },
];

const TASTE_LABEL: Record<TasteTag, string> = {
  foodie: "Foodie",
  outdoors: "Outdoors",
  nightlife: "Nightlife",
  culture: "Culture",
  cheap: "Cheap and cheerful",
  treat: "Treat ourselves",
};

const FIELD =
  "w-full border-b border-[var(--hairline-strong)] bg-transparent pb-1.5 ink-0 outline-none transition-colors duration-[var(--d1)] focus:border-[var(--ink-2)] placeholder:text-[var(--ink-4)]";
const LABEL = "eyebrow";

export function TripIntakeForm() {
  const router = useRouter();
  const [dateMode, setDateMode] = useState<"dates" | "length">("length");

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [lengthDays, setLengthDays] = useState("14");
  const [roughMonth, setRoughMonth] = useState("");
  const [travellers, setTravellers] = useState("2");
  const [budgetCeiling, setBudgetCeiling] = useState("");
  const [pace, setPace] = useState<Pace>("balanced");
  const [taste, setTaste] = useState<TasteTag[]>([]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleTaste(tag: TasteTag) {
    setTaste((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const payload = {
        origin,
        destination,
        startDate: dateMode === "dates" ? startDate : null,
        endDate: dateMode === "dates" ? endDate : null,
        lengthDays: dateMode === "length" ? Number.parseInt(lengthDays, 10) : null,
        roughMonth: dateMode === "length" ? roughMonth : null,
        travellers: Number.parseInt(travellers, 10) || 1,
        budgetCeiling: budgetCeiling ? Number.parseFloat(budgetCeiling) : null,
        pace,
        taste,
      };
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !data.id) {
        setError(data.error ?? "Generation failed. Please try again.");
        setBusy(false);
        return;
      }
      router.push(`/plan/${data.id}`);
    } catch {
      setError("Could not reach the server. Please try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-xl">
      <div className="grid grid-cols-2 gap-x-8 gap-y-6">
        <label className="flex flex-col gap-2">
          <span className={LABEL}>From</span>
          <input
            className={FIELD}
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            placeholder="LHR"
            autoComplete="off"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className={LABEL}>To</span>
          <input
            className={FIELD}
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Lubbock, Texas"
            autoComplete="off"
            required
          />
        </label>
      </div>

      <fieldset className="mt-8">
        <legend className={LABEL}>When</legend>
        <div className="mt-3 flex gap-2" role="tablist" aria-label="How to set dates">
          <ModeButton
            active={dateMode === "length"}
            onClick={() => setDateMode("length")}
          >
            Length and month
          </ModeButton>
          <ModeButton
            active={dateMode === "dates"}
            onClick={() => setDateMode("dates")}
          >
            Exact dates
          </ModeButton>
        </div>

        {dateMode === "length" ? (
          <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-6">
            <label className="flex flex-col gap-2">
              <span className={LABEL}>Nights</span>
              <input
                className={FIELD}
                inputMode="numeric"
                value={lengthDays}
                onChange={(e) =>
                  setLengthDays(e.target.value.replace(/[^0-9]/g, ""))
                }
                placeholder="14"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className={LABEL}>Month</span>
              <input
                className={FIELD}
                type="month"
                value={roughMonth}
                onChange={(e) => setRoughMonth(e.target.value)}
              />
            </label>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-6">
            <label className="flex flex-col gap-2">
              <span className={LABEL}>Depart</span>
              <input
                className={FIELD}
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className={LABEL}>Return</span>
              <input
                className={FIELD}
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>
          </div>
        )}
      </fieldset>

      <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6">
        <label className="flex flex-col gap-2">
          <span className={LABEL}>Travellers</span>
          <input
            className={FIELD}
            inputMode="numeric"
            value={travellers}
            onChange={(e) => setTravellers(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="2"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className={LABEL}>Maximum, optional</span>
          <input
            className={FIELD}
            inputMode="numeric"
            value={budgetCeiling}
            onChange={(e) =>
              setBudgetCeiling(e.target.value.replace(/[^0-9.]/g, ""))
            }
            placeholder="none"
          />
        </label>
      </div>

      <fieldset className="mt-8">
        <legend className={LABEL}>Pace</legend>
        <div className="mt-3 flex gap-2">
          {PACES.map((p) => (
            <ModeButton
              key={p.id}
              active={pace === p.id}
              onClick={() => setPace(p.id)}
            >
              {p.label}
            </ModeButton>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-8">
        <legend className={LABEL}>Taste</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {TASTE_TAGS.map((tag) => (
            <Chip
              key={tag}
              active={taste.includes(tag)}
              onClick={() => toggleTaste(tag)}
            >
              {TASTE_LABEL[tag]}
            </Chip>
          ))}
        </div>
      </fieldset>

      {error && (
        <p className="mt-8 text-sm" style={{ color: "var(--warn)" }} role="status">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-10 inline-flex items-center rounded-md px-5 py-2.5 text-sm font-medium transition-opacity duration-[var(--d1)] disabled:opacity-60"
        style={{ backgroundColor: "var(--accent)", color: "var(--on-accent)" }}
      >
        {busy ? "Generating the trip" : "Generate the trip"}
      </button>
    </form>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-md border px-3 py-1.5 text-sm transition-colors duration-[var(--d1)] ${
        active
          ? "border-[var(--hairline-strong)] surface-2 ink-0"
          : "border-[var(--hairline)] ink-3 hover:text-[var(--ink-1)]"
      }`}
    >
      {children}
    </button>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors duration-[var(--d1)] ${
        active
          ? "border-[var(--hairline-strong)] surface-2 ink-0"
          : "border-[var(--hairline)] ink-3 hover:text-[var(--ink-1)]"
      }`}
    >
      {children}
    </button>
  );
}
