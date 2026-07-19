import { getDashboard, listAlerts } from "@/lib/db/queries";
import { asReason, midpointAt } from "@/lib/dealMath";
import {
  AlertsBoard,
  type AlertDayGroup,
  type AlertRowData,
} from "@/components/alerts/AlertsBoard";

// The full audit log, grouped by the local day each alert fired. Deltas are
// against the watch's own range as it stood at fire time.
export const dynamic = "force-dynamic";

function dayKey(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA");
}

function dayLabel(key: string): string {
  const today = new Date().toLocaleDateString("en-CA");
  const yesterday = new Date(Date.now() - 24 * 3_600_000).toLocaleDateString("en-CA");
  if (key === today) return "Today";
  if (key === yesterday) return "Yesterday";
  return new Date(`${key}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

async function buildGroups(): Promise<AlertDayGroup[]> {
  const [dash, alerts] = await Promise.all([getDashboard(), listAlerts(500)]);
  const byWatch = new Map(dash.summaries.map((s) => [s.watch.id, s]));

  const groups = new Map<string, AlertRowData[]>();
  for (const a of alerts) {
    const reason = asReason(a.reason);
    if (!reason) continue;
    const summary = byWatch.get(a.watchId);
    const row: AlertRowData = {
      id: String(a.id),
      firedAt: a.sentAt,
      channels: a.channels,
      reason,
      origin: a.origin,
      destination: a.destination,
      price: a.price,
      currency: a.currency || summary?.watch.currency || "",
      normal: summary ? midpointAt(summary, a.sentAt) : null,
    };
    const key = dayKey(a.sentAt);
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  return [...groups.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, rows]) => ({
      label: dayLabel(key),
      count: rows.length,
      rows,
    }));
}

export default async function AlertsPage() {
  const groups = await buildGroups();
  return <AlertsBoard groups={groups} fetchedAt={new Date().toISOString()} />;
}
