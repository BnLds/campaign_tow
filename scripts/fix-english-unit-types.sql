-- Fix unit types imported from English OWB exports.
-- Maps English section names to canonical French names used by the app.

UPDATE units SET type = 'Personnages' WHERE type = 'Characters';
UPDATE units SET type = 'Unités de base' WHERE type = 'Core Units';
UPDATE units SET type = 'Unités spéciales' WHERE type = 'Special Units';
UPDATE units SET type = 'Unités rares' WHERE type = 'Rare Units';
