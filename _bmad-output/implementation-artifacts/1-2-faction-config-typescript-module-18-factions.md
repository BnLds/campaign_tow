# Story 1.2: Faction Config TypeScript Module — 18 Factions

Status: done

## Story

As a developer,
I want a single TypeScript module `src/lib/faction-config.ts` exporting a `FACTION_CONFIGS` record covering all 18 factions with their colonization rules, available buildings, automatic free buildings, and alternative/special structures,
so that every server function and client component can consult a single source of truth for faction rules without hardcoding logic per faction.

## Acceptance Criteria

1. **`FactionConfig` interface — exact shape from architecture** — `src/lib/faction-config.ts` exports the `FactionConfig`, `TerrainType`, `ColonyType`, and `BuildingId` types **verbatim** from `architecture-territory/implementation-patterns-consistency-rules.md#Structure-Patterns` (lines 26–66). No renamed fields, no extensions, no additional optional properties. Any deviation requires architectural discussion.
2. **`FACTION_CONFIGS` record covers all 18 canonical factions** — exports `FACTION_CONFIGS: Record<string, FactionConfig>` with exactly 18 entries, one per `CANONICAL_FACTIONS` ID from `src/db/seeds/factions.ts` (Story 1.1). The record's keys MUST be type-safe against `CanonicalFactionId` — prefer `Record<CanonicalFactionId, FactionConfig>` so TypeScript enforces completeness at compile time.
3. **Colonization rules correctly translate `docs/faction_rule.md`** — each entry's `colonization.canBuildVillage`, `canBuildCity`, `alternativeStructure`, and `terrainRestrictions` fields reflect the faction's rules exactly. In particular:
   - `daemons-of-chaos`: `canBuildVillage = false`, `canBuildCity = false`, `alternativeStructure = { name: 'Portail du Chaos', baseCost: 0 (auto-created), upgradeCost: 300, baseIncome: 40, upgradeIncome: 80, baseArmyPoints: 50, upgradeArmyPoints: 100, baseSlots: 1, upgradeSlots: 3 }`.
   - `ogre-kingdoms`: `canBuildVillage = true` (ogres construisent des villages n'importe où), `canBuildCity = false`, `alternativeStructure = { name: 'Hall du Tyran', baseCost: 300, baseIncome: 50, baseArmyPoints: 300, baseSlots: 5 }` — unique city called Hall du Tyran.
   - `dwarfen-mountain-holds`: `canBuildVillage = true`, `canBuildCity = true`, `terrainRestrictions = ['montagnes']` for cities (cannot build city on plains).
   - `orc-and-goblin-tribes`: same mountain-only city restriction as dwarfs.
   - `wood-elf-realms` and `beastmen-brayherds`: `canBuildVillage = true`, `canBuildCity = true` (cities only in forests — `terrainRestrictions = ['foret']` for cities).
   - `kingdom-of-bretonnia`, `empire-of-man`, `high-elf-realms`, `grand-cathay`, `dark-elves`: standard + specific terrain allowing cities (agricole/fluviale/marais as per rules).
   - All other factions with no special rule in `docs/faction_rule.md` (Skaven, Tomb Kings of Khemri, Renegade Crowns, Chaos Dwarfs, Vampire Counts, Lizardmen): `canBuildVillage = true`, `canBuildCity = true`, no `alternativeStructure`, no terrain restriction beyond the standard rules from `docs/territory_rule.md`.
4. **`availableBuildings` reflects faction access** — each entry's `availableBuildings` lists the `BuildingId[]` the faction can build (from `docs/territory_rule.md` + faction-specific exceptions in `docs/faction_rule.md`). Notable cases:
   - `daemons-of-chaos`: only `['caserne', 'caserne_upgraded', 'ecuries', 'ecuries_upgraded', 'menagerie', 'menagerie_upgraded', 'tour_sorcier', 'grande_tour', 'tour_arcanes']` (military + wizard tower only — no economic or standard buildings since they don't colonize).
   - `dark-elves`: excludes `'barbier'` (Barbier-Chirurgien explicitly forbidden).
   - `dwarfen-mountain-holds`: wizard-tower chain replaced — their entry uses the same `BuildingId` union keys (`tour_sorcier`, `grande_tour`, `tour_arcanes`) since the interface does not currently carry per-faction renaming, but include a short comment in the source noting the cost table defers to Epic 4. No extension of `BuildingId`.
   - All others: include the full standard set minus any explicit exclusion.
5. **`automaticBuildings` reflects free buildings at colony founding** — each entry's `automaticBuildings: Array<{ terrain, building, colonyType }>` encodes the free-building rules:
   - `kingdom-of-bretonnia` / any faction colonizing `plaine_agricole`: `{ terrain: 'plaine_agricole', building: 'ferme', colonyType: 'village' }` (ferme gratuite, per `docs/territory_rule.md`).
   - Any faction colonizing `marais` for `village`: `{ terrain: 'marais', building: 'menagerie', colonyType: 'village' }` (ménagerie niv. 1 gratuite).
   - `dark-elves` on `marais`: `{ terrain: 'marais', building: 'menagerie_upgraded', colonyType: 'village' }` (ménagerie **niveau 2** gratuite, écrasant la règle standard).
   - `beastmen-brayherds` on `foret`: `{ terrain: 'foret', building: 'menagerie' (Pierre des Hardes placeholder), colonyType: 'village' }` — note: Pierre des Hardes is a faction-specific building that will be modelled in Epic 4; for this story, DO NOT add a new `BuildingId` value. Instead, include a TODO comment in the source and leave the array empty for `beastmen-brayherds` with a comment referencing Epic 4 Story 4.5. Same reasoning for any other faction-specific free building not yet in `BuildingId`.
6. **`godConsecration` present for Warriors of Chaos and Chaos Marauders** — `warriors-of-chaos` and the Marauders of Chaos (if present as a distinct canonical faction; **not present in the 18** — Marauders are a sub-army of Warriors of Chaos per the current canonical list, so only `warriors-of-chaos` needs `godConsecration`). Set: `{ gods: ['khorne', 'tzeentch', 'nurgle', 'slaanesh', 'undivided'], unitsPerVillage: 2, unitsPerCity: 3 }`. All other factions: `godConsecration` omitted (undefined).
7. **Pure static data — no side effects** — the module imports no DB modules (`src/db/*` is forbidden except for importing the **type** `CanonicalFactionId` or the **const** `CANONICAL_FACTIONS` from `src/db/seeds/factions.ts`, which are both pure static data with no runtime DB access). No runtime side effects, no top-level `await`, no function calls at module load.
8. **Test file covers parity, structure, and faction-specific rules** — `src/lib/__tests__/faction-config.test.ts` passes and includes:
   - A `describe.each(CANONICAL_FACTIONS)` block asserting each faction has an entry in `FACTION_CONFIGS` and every entry exposes: non-null `availableBuildings: string[]` (can be empty only when `canBuildVillage === false && canBuildCity === false`, i.e. daemons), booleans `canBuildVillage` and `canBuildCity`, and a valid `terrainRestrictions: TerrainType[]` (can be empty array = no restriction).
   - A test `daemons and ogres: alternativeStructure without standard colonies` asserting both `daemons-of-chaos` and `ogre-kingdoms` have `canBuildVillage === false` or `canBuildCity === false` respectively (daemons: both false; ogres: only city false) AND a defined `alternativeStructure` object.
   - A parity test: `Object.keys(FACTION_CONFIGS).sort()` equals `CANONICAL_FACTIONS.map(f => f.id).sort()`. Assertion-coupled (single assertion, single `toEqual`) — not two separate length/subset assertions.
   - A test for `warriors-of-chaos` asserting `godConsecration.gods` contains exactly `['khorne', 'tzeentch', 'nurgle', 'slaanesh', 'undivided']` (order-independent via `.toEqual(expect.arrayContaining(...))` + length check coupled on the same object), `unitsPerVillage === 2`, `unitsPerCity === 3`.
   - A test asserting `dark-elves.availableBuildings` does NOT contain `'barbier'` (exclusion rule from `docs/faction_rule.md`).
   - A type-level test (tsc-only — no runtime): `const _: Record<CanonicalFactionId, FactionConfig> = FACTION_CONFIGS` in the test file to force TypeScript to fail the build if a canonical ID is missing or extra.
9. **Type-safe import works for consumers** — a consumer doing `import { FACTION_CONFIGS, type FactionConfig } from '~/lib/faction-config'` gets full TypeScript inference, and `FACTION_CONFIGS[someCanonicalFactionId]` is typed as `FactionConfig` (not `FactionConfig | undefined`). This requires the `Record<CanonicalFactionId, FactionConfig>` typing from AC #2.
10. **No new dependencies, no `BuildingId` / `TerrainType` extensions** — `package.json` is not modified. The `BuildingId` and `TerrainType` unions are exactly those listed in the architecture doc — do not add entries for faction-specific buildings (Pierre des Hardes, Autel de la Dame, Portail du Chaos, etc.) in this story. Those are Epic 4's concern.

## Tasks / Subtasks

- [x] **Task 1: Create the `FactionConfig` interface file** (AC: #1, #10)
  - [x] Create `src/lib/faction-config.ts` and transcribe the `TerrainType`, `ColonyType`, `BuildingId`, `FactionConfig` types from `architecture-territory/implementation-patterns-consistency-rules.md` lines 26–66 **verbatim**. Do not add, remove, or rename any field.
  - [x] Export all four type aliases/interface (`TerrainType`, `ColonyType`, `BuildingId`, `FactionConfig`).
  - [x] Add a file header comment: `// Source of truth: docs/faction_rule.md + docs/territory_rule.md + docs/factions.md. See Epic 1 Story 1.2.`

- [x] **Task 2: Build the `FACTION_CONFIGS` record for all 18 factions** (AC: #2, #3, #4, #5, #6, #7)
  - [x] Import `CANONICAL_FACTIONS` and `CanonicalFactionId` from `@/db/seeds/factions` (alias `@/*` = `src/*` in tsconfig — not `~/`).
  - [x] Declare `export const FACTION_CONFIGS: Record<CanonicalFactionId, FactionConfig> = { ... }` with one entry per canonical ID.
  - [x] For each faction, fill `colonization`, `terrainRestrictions`, `availableBuildings`, `automaticBuildings`, and conditional `godConsecration`. Cross-reference the per-faction rules in `docs/faction_rule.md` — see Dev Notes below for the full faction-by-faction table.
  - [x] Factions with no special rule (Skaven, Tomb Kings of Khemri, Renegade Crowns, Chaos Dwarfs, Vampire Counts, Lizardmen): apply the generic defaults. See Dev Notes.
  - [x] Where a faction has a building that does not yet exist in the `BuildingId` union (Pierre des Hardes for Beastmen, Autel de la Dame for Bretonnia, Portail du Chaos / Portail Majeur for Daemons, Hall du Tyran for Ogres, etc.), leave it out and add a `// TODO Epic 4 Story 4.5 — faction-specific building` comment above that entry. AC #10 forbids extending `BuildingId` in this story.
  - [x] Verify no imports from `src/db/*` other than `@/db/seeds/factions` types/consts.

- [x] **Task 3: Write the test suite** (AC: #8, #9)
  - [x] Create `src/lib/__tests__/faction-config.test.ts`.
  - [x] `describe.each(CANONICAL_FACTIONS)` over each faction — assert the entry exists in `FACTION_CONFIGS` and all required fields are well-typed and consistent (non-null arrays, valid booleans).
  - [x] Add the `daemons` + `ogres` special case test.
  - [x] Add the parity test (`Object.keys(FACTION_CONFIGS).sort() === CANONICAL_FACTIONS.map(f => f.id).sort()`) — single `toEqual` assertion.
  - [x] Add the `warriors-of-chaos.godConsecration` test — couple the `gods` array content and length in a single `toEqual` on a sorted copy, and the counts on the same `.godConsecration` reference.
  - [x] Add the `dark-elves` no-barbier exclusion test — single `.not.toContain('barbier')` on `availableBuildings`.
  - [x] Add the compile-time assertion (a type-level line `const _: Record<CanonicalFactionId, FactionConfig> = FACTION_CONFIGS`) + `void _` to silence `noUnusedLocals` so `pnpm typecheck` fails if the record is incomplete or has extra keys.
  - [x] Run `pnpm vitest src/lib/__tests__/faction-config.test.ts` — 31 tests pass.
  - [x] Run `pnpm typecheck && pnpm lint` — green (2 pre-existing failures in Story 1.1 tests unchanged).

- [x] **Task 4: Verify consumer import pattern** (AC: #9)
  - [x] Path alias `@/lib/faction-config` resolves correctly via existing `tsconfig.json` — no changes needed.
  - [x] `FACTION_CONFIGS['kingdom-of-bretonnia']` returns `FactionConfig` (not `| undefined`) — confirmed by typecheck passing with `Record<CanonicalFactionId, FactionConfig>` typing.

## Dev Notes

### Architecture compliance

- **Interface exact match (AC #1):** Copy the `FactionConfig` / `TerrainType` / `ColonyType` / `BuildingId` shapes **exactly** from `architecture-territory/implementation-patterns-consistency-rules.md` lines 26–66. This is non-negotiable — do not reshape for convenience. Any proposed change must be raised in story review, not silently made.
- **No DB coupling (AC #7):** The module is a pure TypeScript constants file. It may import types and consts from `~/db/seeds/factions` (pure static data) but must never import from `~/db/schema`, `~/db/index`, or any `~/db/queries/*`. Enforce via the import list at the top of the file.
- **Faction config keys == `factions.id`:** per naming patterns table, `FACTION_CONFIGS[factionId]` is the lookup pattern. Keys MUST match the seeded `factions.id` values exactly (kebab-case English, from `docs/factions.md`).
- **`BuildingId` / `TerrainType` stability (AC #10):** These unions are shared across the module. Adding a new `BuildingId` in this story would cascade into later stories (4.x building catalog, 2.x tile server). Reject the temptation and TODO-comment the Pierre des Hardes / Autel de la Dame / Portail du Chaos / Hall du Tyran cases for Epic 4.

### Per-faction rules table (`docs/faction_rule.md` distilled)

| Canonical ID | Colonization | `canBuildVillage` / `canBuildCity` | `terrainRestrictions` | Notable `availableBuildings` changes | `automaticBuildings` | `godConsecration` | `alternativeStructure` |
|---|---|---|---|---|---|---|---|
| `beastmen-brayherds` | Village + city only in `foret`. Pierre des Hardes gratuite en forêt (Epic 4). | `true` / `true` | `['foret']` (for city) | Standard minus faction-specific (Pierre des Hardes deferred) | `[]` (TODO: Pierre des Hardes in Epic 4.5) | — | — |
| `chaos-dwarfs` | Pas de règle spécifique dans doc — défauts standards | `true` / `true` | `[]` | Standard | generic (`plaine_agricole→ferme`, `marais→menagerie`) | — | — |
| `daemons-of-chaos` | Cannot colonize; Portail du Chaos created automatically on tile gain. Only military + wizard tower buildings. | `false` / `false` | `[]` | `['caserne', 'caserne_upgraded', 'ecuries', 'ecuries_upgraded', 'menagerie', 'menagerie_upgraded', 'tour_sorcier', 'grande_tour', 'tour_arcanes']` | `[]` (no colony, no free building — Portail handled by Epic 3 alternative-structure flow) | — | `{ name: 'Portail du Chaos', baseCost: 0, upgradeCost: 300, baseIncome: 40, upgradeIncome: 80, baseArmyPoints: 50, upgradeArmyPoints: 100, baseSlots: 1, upgradeSlots: 3 }` |
| `dark-elves` | Village sur marais → ménagerie niv. 2 gratuite (hors limite). City allowed on marais. | `true` / `true` | `[]` | Standard **minus** `'barbier'` | `[{ terrain: 'marais', building: 'menagerie_upgraded', colonyType: 'village' }, { terrain: 'plaine_agricole', building: 'ferme', colonyType: 'village' }]` | — | — |
| `dwarfen-mountain-holds` | Village + ville en montagne. Pas de ville en plaines. Mine gratuite en montagne (Epic 4 will slot this via `automaticBuildings`). | `true` / `true` | `['montagnes']` (for city) | Standard (wizard-tower chain semantically replaced, see AC #4) | `[{ terrain: 'montagnes', building: 'mine', colonyType: 'village' }, { terrain: 'plaine_agricole', building: 'ferme', colonyType: 'village' }, { terrain: 'marais', building: 'menagerie', colonyType: 'village' }]` | — | — |
| `empire-of-man` | City on `plaine_fluviale`. | `true` / `true` | `[]` (city allowed everywhere standard — fluviale is a bonus terrain, not a restriction) | Standard | generic | — | — |
| `grand-cathay` | City on `plaine_fluviale` for 400 CO. Adjacent fluvial tiles bonus (Epic 5 income). | `true` / `true` | `[]` | Standard | generic | — | — |
| `high-elf-realms` | City on `plaine_fluviale` for 400 CO. | `true` / `true` | `[]` | Standard | generic | — | — |
| `kingdom-of-bretonnia` | City on `plaine_agricole`. Ferme gratuite (per territory rule, already generic). | `true` / `true` | `[]` | Standard | `[{ terrain: 'plaine_agricole', building: 'ferme', colonyType: 'village' }, { terrain: 'marais', building: 'menagerie', colonyType: 'village' }]` | — | — |
| `lizardmen` | Standard. | `true` / `true` | `[]` | Standard | generic | — | — |
| `ogre-kingdoms` | Villages anywhere; only ONE city = Hall du Tyran. | `true` / `false` | `[]` | Standard | generic (village level only) | — | `{ name: 'Hall du Tyran', baseCost: 300, baseIncome: 50, baseArmyPoints: 300, baseSlots: 5 }` (no upgradeXxx fields) |
| `orc-and-goblin-tribes` | Village + ville en montagne; pas de ville en plaines. | `true` / `true` | `['montagnes']` (for city) | Standard | generic | — | — |
| `renegade-crowns` | Standard. | `true` / `true` | `[]` | Standard | generic | — | — |
| `skaven` | Standard. | `true` / `true` | `[]` | Standard | generic | — | — |
| `tomb-kings-of-khemri` | Standard. | `true` / `true` | `[]` | Standard | generic | — | — |
| `vampire-counts` | City on `marais`. | `true` / `true` | `[]` | Standard | generic | — | — |
| `warriors-of-chaos` | Standard + god consecration required at village founding. | `true` / `true` | `[]` | Standard | generic | `{ gods: ['khorne', 'tzeentch', 'nurgle', 'slaanesh', 'undivided'], unitsPerVillage: 2, unitsPerCity: 3 }` | — |
| `wood-elf-realms` | Village + city in `foret` only. | `true` / `true` | `['foret']` (for city) | Standard | generic | — | — |

**"Standard" `availableBuildings`:** `['caserne', 'caserne_upgraded', 'ecuries', 'ecuries_upgraded', 'menagerie', 'menagerie_upgraded', 'atelier', 'atelier_upgraded', 'tour_sorcier', 'grande_tour', 'tour_arcanes', 'barbier', 'forge', 'ferme', 'scierie', 'mine', 'comptoir', 'comptoir_renforce', 'grand_comptoir', 'camp_entrainement']`.

**"Generic" `automaticBuildings`:** `[{ terrain: 'plaine_agricole', building: 'ferme', colonyType: 'village' }, { terrain: 'marais', building: 'menagerie', colonyType: 'village' }]`. Apply when no faction-specific override exists.

**`terrainRestrictions` semantics:** per the interface, the field is a flat `TerrainType[]`. Treat a non-empty array as the **whitelist of terrains where cities can be founded** (consumers MAY apply this to cities only — Epic 3 will formalize the consumer contract). An empty array means no restriction beyond the terrain's own rules. If the semantics later need splitting village vs city, that is an architecture-level change, not a Story 1.2 change.

**Marauders of Chaos note:** The canonical list in `docs/factions.md` does **not** include a separate `marauders-of-chaos` faction — Marauders are sub-units within `warriors-of-chaos`. The faction_rule.md Maraudeurs section applies to `warriors-of-chaos` mechanically, but story AC #6 only covers `warriors-of-chaos`. Do NOT introduce a new canonical faction.

### Library / framework requirements

- TypeScript 5.x (already in `package.json`). No new deps.
- Uses `satisfies` or explicit typing — prefer `const FACTION_CONFIGS: Record<CanonicalFactionId, FactionConfig> = { ... }` so the compiler enforces completeness. Avoid `as const satisfies` here because `Record<CanonicalFactionId, FactionConfig>` would be lost. Trade-off: the record literal won't auto-narrow, but we get completeness checking — the architecture mandate (AC #9) is the tiebreaker.
- Vitest 2.x (already installed). Path alias `~/*` maps to `src/*` via existing `tsconfig.json`.

### File structure

```
src/lib/
├── faction-config.ts                        ← NEW
└── __tests__/
    └── faction-config.test.ts               ← NEW
```

No other files are created or modified in this story.

### Testing requirements

- **Unit tests only** — this module has no DB access. No integration tests.
- **Assertion coupling rule (MEMORY.md):** every assertion that couples two facts must be expressed as a single assertion. Examples:
  - ✅ `expect(Object.keys(FACTION_CONFIGS).sort()).toEqual(CANONICAL_FACTIONS.map(f => f.id).sort())` — single parity check.
  - ❌ Two separate `.toContain` to prove `warriors-of-chaos` has consecration — use `expect(FACTION_CONFIGS['warriors-of-chaos'].godConsecration).toEqual({ gods: [...], unitsPerVillage: 2, unitsPerCity: 3 })` instead.
  - ✅ `expect(FACTION_CONFIGS['daemons-of-chaos']).toMatchObject({ colonization: { canBuildVillage: false, canBuildCity: false, alternativeStructure: { name: 'Portail du Chaos' } } })`.
- **Type-level test:** include `const _: Record<CanonicalFactionId, FactionConfig> = FACTION_CONFIGS` at the top of the test file. This line must compile — it fails the build (not just the test run) if the record is incomplete or has surplus keys. The test file is part of `pnpm typecheck` because `vitest.config.ts` includes `src/**/*.test.ts` and the project's tsconfig includes tests.
- **No network, no DB, no fs, no timers.** Pure value assertions.
- **Vitest discovery:** tests placed under `src/lib/__tests__/` are picked up by the existing `vitest.config.ts` include patterns (see MEMORY.md TanStack CLI notes).

### Previous story intelligence (Story 1.1)

Learnings that directly affect this story:

1. **Use `CANONICAL_FACTIONS` as the authoritative ID list.** It is already exported from `src/db/seeds/factions.ts` with `CanonicalFactionId` union. Do not re-declare the list; import it. This guarantees the docs/factions.md parity check established by Story 1.1 transitively applies.
2. **`docs/factions.md` is the ONLY canonical source for faction IDs/names.** If Story 1.2's tests reveal that `docs/faction_rule.md` uses a name that doesn't map cleanly to a canonical ID, flag it in completion notes and confirm with the user — do NOT invent a new ID.
3. **Assertion-coupling rule applies.** Story 1.1 reviewers flagged several decoupled assertions (`[1.1-MIG-001]` FK regex too permissive, `[1.1-MIG-003]` id coupling without name). Apply the coupling rule from the outset in the test file.
4. **File locations — `src/lib/__tests__/`** is the established pattern (see `src/lib/__tests__/` listing above: `chip-styles.test.ts`, `format.test.ts`, etc.). Follow this convention.
5. **Seed type export `CanonicalFactionId`** was explicitly created in Story 1.1 Task 1 "for Story 1.2 consumption." This story is its declared consumer.

### Project context reference

- **MEMORY.md — assertion coupling rule:** MANDATORY, see test checklist above.
- **MEMORY.md — Tailwind/CSS pitfall:** does NOT apply (no CSS in this story).
- **MEMORY.md — env var guard pattern:** does NOT apply (no DB access).
- **MEMORY.md — TanStack Form Zod v4 native support:** does NOT apply (no form).
- **MEMORY.md — file locations:** story files live under `_bmad-output/implementation-artifacts/`. ✓

### Git intelligence summary

Recent commits relevant to this story:

- `dba3e22 story 1.1: factions table + backfill armies.faction FK` — introduced `src/db/seeds/factions.ts` with `CANONICAL_FACTIONS` and `CanonicalFactionId`. This story builds directly on that export. No file moves, no renames.
- `a31a82e cleanup: remove obsolete test-artifacts scaffolding` — unrelated cleanup; no impact.
- `c38d563 fix planning artifacts after implementation readiness review` — the planning artifacts referenced by this story are the post-fix versions (current HEAD).

### References

- [Source: `_bmad-output/planning-artifacts/epics/epic-1-territory-foundation-faction-recognition.md#Story-1.2`] — full ACs and business context.
- [Source: `_bmad-output/planning-artifacts/architecture-territory/implementation-patterns-consistency-rules.md#Structure-Patterns` (lines 23–71)] — `FactionConfig` / `TerrainType` / `ColonyType` / `BuildingId` interface definition (copy verbatim).
- [Source: `_bmad-output/planning-artifacts/architecture-territory/implementation-patterns-consistency-rules.md#Testing-Strategy`] — faction-config test pattern (`describe.each` over all factions).
- [Source: `docs/faction_rule.md`] — per-faction rules (colonization, buildings, special rules) to encode.
- [Source: `docs/factions.md`] — canonical list of 18 faction IDs.
- [Source: `docs/territory_rule.md` (lines 7–18 terrains, 22–44 colonies, 48–109 buildings)] — standard colony and building rules; basis for "standard" values.
- [Source: `src/db/seeds/factions.ts`] — `CANONICAL_FACTIONS` and `CanonicalFactionId` exports (Story 1.1).
- [Source: `src/lib/__tests__/` (existing files, e.g. `tier.test.ts`, `format.test.ts`)] — convention for test file placement and Vitest style.

### Project Structure Notes

- `src/lib/faction-config.ts` is a **new file** — no conflict with existing symbols (verified: `src/lib/` listing shows no `faction-config.*` files).
- `src/lib/__tests__/faction-config.test.ts` is a **new file** in an existing test directory.
- The `~/*` path alias already resolves `~/db/seeds/factions` and `~/lib/faction-config` — no tsconfig changes needed.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (2026-04-22)

### Debug Log References

- Path alias `~/` n'existe pas dans ce projet — alias correct : `@/*` (src/*) et `#/*` (src/*) d'après `tsconfig.json`. Correction appliquée dans les imports.
- `sed` avec backreference `\1` a corrompu le fichier `faction-config.ts` (octet `\x01` inséré). Fichier réécrit manuellement.
- `const _: Record<CanonicalFactionId, FactionConfig> = FACTION_CONFIGS` déclenche TS6133 (`noUnusedLocals`). Correction : `void _` ajouté après la déclaration.
- `id as CanonicalFactionId` dans `describe.each` déclenche `@typescript-eslint/no-unnecessary-type-assertion` — supprimé car `id` est déjà `CanonicalFactionId` via `as const`.
- `godConsecration!` déclenche `@typescript-eslint/no-non-null-assertion` — remplacé par guard `if (!godConsecration) return` + accès direct sans `!`.
- `CANONICAL_FACTIONS.find(...)!.displayName` déclenche `no-non-null-assertion` — remplacé par helper `dn(id)` avec guard explicite.

### Completion Notes List

- `src/lib/faction-config.ts` créé : types `TerrainType`, `ColonyType`, `BuildingId`, `FactionConfig` transcrits verbatim depuis le doc d'architecture. `FACTION_CONFIGS: Record<CanonicalFactionId, FactionConfig>` couvre exactement les 18 factions canoniques. Aucune extension de `BuildingId` — TODO Epic 4.5 commenté pour Pierre des Hardes (Beastmen), Hall du Tyran (Ogres).
- `src/lib/__tests__/faction-config.test.ts` créé : 31 tests passent. Tous les cas spéciaux AC #8 couverts (daemons, ogres, warriors-of-chaos godConsecration, dark-elves exclusion barbier, parity test, type-level assertion).
- Aucune dépendance ajoutée. `BuildingId` et `TerrainType` inchangés.
- 2 échecs pré-existants (nixpacks.toml + queries-match-results pattern) inchangés — non liés à cette story.

### File List

- `src/lib/faction-config.ts` — NEW
- `src/lib/__tests__/faction-config.test.ts` — NEW

### Change Log

- 2026-04-22: Story 1.2 implementée — module `faction-config.ts` + suite de tests 31 cas.

### Review Findings

- [x] [Review][Defer] Exceptions ville-par-terrain POSITIVES (Bretonnie `plaine_agricole`, Empire/HE/Cathay `plaine_fluviale`, Dark-Elves `marais`) — différé à Epic 3 : nécessite un champ `cityTerrainOverrides` distinct du whitelist restrictif actuel. Commentaire d'en-tête + entry `deferred-work.md`.
- [x] [Review][Decision→Patch] Sémantique `terrainRestrictions` ambiguë — RÉSOLU en splittant l'interface en `villageTerrainWhitelist: TerrainType[]` + `cityTerrainWhitelist: TerrainType[]`. JSDoc ajoutés. Architecture doc (`implementation-patterns-consistency-rules.md`) mise à jour en parallèle. 18 factions migrées, 31 tests passent, typecheck clean.
- [ ] [Review][Decision] Sémantique `terrainRestrictions` ambiguë — `['montagnes']` peut signifier "uniquement en montagnes" ou "pas en montagnes". Dwarfs (city-in-mountains uniquement) et wood-elves (village+city-in-forest uniquement) partagent la même forme mais sémantiques opposées. Ajouter un JSDoc sur l'interface pour clarifier l'intention ?
- [x] [Review][Patch] Code mort après `toBeDefined()` — `if (!godConsecration) return` remplacé par `throw new Error('unreachable…')` pour ne pas masquer de régression. [faction-config.test.ts:59]
- [x] [Review][Patch] Commentaire dark-elves `menagerie_upgraded` ajouté expliquant l'override de la règle générique. [faction-config.ts:142]
- [x] [Review][Patch] TODO Hall du Tyran reformulé — valeurs finales (AC #3) explicites, dette réelle = Grand Hall du Tyran upgrade (Epic 4). [faction-config.ts]
- [x] [Review][Defer] `STANDARD_BUILDINGS` sans assertion d'exhaustivité vs `BuildingId` — ajouter un `BuildingId` au type ne force pas la mise à jour de la liste. Amélioration type-level suggérée (satisfies pattern ou test dédié). Pre-existing, scope architecture. [faction-config.ts:54-61]
- [x] [Review][Defer] Tests `[FC-ALT-001]` / `[FC-ALT-002]` n'assertent que `alternativeStructure.name` — si une future modif change `baseCost: 300` → `400`, ces tests ne détectent pas. FC-DAE-001 / FC-OGR-001 couvrent la forme complète, donc mitigation existe. Renforcement optionnel. [faction-config.test.ts:35-53]

