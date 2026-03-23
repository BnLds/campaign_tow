---
title: 'Unit Graveyard & Permanent Deletion'
slug: 'unit-graveyard-permanent-deletion'
created: '2026-03-23'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: [drizzle, postgresql, tanstack-start, react, tailwind-v4, vitest]
files_to_modify: [src/db/schema.ts, src/db/queries/units.ts, src/components/unit-edit-panel.tsx, src/routes/armies/$armyId.tsx]
code_patterns: [createServerFn-middleware-validator-handler, success-error-return-type, router-invalidate-cache, file-contract-testing, useFeedback-hook]
test_patterns: [vitest, file-contract-readFileSync-regex, no-real-db, tests-dir-and-src-__tests__]
---

# Tech-Spec: Unit Graveyard & Permanent Deletion

**Created:** 2026-03-23

## Overview

### Problem Statement

There is currently no way to remove a unit from an active army — neither as a soft removal (destroyed in-game, keeping a trace) nor as a hard removal (data entry mistake, no trace). All units remain permanently visible and included in post-match flows regardless of their in-game fate.

### Solution

Add a `status` field (`active` | `graveyard`) to the `units` table. Provide two actions at the bottom of the `UnitEditPanel`:
- **Send to Graveyard** (outline navy, warning icon): sets status to `graveyard` with a reason for death. The unit appears in a dedicated "Cimetiere" section at the bottom of the army view (name, type + reason), is excluded from post-match flow, is not editable, and can be restored.
- **Permanent Deletion** (red): hard deletes the unit and its related data (stat modifiers, unit gains, XP entries, sub-profiles) after confirmation. Match history (matchParticipants) is unaffected since it references armies, not units.

### Scope

**In Scope:**
- `status` field on `units` table + Drizzle migration
- `graveyardReason` text field on `units` table (nullable)
- Two action buttons at the bottom of `UnitEditPanel`
- Confirmation modal for permanent deletion
- "Cimetiere" section at the bottom of army view (name + reason)
- Graveyard units excluded from post-match flow
- "Restaurer" button on graveyard units
- Reason input when sending to graveyard

**Out of Scope:**
- Graveyard timeline/history
- Statistics on destroyed units
- Notifications to other players

## Context for Development

### Codebase Patterns

- **Server functions**: `createServerFn({ method: 'POST' }).middleware([authMiddleware]).inputValidator(z.object({...})).handler(async ({ data, context }) => { ... })` — returns `{ success: true, data } | { success: false, error: { code, message } }`
- **Cache invalidation**: `router.invalidate({ filter: (d) => d.routeId === '/armies/$armyId' })` after mutations
- **Soft-delete pattern**: `statModifiers` and `unitGains` use `cleared: boolean` — cleared entries remain in DB for timeline but excluded from active queries via `eq(cleared, false)`
- **Edit panel**: server functions passed as props to `UnitEditPanel`, `useFeedback()` hook for 3-second auto-dismissing messages, inline deletion confirmations via `deletingId` state
- **Unit grouping**: `groupUnitsByType()` in army route groups by 4 types: Personnages, Unites de base, Unites speciales, Unites rares
- **Dynamic imports**: query functions imported inside handlers (`await import('../../db/queries')`)

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/db/schema.ts` (L43-56) | Units table — add `status` + `graveyardReason` columns |
| `src/db/queries/units.ts` (L79-109, L111-155) | `getUnitsForArmy()` + `getArmyWithUnits()` — add status filter |
| `src/db/queries/units.ts` (L274-287) | `getUnitById()` — used for ownership validation in server fns |
| `src/components/unit-edit-panel.tsx` | Edit panel — add graveyard + delete buttons at bottom |
| `src/routes/armies/$armyId.tsx` (L22-71, L325-547) | Army route + view — add server fns + graveyard section |
| `src/routes/match/$matchId/post-match.tsx` (L92-97) | Post-match unit loading — already calls `getUnitsForArmy()` |
| `src/components/unit-card.tsx` | UnitCard — read-only, no changes needed |
| `tests/3-1-schema.test.ts` | Schema file-contract tests — add assertions for new columns |

### Technical Decisions

- **status enum over deleted_at timestamp**: clearer semantics, extensible, no ambiguity between active and graveyard
- **Hard delete for permanent deletion**: all 4 FK children (`subProfiles`, `statModifiers`, `unitGains`, `matchXpEntries`) have `onDelete: 'cascade'` — clean automatic cleanup
- **`matchParticipants` unaffected**: references `armies.id` not `units.id` — match history survives both graveyard and permanent deletion
- **Full cascade on hard delete**: no denormalization, no SET NULL. The confirmation modal warns the player to use the graveyard if they want to keep a trace.
- **Reason field**: `graveyardReason` text, nullable — only populated when status = graveyard
- **Query filter strategy**: add `status = 'active'` filter to `getUnitsForArmy()` and `getArmyWithUnits()` by default; add separate `getGraveyardUnits(armyId)` query for the graveyard section. Verified: `getArmyWithUnits` is only called in the `$armyId.tsx` loader — no other consumers, filter is safe.
- **Cascade deletes `matchXpEntries`**: permanent deletion removes per-match XP entries for that unit. Match participant records survive (they reference `armies.id`), but per-unit XP breakdown is lost. The confirmation modal must explicitly warn the player about this.
- **No index on `units.status`**: the `units` table is partitioned by `army_id` (tens of units per army max), sequential filter is negligible. No index needed.

## Implementation Plan

### Tasks

- [x] Task 1: Add `status` and `graveyardReason` columns to units schema
  - File: `src/db/schema.ts`
  - Action: Add `unitStatusEnum` pgEnum with values `active`, `graveyard`. Add `status: unitStatusEnum('status').notNull().default('active')` and `graveyardReason: text('graveyard_reason')` to the `units` table definition after the `options` column.
  - Notes: Follow existing enum pattern (see `matchResultEnum` in same file).

- [x] Task 2: Generate and apply Drizzle migration
  - File: `drizzle/` (new migration file)
  - Action: Run `pnpm drizzle-kit generate` to produce the migration SQL. Verify it adds the enum type, the two columns with correct defaults, and does not alter existing data.
  - Notes: All existing units get `status = 'active'` by default. No backfill needed.

- [x] Task 3: Add query functions for graveyard
  - File: `src/db/queries/units.ts`
  - Action:
    1. In `getUnitsForArmy()`: add `.where(and(eq(units.armyId, armyId), eq(units.status, 'active')))` (replace current single `eq` filter)
    2. In `getArmyWithUnits()`: add same `eq(units.status, 'active')` filter to the units query
    3. Add new `getGraveyardUnits(armyId: string)` function: same as `getUnitsForArmy` but filtering `eq(units.status, 'graveyard')` and selecting `id, name, type, graveyardReason`
    4. Add new `sendUnitToGraveyard(unitId: string, reason: string)` function: `db.update(units).set({ status: 'graveyard', graveyardReason: reason }).where(eq(units.id, unitId))`
    5. Add new `restoreUnitFromGraveyard(unitId: string)` function: `db.update(units).set({ status: 'active', graveyardReason: null }).where(eq(units.id, unitId))`
    6. Add new `deleteUnitPermanently(unitId: string)` function: `db.delete(units).where(eq(units.id, unitId))` — FK cascade handles children
  - Notes: `getUnitById()` does NOT need a status filter — it is used for ownership validation where we need to find both active and graveyard units.

- [x] Task 4: Add server functions for graveyard and deletion
  - File: `src/routes/armies/$armyId.tsx`
  - Action: Add 3 new server functions following the existing pattern:
    1. `sendToGraveyardFn`: POST, `armyOwnerMiddleware`, input `{ armyId, unitId, reason: z.string().trim().min(1).max(200) }`, validates unit belongs to army and is `active`. **Guard post-match**: check if any `matchXpEntries` joined to `matchParticipants` with `evolutionsEnteredAt IS NULL` exist for this unit — if so, return `{ success: false, error: { code: 'POST_MATCH_IN_PROGRESS', message: 'Cette unite est dans un flux post-match en cours.' } }`. Otherwise calls `sendUnitToGraveyard()`. Returns `{ success: true }`.
    2. `deleteUnitFn`: POST, `armyOwnerMiddleware`, input `{ armyId, unitId }`, validates unit belongs to army via `getUnitById()` (any status — intentional: allows deletion from both active and graveyard). Calls `deleteUnitPermanently()` with `.returning()` — if 0 rows returned, return `{ success: false, error: { code: 'NOT_FOUND', message: 'Unite introuvable ou deja supprimee' } }`. Returns `{ success: true }`.
    3. `restoreUnitFn`: POST, `armyOwnerMiddleware`, input `{ armyId, unitId }`, validates unit belongs to army and is in graveyard, calls `restoreUnitFromGraveyard()`. Returns `{ success: true }`.
  - Notes: All 3 must validate unit ownership (`unit.armyId === data.armyId`). Follow existing error pattern `{ success: false, error: { code: 'FORBIDDEN', message: '...' } }`. Use `.returning()` on mutations to detect concurrent no-op (0 rows affected).

- [x] Task 5: Update army route loader to include graveyard units
  - File: `src/routes/armies/$armyId.tsx`
  - Action: In `loadArmyFn`, after loading `unitCards`, also call `getGraveyardUnits(armyId)` and return as `graveyardUnits` alongside existing data.
  - Notes: `getUnitsForArmy()` already filters `active` only after Task 3, so existing `unitCards` logic is unaffected.

- [x] Task 6: Add graveyard and delete buttons to UnitEditPanel
  - File: `src/components/unit-edit-panel.tsx`
  - Action:
    1. Add new props: `sendToGraveyardFn`, `deleteUnitFn`, `onClose` (callback to close the panel)
    2. After the XP section, add a divider and "Zone de danger" section
    3. Add outline navy (#334155) button with warning icon "Envoyer l'unite au cimetiere" — on click, show inline text input for reason (max 200 chars) + confirm button
    4. Add red button "Supprimer l'unite, elle n'a jamais existe" — on click, open AlertDialog (shadcn `alert-dialog` component)
    5. AlertDialog content: "Attention : cette unite, ses sous-profils, ses modificateurs de stats, ses gains et son historique XP par match seront definitivement supprimes. Si elle a ete detruite lors d'un affrontement, envoyez-la plutot au cimetiere pour garder une trace." Buttons: "Annuler" (blue outline) and "Detruire" (red filled)
    6. On graveyard confirm: call `onClose()` first (close panel immediately), then `sendToGraveyardFn({ data: { armyId, unitId, reason } })`, then `onMutationSuccess()`
    7. On delete confirm: call `onClose()` first (close panel immediately), then `deleteUnitFn({ data: { armyId, unitId } })`, then `onMutationSuccess()`
  - Notes: Use `useFeedback()` for success/error messages. Panel is closed via `onClose()` before mutation to prevent crash on re-render with deleted unit. `onMutationSuccess()` triggers `router.invalidate()` which updates the list.

- [x] Task 7: Add graveyard section to army view
  - File: `src/routes/armies/$armyId.tsx`
  - Action:
    1. After the unit type groups section, add a "Cimetiere" section (only if `graveyardUnits.length > 0`)
    2. Style: subtle separator, section title "Cimetiere" in muted text
    3. Each graveyard unit: simple row with unit name + type (desaturated/muted `text-secondary` #6b5f52) + reason in italic smaller text + "Restaurer" button (outline navy, small) + trash icon button (red, small) for permanent deletion
    4. "Restaurer" button calls `restoreUnitFn({ data: { armyId, unitId } })`, then `router.invalidate()`. Trash icon opens the same AlertDialog confirmation as in UnitEditPanel, then calls `deleteUnitFn({ data: { armyId, unitId } })`, then `router.invalidate()`
    5. Only visible to army owner (`isOwner` check)
  - Notes: No UnitCard component for graveyard units — just a simple list item. Non-owners should not see the graveyard section at all.

- [x] Task 8: Add tests
  - File: `tests/unit-graveyard.test.ts` (new file)
  - Action: File-contract tests following existing pattern:
    1. Schema assertions: `units` table has `status` column with enum, has `graveyardReason` column
    2. Query assertions: `getUnitsForArmy` filters by `status` = `active`, `getGraveyardUnits` filters by `status` = `graveyard`
    3. Server function assertions: `sendToGraveyardFn` validates ownership and reason, `deleteUnitFn` validates ownership, `restoreUnitFn` validates ownership and graveyard status
    4. Component assertions: edit panel renders graveyard and delete buttons, confirmation modal text is correct
  - Notes: Follow `tests/3-1-schema.test.ts` pattern — `readFileSync` + regex assertions.

### Acceptance Criteria

- [x] AC1: Given an army owner viewing the edit panel for an active unit, when they click "Envoyer l'unite au cimetiere" and enter a reason and confirm, then the unit status is set to `graveyard`, the unit disappears from the active list, and appears in the "Cimetiere" section with the provided reason.

- [x] AC2: Given an army owner viewing the edit panel for an active unit, when they click "Supprimer l'unite, elle n'a jamais existe", then a confirmation modal appears with warning text and two buttons: "Annuler" (blue) and "Detruire" (red).

- [x] AC3: Given the confirmation modal is open, when the owner clicks "Detruire", then the unit and all its related data (sub-profiles, stat modifiers, unit gains, match XP entries) are permanently deleted, and the unit disappears from the army view.

- [x] AC4: Given the confirmation modal is open, when the owner clicks "Annuler", then the modal closes and no changes are made.

- [x] AC5: Given an army owner viewing the army view with graveyard units, when they see the "Cimetiere" section, then each graveyard unit shows its name, type, and reason for death, with a "Restaurer" button and a permanent deletion button.

- [x] AC6: Given an army owner clicks "Restaurer" on a graveyard unit, when the action completes, then the unit returns to the active list with status `active`, graveyardReason is cleared, and the unit is once again included in post-match flows.

- [x] AC7: Given a unit is in the graveyard, when the post-match flow loads army units, then graveyard units are excluded from the XP entry list.

- [x] AC8: Given a non-owner views another player's army, then they do not see the "Cimetiere" section nor any graveyard/delete buttons.

- [x] AC9: Given the graveyard reason input is empty, when the owner attempts to send a unit to the graveyard, then the action is blocked and an error message is shown (reason is required).

## Additional Context

### Dependencies

- Drizzle migration tooling (already set up, `pnpm drizzle-kit generate`)
- shadcn AlertDialog component: `pnpm dlx shadcn@latest add alert-dialog` (not yet installed)

### Testing Strategy

- **File-contract tests** (`tests/unit-graveyard.test.ts`): schema structure, query filters, server function validation patterns — following existing readFileSync + regex approach
- **Manual testing**:
  1. Create army with units, send one to graveyard with reason, verify it appears in Cimetiere section
  2. Restore graveyard unit, verify it returns to active list
  3. Permanently delete a unit, verify all related data is gone (check DB)
  4. Start a post-match flow, verify graveyard units are not listed
  5. View another player's army as non-owner, verify no graveyard section visible
- **E2E tests** (future, out of scope): Playwright flow for graveyard + restore + delete

### Notes

- The graveyard section is a second top-level category in the army view, separate from the 4 unit type groups
- Graveyard units show name + type + reason — no stats, no edit button, no UnitCard
- Restore action moves unit back to active status and clears graveyardReason
- Post-match flow calls `getUnitsForArmy()` which automatically excludes graveyard units once Task 3 is applied — no additional changes needed in post-match route
- The button hierarchy follows increasing severity: outline navy (reversible graveyard) above red #b82c2c (irreversible deletion). Gold (#d4a843) is NOT used for buttons — it is reserved for XP tier highlights.
- An empty army (all units in graveyard or deleted) is allowed — no minimum unit count
- Graveyard is blocked if a post-match flow is in progress for the unit (`sendToGraveyardFn` checks `evolutionsEnteredAt IS NULL` on related `matchParticipants`) — player must complete post-match first
- Confirmation modal uses shadcn AlertDialog component (not inline confirmation)
- Permanent deletion is available from both the edit panel (active units) and the graveyard section (graveyard units) — `deleteUnitFn` accepts any status intentionally

## Review Notes
- Adversarial review completed (2026-03-23)
- Findings: 11 total, 5 fixed, 4 skipped (noise/low), 2 acknowledged (F4 intentional per spec, F8 theoretical)
- Resolution approach: auto-fix
- F1 (High) FIXED: removed premature onClose() — panel disappears naturally via router.invalidate()
- F2 (Medium) FIXED: added hasInProgressPostMatch guard to deleteUnitFn
- F3 (Medium) FIXED: checked .returning() length in sendToGraveyardFn and restoreUnitFn
- F9 (Low) FIXED: strengthened coupled test assertions per project rules
- F10 (Low) FIXED: added loading/disabled state to Restaurer button
