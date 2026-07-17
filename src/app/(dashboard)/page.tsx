import Link from "next/link";
import { getDashboard } from "@/lib/db/queries";
import { createServiceClient } from "@/lib/db/client";
import { listTrips, resolveOwnerUserId, type TripSummary } from "@/lib/planner/repo";
import { formatDayDate } from "@/lib/planner/format";

// Home answers one question: what changed since I last looked. It reads the
// same summaries as the watchlist, so both must reflect the latest poll.
export const dynamic = "force-dynamic";

function pollTime(iso: string | null) {
  if (!iso) return "never";
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function HeaderStat({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex flex-col gap-1">
      <span className="eyebrow">{label}</span>
      <span className="num text-sm ink-1">{value}</span>
    </span>
  );
}

function localToday(): string {
  return new Date().toLocaleDateString("en-CA");
}

function nextTrip(trips: TripSummary[]): TripSummary | null {
  const today = localToday();
  const upcoming = trips
    .filter((t) => t.startDate != null && t.startDate >= today)
    .sort((a, b) => (a.startDate! < b.startDate! ? -1 : 1));
  return upcoming[0] ?? null;
}

export default async function Home() {
  const [dash, trips] = await Promise.all([
    getDashboard(),
    listTrips(createServiceClient(), resolveOwnerUserId()),
  ]);

  const below = dash.summaries.filter((s) => s.belowNormal && s.current != null);
  const trip = nextTrip(trips);

  return (
    <main className="mx-auto w-full max-w-4xl px-8 py-10">
      {/* one quiet status line, set once, never animated */}
      <div className="flex flex-wrap gap-x-10 gap-y-4">
        <HeaderStat label="Routes watched" value={String(dash.routesWatched)} />
        <HeaderStat label="Last poll" value={pollTime(dash.lastPollAt)} />
        <HeaderStat label="Alerts today" value={String(dash.alertsToday)} />
      </div>

      <section className="mt-14">
        <h2 className="eyebrow">Below normal</h2>
        {below.length === 0 ? (
          <p className="mt-4 text-sm ink-3">Nothing is below its normal range.</p>
        ) : (
          <div className="mt-2">
            {below.map((s) => {
              const ccy = s.latest?.currency ?? s.watch.currency;
              const pct =
                s.p10 != null && s.current != null && s.p10 > 0
                  ? Math.round((1 - s.current / s.p10) * 100)
                  : null;
              return (
                <Link
                  key={s.watch.id}
                  href="/watchlist"
                  className="grid grid-cols-[3.25rem_3.25rem_1fr_auto] items-baseline gap-x-6 border-b py-3 transition-colors duration-[var(--d1)] hover:bg-[var(--surface-1)]"
                  style={{ borderColor: "var(--hairline)" }}
                >
                  <span className="num text-sm ink-1">{s.watch.origin}</span>
                  <span className="num text-sm ink-3">{s.watch.destination}</span>
                  <span className="num text-base ink-0">
                    <span className="mr-1 text-xs ink-3">{ccy}</span>
                    {s.current!.toLocaleString("en-GB")}
                  </span>
                  <span className="num text-xs" style={{ color: "var(--accent)" }}>
                    {pct != null && pct > 0 ? `${pct}% below p10` : "at p10"}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-14">
        <h2 className="eyebrow">Next trip</h2>
        {trip == null ? (
          <p className="mt-4 text-sm ink-3">No upcoming trips.</p>
        ) : (
          <Link
            href={`/plan/${trip.id}`}
            className="mt-2 grid grid-cols-[1fr_auto] items-baseline gap-6 border-b py-3 transition-colors duration-[var(--d1)] hover:bg-[var(--surface-1)]"
            style={{ borderColor: "var(--hairline)" }}
          >
            <span className="text-sm ink-1">{trip.destLabel ?? trip.destination}</span>
            <span className="num text-xs ink-3">
              {trip.startDate && trip.endDate
                ? `${formatDayDate(trip.startDate)} to ${formatDayDate(trip.endDate)}`
                : trip.startDate
                  ? formatDayDate(trip.startDate)
                  : ""}
            </span>
          </Link>
        )}
      </section>
    </main>
  );
}
