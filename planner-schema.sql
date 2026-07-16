-- FareWatch Planner schema. Run this in the Supabase SQL editor once, after the
-- existing tracker tables (watch, observation, alert, price_history) are in place.
--
-- Three tables: trip is one planned journey, day is one dated slot in it, item is
-- one activity or cost within a day. The budget is never stored. It is summed
-- from items every time it is read, so it can never drift from the plan.
--
-- Two flags on every item are load bearing, not metadata:
--   is_estimated  false means a real looked-up figure, true means a marked guess.
--   price_source  where the number came from, so a real price can be traced.
-- The interface reads these to draw a confirmed price and an estimate differently.
-- A confirmed price (is_estimated false) is required to carry both a number and a
-- source, enforced below, so nothing invented can pose as real.

-- one planned journey
create table trip (
  id             uuid primary key default gen_random_uuid(),
  -- nullable while auth is not wired, matching the relaxed user_id on watch. RLS
  -- below still scopes by user_id, so a null owner is invisible once auth lands.
  user_id        uuid references auth.users(id) on delete cascade,
  watch_id       uuid references watch(id) on delete set null, -- reuse the tracker's route and live fare
  origin         text not null,                    -- IATA or place, e.g. 'LHR'
  destination    text not null,                    -- IATA or place, e.g. 'LBB'
  dest_label     text,                             -- human place name, e.g. 'Lubbock, Texas'
  dest_lat       numeric,                          -- for the weather lookup
  dest_lon       numeric,
  start_date     date,                             -- concrete dates once resolved
  end_date       date,
  length_days    int,                              -- kept when the intake gave length and month, not dates
  rough_month    text,                             -- e.g. '2027-05', provenance for a length based intake
  travellers     int not null default 2,
  budget_ceiling numeric,                          -- optional user maximum
  currency       text not null default 'USD',
  pace           text not null default 'balanced', -- how full the days feel
  taste          text[] not null default '{}',     -- light preference tags, e.g. {'foodie','outdoorsy'}
  status         text not null default 'draft',    -- draft until the itinerary is generated
  created_at     timestamptz not null default now(),
  constraint trip_pace_valid   check (pace in ('relaxed','balanced','packed')),
  constraint trip_status_valid check (status in ('draft','generated')),
  constraint trip_dates_ordered check (start_date is null or end_date is null or end_date >= start_date)
);

-- one dated day within a trip
create table day (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references trip(id) on delete cascade,
  day_index   int not null,                        -- 0 based order within the trip
  day_date    date not null,
  rhythm      text not null default 'light',       -- how full this day is planned to feel
  weather     jsonb,                               -- forecast snapshot, shape documented in the planner types
  locked      boolean not null default false,      -- a held day that re-flows must not touch
  notes       text,
  created_at  timestamptz not null default now(),
  constraint day_rhythm_valid check (rhythm in ('rest','light','full')),
  unique (trip_id, day_index)
);

create index day_trip_order on day (trip_id, day_index);

-- one activity or cost within a day
create table item (
  id           bigserial primary key,
  day_id       uuid not null references day(id) on delete cascade,
  category     text not null,                      -- 'cinema','bowling','golf','restaurant','flight','groceries', and so on
  title        text not null,                      -- short label, e.g. 'Dinner'
  venue        text,                               -- the real named place, e.g. 'The West Table'
  address      text,
  price        numeric,                            -- representative party price, the figure shown
  price_max    numeric,                            -- conservative party price, feeds the ceiling; null means no spread
  currency     text not null default 'USD',
  lat          numeric,                            -- venue coordinates, from the lookup, for the day map
  lon          numeric,
  is_estimated boolean not null default true,      -- load bearing: real looked up, or a marked guess
  price_source text,                               -- load bearing: where the price came from
  source_url   text,                               -- link to the real source or booking
  locked       boolean not null default false,     -- a held item that re-flows must not touch
  position     int not null default 0,             -- order within the day
  notes        text,
  created_at   timestamptz not null default now(),
  -- a confirmed price must carry a number and a traceable source, so nothing
  -- invented can be shown as real
  constraint item_confirmed_is_sourced check (is_estimated or (price is not null and price_source is not null)),
  -- the conservative figure cannot sit below the representative one
  constraint item_ceiling_not_below check (price_max is null or price is null or price_max >= price)
);

create index item_day_order on item (day_id, position);

-- row level security, matching the tracker pattern: a user reaches only their
-- own trips, and days and items only through a trip they own. The generator and
-- any server job use the service role key, which bypasses these policies.
alter table trip enable row level security;
alter table day  enable row level security;
alter table item enable row level security;

create policy "own trips" on trip
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own days" on day
  for all using (
    exists (select 1 from trip t where t.id = day.trip_id and t.user_id = auth.uid())
  ) with check (
    exists (select 1 from trip t where t.id = day.trip_id and t.user_id = auth.uid())
  );

create policy "own items" on item
  for all using (
    exists (
      select 1 from day d join trip t on t.id = d.trip_id
      where d.id = item.day_id and t.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from day d join trip t on t.id = d.trip_id
      where d.id = item.day_id and t.user_id = auth.uid()
    )
  );
