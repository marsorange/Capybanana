-- Capybanana destination CHECK catch-up: the trips/postcards destination_theme
-- CHECK still listed the v1 themes (hotspring/harbor/raincity/nightstation) and
-- was MISSING the current far-pool themes 'starfield' and 'desert' — so any far
-- trip (or its postcard) to those two places failed the insert with a 500.
-- This widens both CHECKs to the union of the live 8 themes (see
-- src/game/destinations.ts) AND the retired ones, so existing legacy rows
-- (there are still 'nightstation' rows in prod) keep validating.
-- Additive over 0006_token_scopes.sql.
--   psql "$POSTGRES_URL" -f supabase/migrations/0007_destination_themes.sql

alter table trips drop constraint if exists trips_destination_theme_check;
alter table trips
  add constraint trips_destination_theme_check check (
    destination_theme is null or destination_theme in (
      -- live themes (src/game/destinations.ts)
      'seaside','forest','flowerfield','town','snow','mountain','starfield','desert',
      -- retired themes kept so legacy rows still validate
      'hotspring','harbor','raincity','nightstation'
    )
  );

alter table postcards drop constraint if exists postcards_destination_theme_check;
alter table postcards
  add constraint postcards_destination_theme_check check (
    destination_theme in (
      'seaside','forest','flowerfield','town','snow','mountain','starfield','desert',
      'hotspring','harbor','raincity','nightstation'
    )
  );
