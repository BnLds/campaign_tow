---
title: 'Refactor matches.ts into domain-based sub-modules'
slug: 'refactor-matches-queries'
created: '2026-03-25'
status: 'completed'
stepsCompleted: [1, 2, 3, 4, 5]
tech_stack: ['drizzle-orm', 'postgres', 'typescript', 'vitest']
files_to_modify: ['src/db/queries/matches.ts', 'src/db/queries/index.ts', 'tests/helpers/read-queries.ts']
code_patterns: ['barrel re-export', 'drizzle alias joins', 'Map-based grouping', 'file-content contract tests via readAllQueries()']
test_patterns: ['readAllQueries() reads flat .ts from src/db/queries/ — must become recursive', 'contract tests assert code patterns via regex on concatenated source']
---

# Tech-Spec: Refactor matches.ts into domain-based sub-modules

**Created:** 2026-03-25

## Overview

### Problem Statement

`src/db/queries/matches.ts` is a 554-line file containing 20 exports (14 functions, 6 types) that span 5 functional domains (timeline, pending matches, admin, mutations, lookups). The opponent alias join pattern is repeated 3 times with slight variations. The `getTimelineForArmy` function alone is ~145 lines with inline grouping logic (3 Maps) that obscures the query flow.

### Solution

Split `matches.ts` into a `matches/` sub-directory with domain-based modules. Extract timeline grouping helpers as private functions. Maintain the existing barrel re-export chain so no downstream imports break. Update the `readAllQueries()` test helper to recurse into subdirectories.

### Scope

**In Scope:**
- Split `src/db/queries/matches.ts` into 5 domain modules + barrel index
- Extract timeline grouping helpers (`buildGainsMap`, `buildStatChangesMap`, `buildXpEntriesMap`) as private functions in `timeline.ts`
- Preserve all existing public API (types + functions) unchanged
- Keep opponent alias patterns duplicated per-query (intentional — they differ in join type and columns)
- Update `tests/helpers/read-queries.ts` to recurse into subdirectories

**Out of Scope:**
- Changing query logic or SQL behavior
- Refactoring other query files (`armies.ts`, `units.ts`, etc.)
- Adding new features or queries
- Changing the public API surface

## Context for Development

### Codebase Patterns

- All query files live in `src/db/queries/` and are re-exported via `src/db/queries/index.ts`
- Consumers import from `../db/queries` (never from individual files directly)
- Verified: zero direct imports to `queries/matches` — all go through barrel
- Drizzle `alias()` is used for self-joins on `matchParticipants`
- `db.transaction()` pattern used for mutations
- Types are co-located with their query functions
- `MatchType` used by both timeline and admin — lives in `timeline.ts`, imported by `admin.ts`

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/db/queries/matches.ts` | Source file to split (554 lines, 20 exports: 14 fns + 6 types) — **DELETE after split** |
| `src/db/queries/index.ts` | Barrel — change `export * from './matches'` (file) to `export * from './matches'` (directory) |
| `src/db/queries/units.ts` | Dependency: `UnitGainType` type, `getArmyXpAndPointsTotalsBatch` fn (used by timeline) |
| `src/server-fns/admin-matches.ts` | Consumer — no changes needed (imports via barrel) |
| `src/lib/session-queries.ts` | Consumer — no changes needed (imports via barrel) |
| `src/routes/index.tsx` | Consumer — no changes needed (`import type { TimelineEntryData }` via barrel) |
| `tests/helpers/read-queries.ts` | Test helper — **UPDATE to recurse into subdirectories** |
| `src/db/__tests__/queries-match-results.test.ts` | Contract tests — no changes needed (uses `readAllQueries()`) |
| `src/db/__tests__/queries-pending-matches.test.ts` | Contract tests — no changes needed |
| `src/db/__tests__/queries-post-match.test.ts` | Contract tests — no changes needed |

### Technical Decisions

- **No shared opponent join helper**: The 3 variants differ in join type (left vs inner), selected columns, and WHERE conditions. An abstraction would add complexity without reducing it.
- **Private helpers by default**: `buildGainsMap`, `buildStatChangesMap`, `buildXpEntriesMap` are implementation details of `getTimelineForArmy`. If Task 8 (optional unit tests) is done, export them with `@internal` JSDoc and exclude from the barrel. Otherwise keep them unexported.
- **Barrel chain preserved**: `matches/index.ts` → `queries/index.ts` — zero import changes downstream.
- **`MatchType` lives in `timeline.ts`**: Imported by `admin.ts`. No separate `types.ts` for a single 2-value type alias.
- **`invertResult` stays in `mutations.ts`**: Used by `updateMatchResults` and `updateMatchResultOnLatest` only — both in the same module.
- **`readAllQueries()` made recursive**: 16 test files depend on it. Single fix point — use `readdirSync` with `{ recursive: true }` (Node 20+).

## Implementation Plan

### Tasks

- [x] Task 1: Update `tests/helpers/read-queries.ts` to recurse into subdirectories
  - File: `tests/helpers/read-queries.ts`
  - Action: Replace flat `readdirSync(dir).filter(f => f.endsWith('.ts'))` with recursive walk that descends into subdirectories. Use `readdirSync(dir, { recursive: true })` to find all `.ts` files across the directory tree.
  - **Critical (F2):** The current `index.ts` exclusion filter is `f !== 'index.ts'`. With recursive results, paths become `matches/index.ts` — this string does NOT equal `'index.ts'`, so the filter silently passes. Fix: use `path.basename(f) !== 'index.ts'` to exclude `index.ts` at any depth. Do NOT use `!f.endsWith('/index.ts')` — this is non-portable on Windows where paths use `\`.
  - Notes: This MUST be done first — it makes the helper forward-compatible so existing tests keep passing both before and after the split. With the flat directory, behavior is identical (no subdirs to recurse into). After the split, it picks up `matches/*.ts` automatically.

- [x] Task 2: Create `src/db/queries/matches/timeline.ts`
  - File: `src/db/queries/matches/timeline.ts` (new)
  - Action: Move from `matches.ts`:
    - Types: `MatchType`, `TimelineStatChange`, `TimelineGain`, `TimelineEntryData`
    - Functions: `getLatestMatchIdForArmy`, `getTimelineForArmy`
    - Extract 3 private helpers from `getTimelineForArmy` body:
      - `buildGainsMap(gainRows: ...)` — groups `unitGains` rows by `matchParticipantId:unitId` key into `Map<string, TimelineGain[]>`
      - `buildStatChangesMap(statModRows: ...)` — groups `statModifiers` rows by `matchParticipantId:unitId` key into `Map<string, TimelineStatChange[]>`
      - `buildXpEntriesMap(xpRows: ..., gainsMap, statChangesMap)` — groups XP entries by `matchParticipantId`, attaches gains and stat changes, sorts by `UNIT_TYPE_ORDER`. Returns `Map<string, Array<{...}>>`
    - `UNIT_TYPE_ORDER` constant moves into `buildXpEntriesMap` scope (module-level or inside the function)
  - Imports needed: `eq, and, ne, desc, inArray` from `drizzle-orm`; `alias` from `drizzle-orm/pg-core`; `db` from `../../index`; `players, armies, units, matches, matchParticipants, matchXpEntries, statModifiers, unitGains` from `../../schema`; `type UnitGainType` from `../units`; `getArmyXpAndPointsTotalsBatch` from `../units`
  - Notes: The body of `getTimelineForArmy` becomes: main query → batch queries → `buildGainsMap()` → `buildStatChangesMap()` → `buildXpEntriesMap()` → map entries. Much more readable.

- [x] Task 3: Create `src/db/queries/matches/pending.ts`
  - File: `src/db/queries/matches/pending.ts` (new)
  - Action: Move from `matches.ts`:
    - Type: `PendingMatchData`
    - Function: `getPendingMatches`
  - Imports needed: `eq, and, ne, desc, isNull, or` from `drizzle-orm`; `alias` from `drizzle-orm/pg-core`; `db` from `../../index`; `players, armies, matches, matchParticipants` from `../../schema`

- [x] Task 4: Create `src/db/queries/matches/admin.ts`
  - File: `src/db/queries/matches/admin.ts` (new)
  - Action: Move from `matches.ts`:
    - Type: `AdminMatchRow`
    - Functions: `getAllMatchesForAdmin`, `deleteMatchWithXpRollback`
    - Import `MatchType` from `./timeline`
  - Imports needed: `eq, and, ne, desc, inArray, sql` from `drizzle-orm`; `alias` from `drizzle-orm/pg-core`; `db` from `../../index`; `players, matches, matchParticipants, matchXpEntries, units` from `../../schema`; `type MatchType` from `./timeline`

- [x] Task 5: Create `src/db/queries/matches/mutations.ts`
  - File: `src/db/queries/matches/mutations.ts` (new)
  - Action: Move from `matches.ts`:
    - Functions: `createMatchWithParticipants`, `invertResult`, `updateMatchResults`, `createInitialSetupMatch`, `updateMatchResultOnLatest`
  - Imports needed: `eq, and, ne, desc, isNull` from `drizzle-orm`; `db` from `../../index`; `matches, matchParticipants` from `../../schema`
  - Notes: `createInitialSetupMatch` and `getInitialSetupMatchForArmy` (in `lookups.ts`) form a semantic pair (idempotent create + lookup for the "Initial XP entry flow"). They are split across modules because create mutates and lookup reads, but the developer should be aware of the coupling — if the `matchType` filter or join logic changes in one, the other must follow. `updateMatchResultOnLatest` contains an inline latest-match query (lines 528-535 in source) that partially duplicates `getLatestMatchIdForArmy` from `timeline.ts`. This is intentional — it runs inside a `FOR UPDATE` transaction for TOCTOU safety and cannot call the read-only timeline function. Document this coupling with a code comment pointing to `timeline.ts`.

- [x] Task 6: Create `src/db/queries/matches/lookups.ts`
  - File: `src/db/queries/matches/lookups.ts` (new)
  - Action: Move from `matches.ts`:
    - Functions: `getArmyRecord`, `getAllArmyRecords`, `getMatchParticipantByMatchAndPlayer`, `getInitialSetupMatchForArmy`
  - Imports needed: `eq, and, sql` from `drizzle-orm`; `db` from `../../index`; `matches, matchParticipants` from `../../schema`
  - Notes: `getInitialSetupMatchForArmy` is the read-side pair of `createInitialSetupMatch` (in `mutations.ts`) — see Task 5 notes for coupling details.

- [x] Task 7: Delete old file, then create `src/db/queries/matches/index.ts` barrel
  - File: `src/db/queries/matches/index.ts` (new)
  - **Critical (F1) — Transition order:** TypeScript will see duplicate exports if both `matches.ts` and `matches/index.ts` exist simultaneously. The correct sequence is:
    1. **Delete** `src/db/queries/matches.ts` first
    2. **Create** `src/db/queries/matches/index.ts` immediately after
  - Action: Create barrel that re-exports everything:
    ```ts
    export * from './timeline'
    export * from './pending'
    export * from './admin'
    export * from './mutations'
    export * from './lookups'
    ```
  - Notes: `src/db/queries/index.ts` stays unchanged — `export * from './matches'` now resolves to `matches/index.ts` automatically.

- [x] Task 8: (Skipped) (Optional) Add unit tests for extracted timeline helpers
  - File: `src/db/queries/matches/__tests__/timeline-helpers.test.ts` (new)
  - Action: Export the 3 helpers (`buildGainsMap`, `buildStatChangesMap`, `buildXpEntriesMap`) from `timeline.ts` with a `/** @internal — exported for testing only */` JSDoc tag. Test them with synthetic input data. These are pure functions (Array in → Map out) — no DB needed.
  - Notes: **(F3)** Recommended but optional. These helpers were previously tested only indirectly via `getTimelineForArmy`. Explicit tests add a safety net for future refactors. If skipped, do NOT export them — keep them as private functions and document as tech debt. The barrel `matches/index.ts` must NOT re-export `@internal` helpers; consumers still import only public API via the barrel.

- [x] Task 9: Verify TypeScript compilation and run all tests
  - Action: Run `pnpm typecheck` then `pnpm test` to verify zero regressions.
  - Notes: No consumer code should need changes. If any test fails, it's either a missed import or the `readAllQueries()` fix not working correctly.

### Acceptance Criteria

- [x] AC 1: Given the refactoring is complete, when `pnpm typecheck` is run, then zero type errors are reported.
- [x] AC 2: Given the refactoring is complete, when `pnpm test` is run, then all existing tests pass (same count as before refactoring).
- [x] AC 3: Given any consumer file (e.g. `src/server-fns/admin-matches.ts`, `src/lib/session-queries.ts`, `src/routes/index.tsx`), when its import statements are inspected, then zero import paths have changed.
- [x] AC 4: Given `src/db/queries/matches.ts` (the original monolithic file), when the refactoring is complete, then this file no longer exists.
- [x] AC 5: Given `src/db/queries/matches/` directory, when its contents are listed, then it contains exactly 6 files: `index.ts`, `timeline.ts`, `pending.ts`, `admin.ts`, `mutations.ts`, `lookups.ts`.
- [x] AC 6: Given `src/db/queries/matches/timeline.ts`, when its exports are inspected, then `getTimelineForArmy` and `getLatestMatchIdForArmy` are exported. If Task 8 was done, `buildGainsMap`, `buildStatChangesMap`, `buildXpEntriesMap` are exported with `@internal` JSDoc but NOT re-exported from the barrel. If Task 8 was skipped, they are NOT exported at all.
- [x] AC 7: Given `tests/helpers/read-queries.ts`, when it reads `src/db/queries/`, then it includes `.ts` files from subdirectories (e.g. `matches/timeline.ts`), excluding all `index.ts` files at any depth (using `basename` check, not exact string match).
- [x] AC 8: Given a `git diff` on `src/db/queries/index.ts`, when the diff is inspected, then the file content is unchanged (barrel still reads `export * from './matches'`).

## Additional Context

### Dependencies

None — pure file reorganization + helper extraction. No new packages, no schema changes, no migration.

### Testing Strategy

- **Before refactoring:** Run `pnpm test` to establish green baseline. Record test count.
- **After Task 1 (readAllQueries fix):** Run `pnpm test` — should still pass (no behavior change on flat dirs).
- **After Task 7 (all files created, old file deleted):** Run `pnpm typecheck` + `pnpm test`. All tests must pass with identical count.
- **Unit tests for extracted helpers (Task 8, optional):** `buildGainsMap`, `buildStatChangesMap`, `buildXpEntriesMap` are pure functions — test with synthetic data, no DB. Recommended but not blocking.

### Pre-mortem / High-risk items

1. **`readAllQueries()` not picking up subdirectory files** — If the recursive fix is wrong, 16 test files break silently (they'd get a shorter concatenated string, and regex matches that span the old `matches.ts` content would fail). Mitigation: Task 1 is done first and tested independently.
2. **Import path for `MatchType` in `admin.ts`** — `admin.ts` imports `MatchType` from `./timeline` (relative within `matches/`). If the developer accidentally imports from the barrel (`./index` or `..`), it creates a circular dependency. Mitigation: Use direct relative import `./timeline`.
3. **Transition state (F1)** — If both `matches.ts` and `matches/index.ts` exist, TypeScript sees duplicate exports. Mitigation: In Task 7, delete `matches.ts` FIRST, then create `matches/index.ts`. The 5 domain modules (Tasks 2-6) can be created while `matches.ts` still exists because they have no barrel yet — no conflict.
4. **`readAllQueries()` index.ts filter (F2)** — Recursive results use relative paths like `matches/index.ts`, not just `index.ts`. The exclusion filter must use `path.basename()` to match at any depth.

### Notes

- `invertResult` is a pure utility used by both `updateMatchResults` and `updateMatchResultOnLatest` — lives in `mutations.ts` alongside its consumers.
- Types (`MatchType`, `TimelineStatChange`, `TimelineGain`, `TimelineEntryData`, `PendingMatchData`, `AdminMatchRow`) stay co-located with their primary query function.
- Party mode insights: no `types.ts`, YAGNI on shared helpers. Transition order: create domain modules (Tasks 2-6) first while `matches.ts` still exists (no conflict — no barrel yet), then delete `matches.ts` and create barrel (Task 7).
- Follow-up opportunity: add unit tests for the 3 extracted pure helpers in `timeline.ts`.

## Review Notes
- Adversarial review completed (Opus agent)
- Findings: 14 total, 4 fixed (F1, F5, F6, F9), 10 skipped (pre-existing/architectural/noise)
- Resolution approach: auto-fix via Sonnet agents
