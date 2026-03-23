---
title: 'Self-Service Army Import for Players'
slug: 'player-army-import'
created: '2026-03-23'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['TanStack Start', 'Drizzle ORM', 'Zod v4', 'Tailwind v4', 'Vitest']
files_to_create: ['src/lib/server-fns/player-import-army.ts', 'src/components/army-import-form.tsx', 'tests/server-fns/player-import-army.test.ts']
files_to_modify: ['src/routes/index.tsx', 'src/routes/armies/index.tsx', 'src/db/queries/armies.ts']
code_patterns: ['createServerFn + middleware chain', 'ServerResult<T> return type', 'dynamic imports in server fns', 'importArmySchema reuse']
test_patterns: ['tests/server-fns/*.test.ts for server function logic']
---

# Tech-Spec: Self-Service Army Import for Players

**Created:** 2026-03-23

## Overview

### Problem Statement

Players without an army must contact the admin to get one imported and assigned. This creates a bottleneck and a poor onboarding experience.

### Solution

Allow players without an army to self-import their OWB army export via a form identical to the admin one. The imported army is automatically assigned to the logged-in player. The import button appears on the Campaign and Armies views only when the player has no army and is not a guest.

### Scope

**In Scope:**
- "Create your army" button on Campaign view (`/`) and Armies view (`/armies`) — visible only if the player has no army and is not a guest
- Import form: raw OWB textarea (reuses `parseOwbExport` + `createArmyWithUnits`)
- Automatic assignment of the imported army to the logged-in player's `playerId`
- Server function protected by `authMiddleware` (not guest, not already having an army)

**Out of Scope:**
- Replacing an existing army
- Additional fields (custom name, manual faction)
- Post-import army editing (remains admin-only)
- Import for guests

## Context for Development

### Codebase Patterns

- **Server functions** use `createServerFn({ method })` + `.middleware([...])` + `.inputValidator(schema)` + `.handler(async ({ context, data }) => ...)`.
- **Return type**: all mutation server fns return `ServerResult<T>` (`{ success: true, data } | { success: false, error: { code, message } }`).
- **Dynamic imports** inside handlers (`await import('../../db/queries')`) to prevent server-only modules from leaking into client bundle.
- **Guest guard pattern**: check `context.session.isGuest` at the top of the handler and throw/return error. Used in `markWelcomeSeenFn`, `submitMatchResultFn`, etc.
- **Admin import flow (reference)**: `importArmyFn` in `src/routes/admin/index.tsx:67-99` — parses OWB text via `parseOwbExport()`, then inserts via `createArmyWithUnits()`. Army is created without a `playerId` (assigned separately via `assignArmyFn`).
- **Army assignment**: `assignArmyToPlayer(armyId, playerId)` in `src/db/queries/armies.ts:54-69` — nullifies any prior army for the player (unique constraint), sets `playerId`, backfills pending `matchParticipants`.
- **Unique constraint** on `armies.playerId` (when not null) — DB-level protection against double-army.
- **Route invalidation**: `router.invalidate()` after mutations to refresh loader data (used throughout the app).
- **Root `beforeLoad`** loads `army` into route context — after import success + invalidation, header auto-updates.
- **UI form style**: admin uses inline styles consistent with the palette tokens (`var(--color-*)`, `var(--font-body)`, `var(--font-display)`). No Tailwind classes in route components.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/routes/admin/index.tsx` (L67-99, L668-719) | Admin `importArmyFn` server fn + OWB textarea form UI |
| `src/routes/index.tsx` (L179-185) | Campaign view — `army === null` empty state to replace |
| `src/routes/armies/index.tsx` | Armies list view — add CTA for no-army players |
| `src/routes/__root.tsx` (L65-93) | Root `beforeLoad` — loads session + army into context |
| `src/lib/owb-parser.ts` | `parseOwbExport()` — pure OWB text parser |
| `src/db/queries/armies.ts` | `createArmyWithUnits()`, `assignArmyToPlayer()`, `getPlayerArmy()` |
| `src/lib/validators.ts` | `importArmySchema` — reusable as-is (`{ rawText: string }`) |
| `src/lib/middleware.ts` | `authMiddleware` — session validation |
| `src/lib/types.ts` | `ServerResult<T>` type |

### Technical Decisions

1. **New server function `playerImportArmyFn`** — NOT reusing admin's `importArmyFn` (it has `adminMiddleware`). The new fn uses `authMiddleware`, checks `!isGuest` and `!existingArmy`, then does parse + create + assign in sequence.
2. **Reuse `importArmySchema`** from `validators.ts` — same input shape (just `rawText`).
3. **Reuse `createArmyWithUnits` + `assignArmyToPlayer`** — no new DB queries needed. Call them sequentially: create army, then assign to player.
4. **Race condition / double-submit**: `assignArmyToPlayer` nullifies prior armies before assigning, so two concurrent requests both pass the `getPlayerArmy` guard, both create an army, and both assign — the second silently overrides the first, leaving an orphaned army. Mitigation: after `assignArmyToPlayer` succeeds, re-check with `getPlayerArmy` that the assigned army is ours. If not (race lost), delete the orphaned army and return an error. This is a lightweight optimistic check — acceptable given the low concurrency of this campaign app.
5. **Extract `ArmyImportForm` component** — the form (textarea + button + loading/success/error states) is used in both Campaign and Armies views. Extract to `src/components/army-import-form.tsx` to avoid duplication. Takes an `onSuccess` callback prop so each route can handle post-import logic (invalidation).
6. **Server fn in shared file** — `playerImportArmyFn` lives in `src/lib/server-fns/player-import-army.ts` (not inline in a route) so both routes can import it.
7. **Post-import UX**: on success, show a recap message (army name, faction, unit count) in a styled card, then `router.invalidate()` so the header and views refresh with the new army data.
8. **Help text**: placeholder "Collez ici l'export de votre armee depuis Old World Builder..." to guide the user.
9. **Error UX**: parsing errors show the parser's message; server errors show a generic retry message. Same pattern as admin.

## Implementation Plan

### Tasks

- [x] Task 0: Add `deleteArmy` query function
  - File: `src/db/queries/armies.ts`
  - Action: Add `export async function deleteArmy(armyId: string): Promise<void>` — simple `DELETE FROM armies WHERE id = armyId`. Cascade will handle units/subProfiles. Used for cleanup on failed import.

- [x] Task 1: Create `playerImportArmyFn` server function
  - File: `src/lib/server-fns/player-import-army.ts` (new)
  - Action: Create a new server function using `createServerFn({ method: 'POST' })` chained with `authMiddleware` and `importArmySchema` validator. Handler logic:
    1. Guard: if `context.session.isGuest` → return `{ success: false, error: { code: 'UNAUTHORIZED', message: 'Connexion requise' } }`
    2. Guard: call `getPlayerArmy(context.session.playerId)` — if result is not null → return `{ success: false, error: { code: 'FORBIDDEN', message: 'Vous avez deja une armee' } }`
    3. Call `parseOwbExport(data.rawText)` in try/catch — on error, return `{ success: false, error: { code: 'VALIDATION_ERROR', message: err.message } }`
    4. Guard: if `parsed.units.length === 0` → return `{ success: false, error: { code: 'VALIDATION_ERROR', message: 'Aucune unite trouvee dans le texte importe' } }`
    5. Call `createArmyWithUnits(parsed)` — returns `{ armyId, unitCount }`
    6. Call `assignArmyToPlayer(armyId, context.session.playerId)`
    7. Re-check: call `getPlayerArmy(context.session.playerId)` — if the returned army id !== `armyId` (race lost), delete the orphaned army via `deleteArmy(armyId)` and return `{ success: false, error: { code: 'CONFLICT', message: 'Vous avez deja une armee' } }`
    8. Return `{ success: true, data: { armyId, armyName: parsed.name, faction: parsed.faction, unitCount } }` (note: `faction` comes from `parsed`, not from `createArmyWithUnits`)
    9. Wrap steps 5-7 in try/catch — on any error, attempt cleanup via `deleteArmy(armyId)` (best-effort, ignore cleanup errors), then return generic server error.
  - Notes: Use dynamic imports for `owb-parser` and `db/queries` (same pattern as admin). Return type is `ServerResult<{ armyId: string; armyName: string; faction: string; unitCount: number }>`. The guest guard in the handler is intentional — `authMiddleware` only validates session existence, it does NOT reject guests (consistent with `submitMatchResultFn`, `markWelcomeSeenFn`, etc.).

- [x] Task 2: Create `ArmyImportForm` component
  - File: `src/components/army-import-form.tsx` (new)
  - Action: Create a React component that renders the OWB import form. Props:
    - `onSuccess: (data: { armyId: string; armyName: string; faction: string; unitCount: number }) => void`
  - Internal state: `owbText` (string), `submitting` (boolean), `result` ({ success: boolean; message: string } | null)
  - Markup (mirror admin form, inline styles with palette tokens):
    - Heading: "Creer votre armee" (Cinzel font)
    - Helper text: "Collez ici l'export de votre armee depuis Old World Builder" (secondary color)
    - `<textarea>` with `data-testid="player-owb-import-textarea"`, monospace font, 6 rows, `maxLength={50000}`, placeholder text
    - Submit `<button>` with `data-testid="player-owb-import-submit"`, disabled when empty or submitting, label "Importer" / "Import en cours..."
    - Result message: success (bonus colors, recap: army name + faction + unit count) or error (malus colors, error message)
  - Handler: calls `playerImportArmyFn({ data: { rawText: owbText.trim() } })`. On success: set result message, call `onSuccess(data)`. On error: set result message.
  - Notes: Import `playerImportArmyFn` from `../lib/server-fns/player-import-army`. Style exactly like admin form (see `admin/index.tsx:668-719`). Future improvement: refactor admin form to also use this shared component (out of scope for this spec).

- [x] Task 3: Integrate `ArmyImportForm` in Campaign view
  - File: `src/routes/index.tsx`
  - Action: Replace the `army === null` empty state block (L179-185) with `<ArmyImportForm>`. The `onSuccess` callback calls `router.invalidate()` to refresh the page with the new army data.
  - Notes: Import `ArmyImportForm` from `../components/army-import-form`. Only rendered when `!isGuest && army === null` (same condition as current empty state).

- [x] Task 4: Integrate `ArmyImportForm` in Armies list view
  - File: `src/routes/armies/index.tsx`
  - Action: Add `ArmyImportForm` after the `<h1>` title, before the armies list. Conditionally rendered: only when the logged-in player has no army and is not a guest.
  - Detection: the loader already returns `isGuest`. For "has army", check if any army in the list has `isOwn === true`. If `!isGuest && !hasOwnArmy` → render `<ArmyImportForm>`.
  - The `onSuccess` callback calls `router.invalidate()`.
  - Notes: No changes to the loader needed — the `isOwn` flag is already computed.

- [x] Task 5: Write server function tests
  - File: `tests/server-fns/player-import-army.test.ts` (new)
  - Action: Test the `playerImportArmyFn` handler logic by mocking dependencies. Test cases:
    1. **Guest guard**: session with `isGuest: true` → returns `{ success: false, error.code: 'UNAUTHORIZED' }`
    2. **Existing army guard**: `getPlayerArmy` returns an army → returns `{ success: false, error.code: 'FORBIDDEN' }`
    3. **Parse error**: `parseOwbExport` throws → returns `{ success: false, error.code: 'VALIDATION_ERROR' }` with parser message
    4. **Empty army guard**: `parseOwbExport` returns `{ units: [] }` → returns `{ success: false, error.code: 'VALIDATION_ERROR' }` with "Aucune unite" message
    5. **Happy path**: parse succeeds, create succeeds, assign succeeds, re-check confirms ownership → returns `{ success: true, data: { armyId, armyName, faction, unitCount } }`
    6. **Race condition (race lost)**: assign succeeds but re-check `getPlayerArmy` returns a different armyId → calls `deleteArmy`, returns `{ success: false, error.code: 'CONFLICT' }`
    7. **Create/assign failure**: `createArmyWithUnits` or `assignArmyToPlayer` throws → attempts cleanup via `deleteArmy`, returns generic server error
  - Notes: Follow same mock patterns as `tests/server-fns/submit-match-result.test.ts` and `tests/server-fns/create-match.test.ts`.

### Acceptance Criteria

- [ ] AC1: Given a logged-in non-guest player with no army, when they visit `/`, then an import form with a textarea and "Importer" button is displayed instead of the "Aucune armee assignee" message.
- [ ] AC2: Given a logged-in non-guest player with no army, when they visit `/armies`, then an import form is displayed at the top of the armies list.
- [ ] AC3: Given a guest user, when they visit `/` or `/armies`, then no import form is displayed.
- [ ] AC4: Given a logged-in player who already has an army, when they visit `/` or `/armies`, then no import form is displayed.
- [ ] AC5: Given a player with no army, when they paste valid OWB text and click "Importer", then the army is created, assigned to the player, and a success recap (army name, faction, unit count) is shown. After `router.invalidate()`, the header shows the new army info and the form disappears.
- [ ] AC6: Given a player with no army, when they paste invalid OWB text and click "Importer", then a user-friendly error message is displayed (parser error message) and no army is created.
- [ ] AC7: Given a player who submits twice concurrently (race condition), when the second request loses the race (post-assign re-check detects a different army), then the orphaned army is deleted and a friendly error "Vous avez deja une armee" is returned.
- [ ] AC8: Given a guest session, when the server function `playerImportArmyFn` is called directly, then it returns `{ success: false, error.code: 'UNAUTHORIZED' }`.
- [ ] AC9: Given a player who already has an army, when the server function `playerImportArmyFn` is called directly, then it returns `{ success: false, error.code: 'FORBIDDEN' }`.

## Review Notes

- Adversarial review completed 2026-03-23
- Findings: 11 total, 8 fixed, 1 acknowledged (F9 — tests structurels uniquement, limitation connue sans DB de test), 2 skipped (bruit)
- Resolution: auto-fix
- Fixes applied: F1 import fusionné, F2 `<form>` + Enter, F3 `deleteArmy` en fin de fichier, F4 logging serveur, F5 `trimmed` dédupliqué, F6 `onSuccess` awaité, F7 textarea vidée sur succès, F8 TypeScript vérifié (0 erreur)

## Additional Context

### Dependencies

- No new external libraries needed. All dependencies already present:
  - `parseOwbExport` from `src/lib/owb-parser.ts`
  - `createArmyWithUnits`, `assignArmyToPlayer`, `getPlayerArmy`, `deleteArmy` (new — simple `DELETE FROM armies WHERE id = ?`) from `src/db/queries/armies.ts`
  - `importArmySchema` from `src/lib/validators.ts`
  - `authMiddleware` from `src/lib/middleware.ts`

### Testing Strategy

- **Unit/integration tests** for the server function (`tests/server-fns/player-import-army.test.ts`): 7 test cases covering guards (guest, existing army, empty units), parse error, happy path, race condition (post-assign re-check), and create/assign failure with cleanup.
- **Manual testing**: login as a player without an army, paste OWB text from `docs/army_example.txt` or `docs/army_2.txt`, verify import + auto-assignment + UI refresh.
- **No E2E tests** (per user decision).

### Notes

- **Orphan cleanup on failure** — If `createArmyWithUnits` succeeds but `assignArmyToPlayer` fails (or race is lost), the handler attempts best-effort cleanup via `deleteArmy(armyId)`. If cleanup itself fails, the orphan remains — admin can clean up manually. This is pragmatic given the low concurrency of this campaign app.
- **Future consideration**: if army replacement is ever needed, the server fn guard (`existing army → reject`) would need to be changed. The component would need a confirmation dialog. Not in scope now.
- **`src/lib/server-fns/` directory**: this is a new directory. If it doesn't exist yet, Task 1 creates it. This pattern allows sharing server functions across multiple routes without coupling them to a specific route file.
