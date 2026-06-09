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

## Deferred from: code review of story-1.3 (2026-04-23)

- Cleanup `afterAll` du test d'intégration ne supprime pas les lignes `units` liées à l'armée — cascade FK non vérifiée dans le scope du diff. Si pas de cascade, les units orphelines s'accumulent dans la DB test. [src/db/__tests__/player-import-army.faction-resolution.test.ts:27-32]
- `${parsed.faction}` interpolé brut dans le message d'erreur VALIDATION_ERROR sans cap de longueur. Surface d'injection/verbosité si l'OWB contient une ligne pathologique. Minor — le message est ensuite rendu dans l'UI, pas directement exécuté. [src/lib/server-fns/player-import-army.ts:47, src/server-fns/admin-armies.ts:33]
- `.toLowerCase()` locale-independent non testé sur caractères exotiques (Turkish dotless ı, German ß). Non réaliste en export OWB mais précaution défensive future.
- Apostrophes Unicode alternatives non normalisées : U+02BC (modifier apostrophe), U+FF07 (fullwidth apostrophe). Uniquement U+2018/U+2019 gérés. [src/lib/faction-resolver.ts:11]
- Tirets Unicode non convertis : en-dash (U+2013), em-dash (U+2014) ne se réduisent pas au hyphen-minus ASCII. Aucune variant de `FACTION_VARIANTS` n'en utilise. [src/lib/faction-resolver.ts]
- `parsed.faction` non-string defensive guard absent : si `parseOwbExport` renvoyait `undefined` pour un export malformé, `.replace` lèverait un TypeError au lieu d'un `VALIDATION_ERROR`. Le type du parser est `string` mais ceinture-et-bretelles manque. [src/lib/faction-resolver.ts:9]
- Le handler admin `importArmyFn` ne valide pas `parsed.units.length === 0` — pré-existant avant 1.3, non introduit par ce changement. [src/server-fns/admin-armies.ts]
- Test de parité SQL réelle (lire `drizzle/0005_chemical_goliath.sql` au runtime, extraire le bloc VALUES, comparer à `FACTION_VARIANTS`) — spec §SQL parity le marque "optional, recommended". Le round-trip actuel ne vérifie que la self-consistency de la liste TS.

## Playwright E2E bootstrap (deferred from Story 1.5)

Story 1.5's epic AC mentioned a Playwright e2e test for the `/territories` route. Deferred because: no `playwright.config.*`, no `e2e/` directory, no global-setup, no auth fixtures, no `.auth/` storageState directory exist in the repo. Bootstrapping all of this is an epic-level task — a single-story scope expansion would balloon. Vitest integration tests (`territory-queries.test.ts`) cover the lazy-bootstrap behaviour at the helper layer. **Action:** schedule a dedicated bootstrap story before Epic 2 ships (recommended: as the first story of Epic 2 or as a 1.6 spike) to set up Playwright config, global-setup with cookie-based session injection, and a first smoke spec covering `/territories`.
