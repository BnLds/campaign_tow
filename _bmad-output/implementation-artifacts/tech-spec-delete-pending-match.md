---
title: 'Delete Pending Match'
slug: 'delete-pending-match'
created: '2026-03-24'
status: 'Completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['tanstack-start', 'drizzle', 'postgresql', 'react', 'tailwind-v4', 'zod-v4', 'radix-ui/alert-dialog']
files_to_modify: ['src/db/queries/matches.ts', 'src/routes/index.tsx', 'src/lib/validators.ts', 'src/routes/admin/index.tsx', 'src/components/action-chip.tsx']
code_patterns: ['createServerFn+authMiddleware+ServerResult', 'db.transaction+for-update', 'dynamic-import-queries', 'inline-confirmation-modal', 'router.invalidate-after-mutation']
test_patterns: ['structural-contract-tests-regex', 'describe-AC-P0-pattern', 'readFileSync-code-assertions']
---

# Tech-Spec: Delete Pending Match

**Created:** 2026-03-24

## Overview

### Problem Statement

A player who creates a match by mistake (wrong opponent, wrong date) has no way to correct it — the match stays stuck in their pending actions forever.

### Solution

Allow any participant (and admin) to delete a match as long as neither player has completed their post-match evolutions (`evolutionsEnteredAt` is null for both participants). If partial XP entries exist from an incomplete post-match wizard (phase 1 started but not committed), roll back the unit XP before deleting. Show a red toast for 5 seconds: "{displayName} a supprimé le match". On failure, show a red toast with the error message.

### Scope

**In Scope:**
- Server function for match deletion with `evolutionsEnteredAt` guard on both participants
- XP rollback if partial `matchXpEntries` exist (decrement unit.xp before cascade delete)
- Red cross button on action chips (Campaign view) next to the existing edit/action area
- Confirmation dialog before deletion
- Admin deletion support
- Red toast notification (5s) on successful deletion: "{displayName} a supprimé le match"
- Red toast notification on failure (e.g. "Post-match déjà complété")
- Cascade cleanup via existing FK constraints (matchParticipants, matchXpEntries)

**Out of Scope:**
- Soft-delete / archival (hard delete only)
- Notification to opponent (no notification system exists)
- Undo functionality

## Context for Development

### Codebase Patterns

- **Server functions:** `createServerFn({ method: 'POST' }).middleware([authMiddleware]).inputValidator(schema).handler(async ({ context, data }): Promise<ServerResult<T>>)` — never throw, always return `ServerResult`
- **DB transactions:** `db.transaction(async (tx) => { ... })` with `.for('update')` on SELECT for row-level locking
- **Dynamic imports:** `const { fn } = await import('../db/queries')` inside handlers (lazy-loading)
- **Error codes:** `'UNAUTHORIZED'`, `'FORBIDDEN'`, `'NOT_FOUND'`, `'SERVER_ERROR'` — messages in French
- **Action chips:** rendered in horizontal scrollable `<div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>` strip
- **Confirmation modals:** inline fixed overlay with `rgba(0,0,0,0.4)` backdrop (existing pattern in index.tsx) — `AlertDialog` from shadcn also available but not used on Campaign view
- **Post-mutation refresh:** `router.invalidate({ filter: (d) => d.routeId === '__root__' || d.routeId === '/' })`
- **Admin pattern:** `adminMiddleware` instead of `authMiddleware`, inline `z.object()` validator, `window.confirm()` for confirmation
- **No toast library exists** — toast must be built as simple local state (div with setTimeout auto-dismiss)
- **XP increment pattern:** `sql\`${units.xp} + ${delta}\`` with delta computed from previous value
- **Naming:** server fns = `camelCaseFn`, queries = `camelCase`, types = `PascalCase`

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/db/schema.ts` | matches, matchParticipants, matchXpEntries, units table definitions with FK cascades |
| `src/db/queries/matches.ts` | Match CRUD, getPendingMatches, updateMatchResultOnLatest (transaction + FOR UPDATE pattern) |
| `src/db/queries/evolutions.ts` | upsertMatchXpEntryWithIncrement (XP delta pattern), completeEvolutionsWithGainsTransaction (FOR UPDATE lock) |
| `src/routes/index.tsx` | Campaign view: pending chips strip, submitMatchResultFn (server fn pattern), inline confirmation modal, router.invalidate |
| `src/lib/validators.ts` | Zod v4 schemas: submitMatchResultSchema (reference for new deleteMatchSchema) |
| `src/routes/admin/index.tsx` | deletePlayerFn (admin delete pattern with adminMiddleware + window.confirm) |
| `src/components/action-chip.tsx` | ActionChip component (to extend with delete cross button) |
| `src/components/ui/alert-dialog.tsx` | shadcn AlertDialog (available but not currently used on Campaign view) |
| `tests/integration/army-import.test.ts` | Structural contract test pattern (readFileSync + regex assertions) |

### Technical Decisions

- Hard delete: matches table has `onDelete: cascade` on matchParticipants, and matchParticipants has `onDelete: cascade` on matchXpEntries — so deleting the match row cascades cleanly
- XP rollback MUST happen before cascade delete, inside the same transaction — otherwise the matchXpEntries are gone and we can't know how much to decrement
- Guard checks `evolutionsEnteredAt IS NULL` on ALL participants (not just the requester)
- **Race condition protection:** `SELECT ... FOR UPDATE` on matchParticipants rows inside the transaction to prevent concurrent post-match completion or double-delete
- **XP floor safety:** Use `GREATEST(0, xp - delta)` when decrementing unit XP to prevent negative values
- **Same guard for admin:** Admin uses the same `evolutionsEnteredAt IS NULL` guard as players (no force-delete in v1) — only difference is admin skips the "requester is participant" check
- **Post-delete refresh:** `router.invalidate()` after successful mutation to re-run campaign loader and remove the chip immediately
- Toast shows the name of the player who deleted (red background, 5s auto-dismiss) — `displayName` is read client-side from the root loader session data, NOT from the mutation response
- **XP rollback concurrency note:** `FOR UPDATE` locks matchParticipants rows but not `units` rows. Concurrent XP modifications on the same unit from another match are theoretically possible. `GREATEST(0, xp - delta)` prevents negatives but the final XP could be slightly off. Acceptable risk for v1 given low concurrency.

## Implementation Plan

### Tasks

- [x] Task 1: Add Zod validator schema
  - File: `src/lib/validators.ts`
  - Action: Add `deleteMatchSchema = z.object({ matchId: z.string().min(1) })` and export type `DeleteMatchInput`
  - Notes: Follow existing flat schema pattern (see `submitMatchResultSchema`)

- [x] Task 2: Add `deleteMatchWithXpRollback` DB query
  - File: `src/db/queries/matches.ts`
  - Action: Create transactional delete function:
    1. `SELECT id, evolutionsEnteredAt FROM matchParticipants WHERE matchId FOR UPDATE` — lock all participant rows
    2. Guard: if any participant has `evolutionsEnteredAt IS NOT NULL`, return `{ deleted: false, reason: 'POST_MATCH_COMPLETED' }`
    3. `SELECT matchParticipantId, unitId, xpGained FROM matchXpEntries WHERE matchParticipantId IN (participant IDs)` — collect all partial XP entries
    4. For each XP entry: `UPDATE units SET xp = GREATEST(0, xp - xpGained) WHERE id = unitId`
    5. `DELETE FROM matches WHERE id = matchId` — FK cascade handles matchParticipants, matchXpEntries, and sets null on statModifiers/unitGains
    6. Return `{ deleted: true }`
  - Notes: Use `sql` template for GREATEST. Import `inArray` for batch participant ID filter. Follow `updateMatchResultOnLatest` transaction + FOR UPDATE pattern.

- [x] Task 3: Add `deleteMatchFn` server function (player)
  - File: `src/routes/index.tsx`
  - Action: Create `deleteMatchFn = createServerFn({ method: 'POST' }).middleware([authMiddleware]).inputValidator(deleteMatchSchema).handler(...)`:
    1. Guard: `context.session.isGuest` → return UNAUTHORIZED
    2. Dynamic import `getMatchParticipantByMatchAndPlayer` and `deleteMatchWithXpRollback`
    3. Verify requester is participant via `getMatchParticipantByMatchAndPlayer(matchId, playerId)` — if not found, return FORBIDDEN
    4. Call `deleteMatchWithXpRollback(matchId)` — if `deleted: false`, return FORBIDDEN with "Post-match déjà complété"
    5. Return `{ success: true, data: null }`
  - Notes: Follow `submitMatchResultFn` pattern exactly. French error messages.

- [x] Task 4: Add delete cross button to ActionChip component
  - File: `src/components/action-chip.tsx`
  - Action: Add optional `onDelete` prop to ActionChip. When provided, render a red cross (X) button on the right side of the chip. Style: `color: var(--color-malus)` (#b82c2c), min touch target 44px, separated from main chip content.
  - Notes: Cross should not trigger the chip's main onClick/href. Use `e.stopPropagation()` AND `e.preventDefault()` on the cross button click (preventDefault needed when chip is an `<a>` link).

- [x] Task 5: Add delete confirmation dialog and toast to Campaign view
  - File: `src/routes/index.tsx`
  - Action:
    1. Add state: `deleteConfirmMatch: { matchId: string, opponentName: string, date: string } | null` and `toast: { message: string } | null`
    2. Pass `onDelete` callback to each pending ActionChip — sets `deleteConfirmMatch` with match info
    3. Render inline confirmation modal (follow existing `reentryConfirmMatchId` pattern): "Supprimer le match du {date} contre {opponent} ?" with red "Supprimer" button and neutral "Annuler"
    4. On confirm: call `deleteMatchFn({ matchId })`, on success set toast `"{displayName} a supprimé le match"`, on failure set toast with error message (e.g. "Post-match déjà complété"), then `router.invalidate()`
    5. Toast component: fixed bottom div, red background (`var(--color-malus)`), white text, `z-index: 50` (below modals at z-100), `bottom: 70px` (above TabBar), auto-dismiss via `setTimeout(5000)` clearing toast state
  - Notes: The `displayName` for the toast comes from the root loader session data (field `session.displayName` from `SessionData` in `src/lib/auth.ts`). NOT from the mutation response (which returns `data: null`). Clean up timeout on unmount with useEffect.

- [x] Task 6: Add admin delete support
  - File: `src/routes/admin/index.tsx`
  - Action:
    1. Add `deleteMatchAdminFn = createServerFn({ method: 'POST' }).middleware([adminMiddleware]).inputValidator(z.object({ matchId: z.string().min(1) })).handler(...)` — calls `deleteMatchWithXpRollback(matchId)` directly (no participant check)
    2. Add delete button (red cross or "Supprimer" text button) next to each match in admin match list
    3. Use `window.confirm()` for confirmation (follow existing admin deletePlayerFn pattern)
  - Notes: Same DB query as player path, just skip participant verification.

### Acceptance Criteria

- [x] AC1: Given a pending match (both participants have `evolutionsEnteredAt IS NULL`), when a participant clicks the red cross on the action chip and confirms, then the match and all related data (matchParticipants, matchXpEntries) are deleted from the database.
- [x] AC2: Given a match where one participant has completed post-match (`evolutionsEnteredAt IS NOT NULL`), when the other participant tries to delete, then the server returns FORBIDDEN with "Post-match déjà complété", the match is NOT deleted, and a red error toast is shown to the user.
- [x] AC3: Given a pending match where a participant has partially entered XP (matchXpEntries exist but evolutionsEnteredAt is null), when the match is deleted, then the unit XP totals are decremented by the exact amounts in the matchXpEntries before the cascade delete occurs.
- [x] AC4: Given a successful match deletion, when the server responds, then a red toast appears at the bottom of the screen showing "{displayName} a supprimé le match" and auto-dismisses after 5 seconds.
- [x] AC5: Given a successful match deletion, when the toast appears, then the action chip for that match disappears from the pending strip (via router.invalidate).
- [x] AC6: Given two concurrent requests (delete + post-match completion on the same match), when both execute, then only one succeeds due to SELECT FOR UPDATE row locking — no data corruption occurs.
- [x] AC7: Given the admin view, when admin clicks delete on a pending match and confirms, then the match is deleted without requiring the admin to be a participant.
- [x] AC8: Given a pending match action chip, when the red cross button is clicked, then an inline confirmation dialog shows "Supprimer le match du {date} contre {opponent} ?" with "Supprimer" (red) and "Annuler" (neutral) buttons.
- [x] AC9: Given a participant with `armyId IS NULL` or zero matchXpEntries rows, when the match is deleted, then the deletion succeeds without errors (empty XP rollback is a no-op, no UPDATE units executed).
- [x] AC10: Given a player who is NOT a participant of the match (and is not admin), when they call deleteMatchFn, then the server returns FORBIDDEN and the match is NOT deleted.

## Additional Context

### Dependencies

- Existing FK cascade constraints handle child row cleanup (no schema migration needed)
- No new packages needed — toast built as local state component
- `authMiddleware` and `adminMiddleware` already exist
- `getMatchParticipantByMatchAndPlayer` query already exists for participant verification

### Testing Strategy

- **Structural contract tests** (`tests/integration/delete-match.test.ts`): Verify `deleteMatchFn` exists with correct middleware, validator, and handler structure using readFileSync + regex assertions. Verify `deleteMatchWithXpRollback` uses transaction + FOR UPDATE + GREATEST pattern.
- **DB query tests** (`src/db/__tests__/queries-delete-match.test.ts`): Test `deleteMatchWithXpRollback` against real DB — happy path deletion, guard rejection when post-match completed, XP rollback correctness, empty XP entries case.
- **E2E test** (`e2e/delete-match.spec.ts`): Create match → verify chip appears → click cross → confirm → verify chip disappears + toast shown → verify DB cleanup.

## Review Notes
- Review adversariale complétée (agent Opus) — 15 findings
- **Corrigés (4) :** F3 fuite timeout toast (useRef + cleanup), F6 double-clic guard, F12 test DEL-024 regex couplée, F1 commentaire invariant statModifiers/unitGains
- **Skip intentionnel (11) :** F2 (any participant by spec), F4/F13 (déjà rendu), F5 (edge case acceptable), F7 (N+1 v1 ok), F8 (intentionnel), F9 (red toast by spec), F10/F11/F14/F15 (bruit/hors scope)
- Résolution : auto-fix

### Notes

- The `statModifiers` and `unitGains` tables have `onDelete: 'set null'` on `matchParticipantId` (not cascade). These rows should not exist when `evolutionsEnteredAt` is null, but if orphaned data exists, their `matchParticipantId` will be set to null rather than deleted. This is acceptable — no data loss risk. TODO: consider a cleanup job for orphaned rows with `matchParticipantId IS NULL` in a future iteration.
- XP can never go negative thanks to `GREATEST(0, xp - delta)` floor.
- The toast is intentionally simple (no undo, no animation) — matches the project's minimal UI approach.
- Future consideration: if a notification system is added later, the delete action could notify the opponent.
