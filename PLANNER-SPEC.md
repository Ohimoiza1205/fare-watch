# FareWatch Planner: Design Spec (paper stage, no code yet)

A second view inside FareWatch. You enter any trip. It plans the fare, a day by day itinerary of real activities with real prices, the weather for each day, and a running budget that reports the cost and warns when a ceiling is crossed. Intelligence arranges the trip. Real data prices it. Those two never blur.

This spec holds to the craft standard in DESIGN-STANDARD.md: the interface behaves like an instrument, motion communicates state, numbers roll rather than snap, panels glide, colour carries status, nothing decorative competes with data. No em dashes anywhere, in this doc or in the product.

---

## The core principle, stated once and obeyed everywhere

Intelligence arranges. Real data prices.

The AI decides what to do, how full each day feels, what suits the traveller's taste, how to sequence it, when to rest, how to adapt to weather. That is real planning intelligence and it is the heart of the product.

The AI never invents a price, never invents that a place exists, never fabricates an address or an opening time. Every specific figure and every named venue comes from a real lookup. Where a real figure cannot be found, the number is shown as an estimate and never disguised as a confirmed price. A confirmed price and an estimate never share the same visual treatment. This single rule is what makes the budget something a person can plan real money around.

---

## What the traveller gives it

A trip is defined by a small, calm intake, not a long form:

- Origin and destination
- Dates, or a length and a rough month
- Number of travellers
- A budget ceiling, optional
- A taste signal: a light set of preferences the planner reads to shape the days. Not a survey. A few taps. Examples: relaxed or packed, foodie, outdoorsy, nightlife, culture, cheap and cheerful, treat ourselves. These bias the plan, they do not dictate it.

The taste signal plus smart preloaded defaults is what sets how full each day feels. A relaxed signal spaces the days and leaves gaps. A packed signal fills them. The default sits in the middle: one anchor activity most days, a meal, and genuine rest days on purpose, because a fourteen day trip that is full every day is exhausting, not fun.

---

## What it produces

Three layers that read as one plan.

### The fare

Pulled from the tracker when the route is one FareWatch already watches, so the flight cost is a real observed number. When the route is new, the fare is fetched the same way the tracker fetches, or shown as an estimate clearly marked until a real fare lands. The planner never guesses a flight price silently.

### The itinerary

A day by day sequence across the trip length. Each day carries what suits it: an anchor activity, sometimes a second lighter one, a meal or two, and rest where rest belongs. The categories span the fun you named and the basics a real trip needs:

Fun: cinema, bowling, golf, arcade, restaurants and date nights, buffets, shopping, and whatever else the destination genuinely offers.

Basics: groceries, a pharmacy run, a laundromat mid trip, a quiet local cafe, the practical texture of actually being somewhere for two weeks rather than a tourist highlight reel.

Every named venue is real, fetched from real local sources. Every price is real where findable, estimated and marked where not.

### The weather

Each day shows its forecast, and the plan reads the forecast. Outdoor golf does not land on a storm day. A rainy day pulls indoor activities forward. This is one of the clearest places the arranging intelligence earns its keep.

### The budget

Always visible, never buried. It sums every item into a total shown two ways: a conservative ceiling, the number you will not exceed if things run expensive, and an average estimate, the realistic middle. If the traveller set a max, the budget warns plainly when the plan crosses it, and the planner can propose cuts to come back under.

---

## Where the peak intelligence lives

The AI is doing real work, and this is where it shows:

- Reading the taste signal and setting the rhythm of the whole trip, how full, how spaced, where the rest days fall.
- Sequencing so the trip flows, not a random pile of activities but a shape: an easy first day after a long flight, bigger days in the middle, a calm last day before flying home.
- Matching activities to weather, per day, and re-flowing when the forecast shifts.
- Balancing the budget, choosing the mix that fits the ceiling without making the trip feel cheap.
- Reacting to edits. When the traveller swaps or removes a day, the planner re-suggests intelligently around the change rather than leaving a hole.

That is genuine planning intelligence, and it is the product's spine. None of it involves inventing a fact or a price.

---

## How the traveller shapes it

Everything is generated first, then fully editable. The traveller is never staring at a blank plan.

- The full trip generates on first run, every day filled to the chosen rhythm.
- Any day can be swapped, edited, or cleared.
- On a swap, the recommendation system offers real alternatives in the same category and price range, drawn from real local options, with their real prices.
- Removing an item updates the budget live, the total rolling to its new value rather than snapping.
- The traveller can lock a day they love so re-flows leave it untouched.

The recommendation system suggests from real, priced, local options. It never fills a swap with an invented venue.

---

## The data behind it

Sits alongside the existing FareWatch tables in Supabase.

- trip: origin, destination, dates, travellers, optional budget ceiling, taste signal.
- day: belongs to a trip, holds its date, its weather snapshot, its rhythm level.
- item: belongs to a day, holds the venue, the category, the real or estimated price, a flag marking which of the two it is, the source of the price, and a lock flag.
- The budget is derived, summed from items, never stored as a guess.

The price-source flag and the real-or-estimated flag are not optional metadata. They are load bearing. They are what the interface uses to show a real price and an estimate differently, and what keeps the whole plan honest.

---

## How it looks and moves

One app, two views, easy to move between. The tracker answers when the flight is cheap. The planner answers what the whole trip costs and what you do each day. Both wear the same instrument-grade restraint.

The planner reads as a calm vertical run of days. Each day is a composed unit, not a generic card: its date, its weather, its activities with their prices, its small day total. The trip budget rides alongside, always in view, its total rolling as the plan changes. A real price and an estimate are visibly distinct at a glance. Weather is legible without shouting. Motion appears only when something changes: a swapped activity glides in, a total rolls to its new figure, a re-flow settles rather than snaps. Nothing moves for decoration.

Colour carries status and nothing else: over budget reads in one clear accent, an estimate reads distinct from a confirmed price, a locked day reads as held. Hierarchy comes from spacing, weight, and composition, so the eye lands on the day, then the activity, then the price, in that order, within a second.

---

## How it gets built, in slices

The same discipline as the tracker. A working narrow thing before a broad half built one. None of this starts until Phase 1 is closed, verified, and deployed.

1. One real day, end to end. One destination, one day: fetch its weather, find one real local activity with a real price for the party size, show it with a day total. This proves the hardest part, the real priced lookup, before anything scales.
2. The budget spine. The trip, day, and item data shape, and the maths that rolls items into a conservative ceiling and an average estimate, with the ceiling warning.
3. The activity lookups. Each category fetched from real local sources, estimates clearly marked when a real figure is not found.
4. The arranging intelligence. Taste signal to rhythm, sequencing, weather matching, budget balancing, re-flow on edit.
5. The recommendation and edit system. Swap, lock, clear, with real priced alternatives.
6. The view. The day by day plan and the live budget, built to the craft standard.

Each slice ends with something that works.

---

## The one line to remember

Peak intelligence for the thinking and arranging. Real data for every fact and every price. The AI plans the trip. It never invents the bill.
