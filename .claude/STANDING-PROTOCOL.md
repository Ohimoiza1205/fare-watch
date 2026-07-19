# STANDING-PROTOCOL.md
# The permanent operating standard for every autonomous build session
# on this project, from tonight forward. Read this alongside CLAUDE.md,
# MASTER-PLAN.md, DESIGN-STANDARD.md, PLANNER-SPEC.md, REDESIGN-SPEC.md,
# REBRAND-SPEC.md, and TONE-SPEC.md at the start of every session,
# resumed or fresh. This file does not replace those, it governs how
# work on top of them gets done, checked, and reported.

---

## PART 0. WHAT THIS IS FOR

Prior sessions on this project produced real, working software through
disciplined phases, one commit each, verified before moving on. That
discipline is the reason the project survived usage limit cutoffs,
missing files, and multiple visual direction changes without losing
work. This document formalizes that discipline as a permanent standard
rather than something re-explained in every kickoff message. The bar
from here forward is production software at a real company's standard,
every element functional, every visual choice deliberate, nothing
shipped that would embarrass a careful engineer reviewing it cold.

---

## PART 1. THE LOCKED DESIGN SYSTEM (do not drift from this without
## an explicit owner amendment, formatted exactly like every prior
## amendment in MASTER-PLAN Part 6)

The current design system is settled: near black tracker canvas
around #0b1120 with its radial lift, bold orange and coral as the one
warm accent around #ff5722, glass as the material of every raised
surface, the atmosphere as a single slow warm wash with no particles,
the planner's light blue canvas untouched, category colors on their
single source. This is the baseline for all new work, not a starting
point to reinterpret.

No task, and no sub agent working under a task, may introduce a new
color, a new material treatment, a new font, or a new motion pattern
outside what is already named in the token system and the named
motion exception list, without it being logged as a proposed
amendment and explicitly approved the same way REDESIGN, REBRAND, and
TONE were each approved before being executed. New UI work fits
inside the existing system. It does not invent a fourth one. Research
in Part 4 below may surface a genuinely better pattern, the response
to that is a logged proposal, never a silent repaint.

---

## PART 2. SUB AGENT DELEGATION PROTOCOL

Delegate to sub agents whenever a task is mechanical, parallelizable,
or research heavy, and route those sub agents to a cheaper model.
Concretely: building independent, self contained primitives from a
written specification, sweeping the codebase for a pattern across
many files, copy audits, lint and typecheck cleanup, gathering
reference material through web research, drafting a first pass on
something with a clear, narrow specification. Three or more
independent sub agents running in parallel on genuinely separable
work is preferred over one at a time when the work allows it, this is
the main lever for finishing more of the queue within a token budget.

Never delegate: anything touching money, currency, or a real data
binding, the final integration of sub agent output into the working
tree, any judgment call about what a screen should look or feel like,
and all visual verification through Chrome. Those stay on the main
model, because they are exactly the places a small compounding
mistake becomes an honesty violation or a currency bug, both of which
this project has already paid real cost to fix once.

Every sub agent's output is a draft. The main model reviews it against
the task's actual requirement before it is integrated or committed.
A sub agent reporting success is not sufficient, the main model
confirms it, the same way a senior engineer reviews a pull request
rather than merging on a green checkmark alone.

---

## PART 3. THE STANDING DEBRIEF GATE

After every three completed tasks, stop and run a debrief before
continuing. The debrief is performed by a fresh, context isolated
reviewer sub agent that had no part in building those three tasks. It
is given the relevant spec sections and the actual diff of what
changed, and it checks: does each task actually do what it claims,
does anything look stalled or half finished, does anything violate
Part 1's locked design system, does anything violate this project's
standing honesty rules (no invented figures, no fabricated content,
estimates marked by form only), and is every interactive element
touched by these three tasks genuinely functional per Part 5 below.

Fix everything the debrief finds before moving to the next batch of
three. Log the debrief's findings in the BUILD LOG plainly, including
when it finds nothing wrong, a clean debrief is itself a useful,
logged fact, not a skipped step.

A final, full session debrief runs once before any session ends or
reports back to the owner, regardless of how many three task batches
happened along the way. This final debrief reviews the entire
session's diff against every spec touched, not just the most recent
batch, and is the one summarized in the closing report.

---

## PART 4. THE QUEUE AND LIVE RESEARCH

MASTER-PLAN Part 5's queue stays open ended. It can and should grow to
hundreds of entries over time, this was already the design intent
stated in that file and stays true here. Work the front of the queue
in priority order, append proposals to the back, never reorder
completed work.

Before starting any task with a real visual or interaction surface,
run a short, targeted web search for how genuinely best in class real
products solve that exact pattern right now, not generic advice.
Name real reference points when they exist, the kind of dashboard
density Stripe or Linear ships, the glass and motion restraint Vercel
or Arc use, the way a serious fintech card surface like Ramp handles
density and hierarchy. Pull the specific, nameable pattern, not a
vague aesthetic impression.

What is found through research either fits inside Part 1's locked
system, in which case adopt it and note where the idea came from in
the BUILD LOG, or it does not fit, in which case log it as a proposed
amendment for the owner rather than building it unapproved. Research
informs the next step of the current task. It never becomes
justification to redesign something outside that task's scope, that
discipline is what has kept this project's backlog from spiraling
into an unfinished mess across many visual overhauls already.

---

## PART 5. FUNCTIONAL INTEGRITY, NOT JUST VISUAL CORRECTNESS

A task touching any interactive element is not done when it typechecks,
lints, builds, and looks right in a screenshot. It is done when every
button, link, form control, and toggle it touches has actually been
clicked or exercised in Chrome and confirmed to perform its real,
stated action. No button whose handler is empty or stubbed. No link
pointing at a route that does not exist. No control that visually
responds to a click but does nothing underneath. No console errors
on interaction, checked directly, not assumed absent because the
build succeeded.

Where a real action genuinely cannot be completed yet, because a key
is missing or a dependency is not wired, the element states that
honestly in its own interface, the way the assistant already says it
is offline rather than pretending to work. A broken or silent control
is never acceptable, an honestly limited one is.

---

## PART 6. MODEL AND TOKEN ECONOMY

The goal is finishing as much of a large, real queue as possible
inside a session's usage budget, not finishing the fewest tasks at
the highest possible polish per task. Route mechanical work down to
cheaper models per Part 2, keep the main model's attention on
judgment calls, integration, and verification, and prefer real
parallel sub agent work over serial single threaded work whenever the
tasks are genuinely independent of each other. If a usage limit is
hit mid queue, the one commit per task discipline already established
in every prior spec on this project means nothing is lost, resume
picks up exactly where it stopped.

---

## PART 7. SESSION CONTINUITY

This file is read at the start of every session on this project from
now forward, alongside the existing chain in CLAUDE.md, MASTER-PLAN.md,
DESIGN-STANDARD.md, PLANNER-SPEC.md, REDESIGN-SPEC.md, REBRAND-SPEC.md,
and TONE-SPEC.md. If a future kickoff message does not explicitly list
this file, read it anyway, it is a standing instruction, not a one
time task.

---

## PART 8. TONIGHT'S QUEUE

Work MASTER-PLAN Part 5 in this order, under every rule above:

First, audit P1 (sparkline hover scrub and percentile position) and
the gap break half of P11 against what already exists in
ScrubSparkline and the Watchlist's percentile text. Confirm in code
and in Chrome, mark done with a note rather than rebuilding if they
are genuinely already there.

Then mark these auto approved and work in this order: P3 (honest
staleness stamp), P2 (fare caveat flags), the remaining request
counter half of P11, P8 (dead man's switch and overdue indicator), P7
(date change re-flow, closing the gap T3 left open), P9 (evidence
based alert copy and ntfy priority by reason), P13 (quiet hours with
mistake override). If time remains, continue with P4, P5, P6, P10,
P12 in that order.

Append T14, a full regression pass across every page, Home, Deals,
Watchlist, Alerts, Profile, Settings, the trip page, the landing
page, and about, at desktop and 390 pixels, confirming the current
orange on near black palette holds up everywhere, not only the pages
already spot checked after prior sessions. Run T14 last, as this
session's final full debrief per Part 3.
