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
- [ ] T3. Trip context header: destination thumbnail, dates chip with picker affordance, travellers chip, budget chip, share trip, primary action. Editable trip title stays.
- [ ] T4. Stat cards to reference parity: budget with progress bar and percent of ceiling, daily average with per day sparkline, remaining amount, trip style chip, weather high low condition. Tinted icons, tabular figures, rolling numbers.
- [ ] T5. Itinerary rows to reference parity: address line under venue, per person or for N people context on prices, overflow control, save or lock control on each row, add activity affordance per day, collapsed day rows showing date plus total.
- [ ] T6. Right rail to reference parity: budget overview ring with percent used above the breakdown rows; map popover card for the selected stop; trip summary tiles.
- [ ] T7. Assistant, phase 1: wire the Anthropic provider module; tracker and planner toolsets as in Part 3; grounded replies only; absent key degrades plainly; cost caps in place.
- [ ] T8. Assistant, phase 2: swap execution through the assistant (it proposes real alternatives from lookups, applies on confirm, budget rolls live).
- [ ] T9. Price history resilience: verify the stops filter fix path; sparklines read whatever history exists, empty safe; one paid poll maximum for verification, logged.
- [ ] T10. View switcher, phase 1: Itinerary (existing) plus Calendar view (a month grid of the trip with day totals). Map and Timeline stubs route honestly to "not built yet" states, not dead tabs.
- [ ] T11. Refinement pass: spacing rhythm, type hierarchy, category colour consistency across tags, pins, donut, rows; confirmed versus estimate clarity; no layout restructuring.
- [ ] [proposed] P1. Sparkline hover scrub plus percentile position: hairline follows pointer, exact price and date print in the row's own number slot, and rows state "Nth lowest of M observations". Rationale: makes the stored history explorable and states position in history without forecast fakery.
- [ ] [proposed] P2. Fare caveat flags: one-word grey tag on row and in alert text when the cheapest quote is virtual interline or self transfer (field already in schema). Rationale: a cheap number that hides a caveat is invented savings.
- [ ] [proposed] P3. Honest staleness stamp: each row shows "as of Xh ago" in grey from observed_at; no skeletons anywhere. Rationale: last-known value plus age is the honest loading state for known layouts.
- [ ] [proposed] P4. Opening-hours conflict line: store venue hours at add time, compare against the planned day, print a plain warning when closed. Rationale: highest honesty per line of code in the planner.
- [ ] [proposed] P5. Keyboard list navigation: arrows or j/k to move, Enter to expand, slash to reach add watch. Rationale: a glance-and-act instrument should not require the mouse.
- [ ] [proposed] P6. Plain-text printable itinerary export: one server-rendered route with addresses, times, confirmed prices. Rationale: a trip is used where connectivity is not.
- [ ] [proposed] P7. Date-change re-flow: applying a new date range to a generated trip shifts or rebuilds days deliberately. Rationale: T3 ships the date picker affordance with apply disabled because silent desync is worse than no edit.
- [ ] T12. Production readiness: clean prod build, vercel.json cron schedule, .env.example with every variable name, DEPLOY.md with the exact owner steps (Vercel connect, env paste, prod CRON_SECRET, deploy, domain purchase and DNS pointing), key rotation list.

## PART 6: DESIGN LEDGER (every accumulated decision, binding)

Everything decided across the project, so nothing lives only in chat history:

- Data honesty treatment: a confirmed price is the bright figure; an estimate is dim, prefixed with a tilde, and carries a small EST tag. Never the same treatment, never distinguished by colour. Enforced at DB level (price_source, is_estimated) and in every surface.
- Canvas: the planner sits on a clearly bluish light canvas with real character (not near white, not lavender, not navy). White cards float on it at believable depth. The tracker stays dark. Both run on the same tokens.
- Category colour system: one source of truth groups fine categories into families (food, cafe, outdoors, culture, activities, shopping, nightlife, errands), each one gentle low saturation hue, applied identically to tags (soft tint, dark same hue text), map pins (mid tone, white numerals), donut slices, and breakdown rows. Two or three hues visible per day, never a rainbow.
- Motion budget: durations 200/320/460ms, weighted deceleration. Numbers roll and decelerate on real change, never on load. Panels and the map glide with weight. Rows lift with depth on hover. Day selection settles the view. Reduced motion collapses everything to instant. No motion that does not communicate a data change.
- Rhythm marks: a day's cadence reads by form (hollow ring rest, one bar light, three rising bars full), never by colour.
- Time rail: times down the left, numbered stops, a vertical connector so a day reads as a schedule. Numbers match the map pins.
- Photo system: venueImage(category, venueName) is the single seam. Free category images now; Google Places real photos later, lazy fetched on card open and cached forever, warm category tile with line icon always underneath so nothing is ever a grey or broken box; photo fades in over the tile.
- Typography: numbers loudest, tabular figures, true columns down the whole plan; eye lands trip then day then activity then price within a second; text in a controlled grey set, never pure white on pure black or pure black on pure white.
- Weather: quiet by default (temps, condition, rain chance), fuller detail in expanded states; forecast in range, climate normal marked typical beyond range; wet days carry a small dotted mark and the arranger keeps them indoor.
- Stat cards carry information, not just figures: progress bar against ceiling with percent, per day spend sparkline, high low condition, tinted icons.
- Language: plain literal labels, sentence case, no marketing or buzzword words anywhere, no em dashes, no unnecessary hyphens. Empty states state the fact plainly.
- The arranger's character: easy first day, bigger middle days, calm last day, genuine rest days, errands woven in (groceries, laundry, pharmacy), no adjacent repeated anchors, balanced variety by default with the taste signal biasing.
- Assistant honesty: grounded tool results only; a price string that did not originate from a tool result is rejected in the reply pipeline.

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
- T2 done: all seven nav items route to real pages (Home summary at /, tracker moved to /watchlist, new /deals, /alerts, /profile, /settings), sidebar weather card fed from next upcoming trip via cached Open-Meteo call, listAlerts query added; typecheck, lint, build pass first cycle.

## MORNING CHECKLIST
(Owner only actions the agent prepared but did not perform.)
