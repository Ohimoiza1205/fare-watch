import Link from "next/link";
import { getDashboard, listAlerts } from "@/lib/db/queries";
import { createServiceClient } from "@/lib/db/client";
import { listTrips, resolveOwnerUserId, type TripSummary } from "@/lib/planner/repo";
import { pollCadenceMs } from "@/lib/cron";
import { midpointAt } from "@/lib/dealMath";
import { DestinationImage } from "@/components/DestinationImage";
import { KineticHeading } from "@/components/KineticHeading";

// There is no auth yet, so the identity card states that fact plainly. Every
// figure below it is a count of stored rows or arithmetic on them. Savings
// are only summed within a single currency; mixing currencies into one total
// would invent a number.
export const dynamic = "force-dynamic";

async function defaultCurrency(): Promise<string | null> {
  const db = createServiceClient();
  const { data } = await db.from("watch").select("currency");
  const rows = (data ?? []) as { currency: string }[];
  if (!rows.length) return null;
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.currency, (counts.get(r.currency) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

type Savings = { currency: string; total: number; count: number } | null;

function savingsCaptured(
  dash: Awaited<ReturnType<typeof getDashboard>>,
  alerts: Awaited<ReturnType<typeof listAlerts>>
): Savings {
  const byWatch = new Map(dash.summaries.map((s) => [s.watch.id, s]));
  const perCurrency = new Map<string, { total: number; count: number }>();
  for (const a of alerts) {
    const summary = byWatch.get(a.watchId);
    if (!summary) continue;
    const midpoint = midpointAt(summary, a.sentAt);
    if (midpoint == null || a.price >= midpoint) continue;
    const ccy = a.currency || summary.watch.currency;
    const entry = perCurrency.get(ccy) ?? { total: 0, count: 0 };
    entry.total += midpoint - a.price;
    entry.count += 1;
    perCurrency.set(ccy, entry);
  }
  const best = [...perCurrency.entries()].sort((a, b) => b[1].count - a[1].count)[0];
  if (!best || best[1].count < 3) return null;
  return { currency: best[0], total: best[1].total, count: best[1].count };
}

function earliestRecord(
  dash: Awaited<ReturnType<typeof getDashboard>>,
  trips: TripSummary[]
): string | null {
  const dates = [
    ...dash.summaries.map((s) => s.watch.created_at).filter(Boolean),
    ...trips.map((t) => t.createdAt).filter(Boolean),
  ];
  if (!dates.length) return null;
  return dates.sort()[0];
}

async function observationsTotal(): Promise<number> {
  const db = createServiceClient();
  const { count } = await db
    .from("observation")
    .select("id", { count: "exact", head: true });
  return count ?? 0;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StatCard({
  label,
  value,
  sub,
  warm,
}: {
  label: string;
  value: string;
  sub: string | null;
  warm?: boolean;
}) {
  return (
    <div
      className="surface-2 elev-raise rounded-[var(--r-card)] p-4"
      style={{ border: "1px solid var(--hairline)" }}
    >
      <span className="eyebrow">{label}</span>
      <div
        className="num mt-2 text-2xl"
        style={{ color: warm ? "var(--warm)" : "var(--ink-0)" }}
      >
        {value}
      </div>
      {sub && (
        <div className="mt-1 text-xs" style={{ color: "var(--ink-3)" }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex items-baseline justify-between border-t py-2.5 first:border-t-0"
      style={{ borderColor: "var(--hairline)" }}
    >
      <span className="text-sm" style={{ color: "var(--ink-2)" }}>
        {label}
      </span>
      <span className="num text-sm" style={{ color: "var(--ink-1)" }}>
        {value}
      </span>
    </div>
  );
}

export default async function Profile() {
  const db = createServiceClient();
  const [dash, alerts, trips, currency, obsTotal] = await Promise.all([
    getDashboard(),
    listAlerts(500),
    listTrips(db, resolveOwnerUserId()),
    defaultCurrency(),
    observationsTotal(),
  ]);

  const today = new Date().toLocaleDateString("en-CA");
  const upcoming = trips.filter((t) => t.startDate != null && t.startDate >= today);
  const savings = savingsCaptured(dash, alerts);
  const since = earliestRecord(dash, trips);
  const cadence = pollCadenceMs();

  const pushConfigured = Boolean(process.env.NTFY_TOPIC);
  const emailConfigured = Boolean(process.env.RESEND_API_KEY);

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-8 lg:px-10">
      <div
        className="surface-2 elev-raise flex flex-wrap items-center justify-between gap-4 rounded-[var(--r-card)] p-5"
        style={{ border: "1px solid var(--hairline)" }}
      >
        <div className="flex items-center gap-4">
          <span
            className="surface-3 num flex h-14 w-14 items-center justify-center rounded-full text-xl"
            style={{
              color: "var(--ink-1)",
              boxShadow: "0 0 0 2px var(--cool-soft), 0 0 0 3px var(--cool)",
            }}
          >
            Y
          </span>
          <div>
            <KineticHeading as="h2" className="text-xl">
              You
            </KineticHeading>
            <p className="mt-0.5 text-xs" style={{ color: "var(--ink-3)" }}>
              Local account &middot; sign in not built yet
            </p>
            {since && (
              <p
                className="num mt-1 flex items-center gap-1.5 text-xs"
                style={{ color: "var(--ink-3)" }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  className="h-3.5 w-3.5"
                  aria-hidden="true"
                >
                  <path d="M4 7h16v13H4zM4 7l0-2h16v2M8 3v4M16 3v4M4 11h16" />
                </svg>
                Since {fmtDate(since)}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href="/settings"
            className="pressable rounded-full px-4 py-2 text-sm"
            style={{ border: "1px solid var(--hairline-strong)", color: "var(--ink-2)" }}
          >
            Settings
          </Link>
          <Link
            href="/plan"
            className="pressable rounded-full px-4 py-2 text-sm font-medium"
            style={{ background: "var(--cool)", color: "var(--on-accent)" }}
          >
            Plan a trip
          </Link>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Trips planned"
          value={String(trips.length)}
          sub={`${upcoming.length} upcoming`}
        />
        <StatCard
          label="Routes watched"
          value={String(dash.routesWatched)}
          sub="active watches"
        />
        <StatCard
          label="Alerts received"
          value={String(alerts.length)}
          sub="all time"
          warm
        />
        {savings ? (
          <StatCard
            label="Savings captured"
            value={`${savings.currency} ${Math.round(savings.total).toLocaleString("en-GB")}`}
            sub="versus normal fares, estimated"
            warm
          />
        ) : (
          <StatCard
            label="Observations stored"
            value={String(obsTotal)}
            sub="price readings"
          />
        )}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section
          className="surface-2 elev-raise rounded-[var(--r-card)] p-5"
          style={{ border: "1px solid var(--hairline)" }}
        >
          <span className="eyebrow">Recent trips</span>
          {trips.length === 0 ? (
            <p className="mt-3 text-sm" style={{ color: "var(--ink-3)" }}>
              No trips yet.{" "}
              <Link href="/plan" className="pressable" style={{ color: "var(--cool)" }}>
                Plan a trip
              </Link>
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {trips.slice(0, 4).map((t) => {
                const label = t.destLabel ?? t.destination;
                const city = label.split(",")[0].trim();
                const isUpcoming = t.startDate != null && t.startDate >= today;
                return (
                  <li key={t.id} className="flex items-center gap-3">
                    <DestinationImage
                      place={city}
                      className="h-10 w-14 shrink-0 rounded-lg"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm" style={{ color: "var(--ink-1)" }}>
                        {city}
                      </div>
                      <div className="num text-xs" style={{ color: "var(--ink-3)" }}>
                        {t.lengthDays != null ? `${t.lengthDays} days` : ""}
                      </div>
                    </div>
                    <span
                      className="rounded-full px-2 py-0.5 text-[9px] uppercase"
                      style={
                        isUpcoming
                          ? {
                              letterSpacing: "0.06em",
                              background: "var(--cool-soft)",
                              color: "var(--cool)",
                            }
                          : {
                              letterSpacing: "0.06em",
                              border: "1px solid var(--hairline-strong)",
                              color: "var(--ink-3)",
                            }
                      }
                    >
                      {isUpcoming ? "Upcoming" : "Past"}
                    </span>
                    <Link
                      href={`/plan/${t.id}`}
                      className="pressable shrink-0 text-xs"
                      style={{ color: "var(--cool)" }}
                    >
                      Open itinerary
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section
          className="surface-2 elev-raise rounded-[var(--r-card)] p-5"
          style={{ border: "1px solid var(--hairline)" }}
        >
          <div className="flex items-baseline justify-between">
            <span className="eyebrow">Account settings</span>
            <Link href="/settings" className="pressable text-xs" style={{ color: "var(--cool)" }}>
              Manage settings
            </Link>
          </div>
          <div className="mt-3">
            <SettingRow
              label="Push alerts"
              value={pushConfigured ? "configured" : "not set"}
            />
            <SettingRow
              label="Email alerts"
              value={emailConfigured ? "configured" : "not set"}
            />
            <SettingRow label="Watch currency" value={currency ?? "none"} />
            <SettingRow
              label="Poll cadence"
              value={
                cadence != null
                  ? `every ${Math.round(cadence / 3_600_000)}h`
                  : "not scheduled"
              }
            />
          </div>
        </section>
      </div>
    </main>
  );
}
