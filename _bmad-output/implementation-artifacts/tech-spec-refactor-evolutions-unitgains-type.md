---
title: 'Refactor evolutions.ts — unitGains type enum + transaction decomposition'
slug: 'refactor-evolutions-unitgains-type'
created: '2026-03-25'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['drizzle-orm', 'postgresql', 'typescript', 'vitest', 'tanstack-start', 'zod']
files_to_modify: ['src/db/schema.ts', 'src/db/queries/evolutions.ts', 'src/db/queries/units.ts', 'src/db/queries/matches.ts', 'src/lib/format.ts', 'src/lib/delta-composer.ts', 'src/routes/armies/$armyId.tsx', 'src/components/timeline-entry.tsx', 'src/components/unit-card.tsx']
code_patterns: ['pgEnum', 'db.transaction(async (tx) => ...)', 'non-exported sub-functions with tx param', 'server functions with dynamic import']
test_patterns: ['vitest describe/it/expect', 'regex pattern matching on source code', 'tests in tests/ and src/**/__tests__/']
---

# Tech-Spec: Refactor evolutions.ts — unitGains type enum + transaction decomposition

**Created:** 2026-03-25

## Overview

### Problem Statement

`src/db/queries/evolutions.ts` has three fragile string-based queries (two `LIKE` at lines 243 and 419, plus one exact match on `description = 'Bannière gratuite'` at line 402) that match unit gain types by parsing French description strings. There is no formal source of truth for unit gain types — they are implicit in the text inserted. Additionally, the main transaction `completeEvolutionsWithGainsTransaction` is a 260-line monolith mixing locking, cleanup, ownership checks, inserts, consequence processing, and finalization, making it hard to test and maintain.

### Solution

1. Add a `unit_gain_type` pgEnum and a `type` column on the `unit_gains` table, with a data migration to backfill existing rows.
2. Replace all `LIKE` queries and string-based matching with `eq(unitGains.type, ...)`.
3. Decompose `completeEvolutionsWithGainsTransaction` into focused sub-functions that receive `tx` and orchestrate within a single transaction.

### Scope

**In Scope:**
- Schema migration: pgEnum `unit_gain_type` + `type` column on `unit_gains` + backfill existing data
- Refactor queries in `evolutions.ts` to use `type` instead of `LIKE`/string matching
- Extract sub-functions from the 260-line transaction
- Update `format.ts` to classify gains by `type` instead of description prefix parsing
- Update all `unitGains` inserts to pass the `type` field
- Update `insertUnitGain` in `units.ts` to accept and pass `type`

**Out of Scope:**
- Other small functions in `evolutions.ts` (getMatchParticipant*, incrementUnitXp, etc.)
- `src/db/queries/units.ts` beyond adding `type` to `insertUnitGain`
- API/route changes
- Evolution flow redesign

## Context for Development

### Codebase Patterns

- Drizzle ORM with pgTable/pgEnum definitions in `src/db/schema.ts`
- Queries organized per domain in `src/db/queries/`
- Transactions use `db.transaction(async (tx) => { ... })` with `tx` passed to all operations
- `format.ts` uses prefix matching arrays (`NEGATIVE_CONSEQUENCE_PREFIXES`, `TEMPORARY_CONSEQUENCE_PREFIXES`) for display classification
- Server functions use dynamic `import()` for query modules
- Components consume gain data with `description` field for display + classification
- `ConsequenceEntry` type has 12 consequence types (zod enum in validators.ts); only 8 produce unit_gains — 4 types (`no_effect`, `survivants_endurcis`, `fureur_vengeresse`, `miracule`) don't create gains

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/db/schema.ts:105` | `unitGains` table definition — add enum + type column here |
| `src/db/queries/evolutions.ts` | Main target — 435 lines, transaction + queries |
| `src/db/queries/units.ts:221` | `insertUnitGain` — needs `type` param |
| `src/lib/format.ts` | `isNegativeConsequenceGain`, `isTemporaryConsequenceGain` — migrate to type-based |
| `src/lib/constants.ts:106` | `UNIT_THRESHOLDS` — honour labels (Champion/Bannière) |
| `src/lib/validators.ts:206` | `ConsequenceEntry` zod schema — 12 consequence types |
| `src/routes/armies/$armyId.tsx:187` | `addUnitGainFn` — calls `insertUnitGain`, needs `type` |
| `src/components/timeline-entry.tsx:6` | Imports format.ts classification functions |
| `src/components/unit-card.tsx:7` | Imports format.ts classification functions |
| `src/routes/match/$matchId/post-match.tsx:278` | Calls `completeEvolutionsWithGainsTransaction` directly |
| `src/components/post-match-wizard.tsx:349-350,648-655` | Calls `completeEvolutionsWithGainsFn` (server function wrapper) or delegates via `onCompleteEvolutions` prop — does NOT import the transaction directly |
| `src/db/queries/matches.ts:100-107` | `getTimelineForArmy` — gains query selects only `description`, needs `type` too |
| `src/lib/delta-composer.ts:17-21` | `UnitGain` manual interface — needs `type` field added |
| `docs/xp_rules.md` | Campaign rules — source of truth for gain types |

### Technical Decisions

- **Single enum for gains and malus:** `unit_gain_type` covers both positive gains and negative consequences since they share the same table.
- **`haine` covers both haine and rancune:** Both consequence types (`haine` from character injury, `rancune` from unit destruction) insert the same "Haine — {name}" gain. One enum value suffices.
- **`honour_champion` and `honour_banner` are distinct from `tier_up`:** They have specific deletion mechanics (duel kill / unit destruction) that require targeted queries.
- **`type` classifies the mechanic, not the content:** Free-text descriptions (e.g. player-chosen skills like "Mur de bouclier") remain in `description`. The `type` is determined by the code path that creates the gain, not by parsing the description.
- **Backfill strategy:** The 7 specific types are matched by description pattern; everything else defaults to `tier_up` (the most common type and safest fallback).
- **DB push, not incremental migration:** Schema change applied via `drizzle-kit push` directly. No migration files needed.
- **No E2E tests:** Manual testing by user. Unit tests on extracted sub-functions only.
- **Enum values:**
  - `tier_up` — Stat/skill improvement at a tier threshold (includes free-text skills)
  - `honour_champion` — Free champion (honour de bataille at 3/9 XP)
  - `honour_banner` — Free banner (honour de bataille at 3/9 XP)
  - `death` — Character killed (MHC roll = 2)
  - `haine` — Hatred gained (MHC roll = 11 / destruction roll = 11)
  - `pertes_catastrophiques` — Half strength next battle (destruction roll = 4-6)
  - `deroute_sanglante` — XP loss (destruction roll = 2-3)
  - `banner_lost` — Banner lost on unit destruction

## Implementation Plan

### Tasks

- [x] Task 1: Add `unitGainTypeEnum` pgEnum and `type` column to schema
  - File: `src/db/schema.ts`
  - Action: Define `unitGainTypeEnum` with 8 values (`tier_up`, `honour_champion`, `honour_banner`, `death`, `haine`, `pertes_catastrophiques`, `deroute_sanglante`, `banner_lost`). Add `type` column to `unitGains` table as `unitGainTypeEnum('type').notNull()`.
  - Notes: Push directly via `drizzle-kit push`. Backfill existing rows with SQL before setting NOT NULL — add column nullable first, backfill, then alter to NOT NULL. Backfill mapping:
    - `description LIKE 'Mort%'` → `death`
    - `description LIKE 'Haine%' OR description LIKE 'Rancune%'` → `haine`
    - `description LIKE 'Pertes Catastrophiques%'` → `pertes_catastrophiques`
    - `description LIKE 'Déroute Sanglante%'` → `deroute_sanglante`
    - `description LIKE 'Bannière perdue%'` → `banner_lost`
    - `description = 'Bannière gratuite'` → `honour_banner`
    - `description = 'Champion gratuit'` → `honour_champion`
    - Everything else → `tier_up`

- [x] Task 2: Update `insertUnitGain` to accept and pass `type`
  - File: `src/db/queries/units.ts:221`
  - Action: Add `type` parameter typed as the Drizzle-inferred enum union (`typeof unitGainTypeEnum.enumValues[number]`, i.e. `'tier_up' | 'honour_champion' | 'honour_banner' | 'death' | 'haine' | 'pertes_catastrophiques' | 'deroute_sanglante' | 'banner_lost'`). Pass it in the `.values()` call. Export the union type as `UnitGainType` for reuse.
  - Notes: All call sites must be updated in Tasks 3 and 5. Using the enum union instead of `string` ensures TypeScript catches typos at compile time.

- [x] Task 3: Update `addUnitGainFn` route to pass `type: 'tier_up'`
  - File: `src/routes/armies/$armyId.tsx:187`
  - Action: Pass `'tier_up'` as `type` to `insertUnitGain`. This route is used exclusively for manual admin gain addition via `unit-edit-panel.tsx` (free-text description field). It is always a tier-up gain.
  - Notes: Confirmed — `addUnitGainFn` is only called from `unit-edit-panel.tsx:371` with `{ armyId, unitId, description }`. No honour gains go through this path.

- [x] Task 4: Extract sub-functions from transaction AND add `type` to all inserts
  - File: `src/db/queries/evolutions.ts`
  - Action: Extract the following non-exported sub-functions, each receiving `tx` as first parameter. Simultaneously add the `type` field to every `tx.insert(unitGains)` call (since we're rewriting the inserts anyway):
    1. `lockAndCheckReentry(tx, matchParticipantId, armyId, matchId)` — Lines 188-218: lock participant row, verify latest match on re-entry, undo previous gains/modifiers
    2. `clearTemporaryEffects(tx, armyId)` — Lines 219-246: clear temporary stat modifiers + pertes catastrophiques gains for army units. Replace LIKE with `eq(unitGains.type, 'pertes_catastrophiques')`.
    3. `verifyUnitOwnership(tx, armyId, unitIds)` — Lines 248-263: security check that all submitted unit IDs belong to the army
    4. `insertTierUpGains(tx, gains, matchParticipantId)` — Lines 265-275: insert tier-up gains with `type: 'tier_up'` and thresholdXp
    5. `processConsequences(tx, consequences, matchParticipantId)` — Lines 278-410: switch/case over consequence types. Handles ALL consequence types:
       - `permanent_injury` → insert `statModifiers` (no unit_gain)
       - `grave_injury` → insert `statModifiers` (no unit_gain)
       - `moral_brise` → insert `statModifiers` (no unit_gain)
       - `haine` / `rancune` → insert unit_gain with `type: 'haine'`
       - `death` → insert unit_gain with `type: 'death'` + update unit status
       - `pertes_catastrophiques` → insert unit_gain with `type: 'pertes_catastrophiques'`
       - `deroute_sanglante` → insert unit_gain with `type: 'deroute_sanglante'` + call `handleDerouteTierDown` internally
       - **Post-switch (independent of type):** if `consequence.bannerLost === true`, delete existing banner via `eq(unitGains.type, 'honour_banner')`, insert with `type: 'banner_lost'`. This is NOT a switch case — `bannerLost` is a boolean flag checked after the switch for every consequence.
    6. `handleDerouteTierDown(tx, consequence, matchParticipantId)` — Lines 356-393: called internally by `processConsequences` within the `deroute_sanglante` case — read unit XP, compute pre-match XP, detect lost thresholds, soft-delete gains
    7. `handleChampionKills(tx, championKilledIds)` — Lines 412-422: delete champion gains via `eq(unitGains.type, 'honour_champion')` (replaces LIKE '%Champion%')
    8. `finalizeEvolutions(tx, matchParticipantId, matchType, armyId)` — Lines 424-433: mark evolutions entered + clear needsInitialXp flag
  - Notes: The main function becomes an orchestrator (max 25 lines) calling these 8 sub-functions in sequence within a single `db.transaction()`. `handleDerouteTierDown` is called internally by `processConsequences`, not by the orchestrator directly. All sub-functions stay private (non-exported) in the same file. The `type` is determined by the code path, never by parsing `description`.

- [x] Task 5: Delete dead code `insertUnitGainsTransaction`
  - File: `src/db/queries/evolutions.ts:76-86`
  - Action: Remove `insertUnitGainsTransaction` — confirmed unused (no imports found outside its definition file). Also remove from any barrel re-export if applicable.

- [x] Task 6: Verify all LIKE/string matches are eliminated
  - File: `src/db/queries/evolutions.ts`
  - Action: After Task 4, verify that the 3 original string-based queries are gone (they should have been replaced during sub-function extraction):
    1. Former line 243: `LIKE 'Pertes Catastrophiques%'` → now `eq(unitGains.type, 'pertes_catastrophiques')` in `clearTemporaryEffects`
    2. Former line 419: `LIKE '%Champion%'` → now `eq(unitGains.type, 'honour_champion')` in `handleChampionKills`
    3. Former line 402: `eq(description, 'Bannière gratuite')` → now `eq(unitGains.type, 'honour_banner')` in `processConsequences`
  - Notes: This is a verification step, not a separate code change. Grep for `LIKE` and `description.*Bannière` to confirm zero matches in evolutions.ts.

- [x] Task 7: Migrate `format.ts` to type-based classification
  - File: `src/lib/format.ts`
  - Action: Change `isNegativeConsequenceGain` and `isTemporaryConsequenceGain` signatures to accept `type: string` instead of (or in addition to) `description: string`. Replace prefix matching with set lookups:
    ```typescript
    const NEGATIVE_GAIN_TYPES = new Set(['death', 'banner_lost', 'deroute_sanglante', 'haine'])
    const TEMPORARY_GAIN_TYPES = new Set(['pertes_catastrophiques'])

    export function isNegativeConsequenceGain(type: string): boolean {
      return NEGATIVE_GAIN_TYPES.has(type)
    }
    export function isTemporaryConsequenceGain(type: string): boolean {
      return TEMPORARY_GAIN_TYPES.has(type)
    }
    ```
  - Notes: Remove `NEGATIVE_CONSEQUENCE_PREFIXES` and `TEMPORARY_CONSEQUENCE_PREFIXES` arrays.

- [x] Task 8a: Update `UnitGain` in `delta-composer.ts` and `getTimelineForArmy` in `matches.ts`
  - Files: `src/lib/delta-composer.ts:17-21`, `src/db/queries/matches.ts:100-128`
  - Action:
    1. **`delta-composer.ts`**: Add `type: string` to the manual `UnitGain` interface (currently `{ id, unitId, description }` — this is NOT an inferred type, it must be updated manually).
    2. **`matches.ts:100-107`**: Add `type: unitGains.type` to the gains select query alongside `description`.
    3. **`matches.ts:121-128`**: Change the `gainsMap` from `Map<string, string[]>` to `Map<string, Array<{ description: string; type: string }>>` and push `{ description: row.description, type: row.type }` instead of just `row.description`.
    4. **`matches.ts:79,142`**: Update the `unitXpEntries` type — change `gains: string[]` to `gains: Array<{ description: string; type: string }>`.
    5. **`matches.ts:23` (`TimelineEntryData`)**: Update the type definition to match.
  - Notes: Without this, `timeline-entry.tsx` will have no access to `type` — gains arrive as plain `string[]` currently. `getUnitDeltas` in `units.ts` returns `unitGains.$inferSelect[]` which will automatically include `type` after Task 1, so `unit-card.tsx` is covered via Drizzle inference. But `getTimelineForArmy` hand-picks columns, so it must be updated explicitly.

- [x] Task 8b: Update components to pass `type` to format functions
  - Files: `src/components/timeline-entry.tsx`, `src/components/unit-card.tsx`
  - Action:
    1. **`timeline-entry.tsx:26`**: Update `TimelineEntryProps` — change `gains: string[]` to `gains: Array<{ description: string; type: string }>` in the `unitXpEntries` type.
    2. **`timeline-entry.tsx:368-369`**: Change `isTemporaryConsequenceGain(g)` / `isNegativeConsequenceGain(g)` to `isTemporaryConsequenceGain(g.type)` / `isNegativeConsequenceGain(g.type)`. Update the display to use `g.description` for the label text.
    3. **`unit-card.tsx:301-302`**: Change `isTemporaryConsequenceGain(g.description)` / `isNegativeConsequenceGain(g.description)` to `isTemporaryConsequenceGain(g.type)` / `isNegativeConsequenceGain(g.type)`. The `UnitGain` type from delta-composer will now include `type` (Task 8a).
  - Notes: The two components consume gains differently: `timeline-entry` gets `gains` from `getTimelineForArmy` (hand-picked columns), `unit-card` gets `UnitGain[]` from `getUnitDeltas` (Drizzle inferred). Both paths must carry `type`.

- [x] Task 9: Update existing tests
  - Files: `src/lib/__tests__/format.test.ts`, `tests/4-3-batch-commit-consequences.test.ts`, `tests/2-4-unit-deltas-queries.test.ts`
  - Action:
    - `format.test.ts`: Update test cases to pass `type` string instead of `description` to classification functions
    - `4-3-batch-commit-consequences.test.ts`: Update assertions that check for `type` field in inserts
    - `2-4-unit-deltas-queries.test.ts`: Update `insertUnitGain` call assertions to include `type`
  - Notes: Existing tests that use regex pattern matching on source code may need pattern updates.

- [x] Task 10: Write integration tests via the public transaction function
  - File: `tests/refactor-evolutions-subfunctions.test.ts` (new)
  - Action: Test the extracted sub-functions **indirectly** via `completeEvolutionsWithGainsTransaction` (the public API). Sub-functions are non-exported, so test through the orchestrator with targeted scenarios:
    - Scenario: army with temporary modifiers → call transaction → verify modifiers cleared and pertes_catastrophiques gains soft-deleted (covers `clearTemporaryEffects`)
    - Scenario: submit unit IDs not belonging to army → call transaction → expect FORBIDDEN error (covers `verifyUnitOwnership`)
    - Scenario: each consequence type → call transaction → verify correct `type` field on inserted gains and correct stat modifiers (covers `processConsequences`)
    - Scenario: deroute_sanglante on unit that crossed threshold downward → call transaction → verify threshold gains soft-deleted (covers `handleDerouteTierDown`)
  - Notes: Testing via the public function ensures we test real behavior, not implementation details. The decomposition is for readability, not testability isolation.
  - **DB setup:** These are real DB integration tests (not structural regex tests like most existing tests in `tests/`). Requires:
    - `DATABASE_URL` pointing to a test database (use the same `.env.test` or local dev DB)
    - A `beforeAll` that seeds prerequisite rows: a player, an army, units, a match, and a matchParticipant
    - A `beforeEach` or `afterEach` that cleans up `unitGains`, `statModifiers`, and `matchXpEntries` inserted by the test (use `DELETE WHERE matchParticipantId = ...`)
    - Import `db` from `src/db/index` directly — no mocking
    - Pattern: see existing integration tests in `tests/integration/` for DB connection and cleanup conventions

### Acceptance Criteria

- [x] AC1: Given the `unit_gains` table, when inspected after schema push, then it has a `type` column of enum type `unit_gain_type` with 8 values and NOT NULL constraint.
- [x] AC2: Given existing rows in `unit_gains`, when backfill SQL runs, then every row has a correct `type` value matching its description pattern, with unmatched rows defaulting to `tier_up`.
- [x] AC3: Given a consequence of type `pertes_catastrophiques`, when `clearTemporaryEffects` runs for the army, then the gain is found via `eq(unitGains.type, 'pertes_catastrophiques')` — no LIKE query used.
- [x] AC4: Given a champion killed in a duel, when `handleChampionKills` runs, then the champion gain is found via `eq(unitGains.type, 'honour_champion')` — no LIKE query used.
- [x] AC5: Given a banner lost on unit destruction, when banner loss is processed, then the existing banner is found via `eq(unitGains.type, 'honour_banner')` — no string match on description.
- [x] AC6: Given the `completeEvolutionsWithGainsTransaction` function, when read, then it is an orchestrator of at most 25 lines calling 7 named sub-functions (the 8th, `handleDerouteTierDown`, is called internally by `processConsequences`) — no inline logic blocks > 15 lines.
- [x] AC7: Given any `tx.insert(unitGains)` call in the codebase, when inspected, then it includes a `type` field matching one of the 8 enum values.
- [x] AC8: Given a gain with `type: 'death'`, when `isNegativeConsequenceGain(type)` is called, then it returns `true` — no description parsing.
- [x] AC9: Given a gain with `type: 'pertes_catastrophiques'`, when `isTemporaryConsequenceGain(type)` is called, then it returns `true` — no description parsing.
- [x] AC10: Given the `timeline-entry.tsx` and `unit-card.tsx` components, when rendering gains, then they pass `type` (not `description`) to classification functions.
- [x] AC11: Given `insertUnitGain` in `units.ts`, when called, then it requires a `type` parameter and passes it to the insert.
- [x] AC12: Given the extracted sub-functions, when integration tests run via `completeEvolutionsWithGainsTransaction`, then all pass covering happy path and key edge cases (ownership check, tier-down detection, consequence processing per type).

## Additional Context

### Dependencies

- `drizzle-kit push` for direct DB schema application
- Backfill SQL executed manually against the database before setting NOT NULL
- No new npm packages required

### Testing Strategy

- **Integration tests** on extracted sub-functions via `completeEvolutionsWithGainsTransaction` (public API) — new test file with targeted scenarios per sub-function
- **Update existing tests** in `format.test.ts`, `4-3-batch-commit-consequences.test.ts`, `2-4-unit-deltas-queries.test.ts` to reflect new signatures
- **Manual testing** by user for full end-to-end validation (post-match flow, army view)
- **No E2E tests** in this refactor scope
- **TypeScript compilation** (`pnpm typecheck`) as safety net — any missed `type` parameter will surface as a type error

### Adversarial Review Notes (2026-03-25)

Adversarial review (Opus) found 12 findings. 6 fixed, 6 skipped.

**Fixed:**
- F1/F5: `computeEffectiveStats` now accepts `UnitGain[]` (not `string[]`); `UnitGain.type` is `UnitGainType` in delta-composer.ts
- F2: `insertTierUpGains` uses `resolveHonourType()` + explicit `type: 'tier_up'` for non-honour inserts; constants moved to format.ts
- F3/F8: `scripts/backfill-unit-gain-type.sql` created; schema comment updated
- F7: `TimelineGain.type` is `UnitGainType` in matches.ts

**Skipped (intentional / noise):**
- F4: post-match wizard string matching — out of scope (UI layer, correct domain behavior)
- F6: `clearTemporaryEffects` not setting `clearedByMatchParticipantId` — intentional (pertes_catastrophiques cleared globally at match start, not per-participant)
- F9: rancune→haine mapping in backfill — intentional per spec
- F10: `addUnitGainFn` passes `type: 'tier_up'` — intentional (initial XP setup context)
- F11: performance concern on `clearTemporaryEffects` — noise (small datasets)
- F12: pre-existing nesting issue — out of scope

### Notes

- **High-risk item:** The backfill SQL must be run and verified BEFORE setting the column to NOT NULL. If rows are missed, the ALTER will fail.
- **`insertUnitGainsTransaction` (line 76-86)** — confirmed dead code (no imports found). Delete in Task 5.
- **Two data paths for gains — different fix strategies:**
  - `getUnitDeltas` in `units.ts` returns `unitGains.$inferSelect[]` — Drizzle-inferred, automatically includes `type` after schema change. BUT `unit-card.tsx` consumes `UnitGain` from `delta-composer.ts` which is a manual interface — must be updated (Task 8a).
  - `getTimelineForArmy` in `matches.ts` hand-picks columns and flattens gains to `string[]` — must be updated to select `type` and change the data shape to `{ description, type }[]` (Task 8a). Without this, `timeline-entry.tsx` has no access to `type`.
- **Future consideration (out of scope):** The `ConsequenceEntry` validator in `validators.ts` has a `type` field for consequence types. This is distinct from `unitGainTypeEnum` — consequence types describe what happened (12 values), gain types describe what was recorded (8 values). They should not be conflated.
