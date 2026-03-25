---
title: 'Remove displayName — use username as sole player identity'
slug: 'remove-display-name'
created: '2026-03-25'
status: 'review'
stepsCompleted: [1, 2, 3]
tech_stack: [drizzle, postgresql, tanstack-start, tanstack-router, tanstack-form, tanstack-query, zod, bcryptjs, vitest, playwright]
files_to_modify:
  - src/db/schema.ts
  - src/db/queries/players.ts
  - src/db/queries/armies.ts
  - src/db/queries/matches.ts
  - src/db/queries/units.ts
  - src/lib/auth.ts
  - src/lib/validators.ts
  - src/routes/invite.$token.tsx
  - src/routes/settings.tsx
  - src/routes/admin/index.tsx
  - src/routes/__root.tsx
  - src/routes/index.tsx
  - src/routes/armies/$armyId.tsx
  - src/routes/match/$matchId/post-match.tsx
  - src/components/create-match-fab.tsx
  - src/db/seed-admin.ts
  - src/db/reset-data.ts
  - src/lib/validators.test.ts
  - tests/integration/settings.test.ts
  - tests/integration/delete-match.test.ts
  - tests/3-1-routes.test.ts
  - e2e/global-setup.ts
  - e2e/helpers/db.ts
  - e2e/logout.spec.ts
  - e2e/guest-access.spec.ts
  - e2e/admin-list-delete.spec.ts
code_patterns:
  - 'Server functions: createServerFn + middleware (authMiddleware/adminMiddleware)'
  - 'Validators: centralized Zod schemas in src/lib/validators.ts, client-safe'
  - 'DB queries: organized by domain in src/db/queries/'
  - 'Forms: @tanstack/react-form with Zod via Standard Schema'
  - 'Uniqueness: check via query first, catch DB unique constraint as fallback'
  - 'Session: SessionData loaded on every request via getSession()'
  - 'Guest display: isGuest flag checked in UI, hardcoded "Invite" label'
test_patterns:
  - 'Unit tests: vitest + zod schema .safeParse() assertions'
  - 'Integration tests: vitest + file content assertions (toContain/toMatch)'
  - 'E2E: Playwright with storageState fixtures, global-setup.ts seeds test users'
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
- Update invite setup route: allow player to change username instead of displayName
- Update settings page: replace "Nom d'affichage" with "Nom d'utilisateur" + uniqueness check
- Update all UI references (6 route files + 1 component)
- Update seed/reset scripts
- Update all tests (unit, integration, e2e)

**Out of Scope:**
- Changing the login flow itself
- Admin bulk rename
- Changing username constraints (min 2, max 50 already in place)

## Context for Development

### Codebase Patterns

- Server functions use `createServerFn` with middleware (`authMiddleware`, `adminMiddleware`)
- Validators are centralized in `src/lib/validators.ts` (pure Zod, client-safe)
- DB queries are organized by domain in `src/db/queries/`
- `SessionData` is the session shape used throughout the app (defined in `src/lib/auth.ts`)
- Forms use `@tanstack/react-form` with Zod validators via Standard Schema
- Uniqueness checks follow the pattern: check first via query, then catch DB unique constraint as fallback
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
| `src/routes/invite.$token.tsx` | Invite setup form + `completeInviteSetupFn` + `activatePlayer()` call |
| `src/routes/settings.tsx` | `updateDisplayNameFn` — replace with `updateUsernameFn` + uniqueness |
| `src/routes/admin/index.tsx` | `createPlayerFn` — remove displayName param |
| `src/routes/__root.tsx` | Header: `session.displayName` |
| `src/routes/index.tsx` | Toast: `session?.displayName` |
| `src/routes/armies/$armyId.tsx` | Army header: `army.player.displayName` |
| `src/routes/match/$matchId/post-match.tsx` | Opponent name from query |
| `src/components/create-match-fab.tsx` | `playerDisplayName` in match creation |
| `src/db/seed-admin.ts` | `displayName: ADMIN_USERNAME` |
| `src/db/reset-data.ts` | SQL debug output with `display_name` |

### Technical Decisions

- `username` remains the login identifier AND becomes the sole display name
- Username change (invite + settings) requires uniqueness check: query first, DB constraint fallback
- `activatePlayer()` will update `username` instead of `displayName`, preserving TOCTOU protection
- Migration is destructive (drops `display_name` column) — acceptable since most players have displayName === username
- Guest player: UI shows hardcoded `'Invite'` based on `isGuest` flag — no DB name needed
- `SessionData` replaces `displayName: string` with `username: string`

## Implementation Plan

### Tasks

Tasks are ordered by dependency (lowest level first).

- [ ] Task 1: Update Drizzle schema — remove `displayName` column
  - File: `src/db/schema.ts`
  - Action: Remove line `displayName: text('display_name').notNull()` from the `players` table definition
  - Notes: This is the foundational change — everything else depends on this

- [ ] Task 2: Update validators — remove displayName schemas, add username change schema
  - File: `src/lib/validators.ts`
  - Action:
    - Delete `updateDisplayNameSchema` and its `UpdateDisplayNameInput` type
    - Remove `displayName` field from `inviteSetupSchema` (keep only `password` + `confirmPassword`)
    - Remove `displayName` field from `createPlayerSchema` (keep only `username`)
    - Add new `updateUsernameSchema`: `z.object({ username: z.string().trim().min(2, "Le nom doit faire au moins 2 caracteres").max(50, "Le nom ne peut pas depasser 50 caracteres") })`
    - Export `UpdateUsernameInput` type
  - Notes: Reuse the same username constraints as `createPlayerSchema` (min 2, max 50)

- [ ] Task 3: Update `SessionData` and `getSession()`
  - File: `src/lib/auth.ts`
  - Action:
    - In `SessionData` type: replace `displayName: string` with `username: string`
    - In `getSession()` select: replace `displayName: players.displayName` with `username: players.username`
    - In return object: replace `displayName: row.displayName` with `username: row.username`
  - Notes: This affects every consumer of `SessionData` across the app

- [ ] Task 4: Update player queries — remove all `displayName` references
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
  - Notes: `checkUsernameExists()` already exists and will be reused for uniqueness checks

- [ ] Task 5: Update army queries
  - File: `src/db/queries/armies.ts`
  - Action:
    - `getAllArmies()`: replace `playerDisplayName: players.displayName` with `playerUsername: players.username`
    - `getPlayerArmy()`: replace `playerDisplayName: players.displayName` with `playerUsername: players.username`
  - Notes: Consumers of these functions will be updated in Task 9

- [ ] Task 6: Update match queries
  - File: `src/db/queries/matches.ts`
  - Action:
    - `getLatestCampaignData()`: replace `oppPlayer.displayName` alias with `oppPlayer.username`
    - `getMatchAndParticipants()`: replace `oppPlayer.displayName` alias with `oppPlayer.username`
    - `getCampaignTimeline()`: replace `player1.displayName` / `player2.displayName` with `.username`
  - Notes: The alias names (`opponentPlayerName`, `player1Name`, etc.) can stay the same — only the source column changes

- [ ] Task 7: Update unit queries
  - File: `src/db/queries/units.ts`
  - Action:
    - `getArmyWithUnitsAndGains()`: replace `playerDisplayName: players.displayName` with `playerUsername: players.username`; update the mapping that aliases it (line ~149)
    - `getPostMatchData()`: replace `p.displayName` with `p.username` in participant mapping
  - Notes: Check that downstream consumers handle the renamed property

- [ ] Task 8: Update invite setup route
  - File: `src/routes/invite.$token.tsx`
  - Action:
    - `getInviteDataFn`: replace `displayName: player.displayName` with `username: player.username` in `'setup'` status return
    - `InvitePageData` type: replace `displayName: string` with `username: string` in `'setup'` variant
    - `completeInviteSetupFn`: replace `displayName` input field with `username` field; add uniqueness check via `checkUsernameExists()` before calling `activatePlayer()`; update `activatePlayer()` call to pass `username` instead of `displayName`
    - `InviteSetupForm` component:
      - Replace prop `defaultDisplayName` with `defaultUsername`
      - Replace form field `displayName` with `username`
      - Update label from "Nom d'affichage" to "Nom d'utilisateur"
      - Update subtitle text
      - Update `data-testid` from `invite-display-name-input` to `invite-username-input`
    - `InvitePage`: pass `username` instead of `displayName` to `InviteSetupForm`
    - Update `inviteSetupSchema` usage — the schema no longer has a `displayName` field; the form only has `username` (from route), `password`, `confirmPassword`
  - Notes: The `username` field in the form is pre-filled with the admin-assigned username but editable. Uniqueness error message: "Ce nom d'utilisateur est deja pris"

- [ ] Task 9: Update settings route
  - File: `src/routes/settings.tsx`
  - Action:
    - Delete `updateDisplayNameFn` server function
    - Add `updateUsernameFn` server function:
      - Middleware: `authMiddleware`
      - Input validator: `updateUsernameSchema`
      - Guard: reject if `isGuest`
      - Uniqueness check: call `checkUsernameExists(data.username)` — if exists AND username !== current username, return error `{ code: 'USERNAME_TAKEN', message: "Ce nom d'utilisateur est deja pris" }`
      - Call `updatePlayerUsername(context.session.playerId, data.username)`
      - Return `{ success: true, data: { username: data.username } }`
    - Replace import `updateDisplayNameSchema` with `updateUsernameSchema`
    - Update component:
      - Replace `displayNameForm` with `usernameForm`
      - Default value: `{ username: session?.username ?? '' }`
      - Section heading: "Nom d'utilisateur" instead of "Nom d'affichage"
      - Label: "Nom d'utilisateur"
      - Success message: "Nom d'utilisateur mis a jour."
      - Update `data-testid` from `settings-display-name-input` to `settings-username-input` and `settings-display-name-submit` to `settings-username-submit`
  - Notes: Must also invalidate session queries + router on success (existing pattern)

- [ ] Task 10: Update admin route
  - File: `src/routes/admin/index.tsx`
  - Action:
    - `createPlayerFn`: remove `data.displayName` from `createPlayer()` call — just pass `data.username`
    - Response type: remove `displayName` field, keep `{ id, username, inviteToken }`
    - `createPlayerSchema` import: no change needed (displayName already removed in Task 2)
    - Player list display: replace any `displayName` references with `username`
    - Remove the displayName input field from the create player form if one exists
  - Notes: The admin only sets a username now — no displayName field at all

- [ ] Task 11: Update remaining route files — replace `session.displayName` / `player.displayName` with `username`
  - Files:
    - `src/routes/__root.tsx`: replace `session.displayName` with `session.username` in header identity indicator
    - `src/routes/index.tsx`: replace `session?.displayName` with `session?.username` in toast message
    - `src/routes/armies/$armyId.tsx`: replace `army.player.displayName` with `army.player.username` in army header
    - `src/routes/match/$matchId/post-match.tsx`: replace `displayName` references with `username` in opponent name mapping
  - Action: Straightforward find-and-replace within each file
  - Notes: Ensure JSX expressions and template literals are updated correctly

- [ ] Task 12: Update create-match-fab component
  - File: `src/components/create-match-fab.tsx`
  - Action: Replace `playerDisplayName: p.displayName` with `playerUsername: p.username` in the select query and any downstream usage
  - Notes: Check if the component renders the player name — update accordingly

- [ ] Task 13: Update seed and reset scripts
  - Files: `src/db/seed-admin.ts`, `src/db/reset-data.ts`
  - Action:
    - `seed-admin.ts`: remove `displayName: ADMIN_USERNAME` from insert values
    - `reset-data.ts`: remove `display_name` from the SELECT debug query and console output; replace with just `username`

- [ ] Task 14: Generate and apply Drizzle migration
  - Action: Run `pnpm db:generate` to create migration file that drops `display_name` column
  - Notes: Review generated SQL before applying. The migration will be a simple `ALTER TABLE players DROP COLUMN display_name;`

- [ ] Task 15: Update unit tests
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

- [ ] Task 16: Update integration tests
  - Files: `tests/integration/settings.test.ts`, `tests/integration/delete-match.test.ts`, `tests/3-1-routes.test.ts`
  - Action:
    - `settings.test.ts`: replace `updateDisplayNameSchema` references with `updateUsernameSchema`
    - `delete-match.test.ts`: replace `displayName` in toast assertion with `username`
    - `3-1-routes.test.ts`: replace `playerDisplayName` / `displayName` assertions with `username` equivalents

- [ ] Task 17: Update E2E tests
  - Files: `e2e/global-setup.ts`, `e2e/helpers/db.ts`, `e2e/logout.spec.ts`, `e2e/guest-access.spec.ts`, `e2e/admin-list-delete.spec.ts`
  - Action:
    - `global-setup.ts`: remove `displayName` from `TEST_USERS` objects — use `username` values instead for identity assertions; remove `displayName` from `.set()` calls in seed inserts
    - `helpers/db.ts`: remove `displayName` from guest player setup
    - `logout.spec.ts`: replace `displayName` references in test titles and assertions with `username`
    - `guest-access.spec.ts`: update comments referencing displayName
    - `admin-list-delete.spec.ts`: update comments and assertions referencing displayName
  - Notes: E2E tests check visible text — the identity indicator in the header now shows `username` instead of `displayName`

### Acceptance Criteria

- [ ] AC1: Given a player table in the database, when the migration is applied, then the `display_name` column no longer exists
- [ ] AC2: Given an admin creates a new player with username "TestPlayer", when the player is created, then only `username` is stored (no `displayName` column) and the invite link is generated
- [ ] AC3: Given an invited player accesses the invite link for the first time, when the setup form loads, then it shows the pre-filled username (editable) and password fields — no "Nom d'affichage" field
- [ ] AC4: Given an invited player changes their username to "NewName" during invite setup, when "NewName" is not taken, then the account is activated with username "NewName" and the player is logged in
- [ ] AC5: Given an invited player changes their username to "ExistingName" during invite setup, when "ExistingName" is already taken by another player, then an error "Ce nom d'utilisateur est deja pris" is displayed and the form is not submitted
- [ ] AC6: Given a logged-in player visits the settings page, when the page loads, then they see a "Nom d'utilisateur" section with their current username pre-filled — no "Nom d'affichage" section
- [ ] AC7: Given a logged-in player changes their username to "UniqueNewName" in settings, when "UniqueNewName" is not taken, then the username is updated, the session is refreshed, and a success message is shown
- [ ] AC8: Given a logged-in player changes their username to "TakenName" in settings, when "TakenName" is already taken, then an error "Ce nom d'utilisateur est deja pris" is displayed
- [ ] AC9: Given a logged-in player, when the header identity indicator is displayed, then it shows `session.username` (not displayName)
- [ ] AC10: Given the campaign timeline, when match history cards are rendered, then player names come from `username` column
- [ ] AC11: Given the guest player accesses the app, when the header identity indicator is displayed, then it shows "Invite" (hardcoded via `isGuest` flag, not from a DB name field)
- [ ] AC12: Given the `updateUsernameSchema` validator, when tested with valid input (2-50 chars, trimmed), then it passes; when tested with empty/too-short/too-long input, then it fails with appropriate error messages

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
- Update settings test: assert `updateUsernameSchema` usage instead of `updateDisplayNameSchema`
- Update delete-match test: `username` in toast instead of `displayName`
- Update 3-1-routes test: `username` in army query assertions

**E2E tests (Playwright):**
- Update global-setup seed data: remove `displayName`, use `username` for assertions
- Update logout test: identity indicator checks `username`
- Invite setup E2E: verify username field pre-filled and editable
- Settings E2E: verify username change with uniqueness check

### Notes

- 22 files total to modify across 17 tasks
- The `__guest__` player with username `__guest__` is unaffected — UI already checks `isGuest` for guest display
- `createPlayerSchema` already has `username` with min 2, max 50 — same constraints reused in `updateUsernameSchema`
- `checkUsernameExists()` already exists in `src/db/queries/players.ts` — reuse for uniqueness checks in both invite setup and settings
- High-risk item: `activatePlayer()` TOCTOU protection must be preserved when switching from `displayName` to `username` update — the `WHERE passwordHash IS NULL` guard remains unchanged
- The login flow uses `username` for authentication — since we're allowing username changes, a player who changes their username will need to use the new username to log in next time (this is expected and correct behavior)
