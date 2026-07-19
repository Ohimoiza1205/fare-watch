# FAREWATCH MASTER BUILD PLAN

The single governing document for autonomous builds. Tasks are appended at the bottom forever; the agent always works the earliest unfinished task. This file is read at the start of every session alongside CLAUDE.md, DESIGN-STANDARD.md, and PLANNER-SPEC.md.

---

## PART 1: WHAT FAREWATCH IS

One app, two halves, one intelligence layer:

- The Tracker: watches flight fares on defined routes, stores price history, detects real deals, alerts the phone.
- The Planner: generates honest day by day trip itineraries with real venues, real or clearly marked estimate prices, weather, and a live budget.
- The intelligence layer (the 2 in 1 system): one assistant surface that spans both. It can answer "when should we book the flight" using the tracker's real price history, and "what does the trip cost if we add a spa day" using the planner's real lookups. One brain, two data sources, zero invented facts.

There is no aircraft map and never will be. Flight tracking language in any brief is a craft standard only.

## PART 2: THE UNIFIED DESIGN SYSTEM (UI specialist's contract)

The tracker is dark and the planner is light today. They must read as one product. The unification is by shared structure and tokens, not by forcing one theme:

- One token source. All colours, spacing, radii, type scale, motion durations, and easing live in one place (globals). The dark tracker and light planner are two themes over the same tokens. Nothing hardcodes a colour.
- One category colour source of truth, used by planner tags, map pins, donut slices, and budget rows.
- One motion language everywhere: durations 200/320/460ms, weighted deceleration, numbers roll on real change only, panels glide, nothing on load, reduced motion collapses all.
- One component vocabulary: the same sidebar, header pattern, stat card, chip, and panel primitives serve both views.
- Numbers are always tabular figures, aligned in true columns. Confirmed versus estimate is always form (dim, tilde, est tag), never colour. Status colours stay reserved.

### Reference parity checklist (from the Bali, Barcelona, and Wayfare references)

The planner matches this bar, item by item:
- Top header: trip context strip (destination thumbnail, dates chip, travellers chip, budget chip) plus share and primary action.
- Stat cards with content: budget with progress bar and percent, daily average with sparkline, remaining, trip style chip, weather with high low and condition.
- View switcher for the itinerary area: Itinerary, Calendar, Map, Timeline (Itinerary first; others may land as later tasks).
- Itinerary rows: time rail with category coloured icon dots and connector line, real photo thumbnail, venue with address line, category tags, price right aligned with per person or for N people context, an overflow control per row, save or lock control.
- Day sections collapse and expand; collapsed days show date plus day total.
- Right rail: budget overview (total, spent style ring or donut with percent used), per category breakdown rows with swatches, amounts, percents; the live street map with numbered pins matching the itinerary and a small popover card for the selected stop; trip summary tiles (duration, activities count, est total, daily average).
- Sidebar: wordmark, primary nav with active state, contextual cards (weather at destination), user card at bottom.
- Add activity affordance at the end of each day.
- Assistant panel: present, useful, grounded (see Part 3).

## PART 3: THE 2 IN 1 AI SYSTEM (senior dev's contract)

One assistant, two grounded toolsets. Architecture:

- A single provider interface (Anthropic Messages API behind one module reading ANTHROPIC_API_KEY). The model never sees a path to invent facts, because every factual answer flows through tools:
  - Tracker tools: read watches, read observations and price history, read alert history, evaluate current price against history.
  - Planner tools: read the trip, days, items; fetch real alternatives by category and price range from the existing venue lookups; apply a swap; recompute the budget.
- Tool results are the only source of prices and venues in assistant replies. If a lookup returns nothing, the assistant says so plainly. Enforced in code: the reply pipeline rejects any price string that did not originate from a tool result.
- The assistant lives in one component used by both views, with the toolset scoped to the view (tracker questions on the tracker, trip questions in the planner, and cross questions like "is the flight cheap enough to book for this trip" allowed anywhere both datasets exist).
- Cost control: cap tokens per reply, cap tool loops per message, degrade to a plain message when the key is absent.

## PART 4: AUTONOMOUS EXECUTION PROTOCOL

How long unattended runs happen safely and productively.

### Setup, once per session
1. Confirm clean state: `claude doctor`, then `git status` clean.
2. Create or switch to a feature branch, never main: `git checkout -b overnight/<date>`.
3. The owner starts the session with `--dangerously-skip-permissions` knowingly. The structural protections below replace the removed pauses.

### Structural protections (non negotiable)
- All work happens on the feature branch. Main is merged by the owner after review, never by the agent.
- Database changes are additive only (new tables, new columns, new rows). No drops, no destructive migrations, no deleting user data. If a destructive change seems needed, write it to the MORNING CHECKLIST instead.
- Never print, commit, or log secrets. .env.local is read only to the agent.
- Deploys, purchases, and key rotation are owner only. Prepare, never perform.

### Working loop (the verification loop, kept from the orchestrator pattern)
For each task, in order:
1. Read the task. Break it into atomic steps. Use sub agents for parallelisable work (for example one on a page, one on a shared component) when it genuinely speeds things up.
2. Build.
3. Verify against the task's acceptance criteria plus: typecheck passes, lint passes, build passes, no dead links, no fabricated data paths, design tokens used (no hardcoded colours), reduced motion respected.
4. If verification fails, fix and re verify. Maximum three fix cycles per task; if still failing, log the exact blocker in the BUILD LOG, mark the task BLOCKED, and move to the next task. Never loop forever, never silently skip.
5. Commit with a clear message. Append one line to the BUILD LOG.
6. Every five tasks, push the branch.

### Drift guard
Do only what the task says. Do not redesign working screens, rename things for taste, or "improve" outside scope. Smallest reasonable choice on ambiguity, noted in the log.

## PART 5: TASK QUEUE

Work top to bottom. Append new tasks at the bottom forever; never reorder or delete completed ones.

- [x] T1. Unify tokens: audit both views for hardcoded colours, spacing, or durations; move all to the shared token source; verify tracker and planner render identically to before.
- [x] T2. Sidebar completion: every nav item routes to a real page (Home summary, Trips, Deals from alert history, Watchlist tracker, Alerts history, Profile, Settings). No dead links. Add the contextual weather card and user card per the references.
- [x] T3. Trip context header: destination thumbnail, dates chip with picker affordance, travellers chip, budget chip, share trip, primary action. Editable trip title stays.
- [x] T4. Stat cards to reference parity: budget with progress bar and percent of ceiling, daily average with per day sparkline, remaining amount, trip style chip, weather high low condition. Tinted icons, tabular figures, rolling numbers.
- [x] T5. Itinerary rows to reference parity: address line under venue, per person or for N people context on prices, overflow control, save or lock control on each row, add activity affordance per day, collapsed day rows showing date plus total.
- [x] T6. Right rail to reference parity: budget overview ring with percent used above the breakdown rows; map popover card for the selected stop; trip summary tiles.
- [x] T7. Assistant, phase 1: wire the Anthropic provider module; tracker and planner toolsets as in Part 3; grounded replies only; absent key degrades plainly; cost caps in place.
- [x] T8. Assistant, phase 2: swap execution through the assistant (it proposes real alternatives from lookups, applies on confirm, budget rolls live).
- [x] T9. Price history resilience: verify the stops filter fix path; sparklines read whatever history exists, empty safe; one paid poll maximum for verification, logged.
- [x] T10. View switcher, phase 1: Itinerary (existing) plus Calendar view (a month grid of the trip with day totals). Map and Timeline stubs route honestly to "not built yet" states, not dead tabs.
- [x] T11. Refinement pass: spacing rhythm, type hierarchy, category colour consistency across tags, pins, donut, rows; confirmed versus estimate clarity; no layout restructuring. Absorbed by the REDESIGN-SPEC full rebuild (P1 to P15); residual: day pills label by date because the arranger provides no area names, and the day strip has no "+N more days" affordance, it scrolls.
- [x] P1. Sparkline hover scrub plus percentile position: hairline follows pointer, exact price and date print in the row's own number slot, and rows state "Nth lowest of M observations". Rationale: makes the stored history explorable and states position in history without forecast fakery. Audited already built: REDESIGN P2's ScrubSparkline ships the scrub with the value and date in a mono chip at the pointer (the newer spec's form), and Watchlist rows state "Cheapest N percent of readings seen" (same information as Nth lowest of M). Confirmed in code and live in Chrome.
- [x] P2. Fare caveat flags: one-word grey tag on row and in alert text when the cheapest quote is virtual interline or self transfer (field already in schema). Rationale: a cheap number that hides a caveat is invented savings. Done: "self transfer" grey tag on the watch row (two words, the hyphen rule forbids Skyscanner's exact form), a plain caveat line in the alert body, virtualInterline added to FareQuote so providers state it instead of the poller hardcoding false. The flights-sky endpoint does not report the flag, so it stays honestly unset there.
- [x] P3. Honest staleness stamp: each row shows "as of Xh ago" in grey from observed_at; no skeletons anywhere. Rationale: last-known value plus age is the honest loading state for known layouts. Done on watch rows, ticking, verified live; zero skeletons confirmed.
- [ ] [proposed] P4. Opening-hours conflict line: store venue hours at add time, compare against the planned day, print a plain warning when closed. Rationale: highest honesty per line of code in the planner.
- [ ] [proposed] P5. Keyboard list navigation: arrows or j/k to move, Enter to expand, slash to reach add watch. Rationale: a glance-and-act instrument should not require the mouse.
- [ ] [proposed] P6. Plain-text printable itinerary export: one server-rendered route with addresses, times, confirmed prices. Rationale: a trip is used where connectivity is not.
- [x] P7. Date-change re-flow: applying a new date range to a generated trip shifts or rebuilds days deliberately. Rationale: T3 ships the date picker affordance with apply disabled because silent desync is worse than no edit. Done: PATCH /api/trips/[tripId] shifts a same-length range across every day and refreshes each day's weather from the real forecast in one range call; a different length is refused with a plain sentence naming both lengths, because regeneration is the honest path to a new length. The dates chip's apply is enabled with busy and error states. Exercised live on the Lisbon trip: refusal verified, a one day shift applied through the UI and shifted back, weather refetched both ways.
- [x] P8. Dead man's switch and overdue-poll indicator: ping a Healthchecks URL at the end of a successful poll; the status line shows last poll age in the status accent when overdue past twice the cadence. Rationale: the tool is worthless if it silently stops polling. Done: the poll route pings HEALTHCHECK_URL when the run proved the pipeline (nothing to poll, or at least one call succeeded; a run of pure failures does not ping so total API failure also alarms), skipped silently when unset. The overdue indicator half already existed in the sidebar and Settings, confirmed live. Owner creates the check and sets the env, in the checklist.
- [ ] [proposed] P9. Evidence-based alert copy and ntfy priority by reason: alert body states the arithmetic (price, count of readings, prior floor); mistake maps to max priority, threshold high, others default. Rationale: trust on the lock screen comes from visible evidence, and triage from priority.
- [ ] [proposed] P10. Actual-spend per item: one optional paid amount per itinerary item; budget shows planned vs actual with a plain delta; a done check greys the item and rolls its actual into spent. Rationale: extends confirmed-vs-estimate honesty into the trip itself.
- [x] P11. Sparkline gap breaks and monthly request counter: lift the pen when observations sit further apart than twice the poll interval; status line shows requests used of 50. Rationale: never draw invented segments, never blow the hard cap. Gap break half audited already built in ScrubSparkline (REDESIGN P2), confirmed live. Counter half done: the poller records every outbound call into poll_request (fail-quiet until tracker-additions.sql is run), and the sidebar strip and Settings show "N of 50" from real rows, omitted entirely while the table is absent. Owner action to create the table is in the MORNING CHECKLIST.
- [ ] [proposed] P12. Days-to-departure chart toggle: re-plot stored observations against days until departure. Rationale: booking-window insight from existing rows, no ML.
- [ ] [proposed] P13. Quiet hours with mistake override: hold threshold, percentile, and drop alerts overnight for morning delivery; mistake fares always break through. Rationale: fatigue control without missing the fares that die in minutes.
- [x] T12. Production readiness: clean prod build, vercel.json cron schedule, .env.example with every variable name, DEPLOY.md with the exact owner steps (Vercel connect, env paste, prod CRON_SECRET, deploy, domain purchase and DNS pointing), key rotation list.
- [x] T13. Intake form (/plan) to reference quality: bring the trip creation form onto the same bluish canvas and card system as the itinerary view, real input styling with depth, toggle groups that feel considered rather than default, consistent with DESIGN-STANDARD.md. No functional changes, appearance only. Done in REDESIGN P10, which also added the live route preview and right rail from the spec.

## PART 6: DESIGN LEDGER (every accumulated decision, binding)

Everything decided across the project, so nothing lives only in chat history:

- Data honesty treatment: a confirmed price is the bright figure; an estimate is dim, prefixed with a tilde, and carries a small EST tag. Never the same treatment, never distinguished by colour. Enforced at DB level (price_source, is_estimated) and in every surface.
- Canvas: the planner sits on a clearly bluish light canvas with real character (not near white, not lavender, not navy). White cards float on it at believable depth. The tracker stays dark. Both run on the same tokens.
- Category colour system: one source of truth groups fine categories into families (food, cafe, outdoors, culture, activities, shopping, nightlife, errands), each one gentle low saturation hue, applied identically to tags (soft tint, dark same hue text), map pins (mid tone, white numerals), donut slices, and breakdown rows. Two or three hues visible per day, never a rainbow.
- Motion budget: durations 200/320/460ms, weighted deceleration. Numbers roll and decelerate on real change, never on load. Panels and the map glide with weight. Rows lift with depth on hover. Day selection settles the view. Reduced motion collapses everything to instant. No motion that does not communicate a data change.
- Named exception to the motion budget: script-driven data motion keeps its own longer durations, draw 700ms, roll 900ms, fade 500ms (the d-draw, d-roll, and d-fade tokens, mirrored in motion.ts). Sparkline drawing, number rolling, and photo fades need the extra time to read as weight rather than flicker. These three are deliberate and are not forced down to the general budget; nothing else may use them.
- Rhythm marks: a day's cadence reads by form (hollow ring rest, one bar light, three rising bars full), never by colour.
- Time rail: times down the left, numbered stops, a vertical connector so a day reads as a schedule. Numbers match the map pins.
- Photo system: venueImage(category, venueName) is the single seam. Free category images now; Google Places real photos later, lazy fetched on card open and cached forever, warm category tile with line icon always underneath so nothing is ever a grey or broken box; photo fades in over the tile.
- Typography: numbers loudest, tabular figures, true columns down the whole plan; eye lands trip then day then activity then price within a second; text in a controlled grey set, never pure white on pure black or pure black on pure white.
- Weather: quiet by default (temps, condition, rain chance), fuller detail in expanded states; forecast in range, climate normal marked typical beyond range; wet days carry a small dotted mark and the arranger keeps them indoor.
- Stat cards carry information, not just figures: progress bar against ceiling with percent, per day spend sparkline, high low condition, tinted icons.
- Language: plain literal labels, sentence case, no marketing or buzzword words anywhere, no em dashes, no unnecessary hyphens. Empty states state the fact plainly.
- The arranger's character: easy first day, bigger middle days, calm last day, genuine rest days, errands woven in (groceries, laundry, pharmacy), no adjacent repeated anchors, balanced variety by default with the taste signal biasing.
- Assistant honesty: grounded tool results only; a price string that did not originate from a tool result is rejected in the reply pipeline.
- TONE amendment (owner approved, from TONE-SPEC, binding): the color choice from the REBRAND amendment is superseded, specifically and only the color. The dark tracker canvas is near black #0b1120 with its radial lift, and the warm accent is bold orange #ff5722, one warm accent used with confidence; the atmosphere wash is warm tinted rather than indigo. Glass as the material system, the wash mechanics, and every other REBRAND rule stand unchanged. The Part 3 fabrication prohibitions restate this project's standing honesty rules and were audited clean.
- REBRAND amendments (owner approved, from REBRAND-SPEC, binding): the product is named Farepoint; it was FareWatch until July 2026, and the repo folder, Supabase project, and git remote keep the old name as owner-only operational changes. The cursor-reactive particle field permitted by the REDESIGN amendments is deleted and replaced entirely by a single slow gradient wash, one soft radial light source on a roughly 90 second loop, no dots, no specks, no grain. Glass is the material of every raised surface (translucent fill, backdrop blur, a soft top edge highlight, a thin barely visible border), superseding the earlier exclusion of primary data cards. The dark tracker canvas is soft navy with a radial lift, not near black; the planner canvas is unchanged. Chameleon border, spotlight, tilt, magnetic pull, and confetti rules are unchanged in scope. The app root is /app; / is the landing page and /about is the honest investor page; returning sessions skip the landing via a first visit cookie. The tagline is "Know what your next trip costs before you book it."
- REDESIGN amendments (owner approved, from REDESIGN-SPEC Part 1): an atmospheric background is permitted on the dark tracker canvas only (aurora blobs, at most 36 particles with cursor repulsion, film grain; paused when hidden, absent under reduced motion, never on the light planner canvas). Glass surfaces are permitted for docked assistant panels, the day strip, the command palette, and modal backdrops, never for primary data cards. Spotlight hover and a max 8 degree tilt are permitted on deal cards, the best deal card, and trip stop cards only; tilt off on touch. The chameleon animated border is reserved for live deal surfaces at 40 percent or more off normal. Magnetic pull is permitted on primary action buttons only (open booking, generate the trip). One confetti burst is permitted only on open booking at 40 percent or more off. Named motion additions alongside the 700/900/500 exception: aurora drift 26 to 38s, breathing standby dots 4s, bell swing 1.2s once on Alerts mount, checkmark draw 0.5s, chameleon shift 6s, kinetic heading letter spacing 0.5s. Time aware warmth: aurora shifts slightly warm after 17:00 and before 07:00. Colour roles widened: warm marks live deal intensity, cool marks normal and watching states and the interactive tint, amber marks above normal; category colours stay on the single source. The absolute rules (no em dashes, no invented figures, estimate by form only, tabular figures, plain language) are unchanged and unamendable.

## PART 7: CONTINUOUS RESEARCH PROTOCOL

Research never stops; building stays disciplined. The loop:

1. Before every task: a short targeted research pass (web search) on the specific feature at hand. How do the best products do this exact element. Fold findings into the task's execution.
2. Every three completed tasks: a broader sweep across UI, interaction, features, and the travel planning niche. From each sweep, append proposed tasks to the queue in Part 5 with a one line rationale each. Mark them [proposed].
3. The queue grows forever. Even a thousand items is correct. Proposed tasks are built only after the owner's numbered tasks unless marked [auto approved] by the owner.
4. Research informs, the queue governs. The agent never restructures or redesigns outside the current task because research suggested it; it appends a proposal instead.
5. Each sweep's findings get two lines in the BUILD LOG: what was learned, what was proposed.

This is how the product keeps getting better without the build ever drifting: ideas are unlimited, execution is ordered and verified.

## BUILD LOG
(One line per task: done or BLOCKED with reason. Research sweeps add two lines each.)

- T1 done: stray colours and durations moved to tokens (on-ink, on-accent, on-marker, map-route, shadow-marker, d-draw, d-roll, d-fade, motion.ts constants); category hsl derivation unified in categoryColor.ts; typecheck and build pass; sparkline fade easing now var(--ease), the one deliberate rendering change; lint had 10 pre-existing any errors in dispatch.ts and flightsSky.ts, cleared in a follow-up commit so the lint gate holds from here on.
- Sweep 1 learned: terminal-grade tables enforce numbers-right with tabular figures and honest staleness beats skeletons; Going marks mistake fares with a may-not-be-honoured warning; no planner competitor does deterministic opening-hours checks.
- Sweep 1 proposed: P1 sparkline scrub, P2 fare caveat flags, P3 staleness stamp, P4 opening-hours conflict, P5 keyboard nav, P6 printable export, plus P7 date-change re-flow from T3 scoping.
- T8 done: assistant swaps via stateless HMAC-signed proposals, compare-and-swap on a version stamp, per-instance idempotency with stamp fallback, prices re-derived server side, one inline card with radio options and Confirm or Dismiss collapsing to server fact lines; 20 of 20 harness checks passed including tamper, stale, locked, and double confirm; pass first cycle. Note: Supabase host did not resolve from this environment during checks.
- T7 done: Anthropic provider wired (haiku default, raw fetch loop, key absent degrades to the exact planned sentence, exercised against a prod build), read-only tracker and planner toolsets plus get_watch_summary bridge, grounding validator with one named-value retry then plain refusal, caps 5 loops 800 tokens 12 turns; old heuristic assistant deleted in favour of shared AssistantChat in both views; pass first cycle.
- Sweep 2 learned: Going wins by curation and quantified alert copy over volume; booking-window and weekday effects are readable from stored rows by grouping alone; visible chart gaps read as higher data quality than interpolation; Healthchecks is the canonical dead man's switch.
- Sweep 2 proposed: P8 dead man's switch, P9 evidence alert copy with ntfy priority, P10 actual spend per item, P11 gap breaks and request counter, P12 days-to-departure toggle, P13 quiet hours with mistake override.
- T6 done: budget ring with percent centre and Other fold, token-skinned map popover with bidirectional selection sync and one Show in plan action, summary tiles as one quiet strip with estimate tilde; breakdown rows default to trip view to legend the ring; one fix cycle, then pass.
- T5 done: rows gain address line, for-N-people price context (semantics verified as party figures), overflow with Swap and additive Remove, lock persisted with server-side hold enforcement, real add-activity flow through findAlternatives, collapsible day sections persisted per trip and day; pass first cycle.
- T4 done: five stat cards at parity (budget bar clamps at 100 percent with literal overage percent, column sparkline with single accent bar, remaining omitted without ceiling, style chip omitted when taste empty, weather with estimate dimming); daily totals recomputed from live item state; pass first cycle.
- T3 done: header strip at reference parity (thumbnail via VenueImage seam, dates chip with native-input popover and honest disabled apply per P7, conditional budget chip, share secondary via navigator.share, primary action focuses the assistant); typecheck, lint, build pass first cycle.
- T2 done: all seven nav items route to real pages (Home summary at /, tracker moved to /watchlist, new /deals, /alerts, /profile, /settings), sidebar weather card fed from next upcoming trip via cached Open-Meteo call, listAlerts query added; typecheck, lint, build pass first cycle.
- Fix done: trip generation 406 root caused to Overpass rejecting requests without a User-Agent; shared USER_AGENT constant now identifies the app on Overpass, Open-Meteo geocode and weather, and Ticketmaster; verified against the live app path, discovery returned 71 real Lisbon venues with real addresses. Full save BLOCKED: the Supabase project host no longer resolves in public DNS (owner action in checklist).
- Parity review (static, live page blocked by Supabase): 7 of 9 Part 2 items fully present; view switcher absent pending T10; rail dots neutral by the ledger colour rule. Flags to reconcile: script motion tokens 700/900/500ms sit outside the stated 200/320/460 budget, DayMap glides in on mount, and the heaviest-day bar in StatCards uses the status accent.
- Bug fixed: estimate figures were USD-scale numbers wearing the destination's currency label (a Lagos trip read NGN 1,440 total). Root cause: category baselines are USD but estimateParty never converted. Baselines now declared USD, estimateParty takes the trip currency and converts through one coarse table (fx.ts, checked July 2026), rounded to two significant figures so an estimate never fakes rate precision; all five mint points route through it. Real prices are never converted, and an event whose published currency does not match the trip's is left out of the sums. Verified live: Lagos for two reads NGN 905,000 over 5 days. Profile line renamed to Watch currency, trip currency stated as a destination property.
- Bug fixed alongside: overpassQuery swallowed rate limits silently, so a throttled lookup saved an empty trip. It now logs the status, retries once on 429/502/504, and generation refuses plainly when discovery returns nothing.
- Supabase restored by the owner and confirmed: a real generation saved end to end (201 with a trip id) and the itinerary page renders it.
- Ledger decisions applied: script motion durations named as a deliberate exception; day map glide gated to real day switches, never page load; heaviest day bar reads in brighter neutral ink, the accent marks only today while underway.
- T10 done: four-tab view switcher above the itinerary area (DayStrip idiom, pressable, tokens); Calendar is a Monday-start month grid, one card, trip days tinted with tabular day totals and the tilde plus dim ink on estimated days, picking a day returns to the itinerary aimed and scrolled at it; Map and Timeline state plainly that they are not built yet; typecheck, lint, build pass first cycle; verified on the live trip page, all four tabs render.
- T9 done: stops filter fix verified live with a single paid request, logged here (90 quotes all within the max one stop ceiling enforced locally, priceHistory intact at 62 points because the endpoint request stays any-stops, cheapest GBP 427 Aer Lingus one stop LHR to JFK); sparkline series confirmed empty safe at zero and one points through the queries.ts defaults and the under-two-points blank svg; poll route gains ?watch and ?limit targeting so a verification run spends exactly one request against the 50 per month cap. Poll through the route itself BLOCKED by the unreachable Supabase project (checklist); the provider path was verified directly instead. One paid request spent this session.
- Responsiveness pass done: one pressable utility in globals.css, pressed state lands at once and releases over d1 with the weighted ease; applied to every action button, chip, tab, and menu item; row and day expanders excluded, their expansion already answers the press; reduced motion collapses it; typecheck, lint, build pass.
- REDESIGN P1 done: token palettes for both canvases per spec Part 2, Space Grotesk headings and JetBrains Mono figures via next/font, CSS primitives (glass, pressed inset, aurora, breathing dot, bell swing, checkmark draw, chameleon border, kinetic, grain); reduced motion removes the atmosphere entirely.
- REDESIGN P2 done: the Part 3 primitive set built by three parallel sub-agents and reviewed (SpotlightCard, MagneticButton, confetti, ScrubSparkline with time-scaled x and gap breaks, GaugeDial, DeltaFlash, Odometer, Atmosphere, CommandPalette, HeatCalendar, IconTile, StatusPill and ReasonBadge, KineticHeading, useNow, useReveal); one hydration bug fixed in useReveal during review.
- REDESIGN P3 done: sidebar rebuilt per Part 4 with the honest poll status line and cadence strip derived from real data, dark in both themes (moved outside the theme scope), atmosphere mounted behind tracker pages only with evening warmth, command palette global; verified in Chrome.
- REDESIGN P4 done: Home per 5.1 on live data; AVG SAVINGS honestly degrades to OBSERVATIONS below three measurable alerts; best deal card with chameleon at 40 percent and no invented expiry, designed empty state (the live-deal populated state could not be visually exercised, no alert inside 48h existed); activity cascade once on reveal; verified desktop and 390 (via iframe viewport, the OS window refuses resize under automation).
- REDESIGN P5 done: Deals per 5.2 with reason chips, sort, honest gap-dot sparklines, struck midpoint only when a real discount exists, per-filter empty states; deal arithmetic extracted to dealMath.ts shared with Home.
- REDESIGN P6 done: Watchlist per 5.3; the spec's "existing add-watch flow" did not exist anywhere, so POST /api/watches plus a compact form were built (validation exercised live); status pills gain a real p90-derived above-normal state; spotlight and tilt removed from watch cards per amendment 3 scope; assistant docked in the glass shell with an honest OFFLINE pill; suggestion chips use answerable read-only prompts instead of the spec's literal action-implying texts because the tracker toolset is read-only.
- REDESIGN P7 done: Alerts per 5.4 with day dividers, real channels, reason tiles, deltas against the range at fire time (suppressed at zero), bell swing once, ticking synced line.
- REDESIGN P8 done: Profile per 5.5; savings captured sums within a single currency only and degrades to observations stored otherwise, since a mixed-currency sum would be an invented figure.
- REDESIGN P9 done: Settings per 5.6 with masked identifiers, real threshold values, honest polling status; the requests-used counter is omitted because nothing stores it (P11 proposal remains open).
- REDESIGN P10 done: Plan a trip per 6.1, closing T13; live route preview appears only when both ends geocode, great circle from real coordinates (LHR to Lisbon verified at 1,585 km), taste chips tinted from the single category source, right rail with the destination seam and magnetic generate button.
- REDESIGN P11 done: trip header band, stat cards (gauge, planner-blue day sparkline, trip style, selected-day weather with haze), glass day strip with date-labelled pills (the arranger provides no area names), stop cards as light SpotlightCards with hollow ring nodes and Stop N pins; all swap, lock, add, collapse behaviour unchanged; verified on the live Lagos trip.
- REDESIGN P12 done: rail completed with the donut centre carrying the spent total in estimate form, heat calendar tinted by real per-day spend, summary tiles moved into the rail, swap proposal card raised to a light card.
- REDESIGN P13 done: one AssistantDock for both views with honest ONLINE or OFFLINE pill, view-scoped chips, mono fact lines, typing dots; grounding re-verified through the degraded no-key path after the restyle.
- REDESIGN P14 done: currency correctness per Part 8; swap and add endpoints refuse foreign-currency options with a plain 422 and always write the trip currency; partitionByCurrency keeps every sum single-currency and the board states exclusions plainly; all money render sites audited. Trip currency continues to be set at generation from the destination (pre-existing mechanism); estimates convert at mint, real prices never convert.
- REDESIGN P15 done: copy audit found zero em dashes and zero buzzwords in src, one caps-without-CSS label fixed; reduced motion audit found every motion site guarded; seven dead modules deleted; typecheck, lint, production build pass.
- REDESIGN review gate: an independent reviewer audited the full session diff against the spec: 0 blockers, 3 fixes, 10 notes. All three fixes applied and re-verified (estimate tildes on the trip stat figures, sidebar trip link thumb through the image seam, palette add watch works while already on the watchlist) plus five note-level corrections. Accepted residuals, with reasons: assistant chips stay read-only questions (the tracker toolset cannot add watches or set alerts); alerts counts read through the 200/500 query caps, fine at today's volume; the chameleon border on the best deal card keeps the stricter 40 percent gate; the day strip scrolls without a "+N more days" affordance; the WATCHING pill variant on the next trip card never occurs because only upcoming trips are shown; trip currency derives from the destination rather than literally from price sources, with every seam enforcing it.
- T12 done: vercel.json cron at 06:00 every second day (sized under the 50 request monthly cap for two watches), cadence parser learns the every-N-days shape (sidebar verified flipping to poll overdue), .env.example with every variable, DEPLOY.md with the owner steps and key rotation list; production build passes.
- Rebrand done: FareWatch renamed to Farepoint throughout all src/ code, components, documentation, and visible UI per REBRAND-SPEC. Verified visually across Home, Deals, Watchlist, and Settings pages; no FareWatch references remain in active codebase.

## MORNING CHECKLIST
(Owner only actions the agent prepared but did not perform.)

- Pushed: overnight/jul-17 is on GitHub as of 19 July 2026 (credentials were cached by then). Review and merge to main when satisfied.
- Add ANTHROPIC_API_KEY to .env.local (and later Vercel) to bring the assistant out of its degraded state. Optionally set ANTHROPIC_MODEL; the code defaults to claude-haiku-4-5.
- Rotate the RapidAPI key (CLAUDE.md section 12: the key used during de-risk runs was exposed in chat). Regenerate in RapidAPI, update .env.local and Vercel.
- Two junk trips sit in the trips table from before the currency and rate limit fixes: the 14 day Lagos trip with USD scale figures labelled NGN, and one empty 5 day Lagos shell (id e8dd5cb6). Delete them from Supabase if unwanted; the agent does not delete user data.
- Create a check at healthchecks.io and set HEALTHCHECK_URL in .env.local and Vercel; until then the poller's dead man's ping is skipped silently.
- Run tracker-additions.sql in the Supabase SQL editor (one additive table, poll_request). Until then the requests counter stays honestly omitted from the sidebar and Settings, and the poller logs a warning per call that it could not record the request.
- Restore the Supabase project: ctqujayrromwxwoxrynq.supabase.co no longer resolves in public DNS, which usually means the free tier project was paused for inactivity or deleted. Unpause it in the Supabase dashboard (or create a new project, re-run the schema from CLAUDE.md section 2, and update the three SUPABASE variables in .env.local and Vercel). Until then trips cannot save, the poller cannot record observations, and the T9 verification poll is blocked.
