---
title: 'Incremental Unit Import'
slug: 'incremental-unit-import'
created: '2026-03-23'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['TanStack Start', 'React', 'Drizzle ORM (PostgreSQL)', 'Zod', 'Tailwind v4']
files_to_modify: ['src/lib/validators.ts', 'src/lib/server-fns/add-units-to-army.ts (new)', 'src/components/add-units-sheet.tsx (new)', 'src/routes/armies/$armyId.tsx']
code_patterns: ['createServerFn + middleware chain', 'ServerResult<T> return type', 'dynamic import of queries', 'db.transaction for batch insert', 'armyOwnerMiddleware for ownership check']
test_patterns: ['tests/server-fns/ for server function unit tests', 'tests/integration/ for E2E import flows']
---

# Tech-Spec: Incremental Unit Import

**Created:** 2026-03-23

## Overview

### Problem Statement

After the initial army import, players cannot add new units to their army. The current import flow (`playerImportArmyFn`) has an existing-army guard that blocks a second import. When a player acquires new units between matches, there is no in-app way to register them — manual database intervention is required.

### Solution

Add an "Ajouter des unités" button in the army view (between the army info header and the first unit section, visible only to the army owner). Tapping it opens a bottom sheet with a textarea where the player pastes an OWB export containing only the new units. The app parses the export client-side using the existing `parseOwbExport` parser and inserts the new units (pure INSERT, no merge/update of existing units). After successful import, a confirmation banner is shown (manually dismissible, not auto-dismiss). Cache is invalidated after successful import.

### Scope

**In Scope:**
- "Ajouter des unités" button in army view, positioned between army info and unit list, visible only when `isOwner === true`
- Expandable panel/sheet with OWB textarea input (reuse existing parser)
- New server function for incremental unit addition (INSERT only, authMiddleware + ownership verification)
- Cache invalidation after successful import

**Out of Scope:**
- Unit deletion
- Updating existing units (points, options, equipment changes)
- Updating army name or total points from the new export
- Full army re-import / merge / diff logic

## Context for Development

### Codebase Patterns

- **Server functions**: `createServerFn({ method: 'POST' }).middleware([...]).inputValidator(zodSchema).handler(async ({ context, data }) => ServerResult<T>)`
- **Ownership guard**: `armyOwnerMiddleware` validates session + army ownership, injects `armyId` into context. Expects `{ armyId }` in input data.
- **DB transactions**: `db.transaction(async (tx) => { ... })` — all related inserts in one atomic block.
- **Dynamic imports**: Server functions use `await import('../../db/queries')` to avoid client bundle leakage.
- **Cache invalidation**: `router.invalidate()` (broad invalidation) after mutations that change unit data — ensures both `/armies/$armyId` and `/armies` (list view with potential unit counts) are refreshed.
- **Unit insert pattern**: Loop over `ParsedUnit[]`, insert unit row, then batch insert `subProfiles` with `sortOrder` index.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/lib/server-fns/player-import-army.ts` | Reference pattern for OWB import server function (guards, parse, create) |
| `src/components/army-import-form.tsx` | Reference UI pattern (textarea + submit + result feedback) |
| `src/routes/armies/$armyId.tsx` | Army view — insert button between header and `groups.map` call |
| `src/db/queries/armies.ts` | `createArmyWithUnits` — transaction pattern for unit + subProfile insert |
| `src/lib/owb-parser.ts` | `parseOwbExport` — reuse as-is for parsing OWB text (client-side) |
| `src/lib/validators.ts` | `importArmySchema` — reuse `rawText` validation, extend with `armyId` |
| `src/lib/middleware.ts` | `armyOwnerMiddleware` — ownership check middleware |

### Technical Decisions

- **Pure INSERT approach**: New units are always appended. No matching, merging, or updating of existing units. This avoids the unsolvable ambiguity of duplicate unit names in OWB exports (no stable unique ID).
- **Button placement**: Between army info (name, faction, player) and first unit group ("Personnages"), not in the header — avoids mobile crowding. Always visible for owner, styled as outline/secondary button.
- **UI pattern — bottom sheet**: Import textarea opens in a bottom sheet (not inline panel) to preserve army view context on mobile.
- **Feedback — confirmation banner**: After successful import, close the bottom sheet and show a confirmation banner ("X unités ajoutées") at the top of the army view. The banner must be **manually dismissible** (close button), not auto-dismiss — ensures the player sees the feedback even if import was slow.
- **Transaction**: All new units + sub-profiles inserted in a single `db.transaction()`. Partial failure = full rollback.
- **Usage frequency**: ~every 2-3 weeks per player. Justifies a visible (but secondary-styled) button.
- **Client-side parsing**: `parseOwbExport` is pure isomorphic TypeScript — runs client-side. Single server call for insert only. No preview round-trip needed.
- **Server input = structured data**: Server function receives `ParsedUnit[]` (not rawText). Zod schema validates both structure and domain constraints (string max lengths, numeric ranges — see Task 1). No re-parsing server-side.
- **Bottom sheet single-step UX**: Textarea + "Importer" button. Same pattern as `ArmyImportForm`. On submit: parse client-side, send structured data to server, show confirmation banner on success, close sheet. State resets on close.
- **Bottom sheet accessibility**: `role="dialog"`, `aria-modal="true"`, focus trap (tab cycles within sheet), ESC to close, return focus to trigger button on close.

## Implementation Plan

### Tasks

- [x] Task 1: Add Zod schema for structured unit input
  - File: `src/lib/validators.ts`
  - Action: Add `addUnitsToArmySchema` — validates `{ armyId: string, units: ParsedUnit[] }` where each unit has `name: string`, `type: string`, `points: number`, `modelCount: number | null`, `specialRules: string | null`, `options: string | null`, and `subProfiles[]` (each with `label: string`, `isMount: boolean`, and 9 stat fields `m`..`cd` as `string | null`). Use `z.nullable()` for nullable fields (NOT `z.optional()`). `armyId` is required for `armyOwnerMiddleware`.
  - **Domain constraints** (Zod level): `units` array: `z.array(...).min(1).max(100)`. String fields: `name` max 200, `type` max 100, `specialRules`/`options` max 2000, stat fields max 10, `label` max 100. `points`: `z.number().int().min(0).max(9999)`. `modelCount`: `z.number().int().min(1).max(999)` (nullable). Textarea in UI: `maxLength={50000}`.
  - Notes: The schema must match `ParsedUnit` / `ParsedSubProfile` types from `owb-parser.ts` structurally so client can send parsed data directly. Co-locate the sub-profile and unit Zod schemas in `validators.ts` alongside the types from `owb-parser.ts` to avoid silent drift — add a comment referencing `ParsedUnit` / `ParsedSubProfile` as the source of truth.

- [x] Task 2: Create server function `addUnitsToArmyFn`
  - File: `src/lib/server-fns/add-units-to-army.ts` (new)
  - Action: Create server function following the `playerImportArmyFn` pattern:
    - `createServerFn({ method: 'POST' }).middleware([armyOwnerMiddleware]).inputValidator(addUnitsToArmySchema).handler(...)`
    - Handler: validate `units.length > 0`, then `db.transaction()` inserting each unit + subProfiles (same loop pattern as `createArmyWithUnits` in `armies.ts:9-51`).
    - Return: `ServerResult<{ unitCount: number }>` on success.
    - No parsing — data arrives pre-parsed and Zod-validated.
  - Notes: `armyOwnerMiddleware` handles auth + ownership check + injects `armyId` into context. No need for manual guest/ownership guards.

- [x] Task 3: Create `AddUnitsSheet` component
  - File: `src/components/add-units-sheet.tsx` (new)
  - Action: Bottom sheet component with single-step flow (same pattern as `ArmyImportForm`):
    - **Props**: `armyId: string`, `open: boolean`, `onClose: () => void`, `onSuccess: (unitCount: number) => void`
    - **Content**: Textarea (same styling as `ArmyImportForm`) + "Importer" button. Button disabled when textarea is empty or submitting.
    - **On submit**: Call `parseOwbExport(text)` client-side. If parse error → show inline error. If `units.length === 0` → show "Aucune unité trouvée". Otherwise call `addUnitsToArmyFn({ data: { armyId, units: parsedUnits } })`. On success → call `onSuccess(unitCount)`, close sheet. On server error → show inline error message in the sheet (e.g. "Erreur serveur, veuillez réessayer").
    - **Reset on close**: When sheet closes (backdrop click, ESC, explicit close, or post-success), reset textarea and error state to initial empty state.
    - **Bottom sheet styling**: Fixed overlay, slides up from bottom, max-height 80vh, backdrop click to close. Use CSS vars from palette (surface bg, separator border).
    - **Accessibility**: `role="dialog"`, `aria-modal="true"`, focus trap (tab cycles within sheet content), ESC key closes, return focus to "Ajouter des unités" button on close.
  - Notes: Parse errors and server errors are caught and displayed inline — no banner for errors in the sheet. Only the success confirmation banner is external (handled by parent).

- [x] Task 4: Integrate into army view
  - File: `src/routes/armies/$armyId.tsx`
  - Action:
    - Add state: `const [addUnitsOpen, setAddUnitsOpen] = useState(false)`
    - Between the army header closing `</div>` and the `{groups.map(` call (locate by searching for `groups.map` — do not rely on line numbers as they shift), add: `{isOwner && <button onClick={() => setAddUnitsOpen(true)} ...outline style...>Ajouter des unités</button>}`
    - Button styling: outline/secondary — `border: 1px solid var(--color-brand)`, `color: var(--color-brand)`, `background: transparent`, `borderRadius: 0.375rem`, `padding: 0.5rem 1rem`, `fontFamily: var(--font-body)`, `fontWeight: 600`, `fontSize: 0.875rem`, full width on mobile.
    - Render `<AddUnitsSheet>` with `open={addUnitsOpen}`, `onClose={() => setAddUnitsOpen(false)}`, `armyId={army.id}`.
    - `onSuccess` handler: show confirmation banner ("X unités ajoutées"), close sheet, call `handleMutationSuccess()` to invalidate cache.
  - Notes: Confirmation banner — a state-driven `div` rendered at top of the army view, with a close (x) button. Manually dismissible (not auto-dismiss). State: `const [successMessage, setSuccessMessage] = useState<string | null>(null)`. No toast library needed.

### Acceptance Criteria

- [ ] AC1: Given an army owner viewing their army, when the page loads, then an "Ajouter des unités" outline button is visible between the army info and the first unit section.
- [ ] AC2: Given a non-owner (or guest) viewing an army, when the page loads, then the "Ajouter des unités" button is NOT rendered.
- [ ] AC3: Given the owner taps "Ajouter des unités", when the bottom sheet opens, then a textarea with placeholder text and an "Importer" button (disabled) are displayed.
- [ ] AC4: Given the owner pastes valid OWB text and taps "Importer", when the server function succeeds, then the new units appear in the army view, a confirmation banner shows "X unités ajoutées" (manually dismissible), and the bottom sheet closes.
- [ ] AC5: Given the owner pastes invalid/unparseable OWB text and taps "Importer", when parsing fails, then an inline error message is shown in the sheet.
- [ ] AC6: Given the owner pastes OWB text with 0 units detected, when parsing completes, then a message "Aucune unité trouvée" is shown.
- [ ] AC7: Given the owner closes the sheet and reopens it, when the sheet opens again, then the textarea is empty and no error message is shown (state is reset).
- [ ] AC8a: Given the server function receives a request from a guest (no session), then `armyOwnerMiddleware` returns UNAUTHORIZED.
- [ ] AC8b: Given the server function receives a request with a missing or invalid `armyId`, then `armyOwnerMiddleware` returns BAD_REQUEST.
- [ ] AC8c: Given the server function receives a request for a non-existent army, then `armyOwnerMiddleware` returns NOT_FOUND.
- [ ] AC8d: Given the server function receives a request from an authenticated player who does not own the army, then `armyOwnerMiddleware` returns FORBIDDEN.
- [ ] AC9: Given a partial DB failure during unit insertion, when the transaction fails, then no units are inserted (full rollback) and an error is returned to the client.
- [ ] AC10: Given the owner pastes OWB text producing more than 100 units, when submitting, then a validation error is shown (Zod max constraint).
- [ ] AC11: Given the server function returns an error (network/DB/500), when the sheet is still open, then an inline error message is displayed in the sheet.

## Additional Context

### Dependencies

- No new packages required — all functionality built on existing stack.
- `parseOwbExport` from `src/lib/owb-parser.ts` (existing)
- `armyOwnerMiddleware` from `src/lib/middleware.ts` (existing)
- Drizzle `db.transaction` from `src/db/index.ts` (existing)

### Testing Strategy

**Unit tests:**
- `tests/server-fns/add-units-to-army.test.ts` — Test `addUnitsToArmyFn`: happy path (inserts units + subProfiles), empty units array rejected, ownership guard (non-owner blocked), transaction rollback on DB error.
**Integration tests:**
- `tests/integration/incremental-import.test.ts` — Full flow: authenticated owner adds units to existing army via server function, verify units appear in `getArmyWithUnits` response.

**Manual testing:**
- Paste real OWB export in bottom sheet, submit, verify units appear in army view + confirmation banner.
- Dismiss confirmation banner manually, verify it disappears.
- Test as non-owner: button should not be visible.
- Test on mobile: bottom sheet usability, button responsiveness.
- Test accessibility: ESC closes sheet, tab cycles within sheet, focus returns to trigger button on close.

### Notes

- The existing `ArmyImportForm` component and `playerImportArmyFn` server function serve as reference patterns but should not be modified — new dedicated components/functions are needed for the incremental flow.
- `parseOwbExport` ignores the army name and faction from the export — only `units[]` are used. This is by design (out of scope: updating army metadata).
- The bottom sheet is a custom lightweight component (CSS-only animation), not a library dependency. For MVP, a simple fixed-position overlay with transform transition is sufficient.
- Future consideration (V2): duplicate detection with fuzzy name matching, sync mode with visual diff/merge UI. Not in scope for MVP.

## Review Notes
- Adversarial review completed
- Findings: 14 total, 7 fixed, 7 skipped (noise/undecided)
- Resolution approach: auto-fix
- Fixed: F1 (subProfiles max constraint), F6 (remove useless useCallback), F7 (focus trap selector), F8 (race condition close/invalidation), F11 (keyframes to global CSS), F12 (double-submit guard), F14 (stopPropagation on sheet)
