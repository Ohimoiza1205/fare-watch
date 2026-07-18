import { Sparkline } from "./Sparkline";
import type { RouteSummary } from "@/lib/db/queries";

function fmt(n: number) {
  return n.toLocaleString("en-GB");
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="eyebrow">{label}</span>
      <span className="num text-lg ink-1">{value}</span>
    </div>
  );
}

// The expanded content: a larger price history, the stats in a true row, the
// cheapest itinerary, and one action.
export function RouteDetail({ summary }: { summary: RouteSummary }) {
  const { latest, series, min, max, current, belowNormal } = summary;
  const prices = series.map((s) => s.price);
  const ccy = latest?.currency ?? summary.watch.currency;
  const money = (n: number | null) => (n != null ? `${ccy} ${fmt(n)}` : "none yet");

  return (
    <div className="ml-[6.5rem] mr-3 mb-6 mt-1 rounded-xl px-5 py-5 surface-1 hairline-t">
      <Sparkline prices={prices} belowNormal={belowNormal} width={620} height={130} />

      <div className="mt-6 grid grid-cols-[repeat(4,minmax(0,7rem))] gap-x-10 gap-y-4">
        <Stat label="Low" value={money(min)} />
        <Stat label="High" value={money(max)} />
        <Stat label="Current" value={money(current)} />
        <Stat label="Points" value={String(series.length)} />
      </div>

      {latest && (
        <div className="mt-6 num text-sm ink-3">
          {(latest.carriers ?? []).join(" ") || "carrier unknown"}
          {"    "}
          {latest.stops != null ? `${latest.stops} stop(s)` : "stops unknown"}
          {"    "}
          {latest.depart_date}
          {latest.return_date ? ` to ${latest.return_date}` : ""}
          {latest.is_virtual_interline ? "    virtual interline" : ""}
        </div>
      )}

      {latest?.deep_link && (
        <a
          href={latest.deep_link}
          target="_blank"
          rel="noopener noreferrer"
          className="pressable mt-6 inline-flex items-center rounded-md px-4 py-2.5 text-sm font-medium hover:opacity-90"
          style={{ backgroundColor: "var(--accent)", color: "var(--on-accent)" }}
        >
          Open booking
        </a>
      )}
    </div>
  );
}
