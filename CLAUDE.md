# Farepoint: Build Guide

A personal flight price tracker that monitors fixed routes across flexible date windows, stores price history, detects genuine drops and mistake fares, and pushes you a fast alert with a direct booking link.

Six corridors at launch: UK to US, US to UK, UK to Nigeria, Nigeria to UK, US to Nigeria, Nigeria to US.

Written for: a developer who has shipped before, on Windows with Git Bash and VS Code, using Claude Code, GitHub, Vercel, and Supabase.

Place this file at the repository root as `CLAUDE.md` (or symlink it) so Claude Code reads it as standing context on every session. The rules below are binding on all generated code, copy, and commits.

---

## Project rules, binding on everything

These govern the codebase, the interface copy, the commit messages, and the code comments. They are not stylistic suggestions.

- No marketing, startup, or buzzword vocabulary anywhere a human will read it. Banned words include sleek, modern, clean, minimal, intuitive, premium, seamless, frictionless, delightful, immersive, cutting edge, next generation, best in class, and their cousins. Button labels, empty states, error messages, and headings use plain, literal language. A button that opens a booking link says Open booking, not Grab this deal.
- No em dashes. No unnecessary hyphens. This applies to UI text and to prose in any file.
- No interface element exists because another product has it. No notification bell, no settings sprawl, no onboarding tour, no decorative animation, no KPI tiles. Every element answers the one question the screen exists to answer.
- No AI features. No chat box, no natural-language search, no generated summaries, no recommendation engine. Detection is arithmetic on a stored price series and nothing more.
- Numbers are the loudest thing on screen, set in tabular figures. Colour carries one job, status. Motion happens only when underlying data changes.
- Code comments explain why, not what. They do not narrate. They are sparse.
- Empty states state the fact plainly. No watches yet reads "No routes watched. Add one to start." It does not cheerlead.

---

## 0. What we are actually building, and why each choice

The whole system rests on one idea: a price is only a deal relative to its own history. A number on a screen tells you nothing. A number that sits below the 10th percentile of every price you have ever recorded for that route, that is a signal. So the price history table is not plumbing, it is the product. Everything else exists to feed it and react to it.

Data sources, locked after testing (no paid providers):

- Flights Scraper Sky on RapidAPI is the source. The endpoint that works is `google/flights/search-roundtrip` on host `flights-sky.p.rapidapi.com`. It returns real fares with carriers, stops, segment detail, and a booking token, and it returns them directly with no two-stage polling. The free plan is 50 requests per month, which is tight, so polling is lean and cached hard.
- It also returns a built-in `priceHistory` array for the route, roughly two weeks of daily points. That is a head start on the trend view, though the app still records its own observations over time for the longer history detection needs.
- The earlier candidates are dead ends and stay out: Kiwi Tequila gated its signup, Amadeus Self-Service is being decommissioned in 2026, and the `web/flights` endpoints on this same RapidAPI listing return empty. Only the `google/flights` endpoints return data.

The data layer stays provider-agnostic regardless, because this is a third-party reseller on a small free tier and may change. One source already failed during this build. The FareProvider interface is what lets a replacement slot in without a rewrite.

Stack, matched to your tools:

- Next.js (App Router) on Vercel for the web app and the API routes.
- Supabase for Postgres, auth, and row-level security.
- A scheduled job (Vercel Cron) that hits an internal route on an interval, which runs the poll.
- Alerts to email, phone push (ntfy or Pushover), and WhatsApp.

A note on scope discipline: there is no machine learning here, no recommendation engine, no chat, no generated copy. The detection is arithmetic on a price series. That is deliberate. It is auditable, fast, and cheap, and it does not pretend to be cleverer than it is.

---

## 1. Repository and local environment

### 1.1 Create the project skeleton

Open Git Bash in the folder where you keep code.

```bash
npx create-next-app@latest fare-watch \
  --typescript --app --eslint --tailwind --src-dir --import-alias "@/*"
cd fare-watch
git init
git add -A
git commit -m "chore: scaffold next app"
```

### 1.2 Folder layout

Inside `src/`, organise by concern, not by file type. This keeps the provider-agnostic boundary obvious.

```
src/
  app/                      Next routes and pages
    api/
      cron/poll/route.ts    the endpoint Vercel Cron calls
      watches/route.ts      CRUD for watchlist items
    (dashboard)/            the authenticated UI
  lib/
    providers/
      types.ts              the shared FareQuote shape and Provider interface
      flightsSky.ts         Flights Scraper Sky (Google endpoint) implementation
      googleMirror.ts       optional secondary, same interface
      index.ts              registry that returns enabled providers
    detect/
      signals.ts            threshold, percentile, drop detection
    notify/
      email.ts
      push.ts
      whatsapp.ts
      dispatch.ts           fan-out to all enabled channels
    db/
      client.ts             Supabase client factory
      queries.ts            typed read and write helpers
    airports.ts             IATA helpers and corridor definitions
  components/               UI building blocks
  styles/
```

### 1.3 Environment variables

Create `.env.local`. Never commit it. Add it to `.gitignore` (Next already does).

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RAPIDAPI_KEY=
RAPIDAPI_HOST=flights-sky.p.rapidapi.com
NTFY_TOPIC=
PUSHOVER_TOKEN=
PUSHOVER_USER=
WHATSAPP_TOKEN=
WHATSAPP_PHONE_ID=
WHATSAPP_TO=
RESEND_API_KEY=
CRON_SECRET=
```

`CRON_SECRET` is a random string you generate. The cron route checks it so the public internet cannot trigger your poller. Generate one:

```bash
openssl rand -hex 32
```

---

## 2. Supabase: the data foundation

### 2.1 Create the project

Sign in at supabase.com, create a project, pick a region near where your cron runs (London or US East are both fine). Copy the project URL, the anon key, and the service role key into `.env.local`.

### 2.2 Schema

Run this in the Supabase SQL editor. Four tables: corridors are static reference data, watches are what you track, observations are the price history that powers everything, and alerts records what already fired so you do not get spammed.

```sql
-- reference data: the six corridors
create table corridor (
  id          text primary key,         -- e.g. 'UK_US'
  origin_area text not null,            -- 'UK'
  dest_area   text not null,            -- 'US'
  label       text not null
);

-- a single thing you are tracking
create table watch (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  corridor_id     text references corridor(id),
  origin          text not null,        -- IATA, e.g. 'LHR'
  destination     text not null,        -- IATA, e.g. 'LBB'
  depart_date     date not null,        -- outbound date
  return_date     date not null,        -- return date
  adults          int not null default 1,
  cabin           text not null default '1', -- 1 economy, 2 prem econ, 3 business, 4 first
  max_stops       int default 0,        -- 0 any, 1 nonstop, 2 max1, 3 max2
  target_price    numeric,              -- your manual threshold, optional
  currency        text not null default 'GBP',
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);

-- every price we ever see, the heart of the system
create table observation (
  id            bigserial primary key,
  watch_id      uuid not null references watch(id) on delete cascade,
  provider      text not null,          -- 'flights-sky'
  price         numeric not null,
  currency      text not null,
  depart_date   date not null,
  return_date   date,
  stops         int,
  carriers      text[],                 -- ['BA','AA']
  deep_link     text,                   -- straight to booking
  is_virtual_interline boolean default false,
  observed_at   timestamptz not null default now()
);

-- index for fast history queries per watch
create index observation_watch_time on observation (watch_id, observed_at desc);
create index observation_watch_price on observation (watch_id, price);

-- what alerts already went out
create table alert (
  id            bigserial primary key,
  watch_id      uuid not null references watch(id) on delete cascade,
  observation_id bigint not null references observation(id),
  reason        text not null,          -- 'threshold','percentile','drop','mistake'
  price         numeric not null,
  sent_at       timestamptz not null default now(),
  channels      text[]                  -- ['email','push','whatsapp']
);

-- seed the corridors
insert into corridor (id, origin_area, dest_area, label) values
  ('UK_US', 'UK', 'US', 'United Kingdom to United States'),
  ('US_UK', 'US', 'UK', 'United States to United Kingdom'),
  ('UK_NG', 'UK', 'NG', 'United Kingdom to Nigeria'),
  ('NG_UK', 'NG', 'UK', 'Nigeria to United Kingdom'),
  ('US_NG', 'US', 'NG', 'United States to Nigeria'),
  ('NG_US', 'NG', 'US', 'Nigeria to United States');
```

### 2.3 Row-level security

Turn on RLS so a user only ever sees their own watches. In the SQL editor:

```sql
alter table watch enable row level security;
alter table observation enable row level security;
alter table alert enable row level security;

create policy "own watches" on watch
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own observations" on observation
  for select using (
    exists (select 1 from watch w where w.id = observation.watch_id and w.user_id = auth.uid())
  );

create policy "own alerts" on alert
  for select using (
    exists (select 1 from watch w where w.id = alert.watch_id and w.user_id = auth.uid())
  );
```

The cron poller writes observations and alerts using the service role key, which bypasses RLS. That is correct: the poller is trusted server code, not a user session. Never expose the service role key to the browser.

---

## 3. The provider-agnostic data layer

This is the most important architectural decision. Every source conforms to one interface. When this RapidAPI listing changes or rate-limits you out, you swap the one file, not the system. One source already failed during this build, so this is not theoretical.

### 3.1 The shared shape

`src/lib/providers/types.ts`

```typescript
export type WatchInput = {
  origin: string;        // IATA, e.g. "LHR"
  destination: string;   // IATA, e.g. "LBB"
  departDate: string;    // ISO yyyy-mm-dd
  returnDate: string;    // ISO yyyy-mm-dd
  adults: number;
  cabin: "1" | "2" | "3" | "4"; // 1 economy, 2 prem econ, 3 business, 4 first
  maxStops: number;      // 0 any, 1 nonstop, 2 max1, 3 max2
  currency: string;
};

export type FareQuote = {
  provider: string;
  price: number;
  currency: string;
  departDate: string;
  returnDate?: string;
  stops: number;
  carriers: string[];
  deepLink: string;       // built from the returningToken, or a search URL
  token?: string;         // returningToken, needed to fetch the return leg + booking
};

// The API hands back a short price history per route. Surface it so the app
// can seed its trend view immediately rather than waiting for its own history.
export type ProviderResult = {
  quotes: FareQuote[];
  priceHistory: { time: number; price: number }[];
};

export interface FareProvider {
  name: string;
  search(input: WatchInput): Promise<ProviderResult>;
}
```

### 3.2 Flights Scraper Sky implementation

Subscribe to Flights Scraper Sky on RapidAPI (free Basic plan), copy your key into `RAPIDAPI_KEY`. The working endpoint is `google/flights/search-roundtrip`. It returns results directly, no polling. Results live in `data.topFlights` and `data.otherFlights`; each item carries `price`, `airlineNames`, `stops`, `departureDate`, `arrivalDate`, `duration`, and a `returningToken`. The route's recent price history is in `data.priceHistory`.

`src/lib/providers/flightsSky.ts`

```typescript
import { FareProvider, FareQuote, ProviderResult, WatchInput } from "./types";

const HOST = process.env.RAPIDAPI_HOST ?? "flights-sky.p.rapidapi.com";

function normalise(it: any, ccy: string): FareQuote {
  return {
    provider: "flights-sky",
    price: it.price,
    currency: ccy,
    departDate: it.departureDate,
    returnDate: it.arrivalDate, // round-trip outbound arrival date; return leg via token
    stops: it.stops ?? Math.max(0, (it.segments?.length ?? 1) - 1),
    carriers: it.airlineNames ?? (it.airlineCode ? [it.airlineCode] : []),
    // A booking-grade deep link needs the return-leg call. As a first cut, link
    // to a Google Flights search for the route; refine with the token later.
    deepLink: `https://www.google.com/travel/flights?q=flights%20from%20${it.departureAirportCode}%20to%20${it.arrivalAirportCode}`,
    token: it.returningToken,
  };
}

export const flightsSky: FareProvider = {
  name: "flights-sky",
  async search(input: WatchInput): Promise<ProviderResult> {
    const params = new URLSearchParams({
      departureId: input.origin,
      arrivalId: input.destination,
      departureDate: input.departDate,
      arrivalDate: input.returnDate,
      cabinClass: input.cabin,
      adults: String(input.adults),
      currency: input.currency,
      sort: "2",                       // price
      stops: String(input.maxStops),
    });

    const res = await fetch(
      `https://${HOST}/google/flights/search-roundtrip?${params}`,
      { headers: { "x-rapidapi-key": process.env.RAPIDAPI_KEY!, "x-rapidapi-host": HOST } }
    );

    if (!res.ok) {
      throw new Error(`flights-sky search failed ${res.status}`);
    }

    const json = await res.json();
    if (json.status === false) {
      throw new Error(`flights-sky reported failure: ${json.message ?? "unknown"}`);
    }

    const data = json.data ?? {};
    const items = [...(data.topFlights ?? []), ...(data.otherFlights ?? [])];
    const quotes = items
      .map((it: any) => normalise(it, input.currency))
      .filter((q: FareQuote) => q.price != null)
      .sort((a: FareQuote, b: FareQuote) => a.price - b.price);

    const priceHistory = (data.priceHistory ?? []).map((h: any) => ({
      time: h.time,
      price: h.price,
    }));

    return { quotes, priceHistory };
  },
};
```

### 3.3 The registry

`src/lib/providers/index.ts`

```typescript
import { FareProvider } from "./types";
import { flightsSky } from "./flightsSky";

export function enabledProviders(): FareProvider[] {
  return [flightsSky];
}
```

When you add a second source later, it implements the same `FareProvider` interface and gets pushed into this array. Nothing else changes.

---

## 4. Detection: turning prices into signals

`src/lib/detect/signals.ts`

Four reasons to fire, evaluated against the watch's own history. Order matters: a mistake fare is the loudest, a manual threshold the most personal.

```typescript
export type PriceRow = { price: number; observed_at: string };

export type Signal = {
  fire: boolean;
  reason: "mistake" | "threshold" | "percentile" | "drop" | null;
  context: string;
};

function percentile(values: number[], p: number): number {
  if (values.length === 0) return Infinity;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.floor((p / 100) * (sorted.length - 1));
  return sorted[idx];
}

export function evaluate(
  current: number,
  history: PriceRow[],
  targetPrice: number | null
): Signal {
  const prices = history.map((h) => h.price);
  const floor = Math.min(...prices, Infinity);
  const p10 = percentile(prices, 10);

  // need a minimum history before percentile logic is trustworthy
  const enoughHistory = prices.length >= 20;

  // 1. Mistake fare: absurdly below the established floor
  if (enoughHistory && floor !== Infinity && current < floor * 0.55) {
    return {
      fire: true,
      reason: "mistake",
      context: `current ${current} is below 55% of floor ${floor}`,
    };
  }

  // 2. Manual threshold: you told it what you would pay
  if (targetPrice != null && current <= targetPrice) {
    return {
      fire: true,
      reason: "threshold",
      context: `current ${current} at or below target ${targetPrice}`,
    };
  }

  // 3. Percentile: cheaper than 90% of everything seen
  if (enoughHistory && current <= p10) {
    return {
      fire: true,
      reason: "percentile",
      context: `current ${current} at or below p10 ${p10}`,
    };
  }

  // 4. Sudden drop versus the most recent reading
  if (history.length >= 2) {
    const last = history[0].price; // history sorted desc by time
    if (last > 0 && current <= last * 0.8) {
      return {
        fire: true,
        reason: "drop",
        context: `current ${current} is 20%+ below last ${last}`,
      };
    }
  }

  return { fire: false, reason: null, context: "" };
}
```

The 0.55 and 0.8 constants are starting points. After a few weeks of real data you will tune them per corridor, because a Nigeria route behaves nothing like a transatlantic one. Keep them in one place so tuning is a one-line edit.

A debounce rule belongs here too: do not fire the same reason for the same watch twice within, say, twelve hours. Check the `alert` table before dispatching. Mistake fares vanish in minutes, so for the mistake reason you can shorten the debounce to one hour.

---

## 5. The poller

`src/app/api/cron/poll/route.ts`

This is the spine. It runs every interval, pulls each active watch, queries every enabled provider, writes observations, evaluates, and dispatches. It must finish inside Vercel's function timeout, so it polls in small batches. The free RapidAPI plan is only 50 requests per month, so polling must be lean: at most a few watches, once a day, and cache aggressively. The per-call sleep below is courtesy, not the real constraint; the monthly cap is.

```typescript
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

  const providers = enabledProviders();
  let polled = 0;

  for (const w of watches ?? []) {
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
          is_virtual_interline: false,
        })
        .select()
        .single();

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
      // basic throttle: stay well under 100 req/min
      await new Promise((r) => setTimeout(r, 700));
    }
  }

  return NextResponse.json({ polled });
}
```

If your watch count grows past what fits in 60 seconds, split the work: select a rotating slice each run using a `last_polled_at` column, ordering by it ascending so the stalest watches go first. Poll hot routes (near departure) more often by weighting that ordering.

---

## 6. Notifications

You chose email, phone push, and WhatsApp. Each is one small file behind a single `dispatch` fan-out.

### 6.1 Dispatch

`src/lib/notify/dispatch.ts`

```typescript
import { sendEmail } from "./email";
import { sendPush } from "./push";
import { sendWhatsApp } from "./whatsapp";

export async function dispatch(watch: any, quote: any, signal: any, obsId: number, db: any) {
  // debounce: skip if same reason fired recently
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

  const channels: string[] = [];
  await Promise.allSettled([
    sendEmail(title, body).then(() => channels.push("email")),
    sendPush(title, body, quote.deepLink).then(() => channels.push("push")),
    sendWhatsApp(`${title}\n${body}`).then(() => channels.push("whatsapp")),
  ]);

  await db.from("alert").insert({
    watch_id: watch.id,
    observation_id: obsId,
    reason: signal.reason,
    price: quote.price,
    channels,
  });
}
```

### 6.2 Email via Resend

Sign up at resend.com, verify a sending domain or use their test address, put the key in `RESEND_API_KEY`.

`src/lib/notify/email.ts`

```typescript
export async function sendEmail(subject: string, text: string) {
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Farepoint <alerts@yourdomain.dev>",
      to: ["you@example.com"],
      subject,
      text,
    }),
  });
}
```

### 6.3 Phone push via ntfy

ntfy is the fastest to stand up: install the ntfy app, subscribe to a private topic name, put that name in `NTFY_TOPIC`. No account needed. Pushover is the paid-once alternative if you want richer formatting; swap the implementation, keep the function name.

`src/lib/notify/push.ts`

```typescript
export async function sendPush(title: string, body: string, link: string) {
  await fetch(`https://ntfy.sh/${process.env.NTFY_TOPIC}`, {
    method: "POST",
    headers: {
      Title: title,
      Click: link,
      Priority: "high",
    },
    body,
  });
}
```

### 6.4 WhatsApp via Meta Cloud API

This one has the most setup. Create a Meta developer app, add the WhatsApp product, get a test number and a permanent token, set `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, and `WHATSAPP_TO`. Note Meta's rule: outside a 24 hour customer-initiated window you can only send pre-approved template messages. For a personal alerter, send yourself a message first to open the window, or register a simple template. If WhatsApp setup stalls, ship with email and push, add WhatsApp later. It is behind the same interface, so it does not block anything.

`src/lib/notify/whatsapp.ts`

```typescript
export async function sendWhatsApp(text: string) {
  const id = process.env.WHATSAPP_PHONE_ID;
  await fetch(`https://graph.facebook.com/v21.0/${id}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: process.env.WHATSAPP_TO,
      type: "text",
      text: { body: text },
    }),
  });
}
```

---

## 7. Scheduling on Vercel

`vercel.json` at the repo root:

```json
{
  "crons": [
    { "path": "/api/cron/poll", "schedule": "0 */3 * * *" }
  ]
}
```

That runs every three hours. Vercel Cron calls the path on your deployed domain. The route checks `CRON_SECRet`, but Vercel Cron sends its own header; to keep your manual `Bearer` check, set the schedule to call a route that reads `CRON_SECRET` from an env the cron can pass, or gate by checking the `x-vercel-cron` presence. Simplest robust pattern: keep the `Authorization` check for manual and external triggers, and additionally allow requests carrying Vercel's cron header. Document whichever you pick in the route file so future-you is not confused.

Tighten the cadence as a trip nears. You can run multiple cron entries with different paths and query flags, for example a 30 minute cadence for watches inside 60 days of departure and 6 hours for the rest. Mind the free plan's cron limits and adjust.

---

## 8. The interface

The standard for this interface is the instrument, not the webpage. Think trading terminal, aircraft panel, telemetry readout: surfaces built so a trained eye reads status in a single glance, where every mark on the screen carries information and nothing is there for decoration. That standard is a quality bar borrowed from instrument design, not a literal feature list. FareWatch has no map and no live aircraft, and adding either would break the first rule below. What transfers is the discipline: density without clutter, motion only as information, hierarchy that feels engineered rather than decorated.

The screen exists to answer one question at a glance. Is anything below its own normal right now, and by how much. Every decision serves that question. Read the frontend-design skill before writing a component, then hold to the rules in this section as written.

### 8.1 The hard rules

- Every element justifies itself by the information it carries. If a thing on screen does not change how you read the prices, it does not ship. No element exists because some other product has it.
- One reading surface. A single dense column of watched routes. No tiles, no hero band, no KPI cards, no empty space dressed up as composure.
- Numbers are the loudest thing on screen. Set every fare in tabular lining figures so digits align in columns and the eye scans price against price without drift. This is not a font preference, it is a scanning-speed requirement.
- Colour does exactly one job, status. A fare below its own tenth percentile reads in a single accent. Everything else is neutral, grey on near-black or grey on near-white. No decorative colour anywhere, no gradients, no brand palette.
- Hierarchy comes from weight, size, and spacing, not from boxes and borders. Group by negative space and typographic scale. A line or a container is a last resort, used only when spacing genuinely cannot carry the grouping.
- Motion happens only when underlying data moves. There are exactly two animations in the entire product, defined in 8.3. No entrance fades, no load-in stagger, no skeleton shimmer, no hover bounce, nothing that moves to look alive. The interface is still until a number changes, then the change itself is the only thing that moves.
- Density rises only where it earns its keep. The collapsed row is spare. Detail appears on demand when a row is opened, and retreats when it closes.

### 8.2 Layout

A list, not a grid. Each watched route is one horizontal row, read left to right as a single sentence: where, how much now, what is normal, what is the shape, what is the status.

```
ORIGIN  DEST    CURRENT      NORMAL RANGE        TREND            STATUS
LHR     LBB     GBP 612      540 to 980          [sparkline]      below normal
LGW     LOS     GBP 488      460 to 720          [sparkline]      normal
JFK     LOS     USD 690      640 to 1,150        [sparkline]      watching
```

The sparkline is the argument of the whole row. A price alone says nothing. The same price drawn against its own ninety-day shape says everything. Mark the current point on the line and draw the historical floor as a faint baseline, so the eye sees at once whether the current fare sits near the bottom of its range or in the middle of it. This is the single visual in the product that earns its pixels, so it is drawn by hand, not pulled from a library.

Opening a row expands it in place. It does not navigate, it does not open a panel from the side. The row grows downward to reveal the full price history, the cheapest itinerary's carriers and stop count, whether the routing is a virtual interline, and one action only, open the booking link. One action, never a row of competing buttons.

The top of the screen is a single quiet status line, not a banner. Routes watched, time of last poll, alerts fired today. Small, plain, set once, never animated.

### 8.3 The only two animations

These are the entire motion budget. Nothing else in the product moves.

- The price roll. When a poll returns a new price for a row, the old number does not blank and reappear, it counts from the old value to the new one over a short, weighted interval, decelerating as it lands. The eye is pulled to the row that changed because it is the only thing moving. A drop and a rise are the same motion; colour, not direction of animation, carries which it was.
- The row expansion. Opening a row eases its height open and the detail content settles in with it, so the new information arrives with physical continuity rather than snapping into place. Closing reverses it. This is the one structural transition, and it exists so the eye keeps its place when density changes.

Both are driven by real state change, a new observation or a user opening a row. Neither fires on page load. If you find yourself adding a third animation, it is decoration, and it does not belong.

### 8.4 Typography and surface

- One typeface for prose and labels, one tabular-figure face for all numbers. Two faces total, no more.
- Near-black surface or near-white surface, chosen once. Text in two or three steps of grey for hierarchy, never pure black on pure white.
- Spacing on a fixed scale so every gap is a deliberate multiple, never an eyeballed value. Alignment is exact down to the pixel; a fare column that drifts by a pixel reads as broken on a surface this spare.

### 8.5 Components to build

Keep the count low. Every component is a place for inconsistency to enter.

- `RouteRow`: the dense collapsed row. Takes the watch, its latest observation, and a computed price summary.
- `Sparkline`: a small SVG line of recent prices, hand-drawn in roughly forty lines. You want full control of the baseline, the marked current point, and the stroke, and you do not want a charting library's defaults leaking styling into a surface this controlled.
- `PriceRoll`: the counting number from 8.3, used wherever a fare can change between polls.
- `RouteDetail`: the in-place expansion, full history plus the single book action.
- `AddWatch`: a compact form, origin, destination, date window, nights range, cabin, optional target price. One screen, no wizard, no steps.

### 8.6 What not to build

No notification bell with a dropdown. No settings page of toggles you will never touch. No onboarding tour. No charts that animate on load. No chat box, no natural-language search, no generated summaries, no recommendation engine, no AI anywhere. No gradients, no glassmorphism, no rounded-card grid, no purple. The product is a list of routes, a hand-drawn line per route, and two animations driven by real data. Build exactly that, to the standard of an instrument, and stop.

---

## 9. Auth and multi-user

Supabase Auth handles sign-in. For a personal tool, email magic links are enough. The RLS policies from section 2.3 already scope every read to the signed-in user, so the moment auth is wired, your data is private by construction. The cron poller is the one piece that runs without a user; it uses the service role key and iterates all active watches across all users, which is correct for a shared poller.

---

## 10. Shipping

```bash
# connect the repo
git remote add origin git@github.com:youruser/fare-watch.git
git push -u origin main

# on vercel.com: import the GitHub repo, framework auto-detected as Next.js
# add every variable from .env.local into Vercel project settings
# deploy
```

Set the Supabase project's allowed redirect URLs to your Vercel domain for auth to work in production. Add the same env vars in Vercel that you have locally, including the service role key (server-only, never prefixed with NEXT_PUBLIC).

After the first deploy, trigger the poller once by hand to confirm the whole chain works end to end:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-app.vercel.app/api/cron/poll
```

You should see a row appear in `observation` and, if a price happens to undercut its history, an alert on your phone.

---

## 11. Build order, so you always have something working

Do not build top to bottom. Build the thinnest vertical slice that produces a real alert, then widen it. Each phase ends with the app in a working state.

1. Supabase schema and one hardcoded watch row inserted by hand.
2. The flights-sky provider plus the local search script (already built and proven). Confirm fares match Google Flights for the same route. This step is done.
3. The poll route, writing observations, no detection yet. Run it a couple of times so history accumulates, mindful of the 50-request monthly cap.
4. Detection plus one notification channel, ntfy, because it is the fastest to prove. Now you get real alerts.
5. Add email and WhatsApp behind the same dispatch.
6. The UI: the route list and the sparkline first, the detail expansion second, the add-watch form last. Seed the sparkline from the provider's built-in priceHistory so it has shape from day one.
7. Vercel Cron, the secret check, production env, deploy.
8. Only if you outgrow the free tier, add a second provider behind the same interface, or upgrade the RapidAPI plan for more corridors and more frequent polling.

A working narrow thing beats a half-built wide thing every time. The first alert you get on your phone, for a route you actually care about, is the moment this becomes real.

---

## 12. Operating it well

- Respect the monthly request cap, not just per-call timing. The free plan is 50 requests a month, so every poll counts. Track usage in RapidAPI's dashboard and widen polling only after upgrading.
- Log every poll outcome. When a provider's response shape changes, and it will, you want the failure visible, not silent.
- Tune the detection constants per corridor after two or three weeks of data. Nigeria routes and transatlantic routes have completely different price distributions, and one set of thresholds will not serve both.
- Treat a fired mistake fare as a candidate, not a certainty. A meaningful share of error fares are never honoured, so book fast but keep the rest of the trip refundable until the ticket is confirmed.
- Keep the data layer honest. The instant you find yourself reaching around the FareProvider interface to grab a flights-sky-specific field, stop and add it to the shared FareQuote shape instead. The interface is the thing that lets you survive a provider change, which has already happened once in this build.
- Rotate the RapidAPI key now. The one used during the de-risk runs has been exposed in chat; regenerate it in RapidAPI and use the new one everywhere.
