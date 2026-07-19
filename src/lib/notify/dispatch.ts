import { sendEmail } from "./email";
import { sendPush } from "./push";
import { sendWhatsApp } from "./whatsapp";

// P13: quiet hours hold the routine reasons overnight; a mistake fare always
// breaks through because it can die in minutes. QUIET_HOURS is "start-end"
// in server-local hours, e.g. "22-7"; unset disables the hold. A held alert
// is not recorded, so the first poll after the window re-detects it and
// delivers only if the fare still qualifies; alerting in the morning on a
// price that died overnight would be announcing a deal that does not exist.
export function inQuietHours(now: Date, raw = process.env.QUIET_HOURS): boolean {
  if (!raw) return false;
  const m = /^(\d{1,2})-(\d{1,2})$/.exec(raw.trim());
  if (!m) return false;
  const start = Number(m[1]) % 24;
  const end = Number(m[2]) % 24;
  if (start === end) return false;
  const h = now.getHours();
  return start < end ? h >= start && h < end : h >= start || h < end;
}
import type { FareQuote } from "@/lib/providers/types";
import type { FiredSignal } from "@/lib/detect/signals";
import type { WatchRow } from "@/lib/db/queries";
import type { createServiceClient } from "@/lib/db/client";

type Db = ReturnType<typeof createServiceClient>;

export async function dispatch(
  watch: WatchRow,
  quote: FareQuote,
  signal: FiredSignal,
  obsId: number,
  db: Db
) {
  // debounce: skip if the same reason fired recently. Mistake fares vanish in
  // minutes, so they get a shorter window than the rest.
  const sinceMinutes = signal.reason === "mistake" ? 60 : 720;
  const cutoff = new Date(Date.now() - sinceMinutes * 60_000).toISOString();
  const { data: recent } = await db
    .from("alert")
    .select("id")
    .eq("watch_id", watch.id)
    .eq("reason", signal.reason)
    .gte("sent_at", cutoff)
    .limit(1);
  if (recent && recent.length) return;

  if (signal.reason !== "mistake" && inQuietHours(new Date())) {
    console.log(`alert held by quiet hours watch=${watch.id} reason=${signal.reason}`);
    return;
  }

  // Trust on the lock screen comes from visible evidence (P9): the body
  // states the arithmetic the alert fired on, not just the verdict.
  const ev = signal.evidence;
  const evidenceLine =
    `${signal.context}, from ${ev.readings} stored ${ev.readings === 1 ? "reading" : "readings"}` +
    (ev.floor != null ? `, prior floor ${quote.currency} ${ev.floor}` : "");

  const title = `${watch.origin} to ${watch.destination}  ${quote.currency} ${quote.price}`;
  const body =
    `${signal.reason.toUpperCase()}  ${quote.carriers.join(" ")}  ` +
    `${quote.stops} stop(s)  ${quote.departDate}` +
    (quote.returnDate ? ` to ${quote.returnDate}` : "") +
    `\n${evidenceLine}` +
    (signal.reason === "mistake"
      ? `\nmistake fares may not be honoured; book fast, keep the rest refundable`
      : "") +
    (quote.virtualInterline ? `\nself transfer, separately ticketed` : "") +
    `\n${quote.deepLink}`;

  // Triage by priority (P9): a mistake fare can vanish in minutes and breaks
  // through, a threshold hit is personal and loud, the statistical reasons
  // ride at default.
  const priority =
    signal.reason === "mistake" ? "max" : signal.reason === "threshold" ? "high" : "default";

  // Record only the channels that actually sent. A channel with missing config
  // returns false and is left out, so the alert log reflects what really fired.
  const channels: string[] = [];
  const results = await Promise.allSettled([
    sendEmail(title, body),
    sendPush(title, body, quote.deepLink, priority),
    sendWhatsApp(`${title}\n${body}`),
  ]);
  const names = ["email", "push", "whatsapp"];
  results.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value) channels.push(names[i]);
  });

  await db.from("alert").insert({
    watch_id: watch.id,
    observation_id: obsId,
    reason: signal.reason,
    price: quote.price,
    channels,
  });
}
