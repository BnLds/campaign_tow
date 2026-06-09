# Deferred Work

## Deferred from: code review of 1-1-db-migration-factions-table-and-backfill-armies-faction-fk (2026-04-21)

- No down/rollback migration — pre-existing pattern across all files in `drizzle/`. No migration has a documented down script; revisit when deploy tooling/ops flow matures.
- `CanonicalFactionId` type exported from `src/db/seeds/factions.ts` but unused in this story — Story 1.2 is the declared consumer per spec Task 1.
- `ON DELETE RESTRICT` runtime behavior not exercised by a behavioral test — covered by drizzle snapshot; a real delete-is-rejected test becomes more valuable once Story 1.2 introduces faction admin flows.
- `[1.1-MIG-003]` couples only the faction `id` (not `name`/`displayName`) at the migration-SQL layer — compensated by `[1.1-FAC-005]` (docs-parity drift check) and `[1.1-SEED-003]` (live DB check for `chaos-dwarfs → 'Nains du Chaos'`).

## Deferred from: code review of story-1.2 (2026-04-22)

- `STANDARD_BUILDINGS` sans garde-fou d'exhaustivité contre le type `BuildingId` : ajouter une nouvelle entrée à `BuildingId` ne force pas la mise à jour de `STANDARD_BUILDINGS`. Amélioration type-level (pattern `satisfies ReadonlyArray<BuildingId>` combiné à un test d'exhaustivité) à considérer quand Epic 4 élargit le catalogue de bâtiments. [src/lib/faction-config.ts:54-61]
- Tests `[FC-ALT-001]` / `[FC-ALT-002]` vérifient uniquement `alternativeStructure.name`. Si un futur dev modifie `baseCost: 300` → `400` pour Hall du Tyran ou Portail du Chaos, ces tests passent toujours. Mitigation : FC-DAE-001 / FC-OGR-001 couvrent la forme complète. Renforcement envisageable (utiliser `toMatchObject` avec tous les champs ou pointer vers la même fixture). [src/lib/__tests__/faction-config.test.ts:35-53]
- Exceptions ville-par-terrain non encodables dans `FactionConfig` actuel : Bretonnie (plaine_agricole), Empire/Hauts Elfes/Cathay (plaine_fluviale), Dark Elves (marais via évolution village→ville). `territory_rule.md` dit `Ville: Non` sur ces terrains, mais `faction_rule.md` accorde des exceptions par faction. L'interface n'a pas de champ pour encoder ces overrides. Épic 3 (territory server fns) doit trancher : étendre l'interface avec un champ `cityTerrainOverrides?: TerrainType[]` (whitelist POSITIF pour factions qui dérogent au défaut `Ville: Non`, distinct du `cityTerrainWhitelist` restrictif existant), ou gérer via une table séparée consultée par le consumer. [src/lib/faction-config.ts — commentaire d'en-tête pointe ici]
