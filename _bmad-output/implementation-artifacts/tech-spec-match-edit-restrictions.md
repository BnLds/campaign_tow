---
title: 'Match Edit Restrictions & Post-Match Re-entry'
slug: 'match-edit-restrictions'
created: '2026-03-23'
updated: '2026-03-23'
status: 'implementation-complete'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['TanStack Start', 'React', 'Drizzle ORM (PostgreSQL)', 'Zod']
files_to_modify:
  - 'src/routes/index.tsx'
  - 'src/components/timeline-entry.tsx'
  - 'src/db/queries/matches.ts'
  - 'src/routes/match/$matchId/post-match.tsx'
  - 'src/db/queries/evolutions.ts'
  - 'src/lib/validators.ts'
code_patterns: ['createServerFn + middleware chain', 'ServerResult<T> return type', 'db.transaction for atomic operations', 'getTimelineForArmy query']
test_patterns: ['tests/server-fns/ for server function unit tests', 'e2e/ for Playwright flows']
---

# Tech-Spec: Match Edit Restrictions & Post-Match Re-entry

**Created:** 2026-03-23
**Updated:** 2026-03-23 (post adversarial review)

## Overview

### Problem Statement

Currently, the "Modifier" button on TimelineEntry is shown on ALL matches for any authenticated player with an army (`isEditable = !isGuest && army !== null`). This means:

1. **Result is always editable** -- even on old matches where post-match has been completed, which risks cascade effects (XP thresholds, tier-ups, improvements chosen based on previous XP state).
2. **Post-match cannot be re-entered** -- once `evolutionsEnteredAt` is set, the post-match flow is permanently locked. If a player made a mistake (wrong XP, wrong injury, wrong improvement), there is no correction mechanism.

### Solution

Restrict editing to the player's **latest match per army**. Determine "latest" per army (armies are independent -- no cross-army cascade). Three cases:

| Case | Condition | Allowed action |
|------|-----------|---------------|
| 1 | Match has no post-match (`evolutionsEnteredAt IS NULL`) | Edit result (existing behavior) |
| 2 | Match is the army's latest AND has post-match | Edit result + re-enter post-match (pre-filled) |
| 3 | Older match with post-match | Read-only -- "Modifier" hidden |

For case 2, re-entering post-match uses an **atomic overwrite** strategy: the existing post-match data (gains, consequences, stat modifiers) stays intact while the player fills the wizard. The old data is only deleted and replaced when the player commits the new post-match flow. This prevents data loss if the player abandons the wizard mid-way.

### Scope

**In Scope:**
- Per-match `isEditable` logic based on match ordering
- `isLatestMatch` flag from query (single source of truth, shared by query and server guard)
- "Modifier" button hidden on old completed matches (case 3)
- "Modifier" on latest completed match: opens result editing + shows "Modifier le rapport" button
- Atomic overwrite of post-match data on re-entry commit (delete old + write new in one transaction)
- Post-match wizard receives pre-filled XP values when re-entering
- Custom confirmation modal before navigating to post-match re-entry
- XP non-negativity guard (`units.xp >= 0`) in subtraction logic
- `SELECT FOR UPDATE` on matchParticipant row to prevent concurrent re-entry commits
- Result re-editing on latest match (lift `isNull(result)` guard for latest match)

**Out of Scope:**
- Cascade recalculation for older matches
- Edit history / audit trail
- Editing matches that are not the army's latest

## Context for Development

### Codebase Patterns

- **Server functions**: `createServerFn({ method: 'POST' }).middleware([authMiddleware]).inputValidator(zodSchema).handler(async ({ context, data }) => ServerResult<T>)`
- **DB transactions**: `db.transaction(async (tx) => { ... })` -- all related operations atomic
- **Timeline query**: `getTimelineForArmy(armyId)` in `src/db/queries/matches.ts` -- returns `TimelineEntryData[]` ordered by date DESC
- **Post-match batch commit**: `completeEvolutionsWithGainsTransaction` writes gains, stat modifiers, clears temporaries, sets `evolutionsEnteredAt`
- **Cache invalidation**: `router.invalidate()` after mutations

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/routes/index.tsx` | Campaign view -- renders timeline, determines `isEditable`, handles result submission |
| `src/components/timeline-entry.tsx` | TimelineEntry component -- "Modifier" button, result selection, "Au rapport !" button |
| `src/db/queries/matches.ts` | `getTimelineForArmy()` -- timeline query, returns `hasEvolutions` per match |
| `src/routes/match/$matchId/post-match.tsx` | Post-match route -- loader, XP submission, batch commit server fns |
| `src/db/queries/evolutions.ts` | `completeEvolutionsWithGainsTransaction()` -- writes all post-match data |
| `src/lib/validators.ts` | Zod schemas for server function inputs |
| `src/lib/middleware.ts` | `authMiddleware` -- session check |
| `src/components/post-match-wizard.tsx` | PostMatchWizard -- multi-step wizard component |

### Technical Decisions

- **"Latest match" = latest by `matches.date` DESC, then `matches.createdAt` DESC** -- same ordering as `getTimelineForArmy`. Computed once in a shared helper `isLatestMatchForArmy(armyId, matchId)` used by both the timeline query and the server-side guard. Single source of truth.
- **Atomic overwrite (not destructive pre-reset)**: Old post-match data is NOT deleted before the wizard opens. It is deleted and replaced atomically when the player commits the new post-match flow via `completeEvolutionsWithGainsTransaction`. If the player abandons the wizard, the original data is untouched.
- **Pre-fill XP only**: The wizard is pre-filled with XP values from `matchXpEntries`. Tier-up choices and consequences are NOT pre-filled (they will be overwritten on commit). The player must redo those steps.
- **Confirmation required**: A custom modal component (not `window.confirm`) is shown before navigating to post-match re-entry. This prevents accidental entry and works reliably on mobile/PWA.
- **"Modifier" opens result editing + "Modifier le rapport" button**: On the latest completed match, clicking "Modifier" opens result selection (same as today) AND shows a "Modifier le dernier rapport" button below. This gives the player both options with clear, distinct actions.
- **XP non-negativity**: The overwrite transaction clamps XP to 0 if subtraction would go negative (`GREATEST(units.xp - xpGained, 0)`).
- **Concurrency safety**: The overwrite transaction uses `SELECT ... FOR UPDATE` on the `matchParticipants` row to serialize concurrent commits on the same participant.

### Key Architectural Change: Atomic Overwrite vs Destructive Reset

The original design called for a separate `resetPostMatchFn` that would destructively delete data before reopening the wizard. This was replaced with an atomic overwrite for the following reasons:

1. **No data loss on abandon**: If the player opens the wizard but never completes it (closes tab, loses connection), the original post-match data remains intact.
2. **No race condition**: Since old data persists until commit, creating a new match during re-entry doesn't orphan XP.
3. **Simpler flow**: No separate reset server function needed. The commit function handles both first-entry and re-entry.
4. **`submitUnitXpFn` already handles re-entry**: The upsert+delta mechanism correctly adjusts XP whether it's a first entry or an update.

## Implementation Plan

### Tasks

**Task 1: Shared `isLatestMatchForArmy` helper + timeline flag**
- File: `src/db/queries/matches.ts`
- Add helper function:
  ```ts
  export async function getLatestMatchIdForArmy(armyId: string): Promise<string | null> {
    // SELECT mp.matchId FROM matchParticipants mp
    // JOIN matches m ON mp.matchId = m.id
    // WHERE mp.armyId = armyId
    // ORDER BY m.date DESC, m.createdAt DESC LIMIT 1
  }
  ```
- In `getTimelineForArmy()`, call `getLatestMatchIdForArmy(armyId)` and use the result to set `isLatestMatch: entry.matchId === latestMatchId` on each entry.
- Add `isLatestMatch: boolean` to `TimelineEntryData` type.
- This helper is reused by the server-side guard in Task 2 -- **single source of truth**.

**Task 2: Update `completeEvolutionsWithGainsTransaction` for re-entry (atomic overwrite)**
- File: `src/db/queries/evolutions.ts`
- Add a `reentry?: boolean` parameter to `completeEvolutionsWithGainsTransaction`.
- When `reentry === true`, at the start of the transaction (before writing new data):
  1. `SELECT ... FOR UPDATE` on `matchParticipants` row (serialize concurrent commits)
  2. Load all `matchXpEntries` for this participant
  3. For each entry, subtract `xpGained` from `units.xp` clamped to 0: `SET xp = GREATEST(xp - $xpGained, 0)`
  4. Delete all `unitGains` where `matchParticipantId = participant.id`
  5. Delete all `statModifiers` where `matchParticipantId = participant.id`
  6. Delete all `matchXpEntries` where `matchParticipantId = participant.id`
- Then proceed with normal flow (clear temporaries, insert gains, insert consequences, set `evolutionsEnteredAt`).
- The XP entries from the new wizard have already been written by `submitUnitXpFn` during the wizard steps, so new `matchXpEntries` exist by the time commit runs.

**Important**: Step 6 (delete matchXpEntries) + the fact that `submitUnitXpFn` writes new entries during the wizard means the new entries replace the old ones. The upsert in `submitUnitXpFn` handles this correctly -- if a new entry was already upserted during the wizard, deleting the old row in the overwrite transaction would delete the new one too. **Solution**: the overwrite deletes entries THEN `completeEvolutionsWithGainsTransaction` re-inserts from the current `submitUnitXpFn` upserts. Wait -- this won't work because `submitUnitXpFn` already wrote during the wizard. Let me revise:

**Revised approach for XP in overwrite transaction**:
  1. Load current `matchXpEntries` for this participant (these are the NEW values -- `submitUnitXpFn` already upserted them during the wizard)
  2. Compute the net XP delta per unit: `newXpGained - oldXpGained`. But we don't have `oldXpGained` anymore because upsert overwrote it.

**Better approach**: `submitUnitXpFn` already handles the delta correctly via its existing upsert mechanism:
  - When the wizard opens in re-entry, `previousXpGained` in the upsert returns the old value
  - The delta `newXp - previousXp` is applied to `units.xp` immediately
  - So by the time the commit runs, `units.xp` is already correct for XP

Therefore, the overwrite transaction only needs to:
  1. `SELECT ... FOR UPDATE` on `matchParticipants` row
  2. Delete all `unitGains` where `matchParticipantId = participant.id`
  3. Delete all `statModifiers` where `matchParticipantId = participant.id`
  4. Proceed with normal flow (clear temporaries, insert new gains/consequences, set `evolutionsEnteredAt`)

No XP subtraction/re-addition needed in the overwrite -- `submitUnitXpFn` already handled it incrementally.

- File: `src/routes/match/$matchId/post-match.tsx`
  - Update `completeEvolutionsWithGainsFn`:
    - Remove the idempotent early return `if (participant.evolutionsEnteredAt !== null) return success`
    - Replace with: if `evolutionsEnteredAt !== null`, verify this is the army's latest match via `getLatestMatchIdForArmy(army.id)`. If not latest, return error.
    - Pass `reentry: true` to `completeEvolutionsWithGainsTransaction` when `evolutionsEnteredAt !== null`.

**Task 3: Wrap `submitUnitXpFn` upsert + increment in a single transaction**
- File: `src/db/queries/evolutions.ts`
- Create `upsertMatchXpEntryWithIncrement(matchParticipantId, unitId, xpGained)` that wraps both `upsertMatchXpEntry` and `incrementUnitXp` in a single `db.transaction`. This prevents inconsistency if a crash occurs between the two operations.
- File: `src/routes/match/$matchId/post-match.tsx`
  - Update `submitUnitXpFn` to call the new atomic function.

**Task 4: Update post-match loader for re-entry mode**
- File: `src/routes/match/$matchId/post-match.tsx`
- In `loadPostMatchDataFn`: currently returns `alreadyCompleted: true` when `evolutionsEnteredAt !== null`.
- Change: if `evolutionsEnteredAt !== null` AND this is the army's latest match (via `getLatestMatchIdForArmy`), load full unit data with pre-filled XP values (same as normal entry mode). Set `reentry: true` in the response.
- If `evolutionsEnteredAt !== null` AND NOT latest, keep `alreadyCompleted: true`.
- Add `reentry: boolean` to `PostMatchLoaderData` type.

**Task 5: Update `isEditable` logic in campaign view**
- File: `src/routes/index.tsx`
- Change from: `isEditable={!isGuest && army !== null}` (same for all entries)
- Change to: per-entry logic:
  ```tsx
  isEditable={!isGuest && army !== null && (
    !entry.hasEvolutions || entry.isLatestMatch
  )}
  ```
  - `!entry.hasEvolutions`: match without post-match -> result always editable (case 1)
  - `entry.isLatestMatch`: latest match -> editable even if post-match done (case 2)
  - All other completed matches: `isEditable = false` -> "Modifier" hidden (case 3)

**Task 6: Update TimelineEntry for post-match re-entry button**
- File: `src/components/timeline-entry.tsx`
- Add new props:
  - `isLatestMatch?: boolean`
  - `onPostMatchReentry?: (matchId: string) => void`
- When `isEditable && result !== null && hasEvolutions && isLatestMatch`:
  - "Modifier" button opens result selection (existing behavior, unchanged)
  - Show a **separate** "Modifier le dernier rapport" button below result selection, styled distinctly (e.g., outline style, or secondary action). Clicking it calls `onPostMatchReentry(matchId)`.
- When `isEditable && result !== null && !hasEvolutions`:
  - Keep existing behavior: "Modifier" opens result selection + "Au rapport !" button.
- This gives two clearly distinct actions: result editing vs. post-match re-entry.

**Task 7: Allow result re-editing on latest match**
- File: `src/db/queries/matches.ts`
- `updateMatchResults` currently has guard `isNull(matchParticipants.result)` which prevents updating a result that's already set.
- Add a new function `updateMatchResultOnLatest(matchId, playerId, newResult)`:
  - Verifies this is the army's latest match via `getLatestMatchIdForArmy`
  - Updates result WITHOUT the `isNull(result)` guard
  - Also updates opponent's result (inverted)
- File: `src/routes/index.tsx`
  - Update `submitMatchResultFn` to use `updateMatchResultOnLatest` when the match already has a result, and `updateMatchResults` for first-time entry.

**Task 8: Wire confirmation modal + navigation in campaign view**
- File: `src/routes/index.tsx`
- Add a custom confirmation modal component (not `window.confirm`):
  - Message: "Modifier le rapport de cette partie ? Les ameliorations et consequences devront etre re-saisies. Les XP seront pre-remplis."
  - Two buttons: "Confirmer" / "Annuler"
- Add `handlePostMatchReentry(matchId)` callback:
  1. Show confirmation modal
  2. If confirmed: `router.navigate({ to: '/match/$matchId/post-match', params: { matchId } })`
  3. No server call needed before navigation (no destructive reset)
- Pass `onPostMatchReentry={handlePostMatchReentry}` and `isLatestMatch={entry.isLatestMatch}` to each TimelineEntry

### Acceptance Criteria

**AC1: Old completed matches are read-only**
- Given a player with 3 completed matches (all with post-match done)
- When the campaign view renders
- Then "Modifier" is visible ONLY on the latest match (first in timeline)
- And "Modifier" is NOT visible on the 2nd and 3rd matches

**AC2: Match without post-match remains editable (any position)**
- Given a player's 2nd-latest match where `evolutionsEnteredAt IS NULL` and result is set
- When the campaign view renders
- Then "Modifier" is visible (result can be changed)

**AC3: Post-match re-entry confirmation**
- Given the player's latest match with post-match completed
- When the player taps "Modifier le dernier rapport"
- Then a confirmation modal appears warning about re-entry
- And no data is modified until the player confirms
- And the modal is a custom component (not `window.confirm`)

**AC4: Atomic overwrite deletes old gains and consequences on commit**
- Given a re-entry post-match commit on the latest match
- When `completeEvolutionsWithGainsFn` executes with `reentry: true`
- Then all old `unitGains` for this `matchParticipantId` are deleted
- And all old `statModifiers` for this `matchParticipantId` are deleted
- And new gains/consequences/stat modifiers from the wizard are written
- And `matchParticipants.evolutionsEnteredAt` is updated

**AC5: Pre-filled XP on re-entry**
- Given a post-match re-entry on the latest match
- When the post-match wizard loads
- Then each unit shows its previous XP value pre-filled
- And the player can modify XP values before proceeding

**AC6: Full re-entry flow works end-to-end**
- Given the player confirms re-entry and navigates to post-match
- When the player completes the wizard again (XP, consequences, tier-ups)
- Then new gains/consequences/stat modifiers are written (replacing old ones)
- And `evolutionsEnteredAt` is updated
- And the timeline reflects the updated data

**AC7: Overwrite is atomic**
- Given an overwrite transaction
- When any step fails (e.g., constraint violation)
- Then the entire transaction rolls back
- And old gains/modifiers remain intact
- And `evolutionsEnteredAt` remains unchanged

**AC8: Only army owner can trigger re-entry commit**
- Given a player who is NOT a participant of the match
- When they attempt to call `completeEvolutionsWithGainsFn` with `reentry: true`
- Then the server returns FORBIDDEN

**AC9: Cannot re-enter non-latest match**
- Given a player's 2nd-latest match (not the most recent for this army)
- When they attempt to call `completeEvolutionsWithGainsFn` for that match
- Then the server returns an error (guard rejects non-latest)

**AC10: Abandoned re-entry preserves original data**
- Given the player navigates to post-match re-entry
- When the player abandons the wizard without committing (closes tab, navigates away)
- Then the original gains, stat modifiers, and `evolutionsEnteredAt` remain intact
- And XP changes from individual `submitUnitXpFn` calls during the wizard are applied (these are incremental and reversible on next re-entry)

**AC11: XP cannot go negative during overwrite**
- Given a re-entry commit where subtracting old XP would result in negative unit XP
- When the overwrite transaction executes
- Then `units.xp` is clamped to 0 (not negative)

**AC12: Concurrent re-entry commits are serialized**
- Given two simultaneous re-entry commit requests for the same match
- When both attempt to execute
- Then only one succeeds (the other blocks on `SELECT FOR UPDATE` and sees updated state)

**AC13: Result can be re-edited on latest match**
- Given the player's latest match with a result already set
- When the player taps "Modifier" and selects a different result
- Then the result is updated (both player and opponent)
- And this works regardless of whether post-match has been completed

**AC14: Result re-edit blocked on non-latest match with result**
- Given a player's 2nd-latest match where result is set and `evolutionsEnteredAt IS NULL`
- When "Modifier" is visible (AC2) and the player selects a result
- Then the server rejects the update (result already set, not latest match)

**AC15: `submitUnitXpFn` upsert + increment are atomic**
- Given a unit XP submission
- When the upsert and increment execute
- Then both occur within a single transaction
- And a crash between them cannot leave inconsistent state

## Additional Context

### Dependencies

- No new packages required -- all functionality built on existing stack.
- `authMiddleware` from `src/lib/middleware.ts` (existing)
- `getTimelineForArmy` from `src/db/queries/matches.ts` (existing, modified)
- `completeEvolutionsWithGainsTransaction` from `src/db/queries/evolutions.ts` (existing, modified -- `reentry` param added)

### Testing Strategy

- **Unit tests** (`tests/server-fns/`): Test `completeEvolutionsWithGainsFn` in re-entry mode -- verify atomic overwrite (old gain deletion, new gain insertion, stat modifier swap, XP non-negativity clamping)
- **Unit tests** (`tests/server-fns/`): Test `submitUnitXpFn` transactional atomicity
- **Unit tests** (`tests/`): Test `isLatestMatch` flag computation in timeline query + `getLatestMatchIdForArmy` helper
- **Unit tests** (`tests/`): Test `updateMatchResultOnLatest` allows re-edit on latest, rejects on non-latest
- **E2E tests** (`e2e/`): Full flow -- complete post-match -> verify locked -> tap "Modifier le dernier rapport" on latest -> confirm modal -> verify pre-filled XP -> complete again -> verify updated timeline
- **E2E tests** (`e2e/`): Abandon flow -- start re-entry -> close tab -> verify original data intact

### Notes

- `submitUnitXpFn` uses an upsert+delta mechanism that already handles re-entry correctly. When a player re-enters the wizard and submits XP, the delta is computed against the previous `matchXpEntries` value and applied incrementally. No bulk XP subtraction is needed before the wizard opens.
- Clearing of temporary modifiers (done in `completeEvolutionsWithGainsTransaction`) is idempotent -- re-running it on the same army won't cause issues since the temporaries from older matches were already cleared.
- Edge case: if a player modifies XP via `submitUnitXpFn` during re-entry but never commits, the XP delta from those individual calls persists. This is acceptable -- the next re-entry will see the updated `matchXpEntries` values and compute correct deltas again. No XP is "lost".
- The `reentry` flag in `completeEvolutionsWithGainsTransaction` is determined server-side (by checking `evolutionsEnteredAt !== null`), not passed from the client. This prevents a client from forcing a re-entry overwrite on a match that was never completed.
