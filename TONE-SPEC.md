# TONE-SPEC.md
# Reverts the color direction from REBRAND-SPEC Part 2 to bold orange
# and coral on near black. Keeps glass as the material system. Folds
# in validated layout and interaction detail. Corrects every instance
# of fabricated content found in an external analysis document before
# it becomes an instruction. Layers on top of REDESIGN-SPEC.md and
# REBRAND-SPEC.md. Where this file amends a prior decision, it says
# so explicitly.

---

## PART 1. COLOR DIRECTION (owner approved, supersedes REBRAND-SPEC
## Part 2's soft navy amendment, only the color choice, nothing else
## in that Part 2 changes)

The dark tracker canvas returns to a deep, near black base, target
#0b1120 to #06080c, not the soft navy #0d1424 from the prior amendment.
A subtle radial lift stays in the center of the main content area so
it never reads as flat.

The primary accent becomes bold orange and coral, target #ff5722 to
the existing warm token if one is already within that range, used for
critical tags (mistake fare, sudden drop), primary action buttons,
and the loudest status moments. This intensifies the existing warm
role in the single color source, it does not add a second warm color,
one warm accent, used with real confidence, not a muted version of it.

The secondary accent stays cool, the existing teal or blue-slate
token, used for normal and watching states exactly as already
defined. Category colors in the planner are untouched, they were
never part of this amendment.

Glass stays the material system from REBRAND-SPEC Part 2: translucent
fills, backdrop blur, a soft top edge highlight, thin borders. Glass
and bold color are not in tension, dark frosted panels with a vivid
orange accent popping through is the actual target, keep the blur and
recolor what sits on top of it.

The atmosphere's single radial light source, established in REBRAND
R2, stays mechanically the same, one soft wash on a slow loop, no
particles, no grain. Retint its base hue toward the warm accent
instead of indigo. The existing evening warmth rule stays in force
unchanged.

---

## PART 2. VALIDATED LAYOUT AND INTERACTION DETAIL (additive, no
## conflict with anything already built, apply where not already
## present)

Sticky right rail on the trip itinerary page: the itinerary timeline
scrolls independently in its own column while the right rail (budget
donut, map, heat calendar) stays sticky in view as the page scrolls,
if this is not already the current behavior, add it.

Card hover state, confirm or add: a subtle lift on hover plus a
slight increase in border or glow visibility, consistent with the
spotlight and tilt rules already in force from REDESIGN-SPEC Part 1,
this is a restatement for confidence, not a new rule.

Chart draw in animation: sparklines and line charts should draw left
to right on first render within the existing named motion exception
for draw and roll, confirm this is happening consistently across
Deals, Watchlist, and the trip page, it may already be correct.

Sidebar active page indicator: a visible left edge accent line on the
active nav item in the accent color, confirm this exists and reads
clearly against the new near black background.

Typography hierarchy, confirm, no change needed if already correct:
tiny uppercase wide tracking overline labels, large bold page titles,
data values as the single loudest element on any card via tabular
mono figures. This restates MASTER-PLAN's existing binding rule, it
does not add a new one.

---

## PART 3. THE FABRICATION CORRECTION (mandatory, read carefully
## before touching any component)

An external document was produced by analyzing old design exploration
screenshots that contained placeholder demo content. That document
described the demo content as if it were real application data to be
replicated exactly. None of the following may ever appear as literal,
hardcoded content anywhere in this codebase, under any circumstance,
regardless of what any prior instruction implies:

A fabricated user name standing in for a real account. The account
identity must always be the real authenticated user, or the existing
honest local-account state, never an invented person's name.

Any specific price, discount percentage, or route figure presented as
if it is real when it did not come from a real observation or alert
in the database. Every number on every screen must trace back to a
real stored value or a tool result, exactly as CLAUDE.md and the
assistant's grounding pipeline already require.

Any countdown or expiration timer for a deal unless a real, known
expiration timestamp exists in the data. This exact prohibition was
already established earlier in this project's build and stays
absolute: no invented countdown, ever, under any framing.

Any statistic (routes watched, alerts today, average savings, and
so on) presented as a fixed number rather than a live computation
against real data, including its honest degraded state when there is
not enough data to compute it meaningfully.

If, anywhere in the codebase, any of the above already exists as a
hardcoded placeholder rather than a real data binding, it is a bug,
fix it as part of this task and log it plainly in the BUILD LOG.

Do not introduce a new charting library as a wholesale replacement
for the existing chart primitives (the sparkline, gauge, and heat
calendar components already built and tuned to real data, including
gap breaks and empty states). Restyle within the existing components.
A library swap is out of scope here and not needed to achieve the
color and interaction goals above.

All product name references stay Farepoint, per REBRAND-SPEC Part 1,
already completed. Nothing in this file reintroduces the old name.

---

## PART 4. EXECUTION PROTOCOL

Phases, one commit each: T1 color token reversal and glass recolor
across both canvases. T2 the additive layout and interaction items
from Part 2, only where not already present. T3 a dedicated audit
pass specifically hunting for any of the fabrication patterns listed
in Part 3, confirm none exist, fix and log any found. T4 full visual
verification in Chrome, desktop and 390px, across Home, Deals,
Watchlist, Alerts, the trip page, and the landing page, typecheck,
lint, and production build must pass.

After T4, add one line to MASTER-PLAN Part 6 logging this color
reversal as a binding amendment superseding REBRAND-SPEC Part 2's
color choice specifically.
