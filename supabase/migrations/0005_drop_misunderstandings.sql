-- Drop the retired "误解词典" (misunderstanding dictionary) feature. The pet no
-- longer mis-hears the owner's note, so the per-pet collection column is dead.
-- All app code that read/wrote pets.misunderstandings has been removed.
-- Additive over 0001_storage_refactor.sql (which created the column).
--   psql "$POSTGRES_URL" -f supabase/migrations/0005_drop_misunderstandings.sql

alter table pets drop column if exists misunderstandings;
