---
title: 'Remove displayName — use username as sole player identity'
slug: 'remove-display-name'
created: '2026-03-25'
status: 'completed'
stepsCompleted: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17]
tech_stack: [drizzle, postgresql, tanstack-start, tanstack-router, tanstack-form, tanstack-query, zod, bcryptjs, vitest]
files_to_modify:
  - src/db/schema.ts
  - src/db/queries/players.ts
  - src/db/queries/armies.ts
  - src/db/queries/matches.ts
  - src/db/queries/units.ts
  - src/lib/auth.ts
  - src/lib/validators.ts
  - src/lib/db-errors.ts
  - src/routes/invite.$token.tsx
  - src/routes/settings.tsx
  - src/routes/admin/index.tsx
  - src/routes/__root.tsx
  - src/routes/index.tsx
  - src/routes/armies/index.tsx
  - src/routes/armies/$armyId.tsx
  - src/routes/match/$matchId/post-match.tsx
  - src/components/create-match-fab.tsx
  - src/db/seed-admin.ts
  - src/db/reset-data.ts
  - src/lib/validators.test.ts
  - tests/integration/settings.test.ts
  - tests/integration/delete-match.test.ts
  - tests/3-1-routes.test.ts
  - tests/3-1-queries.test.ts
code_patterns:
  - 'Server functions: createServerFn + middleware (authMiddleware/adminMiddleware)'
  - 'Validators: centralized Zod schemas in src/lib/validators.ts, client-safe'
  - 'DB queries: organized by domain in src/db/queries/'
  - 'Forms: @tanstack/react-form with Zod via Standard Schema'
  - 'Uniqueness: check via query first, catch DB unique constraint (PG code 23505) as fallback'
  - 'Session: SessionData loaded on every request via getSession()'
  - 'Guest display: isGuest flag checked in UI, hardcoded "Invite" label'
test_patterns:
  - 'Unit tests: vitest + zod schema .safeParse() assertions'
  - 'Integration tests: vitest + file content assertions (toContain/toMatch)'
  - 'Coupled assertions rule: regex or combined string for linked properties'
---

# Tech-Spec: Remove displayName — use username as sole player identity

**Created:** 2026-03-25

## Overview

### Problem Statement

Players have two name fields (`username` for login + `displayName` for UI display) which is redundant and confusing. The admin sets a username at account creation, then the player can set a different display name via invite setup. Only one name should exist.

### Solution

Drop the `display_name` column entirely. Use `username` as the sole player identity everywhere (UI, session, queries). Allow players to change their username (with uniqueness validation) at invite setup and in the settings page.

### Scope

**In Scope:**
- DB migration: drop `display_name` column from `players` table
- Update Drizzle schema (`src/db/schema.ts`)
- Update all queries that read/write `displayName` in 4 query files
- Update `SessionData` type and `getSession()` in `src/lib/auth.ts`
- Update validators: remove `updateDisplayNameSchema`, update `inviteSetupSchema`, simplify `createPlayerSchema`
- Add `updateUsernameSchema` with uniqueness check server-side
- Extract shared `isUniqueViolation()` helper for PG unique constraint detection
- Update invite setup route: allow player to change username instead of displayName
- Update settings page: replace "Nom d'affichage" with "Nom d'utilisateur" + uniqueness check
- Update all UI references (7 route files + 1 component)
- Update seed/reset scripts
- Update all tests (unit, integration)

**Out of Scope:**
- Changing the login flow itself
- Admin bulk rename
- Changing username constraints (min 2, max 50 already in place)
- E2E tests (Playwright)

## Context for Development

### Codebase Patterns

- Server functions use `createServerFn` with middleware (`authMiddleware`, `adminMiddleware`)
- Validators are centralized in `src/lib/validators.ts` (pure Zod, client-safe)
- DB queries are organized by domain in `src/db/queries/`
- `SessionData` is the session shape used throughout the app (defined in `src/lib/auth.ts`)
- Forms use `@tanstack/react-form` with Zod validators via Standard Schema
- Uniqueness checks follow the pattern: check first via query, then catch DB unique constraint (PG error code `23505`) as fallback
- Guest player uses `isGuest` flag — UI shows `'Invite'` when true, not a name from DB
- `activatePlayer()` has TOCTOU protection: `WHERE passwordHash IS NULL`

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/db/schema.ts` | Drizzle table — remove `displayName` column |
| `src/db/queries/players.ts` | 10+ functions reference `displayName` — bulk replace to `username` |
| `src/db/queries/armies.ts` | `getAllArmies()`, `getPlayerArmy()` — `playerDisplayName` alias |
| `src/db/queries/matches.ts` | `getLatestCampaignData()`, `getMatchAndParticipants()`, `getCampaignTimeline()` — opponent name aliases |
| `src/db/queries/units.ts` | `getArmyWithUnitsAndGains()`, `getPostMatchData()` — player display name |
| `src/lib/auth.ts` | `SessionData` type + `getSession()` — `displayName` field |
| `src/lib/validators.ts` | `updateDisplayNameSchema` (delete), `inviteSetupSchema` (remove displayName), `createPlayerSchema` (remove displayName) |
| `src/lib/db-errors.ts` | New file — shared `isUniqueViolation()` helper |
| `src/routes/invite.$token.tsx` | Invite setup form + `completeInviteSetupFn` + `activatePlayer()` call |
| `src/routes/settings.tsx` | `updateDisplayNameFn` — replace with `updateUsernameFn` + uniqueness |
| `src/routes/admin/index.tsx` | `createPlayerFn` — remove displayName param, form field, player list display, army assignment display |
| `src/routes/__root.tsx` | Header: `session.displayName` |
| `src/routes/index.tsx` | Toast: `session?.displayName` |
| `src/routes/armies/index.tsx` | Army list: `army.playerDisplayName` prop on `ArmyListItem` |
| `src/routes/armies/$armyId.tsx` | Army header: `army.player.displayName` |
| `src/routes/match/$matchId/post-match.tsx` | Opponent name from query |
| `src/components/create-match-fab.tsx` | `playerDisplayName` in match creation |
| `src/db/seed-admin.ts` | `displayName: ADMIN_USERNAME` |
| `src/db/reset-data.ts` | SQL debug output with `display_name` |

### Technical Decisions

- `username` remains the login identifier AND becomes the sole display name
- Username change (invite + settings) requires uniqueness check: query first, DB constraint fallback
- DB unique constraint detection uses PG error code `23505` (not string matching on `err.message`) — extracted into shared `isUniqueViolation()` helper
- `activatePlayer()` will update `username` instead of `displayName`, preserving TOCTOU protection
- Migration is destructive (drops `display_name` column) — acceptable since most players have displayName === username
- Guest player: UI shows hardcoded `'Invite'` based on `isGuest` flag — no DB name needed
- `SessionData` replaces `displayName: string` with `username: string`
- Username change form shows a confirmation dialog warning the player that their login identifier will change

## Implementation Plan

### Tasks

Tasks are ordered by dependency (lowest level first). Execute in listed order.

- [x] Task 1: Update Drizzle schema — remove `displayName` column
  - File: `src/db/schema.ts`
  - Action: Remove line `displayName: text('display_name').notNull()` from the `players` table definition
  - Notes: This is the foundational change — everything else depends on this

- [x] Task 2: Generate and apply Drizzle migration
  - Action: Run `pnpm db:generate` to create migration file that drops `display_name` column, then `pnpm db:push` to apply
  - Notes: Review generated SQL before applying. The migration will be a simple `ALTER TABLE players DROP COLUMN display_name;`. Must run immediately after Task 1 so all subsequent code changes can be tested against the real DB schema.

- [x] Task 3: Update validators — remove displayName schemas, add username change schema
  - File: `src/lib/validators.ts`
  - Action:
    - Delete `updateDisplayNameSchema` and its `UpdateDisplayNameInput` type
    - Remove `displayName` field from `inviteSetupSchema` (keep only `password` + `confirmPassword`) — kept for server-side inline validator reference
    - Remove `displayName` field from `createPlayerSchema` (keep only `username`)
    - Add new `updateUsernameSchema`: `z.object({ username: z.string().trim().min(2, "Le nom doit faire au moins 2 caracteres").max(50, "Le nom ne peut pas depasser 50 caracteres") })`
    - Export `UpdateUsernameInput` type
    - Add new `inviteFormSchema` — composite schema for the invite setup form (username + password fields combined in a single schema, because TanStack Form accepts only one schema on `validators.onSubmit`):
      ```ts
      export const inviteFormSchema = z.object({
        username: z.string().trim().min(2, "Le nom doit faire au moins 2 caracteres").max(50, "Le nom ne peut pas depasser 50 caracteres"),
        password: z.string().min(6, 'Le mot de passe doit faire au moins 6 caractères').max(100),
        confirmPassword: z.string().min(6).max(100),
      }).superRefine((d, ctx) => {
        if (d.password !== d.confirmPassword) {
          ctx.addIssue({ code: 'custom', message: 'Les mots de passe ne correspondent pas', path: ['confirmPassword'] })
        }
      })
      export type InviteFormInput = z.infer<typeof inviteFormSchema>
      ```
  - Notes: Reuse the same username constraints as `createPlayerSchema` (min 2, max 50). `inviteFormSchema` exists because TanStack Form requires one merged schema on `validators.onSubmit` — splitting across two schemas is not natively supported. `inviteSetupSchema` (password + confirmPassword only, no `displayName`) is kept for server-side inline validator reference only.

- [x] Task 4: Create shared DB error helper
  - File: `src/lib/db-errors.ts` (new file)
  - Action: Create a shared helper to detect PG unique constraint violations:
    ```ts
    export function isUniqueViolation(err: unknown): boolean {
      return typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505'
    }
    ```
  - Notes: PostgreSQL returns error code `23505` for unique_violation. Do NOT match on `err.message.includes('unique')` — message text is driver/locale-dependent and fragile. Both `completeInviteSetupFn` (Task 9) and `updateUsernameFn` (Task 10) will import this helper.

- [x] Task 5: Update `SessionData` and `getSession()`
  - File: `src/lib/auth.ts`
  - Action:
    - In `SessionData` type: replace `displayName: string` with `username: string`
    - In `getSession()` select: replace `displayName: players.displayName` with `username: players.username`
    - In return object: replace `displayName: row.displayName` with `username: row.username`
  - Notes: This affects every consumer of `SessionData` across the app

- [x] Task 6: Update player queries — remove all `displayName` references
  - File: `src/db/queries/players.ts`
  - Action:
    - `getPlayerById()`: remove `displayName` from select, return `{ id, username }` instead — or remove function entirely if unused after changes
    - `updatePlayerDisplayName()`: delete this function entirely
    - Add `updatePlayerUsername(playerId: string, username: string)`: `db.update(players).set({ username }).where(eq(players.id, playerId))`
    - `createPlayer()`: remove `displayName` parameter and `displayName` from `.values()` and `.returning()`
    - `getAllPlayers()`: remove `displayName` from select, add `username` if not already selected
    - `ensureGhostPlayer()`: remove `displayName: 'Invite'` from `.values()`
    - `getAllPlayersWithArmyInfo()`: replace `displayName: players.displayName` with `username: players.username` in select; update return type; update `orderBy` to `players.username`
    - `getPlayerByInviteToken()`: remove `displayName` from select and return type
    - `activatePlayer()`: change signature from `(playerId, passwordHash, displayName)` to `(playerId, passwordHash, username)` — update `.set({ passwordHash, username })` instead of `.set({ passwordHash, displayName })`
  - Notes: `checkUsernameExists()` must be updated to accept an optional `excludePlayerId?: string` parameter — when provided, filters the current player from the uniqueness check (prevents false "Ce nom est déjà pris" when a player submits their own unchanged username). Update implementation to add `ne(players.id, excludePlayerId)` condition when `excludePlayerId` is present. Import `ne` from `drizzle-orm`.

- [x] Task 7: Update army queries
  - File: `src/db/queries/armies.ts`
  - Action:
    - `getAllArmies()`: replace `playerDisplayName: players.displayName` with `playerUsername: players.username`
    - `getPlayerArmy()`: replace `playerDisplayName: players.displayName` with `playerUsername: players.username`
  - Notes: Consumers of `getAllArmies()` are in `src/routes/armies/index.tsx` (Task 12) and `src/routes/admin/index.tsx` (Task 11). Consumer of `getPlayerArmy()` is in `src/routes/armies/$armyId.tsx` (Task 12).

- [x] Task 8: Update match queries
  - File: `src/db/queries/matches.ts`
  - Action:
    - `getLatestCampaignData()`: replace `oppPlayer.displayName` alias with `oppPlayer.username`
    - `getMatchAndParticipants()`: replace `oppPlayer.displayName` alias with `oppPlayer.username`
    - `getCampaignTimeline()`: replace `player1.displayName` / `player2.displayName` with `.username`
  - Notes: The alias names (`opponentPlayerName`, `player1Name`, etc.) can stay the same — only the source column changes

- [x] Task 9: Update unit queries
  - File: `src/db/queries/units.ts`
  - Action:
    - `getArmyWithUnitsAndGains()`: replace `playerDisplayName: players.displayName` with `playerUsername: players.username`; update the mapping at line ~149 that aliases `playerDisplayName` into `player: { displayName: ... }` — change to `player: { username: army.playerUsername }`
    - `getPostMatchData()`: replace `p.displayName` with `p.username` in participant mapping
  - Notes: Check that downstream consumers handle the renamed property

- [x] Task 10: Update invite setup route
  - File: `src/routes/invite.$token.tsx`
  - Action:
    - `getInviteDataFn`: replace `displayName: player.displayName` with `username: player.username` in `'setup'` status return
    - `InvitePageData` type: replace `displayName: string` with `username: string` in `'setup'` variant
    - `completeInviteSetupFn`:
      - **Inline `inputValidator`**: the current inline `z.object` has `displayName: z.string().trim().min(1).max(100)` — replace with `username: z.string().trim().min(2).max(50)`. The inline validator is defined directly in the server fn, not from `inviteSetupSchema`.
      - Add short-circuit before `checkUsernameExists`: if `data.username === player.username` (player keeps admin-assigned username unchanged), skip the uniqueness check and proceed directly to `activatePlayer()` — avoids false "Ce nom est déjà pris" from the player's own record.
      - Uniqueness check: call `checkUsernameExists(data.username, data.playerId)` — pass `data.playerId` as `excludePlayerId` for defence-in-depth even when short-circuit may not trigger due to whitespace/casing edge cases
      - Update `activatePlayer()` call to pass `username` instead of `displayName`
      - **Catch block**: the current code has `catch {` (no parameter — TypeScript 5 feature). Replace with `catch (err: unknown)` and distinguish errors. Re-throw unexpected errors so they are not silently swallowed as "ALREADY_ACTIVATED":
        ```ts
        import { isUniqueViolation } from '../../lib/db-errors'

        try {
          await activatePlayer(data.playerId, passwordHash, data.username)
        } catch (err: unknown) {
          if (isUniqueViolation(err)) {
            return { success: false, error: { code: 'USERNAME_TAKEN', message: "Ce nom d'utilisateur est deja pris" } }
          }
          // Only treat as ALREADY_ACTIVATED if it's the known player-already-activated error
          if (err instanceof Error && err.message === 'Player already activated') {
            return { success: false, error: { code: 'ALREADY_ACTIVATED', message: 'Ce compte a deja ete active' } }
          }
          throw err
        }
        ```
    - `InviteSetupForm` component:
      - Replace prop `defaultDisplayName` with `defaultUsername`
      - Replace form field `displayName` with `username` — use `inviteFormSchema` (from Task 3) as the single form schema on `validators: { onSubmit: inviteFormSchema }` (covers username + password + confirmPassword in one schema)
      - Update label from "Nom d'affichage" to "Nom d'utilisateur"
      - Add helper text below the username input: "Ce nom sera votre identifiant de connexion." (small, `color: var(--color-text-secondary)`, `fontSize: 0.75rem`)
      - Update subtitle text
      - Update `data-testid` from `invite-display-name-input` to `invite-username-input`
    - `InvitePage`: pass `username` instead of `displayName` to `InviteSetupForm`
    - Replace `inviteSetupSchema` import with `inviteFormSchema` — the form now uses `inviteFormSchema` for `validators.onSubmit`
  - Notes: The `username` field in the form is pre-filled with the admin-assigned username but editable. Uniqueness error message: "Ce nom d'utilisateur est deja pris". Double protection: short-circuit for unchanged username + `checkUsernameExists(username, playerId)` soft check + DB unique constraint catch via `isUniqueViolation()`.

- [x] Task 11: Update settings route
  - File: `src/routes/settings.tsx`
  - Action:
    - Delete `updateDisplayNameFn` server function
    - Add `updateUsernameFn` server function:
      - Middleware: `authMiddleware`
      - Input validator: `updateUsernameSchema`
      - Guard: reject if `isGuest`
      - Short-circuit: if `data.username === context.session.username`, return success immediately (no DB call needed). Requires Task 5 to be done first (session now has `username`, not `displayName`).
      - Uniqueness check: call `checkUsernameExists(data.username, context.session.playerId)` — pass `playerId` as `excludePlayerId` for defence-in-depth (protects against edge cases where the short-circuit doesn't fire). If exists, return error `{ code: 'USERNAME_TAKEN', message: "Ce nom d'utilisateur est deja pris" }`
      - Call `updatePlayerUsername(context.session.playerId, data.username)` wrapped in try/catch — re-throw unexpected errors, only swallow `isUniqueViolation`:
        ```ts
        try {
          await updatePlayerUsername(context.session.playerId, data.username)
        } catch (err: unknown) {
          if (isUniqueViolation(err)) {
            return { success: false, error: { code: 'USERNAME_TAKEN', message: "Ce nom d'utilisateur est deja pris" } }
          }
          throw err
        }
        ```
      - Return `{ success: true, data: { username: data.username } }`
    - Replace import `updateDisplayNameSchema` with `updateUsernameSchema`
    - Update component:
      - Replace `displayNameForm` with `usernameForm`
      - Default value: `{ username: session?.username ?? '' }`
      - Section heading: "Nom d'utilisateur" instead of "Nom d'affichage"
      - Label: "Nom d'utilisateur"
      - Add helper text below the username input: "Ce nom sera votre identifiant de connexion." (small, `color: var(--color-text-secondary)`, `fontSize: 0.75rem`)
      - Add a `window.confirm()` before form submission if username changed: "Attention : votre nom d'utilisateur sert aussi d'identifiant de connexion. Continuer ?"
      - Success message: "Nom d'utilisateur mis a jour."
      - Update `data-testid` from `settings-display-name-input` to `settings-username-input` and `settings-display-name-submit` to `settings-username-submit`
  - Notes: Must also invalidate session queries + router on success (existing pattern)

- [x] Task 12: Update admin route
  - File: `src/routes/admin/index.tsx`
  - Action:
    - `createPlayerFn`: remove `data.displayName` from `createPlayer()` call — just pass `data.username`; update response type from `{ id, username, displayName, inviteToken }` to `{ id, username, inviteToken }`
    - Remove the `displayName` form field (`form.Field name="displayName"`, label "Nom d'affichage (optionnel)", input `admin-display-name-input`)
    - Update `defaultValues` to remove `displayName: ''`
    - Player list display: replace `player.displayName || '—'` with `player.username`
    - Army assignment display: replace `army.playerDisplayName ?? 'Non assignee'` with `army.playerUsername ?? 'Non assignee'`
    - Player select dropdown: replace `player.displayName || player.username` with `player.username`
  - Notes: The admin only sets a username now — no displayName field at all

- [x] Task 13: Update remaining route files — replace `session.displayName` / `player.displayName` with `username`
  - Files:
    - `src/routes/__root.tsx`: replace `session.displayName` with `session.username` in header identity indicator
    - `src/routes/index.tsx`: replace `session?.displayName` with `session?.username` in toast message
    - `src/routes/armies/index.tsx`: replace `army.playerDisplayName` prop with `army.playerUsername` in `ArmyListItem` component
    - `src/routes/armies/$armyId.tsx`: replace `army.player.displayName` with `army.player.username` in army header
    - `src/routes/match/$matchId/post-match.tsx`: replace `displayName` references with `username` in opponent name mapping and `campaignPlayers` mapping
  - Action: Straightforward find-and-replace within each file
  - Notes: Ensure JSX expressions and template literals are updated correctly

- [x] Task 14: Update create-match-fab component
  - File: `src/components/create-match-fab.tsx`
  - Action: Replace `playerDisplayName: p.displayName` with `playerUsername: p.username` in the select query and any downstream usage
  - Notes: Check if the component renders the player name — update accordingly

- [x] Task 15: Update seed and reset scripts
  - Files: `src/db/seed-admin.ts`, `src/db/reset-data.ts`
  - Action:
    - `seed-admin.ts`: remove `displayName: ADMIN_USERNAME` from insert values
    - `reset-data.ts`: remove `display_name` from the SELECT debug query and console output; replace with just `username`

- [x] Task 16: Update unit tests
  - File: `src/lib/validators.test.ts`
  - Action:
    - Delete all `updateDisplayNameSchema` test cases
    - Update `createPlayerSchema` tests: remove displayName-related test cases (AC1.4-UNIT-004, AC1.4-UNIT-005)
    - Update `inviteSetupSchema` tests: remove displayName assertions, keep password tests
    - Add `updateUsernameSchema` test cases:
      - Accepts valid username (2-50 chars)
      - Rejects empty/whitespace-only
      - Rejects < 2 chars
      - Rejects > 50 chars
      - Trims whitespace

- [x] Task 17: Update integration tests
  - Files: `tests/integration/settings.test.ts`, `tests/integration/delete-match.test.ts`, `tests/3-1-routes.test.ts`, `tests/3-1-queries.test.ts`
  - Action:
    - `settings.test.ts`: replace `updateDisplayNameSchema` references with `updateUsernameSchema`; add assertions that `updateUsernameFn` imports and uses `isUniqueViolation` from `src/lib/db-errors.ts`; add assertion that `updateUsernameFn` calls `checkUsernameExists` for uniqueness; add assertion that `updateUsernameFn` does NOT call `updatePlayerUsername` when `data.username === session.username` (short-circuit path)
    - `invite.$token.test.ts` (new or existing): add integration test asserting that `completeInviteSetupFn` returns `{ success: false, error: { code: 'USERNAME_TAKEN' } }` when `checkUsernameExists` returns true for a different player's username. Also assert that `completeInviteSetupFn` imports `isUniqueViolation` from `src/lib/db-errors.ts`. Use coupled assertions (regex) where import and usage are on the same declaration.
    - `delete-match.test.ts`: replace `displayName` in toast assertion with `username`
    - `3-1-routes.test.ts`: replace `playerDisplayName` / `displayName` assertions with `username` / `playerUsername` equivalents
    - `3-1-queries.test.ts`: update test `[3.1-QRY-023]` — replace `playerDisplayName` assertion with `playerUsername`

### Acceptance Criteria

- [x] AC1: Given a player table in the database, when the migration is applied, then the `display_name` column no longer exists
- [x] AC2: Given an admin creates a new player with username "TestPlayer", when the player is created, then only `username` is stored (no `displayName` column) and the invite link is generated
- [x] AC3: Given an invited player accesses the invite link for the first time, when the setup form loads, then it shows the pre-filled username (editable) and password fields — no "Nom d'affichage" field
- [x] AC4: Given an invited player changes their username to "NewName" during invite setup, when "NewName" is not taken, then the account is activated with username "NewName" and the player is logged in
- [x] AC5: Given an invited player changes their username to "ExistingName" during invite setup, when "ExistingName" is already taken by another player, then an error "Ce nom d'utilisateur est deja pris" is displayed and the form is not submitted
- [x] AC6: Given a logged-in player visits the settings page, when the page loads, then they see a "Nom d'utilisateur" section with their current username pre-filled — no "Nom d'affichage" section
- [x] AC7: Given a logged-in player changes their username to "UniqueNewName" in settings, when "UniqueNewName" is not taken, then the username is updated, the session is refreshed, and a success message is shown
- [x] AC8: Given a logged-in player changes their username to "TakenName" in settings, when "TakenName" is already taken, then an error "Ce nom d'utilisateur est deja pris" is displayed
- [x] AC9: Given a logged-in player, when the header identity indicator is displayed, then it shows `session.username` (not displayName)
- [x] AC10: Given the campaign timeline, when match history cards are rendered, then player names come from `username` column
- [x] AC11: Given the guest player accesses the app, when the header identity indicator is displayed, then it shows "Invite" (hardcoded via `isGuest` flag, not from a DB name field)
- [x] AC12: Given the `updateUsernameSchema` validator, when tested with valid input (2-50 chars, trimmed), then it passes; when tested with empty/too-short/too-long input, then it fails with appropriate error messages
- [x] AC13: Given a logged-in player submits the settings form with their current username unchanged, when the form is submitted, then it succeeds silently (no uniqueness error, no unnecessary DB update)
- [x] AC14: Given a player changes their username (via invite setup or settings), when they log out and log back in, then they must use the new username to authenticate successfully
- [x] AC15: Given the invite setup form or the settings page, when the username field is displayed, then a helper text "Ce nom sera votre identifiant de connexion." is visible below the input
- [x] AC16: Given a logged-in player changes their username in settings, when they click submit, then a `window.confirm()` dialog warns them that their login identifier will change before proceeding

## Additional Context

### Dependencies

- Drizzle migration (`pnpm db:generate && pnpm db:push`)
- No new packages required
- Existing `checkUsernameExists()` query reused for uniqueness checks

### Testing Strategy

**Unit tests (vitest):**
- Delete `updateDisplayNameSchema` tests
- Add `updateUsernameSchema` tests (valid, empty, too short, too long, trim)
- Update `createPlayerSchema` tests (remove displayName cases)
- Update `inviteSetupSchema` tests (remove displayName field)

**Integration tests (vitest):**
- Update settings test: assert `updateUsernameSchema` usage instead of `updateDisplayNameSchema`; assert `isUniqueViolation` import and `checkUsernameExists` usage in `updateUsernameFn`
- Update delete-match test: `username` in toast instead of `displayName`
- Update 3-1-routes test: `username` / `playerUsername` in army query assertions
- Update 3-1-queries test: `playerUsername` in `getAllArmies` assertion

### Notes

- 25 files total to modify across 17 tasks (including 1 new file `src/lib/db-errors.ts`, 1 new/updated test file for invite setup)
- The `__guest__` player with username `__guest__` is unaffected — UI already checks `isGuest` for guest display
- `ensureGhostPlayer()` currently has `displayName: 'Invité'` (with accent) — remove this field entirely (the guest never displays a DB name)
- `createPlayerSchema` already has `username` with min 2, max 50 — same constraints reused in `updateUsernameSchema`
- `checkUsernameExists()` in `src/db/queries/players.ts` must be updated to accept `excludePlayerId?: string` (see Task 6) — both invite setup and settings pass the current player's ID to avoid false uniqueness errors
- **Pre-migration check (run before Task 2):** Verify no existing player has a `displayName` that violates the new constraints (`min(2)`, `max(50)`). Run: `SELECT id, username, display_name FROM players WHERE length(display_name) < 2 OR length(display_name) > 50;` — if any rows are returned, update them manually before dropping the column.
- `src/lib/session-queries.ts` — verified, no changes needed. It only imports `SessionData` as a generic type parameter (`queryOptions<SessionData | null>`); it does not reference any `displayName` field. The type update from Task 5 propagates automatically.
- High-risk item: `activatePlayer()` TOCTOU protection must be preserved when switching from `displayName` to `username` update — the `WHERE passwordHash IS NULL` guard remains unchanged
- High-risk item: race condition on username uniqueness — `checkUsernameExists()` is a soft check; the DB unique constraint is the hard guarantee. Both `completeInviteSetupFn` (Task 10) and `updateUsernameFn` (Task 11) must catch DB unique constraint violations using `isUniqueViolation()` (PG code `23505`) and return `USERNAME_TAKEN` error. Non-uniqueness errors must be re-thrown, not silently swallowed as `ALREADY_ACTIVATED`.
- The login flow uses `username` for authentication — since we're allowing username changes, a player who changes their username will need to use the new username to log in next time. The settings form shows a `window.confirm()` warning before submission (AC16).
- `src/routes/admin/index.tsx` has 5 distinct `displayName` references (response type, form field, default values, player list display, army assignment display, player select dropdown) — all must be removed or replaced


## Review Notes
- Adversarial review completed (Opus agent)
- Findings: 13 total, 10 fixed (F2–F5, F7, F10–F13), 1 noise (F1 migration déjà appliquée), 1 noise (F8 session fraîche à chaque requête), 1 noise (F9 confirmPassword côté client intentionnel)
- Resolution approach: auto-fix
