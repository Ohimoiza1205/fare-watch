# REBRAND-SPEC.md
# Rename FareWatch to Farepoint, correct the atmosphere and glass system,
# fix the flagged components, build the pre-app landing page.
# Layers on top of REDESIGN-SPEC.md. Where this file amends a prior
# ledger decision, this file wins; it says so explicitly below.

---

## PART 1. THE RENAME

FareWatch becomes Farepoint everywhere it is user-facing: the sidebar
wordmark, page titles, metadata, the assistant's self-references, all
copy in CLAUDE.md, MASTER-PLAN.md, DESIGN-STANDARD.md, PLANNER-SPEC.md,
REDESIGN-SPEC.md, package.json name field, and any email or export
templates. The Supabase project, the repo folder name, and the git
remote are NOT touched by this task, that is an owner-only operational
change for later and is out of scope here.

Tagline, used in the landing hero and the tab title: "Know what your
next trip costs before you book it." No em dashes, no exclamation
marks, sentence case.

---

## PART 2. VISUAL LANGUAGE CORRECTION (owner approved amendment)

This supersedes REDESIGN-SPEC Part 1 amendment 1 (the cursor-reactive
particle field) and replaces it entirely. Everything else in that
Part 1 stays in force.

The particle field is removed completely, delete the canvas particle
system from the Atmosphere primitive. In its place: a single slow
gradient wash, one soft radial light source drifting across roughly
90 seconds per loop, barely perceptible, never more than one visible
color shift at a time. No dots, no specks, no starfield. If it would
look at home on a screensaver, it is wrong, remove it.

Glass becomes the real material of the product, not an occasional
accent. Every raised surface (cards, panels, the sidebar, modals, the
assistant dock) uses true frosted glass: backdrop blur, a soft inner
highlight at the top edge, a translucent fill rather than a flat
color, and a thin, barely visible border. Depth comes from stacking
real blur and shadow, never from a border trick pretending to be
depth.

The dark tracker canvas softens: move off near-black toward a deep,
warm charcoal or soft navy with real richness, not flat #06080c. The
planner canvas stays the clearly blue tone from REDESIGN-SPEC Part 2.
Both themes read as calm, confident, and considered, the tone is
premium fintech, not command center, not sci-fi.

Category and status colors stay exactly as already defined in the
single color source. This section changes surface material and
atmosphere, not the meaning of any color.

---

## PART 3. THE THREE FLAGGED COMPONENTS

### Atmosphere
Rebuild per Part 2 above. Confirm it is paused when the tab is
hidden, absent entirely under reduced motion, and never rendered on
the planner canvas. After this task the component should be visually
inert unless you stare at it for several seconds, atmosphere is a
background fact, not a foreground effect.

### Trip itinerary right rail
Rebuild with real breathing room between the three stacked elements
(budget donut, map, heat calendar). The donut grows to be the visual
anchor of the rail, not one box among equals, centered spend figure
in large tabular mono, legend rows with real spacing beneath it. The
map and the heat calendar read as one connected instrument rather
than two separate cards, share a visual weight and a consistent glass
treatment. Summary tiles move to a single quiet strip beneath, not
competing for attention with the donut.

### Deal cards
The chameleon border and spotlight hover stay per REDESIGN-SPEC Part
1 amendments 3 and 4, unchanged in when they apply. The glass
treatment on the card body becomes real frosted glass per Part 2
above, not a dark flat fill with a border. The discount percent and
price stay the loudest elements on the card, unchanged.

---

## PART 4. THE LANDING PAGE

New route, `/` becomes the landing page; the current app moves to
`/app` as its root (update all internal links and the sidebar's home
link accordingly). Anonymous visitors see the landing page, an
authenticated or returning session goes straight to `/app`.

Single page, no top navigation bar except the wordmark left and two
links right: "For investors" (quiet, small, understated, links to a
one-paragraph honest project status page, not a fake pitch deck) and
"Try now" (the primary action, glass button with real weight,
routes to `/app`).

Structure, top to bottom:

1. Hero. One sentence stating the core promise, large, confident
   type. Beneath it one line of supporting context, two sentences
   maximum. A real screenshot of the trip itinerary page (the
   richest, most finished page) as the hero image, in a glass frame
   with a soft cast shadow, tilted very slightly for depth, never a
   stock photo. The "Try now" button repeats here, large, glass,
   magnetic pull toward the cursor.

2. Proof strip. Three columns, each a real screenshot crop (Home's
   best deal card, a deal card from Deals, the budget donut from a
   trip) paired with one honest sentence describing what it shows.
   No invented stats, no "10,000 happy travelers", nothing that is
   not literally true about the current build.

3. How it works. Three short steps in plain language: watch a route,
   get alerted the moment it is genuinely cheap, plan the trip with
   a real day by day budget before you commit. Each step gets a
   small glass icon tile, not an illustration.

4. Final CTA. Restates the promise in one line, one "Try now" button,
   nothing else. No footer link farm, a single small line with the
   investor link repeated and nothing more.

No particle effects, no sparkle icons, no bot mascot, no AI
iconography anywhere on this page. The screenshots and the real
numbers they contain are the entire argument.

---

## PART 5. THE INVESTOR PAGE

One quiet page at `/about`, linked from "For investors". Plain
prose, no pitch deck styling: what the product is, what is real
today (the tracker polls real fares, the planner uses real venues
and real weather, the assistant is grounded and refuses to invent
prices), and what is next. Honest, short, no marketing language, no
em dashes, no buzzwords. This page is a credibility signal precisely
because it does not try to sell.

---

## PART 6. EXECUTION PROTOCOL

Same phase and commit discipline as REDESIGN-SPEC Part 10. Phases:
R1 rename sweep across code and docs. R2 Atmosphere and glass system
rebuild. R3 the three flagged components. R4 the landing and
investor pages. R5 full verification pass: every renamed reference
caught, every page still typechecks and builds, visual check in
Chrome at desktop and 390px against this file's descriptions, reduced
motion still collapses the new atmosphere correctly. One commit per
phase, honest BUILD LOG entries, log ambiguities rather than
stopping.

After R5, update MASTER-PLAN.md: log this rebrand in Part 6 as a
binding amendment, note the old name in one line for history, and
confirm T12's DEPLOY.md still reflects the correct app name.
