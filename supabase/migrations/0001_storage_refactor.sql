-- Capybanana storage refactor schema.
-- Run with Supabase CLI, or locally with:
--   psql "$POSTGRES_URL" -f supabase/migrations/0001_storage_refactor.sql

create extension if not exists pgcrypto;

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table users (
  id uuid primary key default gen_random_uuid(),
  supabase_user_id uuid not null unique,
  pet_id uuid unique,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create table agent_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  name text not null default 'default',
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index agent_tokens_user_id_idx on agent_tokens(user_id);

create table pets (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  legacy_companion_id text unique,
  owner_id uuid not null unique references users(id) on delete cascade,

  name text not null,
  species text not null,
  primary_color text not null,
  personality text not null,
  accessory text not null default 'none',

  -- Four core stats (see docs/core-gameplay.md §8).
  mood int not null default 65,
  energy int not null default 70,
  courage int not null default 40,
  injury int not null default 0,
  traits text[] not null default '{}',
  memories text[] not null default '{}',
  souvenirs text[] not null default '{}',
  misunderstandings text[] not null default '{}',
  last_result jsonb,

  state text not null default 'idle_home',
  -- Reserved for the postponed battle feature (not yet written by the app).
  rating int not null default 1000,
  wins int not null default 0,
  losses int not null default 0,
  draws int not null default 0,
  last_action_day date,
  pending_message text,
  active_trip_id uuid,
  rev bigint not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (species in ('capybara','rabbit','duck','raccoon','shiba','sheep')),
  check (personality in ('gentle','curious','lazy','brave','dreamy')),
  check (accessory in ('none','scarf','hat','glasses','flower','bell')),
  check (state in ('idle_home','ready','traveling')),
  check (primary_color ~ '^#[0-9a-fA-F]{6}$'),
  check (mood between 0 and 100),
  check (energy between 0 and 100),
  check (courage between 0 and 100),
  check (injury between 0 and 100)
);

create index pets_rating_idx on pets(rating);
create index pets_state_idx on pets(state);

create trigger pets_set_updated_at
before update on pets
for each row
execute function set_updated_at();

create table bags (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  pet_id uuid not null references pets(id) on delete cascade,
  message text not null default '',
  gesture text,
  items jsonb not null default '[]',
  status text not null default 'ready',
  packed_at timestamptz not null default now(),
  consumed_at timestamptz,

  check (gesture is null or gesture in ('pat')),
  check (status in ('ready','consumed','expired','canceled'))
);

create index bags_pet_id_status_idx on bags(pet_id, status);

create unique index one_ready_bag_per_pet
on bags(pet_id)
where status = 'ready';

create table trips (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  pet_id uuid not null references pets(id) on delete cascade,
  bag_id uuid references bags(id) on delete set null,
  kind text not null,
  intent text,
  destination_theme text,
  status text not null default 'started',
  agent_note text,
  message text not null default '',
  gesture text,
  items_snapshot jsonb not null default '[]',
  started_at timestamptz not null default now(),
  returns_at timestamptz,
  resolved_at timestamptz,

  check (kind in ('travel','battle','stay')),
  check (status in ('started','resolved','canceled')),
  check (gesture is null or gesture in ('pat')),
  check (
    destination_theme is null or destination_theme in (
      'seaside','forest','snow','hotspring','harbor',
      'mountain','flowerfield','raincity','town','nightstation'
    )
  )
);

create index trips_pet_id_started_at_idx on trips(pet_id, started_at desc);
create index trips_pet_id_status_idx on trips(pet_id, status);

alter table pets
add constraint pets_active_trip_id_fkey
foreign key (active_trip_id) references trips(id) on delete set null;

create table postcards (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  pet_id uuid not null references pets(id) on delete cascade,
  trip_id uuid unique references trips(id) on delete set null,
  destination_theme text not null,
  location_name text not null,
  landmark text,
  title text not null,
  message text not null,
  reason text,
  image_key text,
  image_prompt text,
  image_status text not null default 'pending',
  image_path text,
  collected boolean not null default false,
  sent_at timestamptz not null default now(),

  check (
    destination_theme in (
      'seaside','forest','snow','hotspring','harbor',
      'mountain','flowerfield','raincity','town','nightstation'
    )
  ),
  check (image_status in ('pending','generating','ready','error','fallback'))
);

create index postcards_pet_id_sent_at_idx on postcards(pet_id, sent_at desc);

create unique index one_uncollected_postcard_per_pet
on postcards(pet_id)
where collected = false;

create table battles (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  trip_id uuid unique references trips(id) on delete set null,
  day date not null,
  attacker_pet_id uuid not null references pets(id) on delete cascade,
  defender_pet_id uuid references pets(id) on delete set null,
  is_npc boolean not null default false,
  attacker_snapshot jsonb not null,
  defender_snapshot jsonb not null,
  result text not null,
  attacker_rating_delta int not null default 0,
  defender_rating_delta int not null default 0,
  attacker_injury int not null default 0,
  spoils text,
  title text not null,
  story text not null,
  created_at timestamptz not null default now(),

  check (result in ('win','lose','draw'))
);

create index battles_attacker_pet_id_created_at_idx
on battles(attacker_pet_id, created_at desc);

create index battles_defender_pet_id_created_at_idx
on battles(defender_pet_id, created_at desc);

create table activities (
  id bigint generated always as identity primary key,
  legacy_seq bigint,
  pet_id uuid not null references pets(id) on delete cascade,
  actor text not null,
  kind text not null,
  day date not null,
  title text not null,
  detail text,
  effects jsonb not null default '{}',
  payload jsonb,
  trip_id uuid references trips(id) on delete set null,
  postcard_id uuid references postcards(id) on delete set null,
  battle_id uuid references battles(id) on delete set null,
  created_at timestamptz not null default now(),

  check (actor in ('owner','agent','world','pet')),
  check (
    kind in (
      'adopt','pack','say','pat','restyle',
      'travel','battle','rest','home','yard','challenged'
    )
  )
);

create index activities_pet_id_id_idx on activities(pet_id, id);
create index activities_pet_id_day_idx on activities(pet_id, day);
create index activities_pet_id_created_at_idx on activities(pet_id, created_at desc);

create unique index activities_pet_id_legacy_seq_idx
on activities(pet_id, legacy_seq)
where legacy_seq is not null;

create table friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references users(id) on delete cascade,
  addressee_id uuid not null references users(id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),

  unique(requester_id, addressee_id),
  check (status in ('pending','accepted','blocked'))
);
