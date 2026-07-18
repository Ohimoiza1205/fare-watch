import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/db/client";
import { loadTripPlan } from "@/lib/planner/repo";
import { PlannerBoard } from "@/components/planner/PlannerBoard";
import { TripHeaderBar } from "@/components/planner/TripHeaderBar";
import { formatDayDate, formatMoney } from "@/lib/planner/format";

export const dynamic = "force-dynamic";

export default async function TripPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const db = createServiceClient();
  const plan = await loadTripPlan(db, tripId);
  if (!plan) notFound();

  const { trip, days } = plan;
  const destination = trip.dest_label ?? trip.destination;
  const short = destination.split(",")[0].trim();
  const dates =
    trip.start_date && trip.end_date
      ? `${formatDayDate(trip.start_date)} to ${formatDayDate(trip.end_date)}`
      : "dates not set";

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-6">
      <TripHeaderBar
        defaultTitle={`${days.length} days in ${short}`}
        city={short}
        country={
          destination.includes(",")
            ? (destination.split(",").pop()?.trim() ?? null)
            : null
        }
        lengthDays={days.length}
        dates={dates}
        startDate={trip.start_date}
        endDate={trip.end_date}
        travellers={trip.travellers}
        budget={
          trip.budget_ceiling != null
            ? formatMoney(trip.budget_ceiling, trip.currency)
            : null
        }
        brief={{
          destination,
          dates,
          travellers: trip.travellers,
          pace: trip.pace,
          taste: trip.taste,
          maximum:
            trip.budget_ceiling != null
              ? formatMoney(trip.budget_ceiling, trip.currency)
              : null,
        }}
      />

      <PlannerBoard
        tripId={tripId}
        days={days}
        travellers={trip.travellers}
        currency={trip.currency}
        budgetCeiling={trip.budget_ceiling}
        taste={trip.taste}
        pace={trip.pace}
      />
    </main>
  );
}
