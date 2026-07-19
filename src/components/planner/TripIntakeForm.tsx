"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TASTE_TAGS, type Pace, type TasteTag } from "@/lib/planner/intake";
import { categoryTagStyle } from "@/lib/planner/categoryColor";
import { cityForIata } from "@/lib/airports";
import { DestinationImage } from "@/components/DestinationImage";
import { MagneticButton } from "@/components/MagneticButton";

// A calm intake, not a long form. The route preview appears only once both
// ends really geocode, and the great circle distance is computed from those
// results, never guessed. On submit the server generates and the trip opens.

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

// Each taste borrows its colour from the category family it actually biases,
// through the single categoryColor source.
const TASTE_CATEGORY: Record<TasteTag, string> = {
  foodie: "dining",
  outdoors: "outdoors",
  nightlife: "nightlife",
  culture: "museum",
  cheap: "groceries",
  treat: "shopping",
};

type Geo = { lat: number; lon: number; label: string };

const EARTH_RADIUS_KM = 6371;

function distanceKm(a: Geo, b: Geo): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(s));
}

// Debounced client-side geocode against the same keyless Open-Meteo endpoint
// the server uses. A three letter code geocodes through its known city name.
function useGeo(query: string): Geo | null {
  const [geo, setGeo] = useState<Geo | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    const q = query.trim();
    const mine = ++seq.current;
    if (q.length < 3) {
      // clear through the same async path so no setState runs inside the
      // effect body itself
      const raf = requestAnimationFrame(() => {
        if (seq.current === mine) setGeo(null);
      });
      return () => cancelAnimationFrame(raf);
    }
    const timer = setTimeout(async () => {
      try {
        const name = /^[A-Za-z]{3}$/.test(q) ? cityForIata(q) : q;
        const params = new URLSearchParams({
          name,
          count: "1",
          language: "en",
          format: "json",
        });
        const res = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?${params}`
        );
        if (!res.ok) return;
        const json = (await res.json()) as {
          results?: { latitude: number; longitude: number; name: string; country?: string }[];
        };
        const row = json.results?.[0];
        if (seq.current !== mine) return;
        setGeo(
          row
            ? {
                lat: row.latitude,
                lon: row.longitude,
                label: [row.name, row.country].filter(Boolean).join(", "),
              }
            : null
        );
      } catch {
        // preview simply stays absent
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [query]);

  return geo;
}

function Glyph({ d, className }: { d: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-4 w-4"}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

const PIN = "M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z";
const PLANE = "M21 4L3 11l7 2.5L12.5 21l3-6.5L21 4z";
const CAL = "M4 7h16v13H4zM4 7l0-2h16v2M8 3v4M16 3v4M4 11h16";
const MOON = "M21 13A8.5 8.5 0 1 1 11 3a7 7 0 0 0 10 10z";

function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      className="surface-1 inline-flex rounded-xl p-1"
      style={{ border: "1px solid var(--hairline)" }}
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            aria-pressed={active}
            className={`pressable rounded-lg px-3.5 py-1.5 text-sm ${active ? "pressed-in" : ""}`}
            style={
              active
                ? { background: "var(--surface-2)", color: "var(--ink-0)" }
                : { color: "var(--ink-3)" }
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// A styled tile that carries an invisible native input on top, so month and
// date pickers keep their native behaviour without their native look.
function PickerTile({
  icon,
  label,
  display,
  children,
}: {
  icon: string;
  label: string;
  display: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="surface-1 relative flex items-center gap-2.5 rounded-xl px-3 py-2.5"
      style={{ border: "1px solid var(--hairline-strong)" }}
    >
      <span style={{ color: "var(--ink-3)" }}>
        <Glyph d={icon} />
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] uppercase" style={{ letterSpacing: "0.07em", color: "var(--ink-3)" }}>
          {label}
        </span>
        <span className="num block truncate text-sm" style={{ color: "var(--ink-0)" }}>
          {display}
        </span>
      </span>
      {children}
    </div>
  );
}

const OVERLAY_INPUT =
  "absolute inset-0 h-full w-full cursor-pointer opacity-0";

function fmtMonth(m: string): string {
  if (!m) return "pick a month";
  return new Date(`${m}-01T00:00:00`).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

function fmtDate(d: string, placeholder: string): string {
  if (!d) return placeholder;
  return new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function TripIntakeForm() {
  const router = useRouter();
  const [dateMode, setDateMode] = useState<"dates" | "length">("length");

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [lengthDays, setLengthDays] = useState("14");
  const [roughMonth, setRoughMonth] = useState("");
  const [travellerMode, setTravellerMode] = useState<"1" | "2" | "3" | "4+">("2");
  const [travellersMany, setTravellersMany] = useState("4");
  const [budgetCeiling, setBudgetCeiling] = useState("");
  const [pace, setPace] = useState<Pace>("balanced");
  const [taste, setTaste] = useState<TasteTag[]>([]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const originGeo = useGeo(origin);
  const destGeo = useGeo(destination);

  const travellers =
    travellerMode === "4+"
      ? Math.max(4, Number.parseInt(travellersMany, 10) || 4)
      : Number.parseInt(travellerMode, 10);

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
        travellers,
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
      router.push(`/app/plan/${data.id}`);
    } catch {
      setError("Could not reach the server. Please try again.");
      setBusy(false);
    }
  }

  const lengthLabel =
    dateMode === "length"
      ? `${lengthDays || "?"} nights`
      : startDate && endDate
        ? `${fmtDate(startDate, "")} to ${fmtDate(endDate, "")}`
        : "dates not set";

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div
        className="surface-2 rounded-[var(--r-card)] p-6 lg:col-span-2"
        style={{
          border: "1px solid var(--hairline)",
          boxShadow: "var(--elev-raise)",
        }}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="eyebrow">From</span>
            <span
              className="surface-1 flex items-center gap-2.5 rounded-xl px-3 py-2.5"
              style={{ border: "1px solid var(--hairline-strong)" }}
            >
              <span style={{ color: "var(--ink-3)" }}>
                <Glyph d={PIN} />
              </span>
              <input
                className="w-full bg-transparent text-sm outline-none"
                style={{ color: "var(--ink-0)" }}
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="Departure city or airport"
                autoComplete="off"
              />
            </span>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="eyebrow">To</span>
            <span
              className="surface-1 flex items-center gap-2.5 rounded-xl px-3 py-2.5"
              style={{ border: "1px solid var(--hairline-strong)" }}
            >
              <span style={{ color: "var(--ink-3)" }}>
                <Glyph d={PLANE} />
              </span>
              <input
                className="w-full bg-transparent text-sm outline-none"
                style={{ color: "var(--ink-0)" }}
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Destination city"
                autoComplete="off"
                required
              />
            </span>
          </label>
        </div>

        {originGeo && destGeo && (
          <div
            className="surface-1 mt-4 flex items-center gap-3 rounded-xl px-4 py-3"
            style={{ border: "1px solid var(--hairline)" }}
          >
            <span className="min-w-0">
              <span className="num block text-sm" style={{ color: "var(--ink-0)" }}>
                {/^[A-Za-z]{3}$/.test(origin.trim()) ? origin.trim().toUpperCase() : originGeo.label.split(",")[0]}
              </span>
              <span className="block truncate text-xs" style={{ color: "var(--ink-3)" }}>
                {originGeo.label.split(",")[0]}
              </span>
            </span>
            <span className="flex flex-1 items-center gap-2" style={{ color: "var(--ink-4)" }}>
              <span className="h-0 flex-1" style={{ borderTop: "1px dashed var(--hairline-strong)" }} />
              <Glyph d={PLANE} className="h-3.5 w-3.5" />
              <span className="h-0 flex-1" style={{ borderTop: "1px dashed var(--hairline-strong)" }} />
            </span>
            <span className="min-w-0 text-right">
              <span className="num block truncate text-sm" style={{ color: "var(--ink-0)" }}>
                {destGeo.label.split(",")[0]}
              </span>
              <span className="num block text-xs" style={{ color: "var(--ink-3)" }}>
                great circle {Math.round(distanceKm(originGeo, destGeo)).toLocaleString("en-GB")} km
              </span>
            </span>
          </div>
        )}

        <fieldset className="mt-6">
          <legend className="eyebrow">When</legend>
          <div className="mt-2.5">
            <Segmented
              options={[
                { id: "length", label: "Length and month" },
                { id: "dates", label: "Exact dates" },
              ]}
              value={dateMode}
              onChange={setDateMode}
              ariaLabel="How to set dates"
            />
          </div>

          {dateMode === "length" ? (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <PickerTile icon={MOON} label="Nights" display={`${lengthDays || "?"} nights`}>
                <input
                  className={OVERLAY_INPUT}
                  inputMode="numeric"
                  aria-label="Nights"
                  value={lengthDays}
                  onChange={(e) => setLengthDays(e.target.value.replace(/[^0-9]/g, ""))}
                  style={{ opacity: 0 }}
                />
              </PickerTile>
              <PickerTile icon={CAL} label="Month" display={fmtMonth(roughMonth)}>
                <input
                  type="month"
                  className={OVERLAY_INPUT}
                  aria-label="Month"
                  value={roughMonth}
                  onChange={(e) => setRoughMonth(e.target.value)}
                />
              </PickerTile>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <PickerTile icon={CAL} label="Depart" display={fmtDate(startDate, "pick a date")}>
                <input
                  type="date"
                  className={OVERLAY_INPUT}
                  aria-label="Depart"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </PickerTile>
              <PickerTile icon={CAL} label="Return" display={fmtDate(endDate, "pick a date")}>
                <input
                  type="date"
                  className={OVERLAY_INPUT}
                  aria-label="Return"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </PickerTile>
            </div>
          )}
        </fieldset>

        <fieldset className="mt-6">
          <legend className="eyebrow">Travellers</legend>
          <div className="mt-2.5 flex items-center gap-3">
            <Segmented
              options={[
                { id: "1", label: "1" },
                { id: "2", label: "2" },
                { id: "3", label: "3" },
                { id: "4+", label: "4+" },
              ]}
              value={travellerMode}
              onChange={setTravellerMode}
              ariaLabel="Travellers"
            />
            {travellerMode === "4+" && (
              <input
                inputMode="numeric"
                aria-label="Number of travellers"
                value={travellersMany}
                onChange={(e) => setTravellersMany(e.target.value.replace(/[^0-9]/g, ""))}
                className="surface-1 num w-16 rounded-xl px-3 py-2 text-sm outline-none"
                style={{
                  border: "1px solid var(--hairline-strong)",
                  color: "var(--ink-0)",
                }}
              />
            )}
          </div>
        </fieldset>

        <fieldset className="mt-6">
          <legend className="eyebrow">Pace</legend>
          <div className="mt-2.5">
            <Segmented options={PACES} value={pace} onChange={setPace} ariaLabel="Pace" />
          </div>
        </fieldset>

        <fieldset className="mt-6">
          <legend className="eyebrow">Taste</legend>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {TASTE_TAGS.map((tag) => {
              const active = taste.includes(tag);
              const tint = categoryTagStyle(TASTE_CATEGORY[tag]);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTaste(tag)}
                  aria-pressed={active}
                  className="pressable rounded-full px-3.5 py-1.5 text-sm"
                  style={
                    active
                      ? { background: tint.background, color: tint.color }
                      : {
                          border: "1px solid var(--hairline-strong)",
                          color: "var(--ink-3)",
                        }
                  }
                >
                  {TASTE_LABEL[tag]}
                </button>
              );
            })}
          </div>
        </fieldset>

        <label className="mt-6 flex max-w-xs flex-col gap-1.5">
          <span className="eyebrow">Maximum, optional</span>
          <input
            inputMode="numeric"
            value={budgetCeiling}
            onChange={(e) => setBudgetCeiling(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="none"
            className="surface-1 num rounded-xl px-3 py-2.5 text-sm outline-none"
            style={{
              border: "1px solid var(--hairline-strong)",
              color: "var(--ink-0)",
            }}
          />
        </label>

        {error && (
          <p className="mt-6 text-sm" style={{ color: "var(--warn)" }} role="status">
            {error}
          </p>
        )}
      </div>

      <aside
        className="surface-2 flex h-fit flex-col overflow-hidden rounded-[var(--r-card)]"
        style={{
          border: "1px solid var(--hairline)",
          boxShadow: "var(--elev-raise)",
        }}
      >
        <DestinationImage
          place={destGeo ? destGeo.label.split(",")[0] : destination || "somewhere"}
          className="h-28 w-full"
        />
        <div className="flex flex-col gap-3 p-5">
          <div>
            <span className="eyebrow">Destination</span>
            <div className="heading mt-1 text-lg" style={{ color: "var(--ink-0)" }}>
              {destGeo ? destGeo.label : "Not set yet"}
            </div>
          </div>

          <div className="mt-1 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span style={{ color: "var(--ink-2)" }}>Travellers</span>
              <span className="num" style={{ color: "var(--ink-0)" }}>
                {travellers}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: "var(--ink-2)" }}>Pace</span>
              <span className="num" style={{ color: "var(--ink-0)" }}>
                {PACES.find((p) => p.id === pace)?.label}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: "var(--ink-2)" }}>Length</span>
              <span className="num" style={{ color: "var(--ink-0)" }}>
                {lengthLabel}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: "var(--ink-2)" }}>Tastes</span>
              <span className="num" style={{ color: "var(--ink-0)" }}>
                {taste.length > 0 ? taste.map((t) => TASTE_LABEL[t]).join(", ") : "none"}
              </span>
            </div>
            {budgetCeiling && (
              <div
                className="flex items-center justify-between rounded-lg px-2.5 py-1.5"
                style={{ background: "var(--cool-soft)" }}
              >
                <span style={{ color: "var(--ink-1)" }}>Ceiling</span>
                <span className="num" style={{ color: "var(--ink-0)" }}>
                  {Number(budgetCeiling).toLocaleString("en-GB")}
                </span>
              </div>
            )}
          </div>

          <MagneticButton
            type="submit"
            disabled={busy}
            className="mt-2 w-full rounded-xl px-5 py-3 text-center text-sm font-medium disabled:opacity-60"
            style={{ background: "var(--ink-0)", color: "var(--on-ink)" }}
          >
            {busy ? "Generating from real sources" : "Generate the trip"}
          </MagneticButton>
        </div>
      </aside>
    </form>
  );
}
