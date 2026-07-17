import { listAlerts, type AlertLogRow } from "@/lib/db/queries";

// A deal is the most recent alert per watch, so the page shows what is worth
// acting on now, not the full history. The full log lives at /alerts.
export const dynamic = "force-dynamic";

const GRID =
  "grid grid-cols-[3.25rem_3.25rem_9rem_6.5rem_9.5rem_auto] items-baseline gap-x-6";

function when(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function latestPerWatch(alerts: AlertLogRow[]): AlertLogRow[] {
  const seen = new Set<string>();
  const out: AlertLogRow[] = [];
  for (const a of alerts) {
    if (seen.has(a.watchId)) continue;
    seen.add(a.watchId);
    out.push(a);
  }
  return out;
}

export default async function Deals() {
  const deals = latestPerWatch(await listAlerts(200));

  return (
    <main className="mx-auto w-full max-w-4xl px-8 py-10">
      <h1 className="text-lg ink-0">Deals</h1>

      {deals.length === 0 ? (
        <p className="mt-8 text-sm ink-3">
          No deals recorded. Alerts that fire will appear here.
        </p>
      ) : (
        <div className="mt-8">
          <div className={`${GRID} px-3 pb-3`}>
            <span className="eyebrow">Origin</span>
            <span className="eyebrow">Dest</span>
            <span className="eyebrow">Price</span>
            <span className="eyebrow">Reason</span>
            <span className="eyebrow">When</span>
            <span />
          </div>
          {deals.map((d) => (
            <div
              key={d.id}
              className={`${GRID} border-t px-3 py-4`}
              style={{ borderColor: "var(--hairline)" }}
            >
              <span className="num text-sm ink-1">{d.origin}</span>
              <span className="num text-sm ink-3">{d.destination}</span>
              <span className="num text-base ink-0">
                <span className="mr-1 text-xs ink-3">{d.currency}</span>
                {d.price.toLocaleString("en-GB")}
              </span>
              <span className="text-xs ink-2">{d.reason}</span>
              <span className="num text-xs ink-3">{when(d.sentAt)}</span>
              {d.deepLink ? (
                <a
                  href={d.deepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="justify-self-end text-xs ink-2 underline underline-offset-4 transition-colors duration-[var(--d1)] hover:text-[var(--ink-0)]"
                >
                  Open booking
                </a>
              ) : (
                <span className="justify-self-end text-xs ink-4">no link</span>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
