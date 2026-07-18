"use client";

import Link from "next/link";
import { DestinationImage } from "@/components/DestinationImage";

// The right-third card: the next planned trip with its real dates, a real
// countdown, and the real stop count. Empty state states the fact and offers
// the one useful action.

export type NextTripInfo = {
  id: string;
  city: string;
  label: string;
  startDate: string;
  endDate: string | null;
  daysUntil: number;
  stops: number;
};

function fmt(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

export function NextTripCard({
  trip,
  hasPastTrips = false,
}: {
  trip: NextTripInfo | null;
  hasPastTrips?: boolean;
}) {
  if (!trip) {
    return (
      <div
        className="elev-raise flex min-h-64 flex-col items-center justify-center gap-3 rounded-[var(--r-card)] p-6"
        style={{ background: "var(--surface-2)", border: "1px solid var(--hairline)" }}
      >
        <p className="text-sm" style={{ color: "var(--ink-2)" }}>
          {hasPastTrips ? "No upcoming trips." : "No trips yet."}
        </p>
        <Link
          href="/plan"
          className="pressable rounded-full px-4 py-2 text-xs"
          style={{ border: "1px solid var(--hairline-strong)", color: "var(--cool)" }}
        >
          Plan a trip
        </Link>
      </div>
    );
  }

  return (
    <div
      className="elev-raise flex flex-col overflow-hidden rounded-[var(--r-card)]"
      style={{ background: "var(--surface-2)", border: "1px solid var(--hairline)" }}
    >
      <div className="relative">
        <DestinationImage place={trip.city} className="h-24 w-full" />
        <span
          className="absolute right-3 top-3 rounded-full px-2.5 py-1 text-[10px] uppercase"
          style={{
            letterSpacing: "0.06em",
            background: "rgba(6, 8, 12, 0.55)",
            color: "var(--cool)",
            backdropFilter: "blur(4px)",
          }}
        >
          Upcoming
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <span className="eyebrow">Next trip</span>
        <span className="heading mt-1 text-xl" style={{ color: "var(--ink-0)" }}>
          {trip.city}
        </span>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div>
            <span className="block text-[10px] uppercase" style={{ letterSpacing: "0.07em", color: "var(--ink-4)" }}>
              Departs
            </span>
            <span className="num text-sm" style={{ color: "var(--ink-1)" }}>
              {fmt(trip.startDate)}
            </span>
          </div>
          <div>
            <span className="block text-[10px] uppercase" style={{ letterSpacing: "0.07em", color: "var(--ink-4)" }}>
              Returns
            </span>
            <span className="num text-sm" style={{ color: "var(--ink-1)" }}>
              {trip.endDate ? fmt(trip.endDate) : "open"}
            </span>
          </div>
          <div>
            <span className="block text-[10px] uppercase" style={{ letterSpacing: "0.07em", color: "var(--ink-4)" }}>
              Countdown
            </span>
            <span className="num text-sm" style={{ color: "var(--cool)" }}>
              {trip.daysUntil} {trip.daysUntil === 1 ? "day" : "days"}
            </span>
          </div>
        </div>

        <div
          className="mt-auto flex items-center justify-between border-t pt-3"
          style={{ borderColor: "var(--hairline)", marginTop: "auto" }}
        >
          <span className="num text-xs" style={{ color: "var(--ink-3)" }}>
            {trip.stops} {trip.stops === 1 ? "stop" : "stops"} planned
          </span>
          <Link
            href={`/plan/${trip.id}`}
            className="pressable text-xs"
            style={{ color: "var(--cool)" }}
          >
            Itinerary
          </Link>
        </div>
      </div>
    </div>
  );
}
