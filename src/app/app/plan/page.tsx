import Link from "next/link";
import { createServiceClient } from "@/lib/db/client";
import { resolveOwnerUserId, listTrips, type TripSummary } from "@/lib/planner/repo";
import { TripIntakeForm } from "@/components/planner/TripIntakeForm";
import { KineticHeading } from "@/components/KineticHeading";
import { formatDayDate } from "@/lib/planner/format";

// The list of a trip's own data changes as trips are generated, so read fresh.
export const dynamic = "force-dynamic";

async function recentTrips(): Promise<TripSummary[]> {
  const db = createServiceClient();
  // Pre-auth: no resolved owner returns every trip, matching the tracker.
  return listTrips(db, resolveOwnerUserId());
}

function TripLine({ trip }: { trip: TripSummary }) {
  const dates =
    trip.startDate && trip.endDate
      ? `${formatDayDate(trip.startDate)} to ${formatDayDate(trip.endDate)}`
      : "";
  return (
    <Link
      href={`/app/plan/${trip.id}`}
      className="group grid grid-cols-[1fr_auto] items-baseline gap-6 border-b py-4 transition-colors duration-[var(--d1)]"
      style={{ borderColor: "var(--hairline)" }}
    >
      <span className="text-sm ink-1 transition-colors duration-[var(--d1)] group-hover:text-[var(--ink-0)]">
        {trip.destLabel ?? trip.destination}
      </span>
      <span className="flex items-baseline gap-4 text-xs ink-3">
        <span className="num">{dates}</span>
        {trip.lengthDays != null && (
          <span className="num">{trip.lengthDays} days</span>
        )}
      </span>
    </Link>
  );
}

export default async function PlannerHome() {
  const trips = await recentTrips();

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-10">
      <span className="eyebrow">Trip planner</span>
      <KineticHeading className="mt-2 text-3xl">Plan a trip</KineticHeading>
      <p className="mt-2 max-w-md text-sm leading-relaxed ink-3">
        Real venues and real prices where they are found, clearly marked estimates
        where they are not.
      </p>

      <div className="mt-8">
        <TripIntakeForm />
      </div>

      {trips.length > 0 && (
        <section className="mt-14">
          <h2 className="eyebrow">Your trips</h2>
          <div className="mt-4">
            {trips.map((t) => (
              <TripLine key={t.id} trip={t} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
