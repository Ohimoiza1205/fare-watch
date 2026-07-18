import { readFileSync } from "fs";
import { join } from "path";

// The sidebar states polling health honestly: LIVE when the newest observation
// is within twice the scheduled cadence, OVERDUE past that, and NOT SCHEDULED
// when no vercel.json cron entry exists for the poll route. The cadence is
// read from the repo's own vercel.json so the display can never invent a
// schedule that is not really configured.

type CronEntry = { path: string; schedule: string };

// Supports the shapes this project would actually schedule: every N minutes,
// every N hours, daily at a fixed hour, or every N days at a fixed hour.
// Anything else returns null and the caller treats the cadence as unknown.
export function cadenceMsFromSchedule(schedule: string): number | null {
  const parts = schedule.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  const [min, hour, dom] = parts;

  const everyMin = min.match(/^\*\/(\d+)$/);
  if (everyMin && hour === "*") return Number(everyMin[1]) * 60_000;

  const everyHour = hour.match(/^\*\/(\d+)$/);
  if (/^\d+$/.test(min) && everyHour) return Number(everyHour[1]) * 3_600_000;

  if (/^\d+$/.test(min) && /^\d+$/.test(hour)) {
    const everyDay = dom.match(/^\*\/(\d+)$/);
    if (everyDay) return Number(everyDay[1]) * 24 * 3_600_000;
    if (dom === "*") return 24 * 3_600_000;
  }

  return null;
}

export function pollCadenceMs(): number | null {
  try {
    const raw = readFileSync(join(process.cwd(), "vercel.json"), "utf8");
    const parsed = JSON.parse(raw) as { crons?: CronEntry[] };
    const entry = (parsed.crons ?? []).find((c) =>
      c.path.startsWith("/api/cron/poll")
    );
    if (!entry) return null;
    return cadenceMsFromSchedule(entry.schedule);
  } catch {
    return null;
  }
}
