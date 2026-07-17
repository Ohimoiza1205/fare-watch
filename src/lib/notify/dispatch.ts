import { sendEmail } from "./email";
import { sendPush } from "./push";
import { sendWhatsApp } from "./whatsapp";
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

  const title = `${watch.origin} to ${watch.destination}  ${quote.currency} ${quote.price}`;
  const body =
    `${signal.reason.toUpperCase()}  ${quote.carriers.join(" ")}  ` +
    `${quote.stops} stop(s)  ${quote.departDate}` +
    (quote.returnDate ? ` to ${quote.returnDate}` : "") +
    `\n${quote.deepLink}`;

  // Record only the channels that actually sent. A channel with missing config
  // returns false and is left out, so the alert log reflects what really fired.
  const channels: string[] = [];
  const results = await Promise.allSettled([
    sendEmail(title, body),
    sendPush(title, body, quote.deepLink),
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
