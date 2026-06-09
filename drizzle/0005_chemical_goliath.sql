-- Migration 0005: factions table + seed + armies.faction backfill + FK constraint
-- Source: Story 1.1 — DB Migration factions table and backfill armies.faction FK
--
-- Existing armies.faction values (inventoried 2026-04-20 from dev DB):
--   'Hommes-Lézards' → lizardmen
--   'Lizardmen'      → lizardmen
--   'Royaumes Hauts Elfes' → high-elf-realms
--   'Tribus des Orques & Gobelins' → orc-and-goblin-tribes
--   'Warriors of Chaos' → warriors-of-chaos
-- All variants resolved by lower(unaccent(trim())) + exhaustive variant table.

-- 1. factions table
CREATE TABLE "factions" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	CONSTRAINT "factions_name_unique" UNIQUE("name")
);

--> statement-breakpoint

-- 2. Seed — 18 canonical factions from CANONICAL_FACTIONS (scripts/emit-factions-seed.ts)
INSERT INTO factions (id, name, display_name) VALUES
  ('beastmen-brayherds', 'Beastmen Brayherds', 'Braillehardes Hommes-bêtes'),
  ('chaos-dwarfs', 'Chaos Dwarfs', 'Nains du Chaos'),
  ('daemons-of-chaos', 'Daemons of Chaos', 'Démons du Chaos'),
  ('dark-elves', 'Dark Elves', 'Elfes Noirs'),
  ('dwarfen-mountain-holds', 'Dwarfen Mountain Holds', 'Forteresses Naines'),
  ('empire-of-man', 'Empire of Man', 'Empire de l''Homme'),
  ('grand-cathay', 'Grand Cathay', 'Grand Cathay'),
  ('high-elf-realms', 'High Elf Realms', 'Royaumes Hauts Elfes'),
  ('kingdom-of-bretonnia', 'Kingdom of Bretonnia', 'Royaume de Bretonnie'),
  ('lizardmen', 'Lizardmen', 'Hommes-Lézards'),
  ('ogre-kingdoms', 'Ogre Kingdoms', 'Royaumes Ogres'),
  ('orc-and-goblin-tribes', 'Orc & Goblin Tribes', 'Tribus des Orques & Gobelins'),
  ('renegade-crowns', 'Renegade Crowns', 'Couronnes Renégates'),
  ('skaven', 'Skaven', 'Skavens'),
  ('tomb-kings-of-khemri', 'Tomb Kings of Khemri', 'Rois des Tombes de Khemri'),
  ('vampire-counts', 'Vampire Counts', 'Comtes Vampires'),
  ('warriors-of-chaos', 'Warriors of Chaos', 'Guerriers du Chaos'),
  ('wood-elf-realms', 'Wood Elf Realms', 'Royaumes Elfes Sylvains')
ON CONFLICT (id) DO NOTHING;

--> statement-breakpoint

-- 3. unaccent extension (required for accent-insensitive normalization)
CREATE EXTENSION IF NOT EXISTS unaccent;

--> statement-breakpoint

-- 4. Backfill armies.faction free-text → canonical faction ID
-- Strategy: normalize both sides with lower(unaccent(trim(...))), match against exhaustive variant list.
-- Variants cover: English canonical, French display, lowercased, unaccented, OWB export, & vs and.
UPDATE armies
SET faction = v.canonical_id
FROM (VALUES
  -- beastmen-brayherds
  ('beastmen brayherds',            'beastmen-brayherds'),
  ('beastmen-brayherds',            'beastmen-brayherds'),
  ('braillehardes hommes-betes',    'beastmen-brayherds'),
  ('braillehardes hommes betes',    'beastmen-brayherds'),
  -- chaos-dwarfs
  ('chaos dwarfs',                  'chaos-dwarfs'),
  ('chaos-dwarfs',                  'chaos-dwarfs'),
  ('nains du chaos',                'chaos-dwarfs'),
  -- daemons-of-chaos
  ('daemons of chaos',              'daemons-of-chaos'),
  ('daemons-of-chaos',              'daemons-of-chaos'),
  ('demons of chaos',               'daemons-of-chaos'),
  ('demons du chaos',               'daemons-of-chaos'),
  ('daemons du chaos',              'daemons-of-chaos'),
  -- dark-elves
  ('dark elves',                    'dark-elves'),
  ('dark-elves',                    'dark-elves'),
  ('elfes noirs',                   'dark-elves'),
  -- dwarfen-mountain-holds
  ('dwarfen mountain holds',        'dwarfen-mountain-holds'),
  ('dwarfen-mountain-holds',        'dwarfen-mountain-holds'),
  ('forteresses naines',            'dwarfen-mountain-holds'),
  -- empire-of-man
  ('empire of man',                 'empire-of-man'),
  ('empire-of-man',                 'empire-of-man'),
  ('empire de l''homme',             'empire-of-man'),
  ('empire de l homme',             'empire-of-man'),
  -- grand-cathay
  ('grand cathay',                  'grand-cathay'),
  ('grand-cathay',                  'grand-cathay'),
  -- high-elf-realms
  ('high elf realms',               'high-elf-realms'),
  ('high-elf-realms',               'high-elf-realms'),
  ('high elves',                    'high-elf-realms'),
  ('royaumes hauts elfes',          'high-elf-realms'),
  -- kingdom-of-bretonnia
  ('kingdom of bretonnia',          'kingdom-of-bretonnia'),
  ('kingdom-of-bretonnia',          'kingdom-of-bretonnia'),
  ('royaume de bretonnie',          'kingdom-of-bretonnia'),
  -- lizardmen
  ('lizardmen',                     'lizardmen'),
  ('hommes-lezards',                'lizardmen'),
  ('hommes lezards',                'lizardmen'),
  -- ogre-kingdoms
  ('ogre kingdoms',                 'ogre-kingdoms'),
  ('ogre-kingdoms',                 'ogre-kingdoms'),
  ('royaumes ogres',                'ogre-kingdoms'),
  -- orc-and-goblin-tribes
  ('orc & goblin tribes',           'orc-and-goblin-tribes'),
  ('orc and goblin tribes',         'orc-and-goblin-tribes'),
  ('orc-and-goblin-tribes',         'orc-and-goblin-tribes'),
  ('tribus des orques & gobelins',  'orc-and-goblin-tribes'),
  ('tribus des orques et gobelins', 'orc-and-goblin-tribes'),
  ('orcs and goblins',              'orc-and-goblin-tribes'),
  ('orcs & goblins',                'orc-and-goblin-tribes'),
  -- renegade-crowns
  ('renegade crowns',               'renegade-crowns'),
  ('renegade-crowns',               'renegade-crowns'),
  ('couronnes renegates',           'renegade-crowns'),
  -- skaven
  ('skaven',                        'skaven'),
  ('skavens',                       'skaven'),
  ('skaven clans',                  'skaven'),
  -- tomb-kings-of-khemri
  ('tomb kings of khemri',          'tomb-kings-of-khemri'),
  ('tomb-kings-of-khemri',          'tomb-kings-of-khemri'),
  ('rois des tombes de khemri',     'tomb-kings-of-khemri'),
  -- vampire-counts
  ('vampire counts',                'vampire-counts'),
  ('vampire-counts',                'vampire-counts'),
  ('comtes vampires',               'vampire-counts'),
  -- warriors-of-chaos
  ('warriors of chaos',             'warriors-of-chaos'),
  ('warriors-of-chaos',             'warriors-of-chaos'),
  ('guerriers du chaos',            'warriors-of-chaos'),
  -- wood-elf-realms
  ('wood elf realms',               'wood-elf-realms'),
  ('wood-elf-realms',               'wood-elf-realms'),
  ('wood elves',                    'wood-elf-realms'),
  ('royaumes elfes sylvains',       'wood-elf-realms')
) AS v(variant, canonical_id)
-- curly quote + whitespace normalization
WHERE lower(unaccent(trim(regexp_replace(replace(replace(replace(armies.faction, chr(8217), chr(39)), chr(8216), chr(39)), chr(160), ' '), '\s+', ' ', 'g')))) = v.variant;

--> statement-breakpoint

-- 5. Fail-loud guard — abort if any armies.faction value was not resolved
-- curly quote + whitespace normalization applied on both sides for consistency
DO $$ DECLARE bad int; BEGIN
  SELECT COUNT(*) INTO bad
  FROM armies a
  LEFT JOIN factions f ON lower(unaccent(trim(regexp_replace(replace(replace(replace(a.faction, chr(8217), chr(39)), chr(8216), chr(39)), chr(160), ' '), '\s+', ' ', 'g')))) = f.id
  WHERE f.id IS NULL;
  IF bad > 0 THEN
    RAISE EXCEPTION 'Unmapped faction values: %',
      (SELECT array_agg(DISTINCT a.faction) FROM armies a LEFT JOIN factions f ON lower(unaccent(trim(regexp_replace(replace(replace(replace(a.faction, chr(8217), chr(39)), chr(8216), chr(39)), chr(160), ' '), '\s+', ' ', 'g')))) = f.id WHERE f.id IS NULL);
  END IF;
END $$;

