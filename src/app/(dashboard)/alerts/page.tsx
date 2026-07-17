import { listAlerts } from "@/lib/db/queries";

// The audit trail of every alert sent, newest first. It records what already
// happened, so there is nothing to mark read and nothing to act on here.
export const dynamic = "force-dynamic";

const GRID =
  "grid grid-cols-[9.5rem_3.25rem_3.25rem_6.5rem_9rem_1fr] items-baseline gap-x-6";

function when(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function Alerts() {
  const alerts = await listAlerts(500);

  return (
    <main className="mx-auto w-full max-w-4xl px-8 py-10">
      <h1 className="text-lg ink-0">Alerts</h1>

      {alerts.length === 0 ? (
        <p className="mt-8 text-sm ink-3">No alerts sent yet.</p>
      ) : (
        <div className="mt-8">
          <div className={`${GRID} px-3 pb-3`}>
            <span className="eyebrow">Sent</span>
            <span className="eyebrow">Origin</span>
            <span className="eyebrow">Dest</span>
            <span className="eyebrow">Reason</span>
            <span className="eyebrow">Price</span>
            <span className="eyebrow">Channels</span>
          </div>
          {alerts.map((a) => (
            <div
              key={a.id}
              className={`${GRID} border-t px-3 py-3`}
              style={{ borderColor: "var(--hairline)" }}
            >
              <span className="num text-xs ink-3">{when(a.sentAt)}</span>
              <span className="num text-sm ink-1">{a.origin}</span>
              <span className="num text-sm ink-3">{a.destination}</span>
              <span className="text-xs ink-2">{a.reason}</span>
              <span className="num text-sm ink-0">
                <span className="mr-1 text-xs ink-3">{a.currency}</span>
                {a.price.toLocaleString("en-GB")}
              </span>
              <span className="text-xs ink-3">{a.channels.join(" ")}</span>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
