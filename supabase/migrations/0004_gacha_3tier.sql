-- Capybanana postcard gacha v2: shrink the 图鉴 to 8 destinations × 3 rarities =
-- 24 cards, and drop the SSR tier (rarity is now N / R / SR). The agent no longer
-- picks a destination — it only chooses near/far and the server rolls the place.
-- Additive over 0003_postcard_gacha.sql.
--   psql "$POSTGRES_URL" -f supabase/migrations/0004_gacha_3tier.sql

-- 1) Collapse any legacy 传说(SSR) postcards into the new top tier 史诗(SR) so the
--    tightened CHECK below won't reject existing rows.
update postcards set rarity = 'SR' where rarity = 'SSR';

-- 2) Tighten the rarity CHECK to the 3-tier set. (Retired destination themes on
--    old rows are left as-is; the app derives the 24-card 图鉴 from the valid set
--    and ignores orphans — see countCollected() in src/game/gacha.ts.)
alter table postcards drop constraint if exists postcards_rarity_check;
alter table postcards
  add constraint postcards_rarity_check check (rarity in ('N', 'R', 'SR'));
