import { getDashboard } from "@/lib/db/queries";
import { RouteRow } from "@/components/RouteRow";
import { ROW_GRID } from "@/components/rowGrid";
import { AssistantChat } from "@/components/AssistantChat";

// The list reflects the latest poll, so read fresh on every request.
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

export default async function Dashboard() {
  const { summaries, routesWatched, lastPollAt, alertsToday } = await getDashboard();

  return (
    <main className="mx-auto w-full max-w-4xl px-8 py-10">
      {/* one quiet status line, set once, never animated */}
      <div className="flex flex-wrap gap-x-10 gap-y-4">
        <HeaderStat label="Routes watched" value={String(routesWatched)} />
        <HeaderStat label="Last poll" value={pollTime(lastPollAt)} />
        <HeaderStat label="Alerts today" value={String(alertsToday)} />
      </div>

      {summaries.length === 0 ? (
        <p className="mt-16 text-sm ink-3">No routes watched. Add one to start.</p>
      ) : (
        <div className="mt-12">
          <div className={`${ROW_GRID} px-3 pb-4`}>
            <span className="eyebrow">Origin</span>
            <span className="eyebrow">Dest</span>
            <span className="eyebrow">Current</span>
            <span className="eyebrow">Normal range</span>
            <span className="eyebrow">Trend</span>
            <span className="eyebrow">Status</span>
          </div>

          <div>
            {summaries.map((s) => (
              <RouteRow key={s.watch.id} summary={s} />
            ))}
          </div>
        </div>
      )}

      {/* subordinate to the list; answers come only from stored tracker data */}
      <section className="mt-16 max-w-2xl">
        <h2 className="eyebrow">Assistant</h2>
        <AssistantChat
          endpoint="/api/assistant"
          emptyText="Ask about watched routes, price history, or alerts. Figures come from stored data only."
        />
      </section>
    </main>
  );
}
