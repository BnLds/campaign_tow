-- Backfill unit_gains.type after adding the unit_gain_type enum column
-- Run AFTER drizzle-kit push (the default 'tier_up' is applied first, then these override specific types)
-- Order matters: more specific matches first

UPDATE unit_gains SET type = 'death' WHERE description LIKE 'Mort%' AND type = 'tier_up';
UPDATE unit_gains SET type = 'haine' WHERE (description LIKE 'Haine%' OR description LIKE 'Rancune%') AND type = 'tier_up';
UPDATE unit_gains SET type = 'pertes_catastrophiques' WHERE description LIKE 'Pertes Catastrophiques%' AND type = 'tier_up';
UPDATE unit_gains SET type = 'deroute_sanglante' WHERE description LIKE 'Déroute Sanglante%' AND type = 'tier_up';
UPDATE unit_gains SET type = 'banner_lost' WHERE description LIKE 'Bannière perdue%' AND type = 'tier_up';
UPDATE unit_gains SET type = 'honour_banner' WHERE description = 'Bannière gratuite' AND type = 'tier_up';
UPDATE unit_gains SET type = 'honour_champion' WHERE description = 'Champion gratuit' AND type = 'tier_up';

-- Verify: no rows should remain with incorrect type after backfill
-- SELECT type, description, COUNT(*) FROM unit_gains GROUP BY type, description ORDER BY type, description;
