-- Capybanana postcard gacha (P0): postcards become collectible cards with a
-- rarity, plus the visible 养成 meter (陪伴天数) and the gacha pity counter.
-- Additive over 0002_gameplay_v2.sql.
--   psql "$POSTGRES_URL" -f supabase/migrations/0003_postcard_gacha.sql

-- 1) Pet-level gacha/养成 state.
--    companion_days  — 陪伴天数: +1 per day the Agent took its one main action
--                      (the ONLY meter shown to the owner; all 5 stats stay hidden).
--    pulls_since_rare — travels since the last SR/SSR postcard, driving soft/hard pity.
alter table pets
  add column if not exists companion_days int not null default 0,
  add column if not exists pulls_since_rare int not null default 0;

-- 2) Postcard rarity. Each (destination_theme × rarity) pair is one fixed 图鉴
--    card; 12 destinations × 4 rarities = 48 cards. Rolled server-side at trip
--    resolution. Existing rows backfill to the common tier.
alter table postcards
  add column if not exists rarity text not null default 'N';

alter table postcards drop constraint if exists postcards_rarity_check;
alter table postcards
  add constraint postcards_rarity_check check (rarity in ('N', 'R', 'SR', 'SSR'));
