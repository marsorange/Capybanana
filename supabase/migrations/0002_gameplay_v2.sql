-- Capybanana gameplay v2: re-add curiosity, forced-rest after battle loss, a
-- per-day agent-reported stress, and the matchmaking pool that activates the
-- (already-schemaed) battle feature. Additive over 0001_storage_refactor.sql.
--   psql "$POSTGRES_URL" -f supabase/migrations/0002_gameplay_v2.sql

-- 1) New pet columns. curiosity is the 5th core stat (旅行倾向); rest_until_day
--    enforces "战败必养伤至少一天"; pending_stress(_note) hold the agent's daily
--    self-report until the day's action consumes it (mirrors pending_message).
alter table pets
  add column if not exists curiosity int not null default 50,
  add column if not exists rest_until_day date,
  add column if not exists pending_stress text,
  add column if not exists pending_stress_note text;

alter table pets drop constraint if exists pets_curiosity_check;
alter table pets add constraint pets_curiosity_check check (curiosity between 0 and 100);

-- 2) Matchmaking pool: one snapshot row per pet, refreshed every time it opts
--    into a battle. Opponents are drawn from OTHER owners' recent snapshots.
create table if not exists battle_pool (
  pet_id uuid primary key references pets(id) on delete cascade,
  owner_id uuid not null references users(id) on delete cascade,
  snapshot jsonb not null,
  rating int not null default 1000,
  updated_at timestamptz not null default now()
);

create index if not exists battle_pool_updated_at_idx on battle_pool(updated_at desc);
create index if not exists battle_pool_owner_id_idx on battle_pool(owner_id);

-- Note: pets.rating/wins/losses/draws, the battles table, and trips.kind='battle'
-- already exist from 0001 — v2 simply starts writing them.
