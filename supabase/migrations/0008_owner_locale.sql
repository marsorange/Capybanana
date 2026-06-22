-- Bilingual (中文 / English) support: persist the owner's UI language on the pet
-- so server-generated, stored text (postcards, souvenirs, the activity log) is
-- written in their language even when the Agent — which doesn't know the UI
-- locale — triggers the generation. Additive over 0002_gameplay_v2.sql.
--   psql "$POSTGRES_URL" -f supabase/migrations/0008_owner_locale.sql
--
-- The app degrades gracefully WITHOUT this column (loadSave reads it as 'zh',
-- savePet writes it best-effort and swallows the missing-column error), so this
-- migration only needs to run to ACTIVATE English server text — it is safe to
-- apply at any time.

alter table pets
  add column if not exists locale text not null default 'zh';

alter table pets drop constraint if exists pets_locale_check;
alter table pets
  add constraint pets_locale_check check (locale in ('zh', 'en'));
