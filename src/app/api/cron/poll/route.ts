import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/db/client";
import { enabledProviders } from "@/lib/providers";
import { evaluate, PriceRow } from "@/lib/detect/signals";
import { dispatch } from "@/lib/notify/dispatch";

export const maxDuration = 60; // seconds, Vercel hobby cap

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = createServiceClient();
  const { data: watches } = await db
    .from("watch")
    .select("*")
    .eq("active", true);

  // Every watch polled costs one provider request against a 50-per-month cap,
  // so a manual or verification run must be able to spend exactly one. ?watch=id
  // targets a single watch; ?limit=n takes the n stalest (never-observed first,
  // then oldest last observation). No parameter keeps the full cron behaviour.
  let targets = watches ?? [];
  const url = new URL(req.url);
  const watchParam = url.searchParams.get("watch");
  const limitParam = url.searchParams.get("limit");
  if (watchParam) {
    targets = targets.filter((w) => w.id === watchParam);
  } else if (limitParam) {
    const limit = Math.max(1, Number.parseInt(limitParam, 10) || 1);
    const { data: seen } = await db
      .from("observation")
      .select("watch_id, observed_at")
      .order("observed_at", { ascending: false });
    const lastSeen = new Map<string, number>();
    for (const o of seen ?? []) {
      if (!lastSeen.has(o.watch_id)) lastSeen.set(o.watch_id, Date.parse(o.observed_at));
    }
    targets = [...targets]
      .sort((a, b) => (lastSeen.get(a.id) ?? 0) - (lastSeen.get(b.id) ?? 0))
      .slice(0, limit);
  }

  const providers = enabledProviders();
  let polled = 0;

  for (const w of targets) {
    for (const p of providers) {
      let result;
      try {
        result = await p.search({
          origin: w.origin,
          destination: w.destination,
          departDate: w.depart_date,
          returnDate: w.return_date,
          adults: w.adults,
          cabin: w.cabin,
          maxStops: w.max_stops,
          currency: w.currency,
        });
      } catch (e) {
        console.error(`poll failed watch=${w.id} provider=${p.name}`, e);
        continue;
      }

      const cheapest = result.quotes[0];
      if (!cheapest) continue;

      const { data: obs } = await db
        .from("observation")
        .insert({
          watch_id: w.id,
          provider: cheapest.provider,
          price: cheapest.price,
          currency: cheapest.currency,
          depart_date: cheapest.departDate,
          return_date: cheapest.returnDate,
          stops: cheapest.stops,
          carriers: cheapest.carriers,
          deep_link: cheapest.deepLink,
          is_virtual_interline: cheapest.virtualInterline ?? false,
        })
        .select()
        .single();

      // Persist the provider's built-in price history so the sparkline has real
      // shape immediately. The unique (watch_id, time) constraint means a point
      // is stored once; ignoreDuplicates skips the ones already there.
      const points = result.priceHistory
        .filter((h) => h.time != null && h.price != null)
        .map((h) => ({ watch_id: w.id, time: h.time, price: h.price, source: "provider" }));
      if (points.length) {
        const { error: upErr } = await db
          .from("price_history")
          .upsert(points, { onConflict: "watch_id,time", ignoreDuplicates: true });
        if (upErr) console.error(`price_history upsert failed watch=${w.id}`, upErr);
      }
      console.log(
        `poll watch=${w.id} price=${cheapest.price} historyPoints=${points.length}`
      );

      const { data: hist } = await db
        .from("observation")
        .select("price, observed_at")
        .eq("watch_id", w.id)
        .order("observed_at", { ascending: false })
        .limit(500);

      const signal = evaluate(
        cheapest.price,
        (hist ?? []) as PriceRow[],
        w.target_price
      );

      if (signal.fire && obs) {
        await dispatch(w, cheapest, signal, obs.id, db);
      }

      polled++;
      // basic throttle: stay well under 100 req/min. The real constraint is the
      // 50-request monthly cap, so trigger this route sparingly.
      await new Promise((r) => setTimeout(r, 700));
    }
  }

  return NextResponse.json({ polled });
}
