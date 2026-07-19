# Farepoint: Plan of Work

Two phases in sequence. First finish and stabilise the fare tracker that already exists. Then build a trip planner as a second view inside the same app, reusing the route, dates, and live fare the tracker already holds.

This document governs the work the way CLAUDE.md governs the code. The binding rules in CLAUDE.md still apply to everything here: no marketing or buzzword language, no em dashes, no AI features that invent facts, numbers loudest, colour only for status, motion only when data changes.

---

## Where things stand

The tracker works. It watches London to Lubbock, 7 to 21 May 2027, target 1100 GBP. It polls the flights-sky Google endpoint, stores every price in Supabase, detects a genuine deal, and pushes an alert. A live poll returned 991 GBP on American with one stop, and a real alert reached the phone through ntfy. The interface exists: a route list, sparklines, and a detail view.

Two things are open, both known:

- The dashboard query crashes when a route has no stored price history, because an array comes back undefined and gets mapped. This is a null-handling fix.
- The provider's built-in price history is not landing in the price_history table, so sparklines stay flat. Either the point timestamps use a field name the parser does not expect, or the thin Lubbock route returned an empty history. Logging was added to reveal which, and one poll will show the truth.

These are the first things Phase one closes.

---

## Phase one: finish and stabilise the tracker

The goal is a tracker that stands on its own and runs without you.

1. Fix the dashboard crash. Every array read from Supabase becomes an empty array before any map or sort, so the page renders even when a route has no history yet.

2. Land the provider price history. Confirm from the poll logs which field the timestamps use, correct the parser if needed, and verify rows land in price_history for the Lubbock watch. Once they do, the sparkline carries real two week shape instead of a flat line.

3. Add a currency marker beside every price. Your six corridors span GBP, USD, and NGN, so a price means nothing without its currency shown plainly next to it. This is display only, the stored currency already exists on each row.

4. Deploy and schedule. Put the app on Vercel, move the environment variables over, and turn on a cron schedule so the poller runs on its own rather than by hand. Respect the fifty request monthly cap: the one real route polled once a day fits inside it. More corridors wait for a larger plan.

When Phase one is done, the tracker is live, self running, and honest about what it shows.

---

## Phase two: the trip planner view

A second view inside Farepoint. It reuses the route, the dates, and the live fare the tracker already holds, and around that it builds a full two week plan with a real budget.

### What it produces

A single trip becomes a plan with three parts that work together.

**The fare.** Taken from what the tracker already watches, so the flight line in the budget is a real observed number, not a guess.

**The day by day itinerary.** Fourteen days, each carrying an activity or two, spaced so the trip breathes instead of cramming. A cinema night, a bowling afternoon, a golf morning, an arcade run, restaurant date nights, a buffet, a shopping day, and quiet days on purpose. Each activity names a real place in the Lubbock area and its real cost for two where that can be found, and a clearly marked estimate where it cannot.

**The weather for each day.** So the plan is sensible. Outdoor golf does not land on a day of storms. The plan reads the forecast and arranges around it.

Underneath all of it, a **running budget**. Every item sums into a total shown two ways: a conservative ceiling you will not exceed if things run expensive, and an average estimate for the realistic middle.

### The rule the planner lives or dies on

The planner is only worth building if its prices can be trusted. A specific Lubbock cinema ticket for two, real bowling and golf and buffet rates. This is exactly where an app can quietly invent numbers and look convincing while being useless for real money planning.

So the honest design is fixed here: fetch real prices where they can be found through live lookups, and clearly mark estimates where they cannot. A real price and an estimate never look the same on screen. That single distinction is what makes the total something you can plan money around. It is the most important decision in the whole planner, and it is not negotiable.

### Where intelligence belongs, and where it does not

Premium use of intelligence goes into the arrangement. Sequencing fourteen days well, balancing big days against quiet ones, matching outdoor plans to good weather, spacing the date nights, holding the budget in range. That is genuine planning work and it earns its place.

Intelligence never invents prices or facts. Costs come from real lookups. So the split is clean: intelligence arranges the trip, real data prices it. This keeps the planner trustworthy and keeps it clear of invented numbers.

### How it fits the app

One project, one aesthetic, two views that are easy to move between. The tracker view answers when the flight is cheap. The planner view answers what the whole trip costs and what you do each day. Both carry the same restraint: numbers first, real spacing, motion only when something changes, nothing decorative competing with data.

---

## How Phase two gets built

In slices, the same discipline as before. A working narrow thing before a broad half built one.

1. **One real day, end to end.** Pick a single day. Fetch its weather, find one real local activity with a real price for two, and show it with a small day total. This proves the hardest part, the real price lookup, before anything is scaled.

2. **The budget spine.** The data shape that holds trip, days, activities, and costs, plus the maths that rolls items into a conservative ceiling and an average estimate. Stored in Supabase alongside the existing tables.

3. **The activity lookups.** The categories you named, cinema, bowling, golf, arcade, restaurants, buffet, shopping, each fetched from real local sources with estimates clearly marked when a real figure cannot be found.

4. **The arrangement.** Spread the activities across fourteen days, balanced and weather aware, spacing date nights and quiet days.

5. **The view.** The planner screen itself, a readable day by day plan with the running total and the two budget figures, built to the same standard as the tracker.

Each slice ends with something that works.

---

## Order of the very next steps

1. Fix the dashboard crash so the app stops erroring.
2. Land the provider price history and confirm the sparkline shows real shape.
3. Add the currency marker beside prices.
4. Deploy to Vercel with a cron schedule.
5. Begin Phase two at slice one, one real day with a real price and a real total.

Phase one is mostly closing known work. Phase two is the real new build. Both hold the same line: real data priced honestly, intelligence used only to arrange, and an interface that behaves like an instrument rather than a page.
