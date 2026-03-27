---
title: 'Gate timeline visibility behind initial_xp completion'
slug: 'gate-timeline-initial-xp'
created: '2026-03-27'
status: 'implementation-complete'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['TanStack Start', 'Drizzle ORM', 'PostgreSQL', 'Vitest']
files_to_modify:
  - 'src/db/schema.ts'
  - 'src/db/queries/armies.ts'
  - 'src/db/queries/matches/timeline.ts'
  - 'src/db/queries/evolutions.ts'
  - 'src/routes/index.tsx'
  - 'src/routes/match/$matchId/post-match.tsx'
  - 'tests/initial-xp.test.ts'
  - 'drizzle migration (new)'
code_patterns:
  - 'Drizzle schema + pgTable definitions'
  - 'Server functions via createServerFn + authMiddleware'
  - 'Atomic DB transactions for multi-table updates'
  - 'Dynamic imports in server functions (tree-shaking)'
  - 'router.invalidate for cache busting after mutations'
test_patterns:
  - 'File-contract tests: readFileSync + regex assertions on source code'
  - 'Coupled assertions: regex matching related constructs on same declaration'
---

# Tech-Spec: Gate timeline visibility behind initial_xp completion

**Created:** 2026-03-27

## Overview

### Problem Statement

A player can see matches in their timeline before completing their initial_xp setup. This is inconsistent — the army isn't "ready" yet, so showing matches is premature. Additionally, matches created before initial_xp completion should remain permanently hidden from that player's timeline, even after completion.

### Solution

Replace the `needsInitialXp` boolean with a single `initialXpCompletedAt` (timestamp, nullable) column on `armies` — single source of truth. Filter timeline visibility at the query level:
- If `initialXpCompletedAt IS NULL` → return an empty timeline (no matches visible).
- If `initialXpCompletedAt IS NOT NULL` → only show matches where `matches.date >= initialXpCompletedAt`.
- No changes to match creation, invitations, or the opponent's timeline.

### Scope

**In Scope:**
- Add `initialXpCompletedAt` (timestamp, nullable) column to `armies` table
- Remove `needsInitialXp` boolean column — replaced by `initialXpCompletedAt IS NULL`
- Migrate existing data: `needsInitialXp = false` → `initialXpCompletedAt = armies.createdAt`
- Set `initialXpCompletedAt = NOW()` atomically in the completion transaction
- Set `initialXpCompletedAt = NOW()` in `skipInitialXpFn` (skip = same as complete)
- Modify `getTimelineForArmy` to return empty if `initialXpCompletedAt IS NULL`, else filter `matches.date >= initialXpCompletedAt`
- Refactor all ~17 occurrences of `needsInitialXp` across src/, tests/, e2e/
- Unit tests for the new behavior

**Out of Scope:**
- No changes to match creation or invitation flow
- No impact on the opponent's timeline (opponent sees the match normally)
- No UI changes (timeline simply appears empty or filtered)
- No changes to `getPendingMatches` behavior

## Context for Development

### Codebase Patterns

- **Schema:** Drizzle `pgTable` definitions in `src/db/schema.ts`. Timestamps use `timestamp()` (not `date()`). UUIDs via `crypto.randomUUID()`.
- **Queries:** Domain-organized under `src/db/queries/`. Functions exported directly (no class wrappers). Transactions via `db.transaction(async (tx) => { ... })`.
- **Server functions:** `createServerFn({ method })` with `.middleware([authMiddleware]).handler(...)`. Dynamic imports for tree-shaking (`await import('../db/queries')`).
- **Mutations:** Atomic multi-table updates inside transactions. Pattern: guard → clear effects → verify ownership → apply changes → finalize.
- **Tests:** File-contract tests reading source via `readFileSync` + regex. Coupled assertions (regex matching related constructs on same declaration).
- **State refresh:** `router.invalidate({ filter: (d) => d.routeId === '/' })` + `router.navigate({ to: '/' })` after post-match completion.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/db/schema.ts:51-61` | `armies` table — remove `needsInitialXp`, add `initialXpCompletedAt` |
| `src/db/queries/armies.ts:115-138` | `getPlayerArmy` — return type + select: replace `needsInitialXp` with `initialXpCompletedAt` |
| `src/db/queries/matches/timeline.ts:98-212` | `getTimelineForArmy` — add `initialXpCompletedAt` param, early return if null, add `gte(matches.date, initialXpCompletedAt)` filter |
| `src/db/queries/evolutions.ts:447-462` | `finalizeEvolutions` — set `initialXpCompletedAt: new Date()` instead of `needsInitialXp: false` |
| `src/routes/index.tsx:76-105` | `skipInitialXpFn` — set `initialXpCompletedAt: new Date()` instead of `needsInitialXp: false` |
| `src/routes/index.tsx:107-133` | `loadCampaignTimelineFn` — replace `army?.needsInitialXp` with `!army?.initialXpCompletedAt`, pass timestamp to `getTimelineForArmy` |
| `src/routes/index.tsx:178-191` | `useEffect` auto-create — replace `army?.needsInitialXp` with `!army?.initialXpCompletedAt` |
| `src/routes/index.tsx:311-318` | `handleEvolutionStart` — replace `army?.needsInitialXp` with `!army?.initialXpCompletedAt` |
| `src/db/queries/matches/timeline.ts:38-46` | `getLatestMatchIdForArmy` — add `initialXpCompletedAt` param, early return null if null, add `gte(matches.date, initialXpCompletedAt)` filter |
| `src/routes/match/$matchId/post-match.tsx:92,331` | Callers of `getLatestMatchIdForArmy` — pass `army.initialXpCompletedAt` |
| `tests/initial-xp.test.ts` | Update all assertions referencing `needsInitialXp` to `initialXpCompletedAt` |

### Technical Decisions

- **Single source of truth:** `initialXpCompletedAt` replaces `needsInitialXp`. `NULL` = needs initial XP, `NOT NULL` = ready. Eliminates desynchronization risk.
- `initialXpCompletedAt` uses `timestamp()` (without timezone), consistent with `matches.date` and `armies.createdAt`. All timestamps in the schema use the same type — no timezone mismatch risk.
- The timestamp is set atomically in the same transaction as evolution completion.
- Matches created before completion are permanently hidden — not deleted, just filtered out at query time.
- **`gte` (>=) comparison:** The filter uses `gte(matches.date, initialXpCompletedAt)` — greater than or equal. A match created at the exact completion timestamp is considered post-completion. The `initial_setup` match always has `date < initialXpCompletedAt` since the match is created before completion, so it is correctly excluded.
- Skip initial XP sets `initialXpCompletedAt = NOW()` — same semantic as completing.
- Timeline refresh after completion is already handled by `router.invalidate` in `post-match.tsx`.
- `getTimelineForArmy` receives `initialXpCompletedAt` as a second parameter (caller already has the army object — avoids redundant DB join).
- **Data migration trade-off:** For existing armies that already completed initial XP, the migration sets `initialXpCompletedAt = created_at`. This is a best-effort approximation — in practice, initial XP is completed before any regular match is played, so no match is incorrectly shown or hidden.
- **Caller inventory (verified):** `getTimelineForArmy` has 1 caller (`loadCampaignTimelineFn` in `index.tsx:119`). `getLatestMatchIdForArmy` has 2 callers (`loadPostMatchDataFn` at `post-match.tsx:92`, `completeEvolutionsWithGainsFn` at `post-match.tsx:331`).
- **`getPendingMatches` not impacted:** `getPendingMatches` filters by `matchType !== 'initial_setup'` and pending result/evolutions state — it does not filter by date. No changes needed: pending matches are actionable regardless of timeline visibility.

## Implementation Plan

### Implementation Phases

> **Phase A** (Tasks 1, 3-8): Schema definition + all code references updated atomically. TypeScript compiles cleanly after this phase.
> **Phase B** (Task 2): Generate and run Drizzle migration to align the database.
> **Phase C** (Tasks 9-10): Update file-contract tests.

### Tasks

- [x] **Task 1: Schema — replace `needsInitialXp` with `initialXpCompletedAt`**
  - File: `src/db/schema.ts`
  - Action: In the `armies` pgTable definition (line 56), remove `needsInitialXp: boolean('needs_initial_xp').notNull().default(true)` and add `initialXpCompletedAt: timestamp('initial_xp_completed_at')` (nullable, no default).

- [x] **Task 2: Drizzle migration**
  - File: New migration file via `pnpm drizzle-kit generate`
  - Action: Generate migration, then manually edit the SQL to ensure correct data migration order:
    1. `ALTER TABLE armies ADD COLUMN initial_xp_completed_at TIMESTAMP;`
    2. `UPDATE armies SET initial_xp_completed_at = created_at WHERE needs_initial_xp = false;`
    3. `ALTER TABLE armies DROP COLUMN needs_initial_xp;`
  - Notes: Single migration file — no zero-downtime constraint. Run after Phase A (all code references updated).

- [x] **Task 3: Query — update `getPlayerArmy` return type and select**
  - File: `src/db/queries/armies.ts`
  - Action:
    - In the return type (line 121), replace `needsInitialXp: boolean` with `initialXpCompletedAt: Date | null`.
    - In the select (line 130), replace `needsInitialXp: armies.needsInitialXp` with `initialXpCompletedAt: armies.initialXpCompletedAt`.

- [x] **Task 4: Query — update `getTimelineForArmy` signature and add filtering**
  - File: `src/db/queries/matches/timeline.ts`
  - Action:
    - Change signature from `getTimelineForArmy(armyId: string)` to `getTimelineForArmy(armyId: string, initialXpCompletedAt: Date | null)`.
    - At the top of the function body, add early return: `if (!initialXpCompletedAt) return []`.
    - In the `.where()` clause (line 121), add `gte(matches.date, initialXpCompletedAt)` condition alongside the existing `eq(matchParticipants.armyId, armyId)`. Use `and()` to combine both conditions.
    - Add `gte` to the drizzle-orm import (line 1).

- [x] **Task 5: Query — update `finalizeEvolutions` to set `initialXpCompletedAt`**
  - File: `src/db/queries/evolutions.ts`
  - Action: In `finalizeEvolutions` (line 458-461), replace `.set({ needsInitialXp: false })` with `.set({ initialXpCompletedAt: new Date() })`.

- [x] **Task 6: Server function — update `skipInitialXpFn`**
  - File: `src/routes/index.tsx`
  - Action: In `skipInitialXpFn` (line 94), replace `.set({ needsInitialXp: false })` with `.set({ initialXpCompletedAt: new Date() })`. Update the schema import if needed (import `armies` table reference).

- [x] **Task 7: Server function — update `loadCampaignTimelineFn`**
  - File: `src/routes/index.tsx`
  - Action:
    - Line 123: Replace `army?.needsInitialXp ? getInitialSetupMatchForArmy(army.id) : Promise.resolve(null)` with `!army?.initialXpCompletedAt ? getInitialSetupMatchForArmy(army.id) : Promise.resolve(null)`.
    - Line 122: Pass `initialXpCompletedAt` to `getTimelineForArmy`: change `getTimelineForArmy(army.id)` to `getTimelineForArmy(army.id, army.initialXpCompletedAt)`.

- [x] **Task 8: Component — update `CampaignView` references + `getLatestMatchIdForArmy` callers**
  - File: `src/routes/index.tsx` + `src/routes/match/$matchId/post-match.tsx`
  - Action:
    - `index.tsx` line 182 (`useEffect`): Replace `army?.needsInitialXp` with `!army?.initialXpCompletedAt`. Note the logic inversion: `needsInitialXp` was truthy when needed, `initialXpCompletedAt` is falsy (null) when needed.
    - `index.tsx` line 313 (`handleEvolutionStart`): Replace `army?.needsInitialXp` with `!army?.initialXpCompletedAt`.
    - `src/db/queries/matches/timeline.ts`: Change `getLatestMatchIdForArmy(armyId: string)` to `getLatestMatchIdForArmy(armyId: string, initialXpCompletedAt: Date | null)`. Add early return `if (!initialXpCompletedAt) return null`. Add `gte(matches.date, initialXpCompletedAt)` to `.where()` clause. The early return `null` path is unreachable in current callers (both are guarded by `evolutionsEnteredAt !== null`, which implies initial XP is already completed). The guard exists for API safety.
    - `post-match.tsx` line 92 (`loadPostMatchDataFn`): Change `getLatestMatchIdForArmy(army.id)` to `getLatestMatchIdForArmy(army.id, army.initialXpCompletedAt)`.
    - `post-match.tsx` line 331 (`completeEvolutionsWithGainsFn`): Same change — `getLatestMatchIdForArmy(army.id, army.initialXpCompletedAt)`.

- [x] **Task 9: Tests — update file-contract tests**
  - File: `tests/initial-xp.test.ts`
  - Action:
    - `[INIT-SCH-003]`: Replace assertion to verify `initialXpCompletedAt` timestamp column exists (instead of `needsInitialXp` boolean).
    - `[INIT-EVO-002]`: Replace assertion to verify `initialXpCompletedAt` is set when matchType is `initial_setup` (instead of `needsInitialXp`).
    - `[INIT-SFN-004]`: Replace assertion to verify `skipInitialXpFn` sets `initialXpCompletedAt` (instead of `needsInitialXp: false`).
    - Add new test `[INIT-TL-001]`: Verify `getTimelineForArmy` accepts `initialXpCompletedAt` parameter.
    - Add new test `[INIT-TL-002]`: Verify `getTimelineForArmy` returns early `[]` when `initialXpCompletedAt` is null/falsy.
    - Add new test `[INIT-TL-003]`: Verify `getTimelineForArmy` filters `matches.date` using `gte` with `initialXpCompletedAt`.
    - Add new test `[INIT-TL-004]`: Verify `getLatestMatchIdForArmy` accepts `initialXpCompletedAt` parameter.
    - Add new test `[INIT-TL-005]`: Verify `getLatestMatchIdForArmy` returns `null` when `initialXpCompletedAt` is null/falsy.
    - Add new test `[INIT-TL-006]`: Verify `getLatestMatchIdForArmy` filters `matches.date` using `gte` with `initialXpCompletedAt`.
    - Add new test `[INIT-TL-007]`: Verify `getTimelineForArmy` WHERE clause only references `matchParticipants.armyId` (the caller's army), not the opponent's `initialXpCompletedAt` — confirms AC 5 by design.

- [x] **Task 10: Tests — integration tests for timeline gating behavior**
  - File: `tests/initial-xp.test.ts`
  - Action:
    - Add new test `[INIT-TL-INT-001]`: Call `getTimelineForArmy(armyId, null)` against a test database with seeded matches → assert returns `[]`.
    - Add new test `[INIT-TL-INT-002]`: Call `getTimelineForArmy(armyId, completedAt)` with matches before and after `completedAt` → assert only post-completion matches are returned.
  - Notes: File-contract tests verify code structure but not runtime behavior. These integration tests hit the real database to confirm the gating logic works end-to-end.

### Acceptance Criteria

- [x] **AC 1:** Given an army with `initialXpCompletedAt IS NULL`, when `getTimelineForArmy` is called, then it returns an empty array `[]` regardless of how many matches exist for that army.

- [x] **AC 2:** Given an army with `initialXpCompletedAt = '2026-03-25T15:00:00Z'` and two matches (one with `date = '2026-03-25T10:00:00Z'`, one with `date = '2026-03-26T14:00:00Z'`), when `getTimelineForArmy` is called, then only the match dated `2026-03-26` is returned (the one before completion is permanently hidden). A match with `date = initialXpCompletedAt` exactly is considered post-completion (>=).

- [x] **AC 3:** Given a player completing the initial_xp flow (via `completeEvolutionsWithGainsTransaction` with `matchType = 'initial_setup'`), when the transaction commits, then `armies.initialXpCompletedAt` is set to the current timestamp and is NOT NULL.

- [x] **AC 4:** Given a player using `skipInitialXpFn`, when the skip completes, then `armies.initialXpCompletedAt` is set to the current timestamp and is NOT NULL.

- [x] **AC 5:** Given player A has `initialXpCompletedAt IS NULL` and is a participant in a match with player B, when player B calls `getTimelineForArmy` for their own army (which has `initialXpCompletedAt IS NOT NULL`), then player B sees the match normally in their timeline (no impact from player A's state). Verified by design: the query filters on `matchParticipants.armyId` only, never on the opponent's `initialXpCompletedAt`. Covered by file-contract test `[INIT-TL-007]`.

- [x] **AC 6:** Given the `needsInitialXp` column no longer exists in the schema, when the codebase is searched for `needsInitialXp`, then zero occurrences are found in `src/` (complete removal).

- [x] **AC 7:** Given existing armies in the database with `needsInitialXp = false`, when the migration runs, then those armies have `initialXpCompletedAt` set to their `created_at` value (data preserved).

- [x] **AC 8:** Given existing armies with `needsInitialXp = true`, when the migration runs, then those armies have `initialXpCompletedAt = NULL`.

- [x] **AC 9:** Given an army with `initialXpCompletedAt` set and a match dated before that timestamp, when `getLatestMatchIdForArmy` is called, then the pre-completion match is excluded and the function returns the latest post-completion match (or `null` if no post-completion match exists).

- [x] **AC 10:** Given an army with `initialXpCompletedAt IS NULL`, when `getLatestMatchIdForArmy` is called, then it returns `null` (no match can be considered "latest" before initial XP completion).

## Additional Context

### Dependencies

- Drizzle migration required (single migration file with 3 SQL statements).
- No new npm dependencies.
- No external service dependencies.

### Testing Strategy

- **File-contract tests** (`tests/initial-xp.test.ts`):
  - Update 3 existing assertions (`INIT-SCH-003`, `INIT-EVO-002`, `INIT-SFN-004`) to reference `initialXpCompletedAt`.
  - Add 7 new file-contract assertions (`INIT-TL-001/002/003` for `getTimelineForArmy`, `INIT-TL-004/005/006` for `getLatestMatchIdForArmy`, `INIT-TL-007` for opponent isolation).
- **Integration tests** (`tests/initial-xp.test.ts`):
  - `INIT-TL-INT-001`: `getTimelineForArmy(armyId, null)` returns `[]` against real DB.
  - `INIT-TL-INT-002`: `getTimelineForArmy(armyId, completedAt)` returns only post-completion matches.
  - These complement file-contract tests by verifying runtime behavior, not just source code structure.
- **Manual verification**:
  - Create army → verify timeline is empty.
  - Complete initial_xp → verify timeline shows only post-completion matches.
  - Skip initial_xp → verify same behavior as completing.
  - Check opponent's timeline is unaffected.

### Notes

- **Logic inversion**: `needsInitialXp` was `true` when the army needed setup. `initialXpCompletedAt` is `null` when the army needs setup. All boolean checks must be inverted: `army?.needsInitialXp` → `!army?.initialXpCompletedAt`.
- **Migration safety**: The `UPDATE ... SET initial_xp_completed_at = created_at WHERE needs_initial_xp = false` must run BEFORE the `DROP COLUMN needs_initial_xp`. The generated Drizzle migration may need manual reordering.
- **`getLatestMatchIdForArmy` alignment**: This function is used by the re-entry guard and chronological ordering guard in `post-match.tsx`. It must filter by `initialXpCompletedAt` to stay aligned with the timeline — otherwise a hidden pre-completion match could be considered the "latest" and block the player from completing reports on visible matches.
