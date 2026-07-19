-- Farepoint tracker additions. Run once in the Supabase SQL editor, after
-- the base schema from CLAUDE.md section 2. Additive only.
--
-- P11: one row per outbound fare API request, so the app can state real
-- monthly usage against the 50 request cap instead of guessing. The poller
-- writes a row for every request it makes, successful or not, because the
-- cap counts requests, not successes. The UI omits the counter entirely
-- when this table does not exist yet; nothing breaks before this runs.

create table if not exists poll_request (
  id           bigserial primary key,
  watch_id     uuid references watch(id) on delete set null,
  provider     text not null,
  ok           boolean not null,
  requested_at timestamptz not null default now()
);

create index if not exists poll_request_time on poll_request (requested_at desc);

alter table poll_request enable row level security;

-- Same shape as the other tracker tables: the service role writes, a signed
-- in user may read their own rows through the watch relationship. Rows with
-- a null watch_id (watch since deleted) stay service role only.
create policy "own poll requests" on poll_request
  for select using (
    exists (select 1 from watch w where w.id = poll_request.watch_id and w.user_id = auth.uid())
  );
