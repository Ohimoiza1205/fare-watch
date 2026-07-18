# REDESIGN-SPEC.md
# FareWatch full visual rebuild to the approved reference target
# Read alongside CLAUDE.md, MASTER-PLAN.md, DESIGN-STANDARD.md, PLANNER-SPEC.md.
# Where this file conflicts with older visual rules, THIS FILE WINS: the owner has
# approved the amendments in Part 1 explicitly. Data honesty rules are NEVER
# overridden and remain absolute.

---

## PART 0. WHAT THIS IS

The owner prototyped the target look in an external tool and approved it from
screenshots. This document reconstructs that target page by page, element by
element, with exact styling intent and, critically, the REAL data binding for
every element. The prototype ran on mock data; this build runs on the live
Supabase data, real APIs, and honest empty states. Nothing may be dummy.
Every button does what it says. Every number is computed or honestly absent.

Execution protocol is Part 10. Work phase by phase, commit per phase, verify
visually with the connected Chrome extension against the checklists.

---

## PART 1. LEDGER AMENDMENTS (owner approved, record these in MASTER-PLAN Part 6)

1. An atmospheric background layer is now permitted on the dark tracker canvas:
   slow aurora gradient blobs, a sparse cursor-reactive particle field, and a
   faint film grain. It must be subtle, pointer-events none, capped at 36
   particles, paused when the tab is hidden, fully disabled under reduced
   motion, and never rendered on the light planner canvas.
2. Glass surfaces (translucent, backdrop blur, hairline border) are permitted
   for: docked assistant panels, the trip day strip, the command palette, and
   modal backdrops. Not for primary data cards.
3. Spotlight hover (cursor-following radial light) and a gentle 3D tilt (max 8
   degrees, spring settle) are permitted on deal cards, the best-deal card, and
   trip stop cards. Tilt off on touch devices.
4. A chameleon animated gradient border is RESERVED for live deal surfaces
   only: the Home best-deal card and Deals cards at 40 percent or more off
   normal. Nowhere else, ever.
5. Magnetic pull toward the cursor is permitted on primary action buttons only
   (open booking, generate the trip). Subtle, spring settle, off on touch.
6. One celebratory confetti burst is permitted only when the person clicks
   open booking on a deal at 40 percent or more off normal. Restrained palette
   from the token accents. Never on load, never elsewhere.
7. Named motion additions to the exception table (alongside the existing
   700/900/500 draw/roll/fade exception): aurora drift 26 to 38s loops,
   breathing standby dots 4s, bell swing 1.2s once on Alerts mount, checkmark
   draw 0.5s, chameleon shift 6s loop, kinetic heading letter-spacing 0.5s.
   Everything else stays inside the 200/320/460 budget with weighted
   deceleration. prefers-reduced-motion collapses ALL of the above to instant
   and disables atmosphere, tilt, magnetic, confetti, and particles entirely.
8. Time-aware warmth is permitted: after 17:00 and before 07:00 local, the
   aurora blobs shift slightly warm. Nothing else changes by time.
9. Colour roles are widened: status colours remain reserved and meaningful,
   and the warm accent additionally marks live deal intensity (discount
   figures, deal badges, alert deltas), the cool accent marks normal or
   watching states and primary interactive tint, amber marks above normal.
   Category colours in the planner stay on the single existing source of
   truth, applied identically to tags, pins, donut slices, and legend rows.
10. UNCHANGED AND ABSOLUTE: no em dashes anywhere (the prototype's copy
    contains them; rewrite every instance), no unnecessary hyphens (write
    "day by day", "great circle"), no marketing or buzzword language, plain
    sentence-case labels, tabular figures for all numbers, confirmed versus
    estimate distinguished by FORM only (bright versus dim, tilde prefix, EST
    tag), never by colour, and the assistant can never output a price or venue
    that did not come from a tool result.

---

## PART 2. DESIGN TOKENS (extend the single token source; hardcode nothing)

Dark tracker palette:
- canvas deepest: #06080c, with a very soft radial lift toward #0a1018 top
- panel: #0e141d; panel raised: #111826 with a 1px top inner highlight
  rgba(255,255,255,0.04); border: #1a2330
- text primary #e6edf3, secondary #8b98a9, faint #5a6573
- cool accent (teal) #3dd6c4, warm accent (orange) #ff7a45,
  indigo #6d7bd8, amber #d9a441, danger red only for destructive actions
- soft tints: cool at 10 percent alpha for active nav and pills, warm at 12
  percent for deal badges

Light planner palette:
- canvas: a clearly blue cool tone, target #dbe5f5 to #e3ebf8, must read blue
  at a glance (this also resolves the standing "not blue enough" complaint)
- cards: #ffffff, border #e2e8f0, shadow 0 8px 30px -12px rgba(20,40,70,0.25)
- text: slate 800 #1e293b, secondary #64748b, faint #94a3b8
- planner accent blue #3a9fd9, on-track green #059669
- category colours: from the existing categoryColor source only

Typography:
- Headings: the existing heading token; if none is set, add Space Grotesk via
  next/font as --font-heading
- Numbers: JetBrains Mono (or the existing mono token) with tabular figures,
  used for every price, count, time, and stat; true column alignment in lists
- Body: existing sans

Radii 10 to 16px cards, 999px pills. Shadows imply layer height: raised panels
carry a soft drop, glass carries blur, floating panels carry a stronger cast.

---

## PART 3. SHARED PRIMITIVES (client components, in the existing components dir)

Build or upgrade, reusing what exists (RollingNumber, Sparkline, PriceRoll,
NumberMap, VenueImage, AssistantChat, pressable utility):

1. Atmosphere: aurora blobs (CSS keyframe drift), canvas particle field with
   cursor repulsion, grain overlay (SVG feTurbulence data URI at 0.035
   opacity, mix-blend overlay). Mounted once behind the tracker canvas,
   pinned (main is overflow hidden, inner div scrolls). Warm prop.
2. Glass: frosted panel wrapper, dark and light variants.
3. SpotlightCard: sets CSS vars for the radial spotlight on mousemove, spring
   tilt via the existing motion library, light variant uses a soft blue
   radial instead of white. Glow prop applies the chameleon border.
4. MagneticButton: spring translate toward cursor within bounds, supports
   navigation and onClick, triggers navigator.vibrate(8) where available.
5. ScrubSparkline: upgrade of Sparkline. Draws in with eased stroke (the
   existing named exception), current point lands with a soft glow ping, and
   on hover a dashed hairline follows the pointer with the exact value and
   date printed in a small mono chip above. Honors gap breaks (P11 rule:
   lift the pen across gaps wider than twice the poll cadence).
6. GaugeDial: semicircular arc gauge, track plus value arc, percent centred
   in mono, sweep on change over 1.1s eased, light and dark variants.
7. CommandPalette: Ctrl or Cmd K glass overlay, fuzzy filter over nav items
   grouped Tracker, Planner, Account, plus actions "Add watch" and "Plan a
   trip". Arrow keys plus Enter. Esc closes. Depth of field blur backdrop.
8. DeltaFlash: prints a signed delta beside a price when it changes, fades
   after 2s. Cool for drops, warm for rises.
9. KineticHeading: page h1 whose letter spacing eases open slightly on hover.
10. HeatCalendar: month grid, trip days tinted by spend intensity on the
    planner accent, weekday header, day numbers in mono, hover shows the
    day total.
11. IconTile: rounded square icon container with a soft tint matching its
    semantic colour (used in alert rows, settings rows, stat card corners).
12. StatusPill and ReasonBadge: pills for BELOW NORMAL (warm), NORMAL (cool),
    ABOVE NORMAL (amber), WATCHING (cool outline); reason badges MISTAKE
    FARE and SUDDEN DROP (warm), THRESHOLD and PERCENTILE (cool).
13. Breathing dot, bell swing, checkmark draw, neumorphic pressed inset for
    active chips and segmented controls: CSS utilities.
14. useNow(intervalMs) ticking clock hook; useReveal intersection hook.
15. Odometer upgrade to RollingNumber if cheap: per-digit vertical reel on
    the Home best-deal price only; otherwise keep RollingNumber everywhere.

---

## PART 4. APP SHELL AND SIDEBAR (both themes, one structure)

Sidebar, fixed left, dark in both themes for continuity:
- Wordmark row: plane glyph in a rounded cool-tinted tile, FAREWATCH in the
  heading font, beneath it a live status line: a small dot plus POLLING LIVE
  when the last poll is within twice the cron cadence, otherwise the dot in
  amber with POLL OVERDUE, or grey CRON NOT SCHEDULED when no schedule is
  known. Real, from the latest observation timestamp and vercel.json cadence.
- Groups with letterspaced small-caps labels: TRACKER (Home, Deals,
  Watchlist, Alerts), PLANNER (Plan a trip, plus a dynamic link named after
  the next upcoming or most recent trip, for example "Lisbon itinerary";
  when no trips exist the dynamic link is absent), ACCOUNT (Profile,
  Settings). Active item: cool soft tint pill with a 2px left accent bar.
- Keep the existing contextual weather card, restyled to tokens, placed
  under the PLANNER group (it is a real feature; it stays).
- Bottom: a poll cadence strip: label "Poll cadence", elapsed-since-last-poll
  progress bar against the cadence, mono time. Honest states as above. The
  fictional 90s cycle from the prototype does not exist; never fake it.
- Every nav item routes to its real page. No dead links.

---

## PART 5. TRACKER PAGES, ONE BY ONE

### 5.1 HOME
Layout: eyebrow TELEMETRY OVERVIEW with icon; kinetic greeting heading that
is time aware ("Good morning" before 12:00, "Good afternoon" before 18:00,
else "Good evening") with no fabricated name (local account); right side a
pill "Last poll Xm ago" with a breathing cool dot, live via useNow.

Stat strip, four raised panels, each: small-caps label plus corner icon,
large mono figure with RollingNumber, one quiet sub-line:
1. ROUTES WATCHED: count of active watches; sub-line "N active monitors".
2. LAST POLL: relative age of the newest observation, ticking; sub-line
   "next run per cron schedule" only when a schedule is known, else omitted.
3. ALERTS TODAY: count since local midnight, warm figure; sub-line "N fired
   this morning" only when nonzero before 12:00, else "in the last 24h" count.
4. AVG SAVINGS: mean over the last 30 days of alerts of (1 minus alert price
   over the midpoint of that watch's stored normal range at fire time),
   shown warm as a negative percent. Requires at least 3 qualifying alerts;
   otherwise this card becomes OBSERVATIONS with the total stored readings
   count. Never invent a savings figure.

Best current deal card, spanning two thirds: pick the newest alert within 48h
with the largest discount versus its normal range. Chameleon border, spotlight
plus tilt. Contents: warm eyebrow BEST CURRENT DEAL with flame IconTile;
ReasonBadge top right; the route as large mono "LHR ---- plane glyph ---- LBB"
with a dashed connector; sub-line "City to City · Carrier" from the stored
itinerary; bottom row: DISCOUNT as a huge warm percent, NOW as the huge price
(odometer if built) with the normal midpoint struck through beneath, a
90 day ScrubSparkline from real observations, "caught Xm ago" with a clock
glyph (NEVER a fabricated expiry countdown; if reason is mistake fare add the
plain line "mistake fares can vanish fast"), and a warm MagneticButton
"Open booking" using the stored booking link, confetti per amendment 6.
Empty state when no qualifying alert: a designed quiet panel, "No live deal
right now. The tracker is watching N routes." with the plane glyph.

Next trip card, right third: destination photo header (Part 9 seam) with a
WATCHING or UPCOMING pill; NEXT TRIP eyebrow; destination large; DEPARTS,
RETURNS, COUNTDOWN in three mono columns (countdown in cool, real days
until departure); footer bar "N stops planned" with an "Itinerary" link to
the real trip page. Empty state: "No trips yet" with a Plan a trip link.

Recent activity panel, full width: header RECENT ACTIVITY with an "All
alerts" link. Rows merged from real events, newest first, capped at 8:
alerts (warm dot), threshold crossings and percentile events (cool dot),
watch additions (grey dot). Each row: relative mono time via useNow, route
in mono, plain description ("Price dropped to $487", "Alert fired via push
and email", "New watch added"), right-aligned quiet detail ("47 percent
below normal", "$724 to $641", "threshold $480"). No em dashes, ranges use
"to". Staggered cascade on first reveal only.

### 5.2 DEALS
Header: eyebrow LIVE CATCHES, kinetic Deals heading; right: a route filter
input (filters the list client side) and a sort control (discount, recency).
Filter chip row: All, Mistake fare, Sudden drop, Threshold, Percentile;
active chip cool with neumorphic pressed inset; right side "N live ·
refreshed Xm ago" from real data, ticking.

Cards, two-column grid, from alert history joined to observations: mono
route with dashed plane connector, ReasonBadge, city and carrier sub-line,
PRICE NOW large with struck normal midpoint, OFF NORMAL warm percent,
HISTORY ScrubSparkline (warm stroke for mistake and sudden drop, cool for
threshold and percentile) with a soft gradient area fill, "caught Xm ago",
cool outline MagneticButton "Open booking" to the stored link. Spotlight
plus tilt on all; chameleon border at 40 percent or more. Staggered reveal.
Empty state per active filter: designed, plain, with the count of watched
routes and when the next poll is expected if known.

### 5.3 WATCHLIST
Header: eyebrow MONITORED ROUTES, Watchlist heading, cool outline "+ Add
route" button opening the existing add-watch flow restyled to tokens.

Watch cards, two-column: mono route, StatusPill (below normal warm, normal
cool, above normal amber, watching outline when unpriced), CURRENT price
huge with DeltaFlash on change, NORMAL RANGE as "$low to $high" mono with a
trend word (falling or rising from the slope of the last five observations,
omitted with fewer than three), a large ScrubSparkline coloured by status
with gap breaks, footer left "Cheapest N percent of readings seen" computed
from stored observations (needs at least 5 readings, else "N readings
stored"), footer right "low $X · high $Y". Unpriced watch: an em-free quiet
dash for current and "No reading yet". Expansion to the existing RouteDetail
stays, restyled.

Route assistant, docked glass panel at the bottom (this is the upgraded
assistant surface, see Part 7): sparkle IconTile, "Route assistant" title,
an honest status pill: ONLINE when the model key is configured, OFFLINE in
grey when absent (the existing degraded sentence remains the reply), four
real suggestion chips that submit on tap ("Add LHR to LBB to my watchlist",
"When was this route cheapest", "Alert me below 900 on LHR to LBB",
"Compare my watched routes"), the input with a send button. Grounding rules
unchanged and absolute.

### 5.4 ALERTS
Header: eyebrow NOTIFICATION LOG with the bell (bell swing once on mount),
kinetic Alerts heading, right a live "synced Ns ago" ticking line with a
breathing cool dot.

Grouped by day with divider rows: letterspaced TODAY, YESTERDAY, then real
dates, a thin rule, and the day's count right aligned. Each alert row is a
quiet card: left column mono fire time plus the channels it actually went
out on in small caps (push, email, whatsapp from the stored alert row); a
reason IconTile (flame warm for mistake, falling arrow warm for sudden
drop, gauge cool for threshold, percent cool for percentile); route mono
bold with "Reason · normal $X" beneath; right: the fired price large mono
with the signed delta versus normal beneath (cool for below, warm for
above); far right the primary channel glyph. Rows cascade on reveal.
Empty state: designed, "No alerts yet. They will land here when a watched
fare crosses a trigger."

### 5.5 PROFILE
Identity card: an initial disc avatar with a subtle cool ring (no fabricated
photo or handle), "You" as the name, "Local account · sign in not built
yet", "Since <earliest real record date>" with a calendar glyph; right:
"Settings" quiet button and a cool "Plan a trip" button.

Stat row, four cards, all real: TRIPS PLANNED (count, sub-line "N upcoming"),
ROUTES WATCHED, ALERTS RECEIVED (all time, warm), and SAVINGS CAPTURED only
if the Part 5.1 savings computation has at least 3 qualifying alerts, summed,
with sub-line "versus normal fares, estimated"; otherwise that card becomes
OBSERVATIONS STORED. Recent trips panel: destination thumb via the image
seam, name, length, UPCOMING or PAST pill, "Open itinerary" link per row.
Account settings panel: real read-only rows (push alerts configured yes or
no, email configured yes or no, default currency, poll cadence) and a
"Manage settings" link to Settings.

### 5.6 SETTINGS
Three cards. NOTIFICATION CHANNELS: "N of 3 configured" top right; tiles for
ntfy push, Email, WhatsApp with IconTile, a masked identifier when present
(topic name partially masked, address masked), and a CONFIGURED pill with a
self-drawing checkmark or a grey NOT SET pill. Real presence from env and
config, never invented. DETECTION THRESHOLDS: "Applied to all watched
routes" note; one row per real rule with IconTile, title, the exact plain
explanation sentence already in the app, and the REAL value huge in mono
right (mistake 55 percent of floor after 20 readings, per-watch target
threshold noted as "set per watch", percentile 10th after 20, drop 20
percent, debounce 12h and 1h). POLLING STATUS: ACTIVE, OVERDUE, or NOT
SCHEDULED pill; columns for cadence, routes active, last run, and next run
only when derivable; an elapsed progress bar; requests used this month out
of 50 (the P11 counter) if the count is stored, else omit. Keep the honest
closing line: "Values change in code and environment, not here."

---

## PART 6. PLANNER PAGES

### 6.1 PLAN A TRIP (absorbs and closes T13)
Light blue canvas. Eyebrow TRIP PLANNER, kinetic "Plan a trip" heading,
sub-line "Real venues and real prices where they are found, clearly marked
estimates where they are not." (keep the existing honest line).

Main form card, white, real depth: FROM and TO as proper bordered inputs
with pin and plane glyphs and fully legible placeholders ("Departure city
or airport", "Destination city"); remove the hardcoded LHR and Lubbock
placeholders. Beneath, a live route preview strip that appears once both
geocode: origin code and city left, dashed plane connector, destination
right, and "GREAT CIRCLE N km" in mono computed by haversine from the
existing geocode results. WHEN as a white segmented toggle (Length and
month, Exact dates) with neumorphic pressed active; the sub-fields as three
small bordered tiles with icons and mono values (nights, month or the two
date inputs styled, never a bare native control: overlay the native input
invisibly on a styled tile). TRAVELLERS as a segmented 1, 2, 3, 4+ with a
numeric input appearing on 4+. PACE segmented with the real labels Relaxed,
Balanced, Packed. TASTE chips: unselected outline, selected filled with
that taste's category colour tint and dark same-hue text.

Right rail card: destination photo header via the image seam (updates live
as the destination geocodes; warm tile fallback), DESTINATION eyebrow and
the resolved place name, live summary rows with icons and mono values
(travellers, pace, length, tastes selected), the optional ceiling as a
highlighted row only when entered, and a dark MagneticButton "Generate the
trip" with the existing generation flow behind it. While generating, show
plain staged labels that tick only as each real server step completes if
the API reports steps; otherwise a single honest pending state "Generating
from real sources". Errors surface plainly (the fixed 406 path).

### 6.2 TRIP ITINERARY (the flagship; refines the weak bottom half)
Destination header band: a wide, softly faded destination photo (Part 9
seam; London shows London) blending down into the blue canvas, with the
eyebrow ITINERARY, the kinetic trip title, and the sub-line "May 4 to May
18 · 14 days · Country" overlaid bottom left in slate on a soft white
scrim; "Edit trip" quiet button top right. Never a broken image: the warm
tile fallback sits underneath and the photo fades in over it.

Stat card row, four white cards: BUDGET with the total in mono, "/ ceiling"
beneath when set, a light GaugeDial right showing percent of ceiling, and
an on-track line in green (over-ceiling states use the reserved status
colour); estimates keep the tilde and dim treatment on the figure itself.
DAILY AVERAGE with a planner-blue ScrubSparkline of per-day totals.
TRIP STYLE with the pace word large and the selected taste tags in their
category tints, "+N" overflow chip. WEATHER for the selected day with the
big temperature, condition, high and low, the estimate dimming for
climate-normal values beyond forecast range, and the soft weather haze
treatment behind (clear warm haze, wet a faint cool drift).

Day strip: a light Glass bar; day pills "D1 <label>" where the label is the
day's area or anchor if the arranger provides one, else the date; active
pill dark; the existing rhythm marks stay inside each pill; overflow "+N
more days" scrolls. Selecting a day updates itinerary scroll, map, weather
card, and stats together with the existing settle motion.

Itinerary column: per day, the existing structure restyled: day heading
with date, area line and stop count, day total right (estimates dim with
tilde); the time rail with mono times, hollow ring nodes, a connector line;
stop cards as light SpotlightCards: venue photo thumb (seam), name,
category tag in its colour, address line, "Stop N" with a pin glyph
matching the map numeral, price right in mono with CONFIRMED bright or
"~ $X" dim with an ESTIMATED tag, the overflow control (Swap, Remove), the
lock control, and the add-activity affordance at day end. All existing
behaviour (collapse, lock enforcement, real alternatives) unchanged.

Right rail, top to bottom, closing the unrefined bottom:
1. BUDGET BREAKDOWN: the donut with the spent total centred ("$2,148 of
   $3,200" in mono, estimate marking preserved), legend rows with category
   swatches, amounts, and percents from the single colour source, the
   existing trip versus day toggle.
2. LIVE MAP: the existing NumberMap (Leaflet, OpenStreetMap) in a white
   card, numbered pins matching the stop numerals for the selected day,
   the route drawn with the day distance, the popover card on pin select,
   bidirectional selection sync. Restyle the popover to tokens.
3. HEAT CALENDAR: the month grid tinted by real per-day spend.
4. TRIP SUMMARY tiles: duration, activities count, estimated total with
   tilde, daily average, as one quiet mono strip.

Assistant: the upgraded docked panel (Part 7) below the columns, planner
scoped, with the swap proposal cards restyled: a light card in the thread
with radio option rows (venue, category tag, price with honest marking),
Confirm and Dismiss, collapsing to the server fact lines on completion,
budget and donut rolling live on apply. The intelligent swap flow itself
(HMAC proposals, compare and swap, server-derived prices) is untouched.

---

## PART 7. THE ASSISTANT SURFACE, UPGRADED (both views, one component)

The existing grounded AssistantChat gains a professional shell: a Glass
panel, a sparkle IconTile, the title (Route assistant on the tracker, Trip
assistant in the planner), an honest ONLINE or OFFLINE status pill tied to
key presence, view-scoped suggestion chips that submit on tap, a message
thread with quiet user bubbles and assistant replies in which any figure
carries its confirmed or estimate form, tool activity shown as small mono
fact lines rather than raw JSON, a typing indicator inside the motion
budget, Enter to send, and the input focusable from the trip header's
primary action. Grounding, caps, degraded mode, and the no-fabricated-price
pipeline are unchanged and re-verified after restyling.

---

## PART 8. CURRENCY CORRECTNESS (blocking bug, fix inside this build)

Symptom: trip totals rendered NGN and GBP labels over USD-scale figures,
and the profile default currency disagreed with generated trips. Fix at the
root: one currency source of truth per trip, set at generation time from
the price sources actually used, stored on the trip row; every price
surface renders that stored currency's symbol and code; the profile default
currency is a display preference applied only where a real conversion rate
is available, otherwise surfaces state the trip's native currency plainly.
Never relabel a figure into a currency it was not priced in. Audit every
money render site after the fix.

---

## PART 9. DESTINATION AND VENUE IMAGERY SEAM

Extend the existing venueImage seam with destinationImage(place): try the
configured photo provider (Google Places when the key lands), cache
forever, and always render the warm category tile with a line glyph
underneath so nothing is ever a grey or broken box; the photo fades in over
the tile within the fade exception duration. Used by: the trip header band,
the next-trip card, plan form right rail, profile recent trips, and the
sidebar dynamic trip link thumb. Venue thumbs continue through the
existing seam unchanged.

---

## PART 10. EXECUTION PROTOCOL

Branch: continue on the current overnight branch. All MASTER-PLAN Part 4
structural protections hold (additive DB only, no secrets, owner-only
deploys). Copy rules audited in every phase: no em dashes, no unnecessary
hyphens, no marketing words, sentence case, tabular figures.

Phases, one commit each, in order:
P1 tokens, fonts, CSS primitives. P2 shared components (Part 3). P3 shell,
sidebar, atmosphere, command palette. P4 Home. P5 Deals. P6 Watchlist.
P7 Alerts. P8 Profile. P9 Settings. P10 Plan a trip (record T13 done).
P11 Trip header band, stats, day strip, itinerary column. P12 Trip right
rail and bottom (donut, map, calendar, summary) plus swap restyle.
P13 assistant upgrade both views. P14 currency fix (Part 8). P15 sweep:
reduced motion full pass, 390px responsive pass, empty states, copy audit,
performance check (no jank from atmosphere), typecheck, lint, production
build.

Verification loop per page phase: start the dev server, navigate with the
connected Chrome extension, screenshot at desktop width and at 390px,
compare against this spec's checklist for that page, fix, re-verify, three
cycles maximum, then log any residual honestly in the BUILD LOG and move
on. Numbers must be real: verify at least one page against live Supabase
data with a generated trip.

After P15: update MASTER-PLAN: mark T13 done, mark T11 absorbed by this
spec with a one-line note of anything residual, append the ledger
amendments to Part 6, one BUILD LOG line per phase. Then execute T12
(production readiness) per its task text. Then attempt `git push` on the
branch: credentials may be cached from the owner's earlier interactive
push; if authentication fails or hangs, do not loop, add the exact command
to the MORNING CHECKLIST and continue. Finish with a report: what shipped
per phase, every deviation from this spec with its reason, keys or env
still needed, how to view each page, and what remains for the owner.