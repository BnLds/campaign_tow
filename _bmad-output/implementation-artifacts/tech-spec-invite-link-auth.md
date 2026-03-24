---
title: 'Invite Link Authentication'
slug: 'invite-link-auth'
created: '2026-03-24'
status: 'implementation-complete'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['TanStack Start', 'Drizzle ORM', 'PostgreSQL', 'bcryptjs', 'Zod v4', 'shadcn/ui', 'TanStack Form', 'TanStack Query']
files_to_modify: ['src/db/schema.ts', 'src/lib/auth.ts', 'src/lib/validators.ts', 'src/db/queries/players.ts', 'src/routes/invite.$token.tsx', 'src/routes/index.tsx', 'src/routes/__root.tsx', 'src/routes/admin/index.tsx', 'src/components/welcome-modal.tsx', 'src/lib/session-queries.ts']
code_patterns: ['createServerFn() + middleware chain', 'dynamic import in middleware (server-only)', 'bcryptjs.hash(pw, 12)', 'crypto.randomUUID() for IDs', 'ServerResult<T> return type', 'beforeLoad route protection', 'useRouteContext for session', 'TanStack Query invalidation']
test_patterns: ['integration tests in tests/integration/', 'E2E Playwright in e2e/', 'unit tests colocated src/**/*.test.ts', 'ATDD Given/When/Then', 'coupled assertions (regex match)']
---

# Tech-Spec: Invite Link Authentication

**Created:** 2026-03-24

## Overview

### Problem Statement

The current player creation flow requires the admin to define a temporary password and communicate it out-of-band to each player. There is no password recovery mechanism — if a player forgets their password, the admin must manually reset it. This creates friction for both admin and players.

### Solution

Replace the temporary password with a permanent invite link per player. The link serves two purposes:
1. **First login** — brings the player to a setup page where they validate/modify their display name and set their password.
2. **Password recovery** — if the player forgets their password, the same link auto-logs them in and they can change their password in settings.

The classic username/password login remains the primary authentication path. The invite link is a secondary/auxiliary channel.

### Scope

**In Scope:**
- Add `inviteToken` column (indexed, unique) to `players` table
- Make `passwordHash` nullable (null = account not yet activated)
- Generate `inviteToken` automatically on player creation (admin flow)
- New route `/invite/:token` with setup page (first access) and auto-login (subsequent access)
- Setup page: editable display name (pre-filled), password + confirm password fields
- Admin UI: "Copy link" button per player in player list (token fetched on-demand, not pre-loaded)
- Admin UI: "Regenerate link" button with confirmation modal
- Admin UI: "Generate all missing tokens" bulk action for existing players
- Remove WelcomeModal (replaced by invite setup page)
- Settings page: password change option (requires current password for activated accounts)
- Rate limiting on `/invite/:token` route (anti brute-force)
- On auto-login via invite, invalidate all other sessions for the player (session takeover protection)

**Out of Scope:**
- Email/notification delivery of invite links
- Changes to guest access flow (unchanged)
- Changes to the classic login form (unchanged)

## Context for Development

### Codebase Patterns

- Server functions use `createServerFn()` with middleware chain (`authMiddleware`, `adminMiddleware`)
- Middleware uses dynamic imports to keep server-only code out of client bundle (e.g. `const { getSession } = await import('./auth')`)
- Session management via HTTP-only signed cookies (`session_id`) + `sessions` DB table (30-day expiry, `SESSION_DURATION_DAYS = 30`)
- Drizzle ORM with `pgTable` schema definitions in `src/db/schema.ts`
- Zod v4 validators in `src/lib/validators.ts`, used directly with TanStack Form (Standard Schema, no adapter)
- Route protection via `beforeLoad` in `__root.tsx` line 49 → redirect to `/login` if no session. Currently only `/login` is excluded.
- Admin pages check `session.isAdmin` in `beforeLoad`
- Password hashing uses `bcryptjs.hash(password, 12)` — 12 rounds
- Player IDs use `crypto.randomUUID()` via `$defaultFn`
- Server functions return `ServerResult<T>` pattern: `{ success: true, data: T }` or `{ success: false, error: {...} }`
- Rate limiting on login: 10 failures per username per 15 min (in-memory Map in `login.tsx`)

### Files to Reference

| File | Purpose | Key Lines |
| ---- | ------- | --------- |
| `src/db/schema.ts` | Players table (L16-25), sessions table (L27-34) | `passwordHash: text('password_hash').notNull()`, `hasSeenWelcome: boolean` |
| `src/lib/auth.ts` | `SessionData` type (L14-20), `getSession()` (L22-52), `createSession()` (L54-70), `loginPlayer()` (L82-94) | `hasSeenWelcome` in SessionData |
| `src/lib/middleware.ts` | `authMiddleware` (L15-20), `adminMiddleware` (L24-31), `armyOwnerMiddleware` (L39-52) | Dynamic imports pattern |
| `src/lib/validators.ts` | `loginSchema` (L6-10), `createPlayerSchema` (L19-23 — has `tempPassword`), `updateDisplayNameSchema` (L13-16) | `tempPassword: string.min(6).max(100)` |
| `src/db/queries/players.ts` | `createPlayer(username, passwordHash)` (L31-46), `getAllPlayers()` (L48-60), `markPlayerWelcomeSeen()` (L14-16), `ensureGhostPlayer()` (L66-83) | Ghost player uses `'!no-login!'` sentinel hash |
| `src/routes/login.tsx` | `loginFn` (L58-80), `guestLoginFn` (L50-56), rate limiter (L16-44) | Unprotected route |
| `src/routes/index.tsx` | `markWelcomeSeenFn` (L15-21), `updateDisplayNameFn` (L23-31), WelcomeModal usage (L342-348), modal open logic (L171-172) | `modalOpen = !hasSeenWelcome && !modalDismissed` |
| `src/routes/__root.tsx` | `beforeLoad` auth check (L45-69), `/login` exclusion (L49), AppHeader with logout (L121-399) | Session context injection |
| `src/routes/admin/index.tsx` | `createPlayerFn` (L15-43 — hashes `tempPassword`), `listPlayersFn` (L46-51), `deletePlayerFn` (L54-64), player list UI (L635+) | No invite link UI yet |
| `src/components/welcome-modal.tsx` | WelcomeModal component (L1-92) — display name edit + dismiss | To be deleted |
| `src/lib/session-queries.ts` | `getSessionFn` (L14-17), `sessionQueryOptions()` | `SessionData` includes `hasSeenWelcome` |
| `src/db/seed-admin.ts` | Admin seed with `ADMIN_PASSWORD_HASH` env var (L1-42) | Must still work with nullable `passwordHash` |

### Technical Decisions

1. **`inviteToken` stored in DB** (not JWT) — simple, auditable, revocable via regeneration. No dependency on signing secrets.
2. **`passwordHash` nullable** — `null` means account not yet activated (first access). No extra boolean column needed. Currently `notNull` in schema — migration required.
3. **Token format**: `crypto.randomUUID()` — consistent with existing `id` generation pattern in the schema. 122 bits of entropy — sufficient against brute-force even without expiration, but rate-limiting adds defense in depth.
4. **Invite link is secondary** — classic login remains primary. The invite link is for onboarding and recovery.
5. **WelcomeModal removed** — the invite setup page replaces it entirely. `hasSeenWelcome` column removed from schema, `SessionData` type, and all references.
6. **`/invite/$token` added to `__root.tsx` exclusion list** — alongside `/login`, this route must be accessible without authentication.
7. **Ghost player unaffected** — `ensureGhostPlayer()` uses `'!no-login!'` sentinel for `passwordHash`, not null. With nullable hash, ghost player still works (non-null sentinel).
8. **`seed-admin.ts` unaffected** — admin is created with a real `passwordHash` from env var. Nullable column doesn't break this.
9. **`loginPlayer()` must handle nullable hash** — if `passwordHash` is null, `bcryptjs.compare()` would fail. Add explicit null check → return false (player must use invite link first).
10. **`inviteToken` NOT returned in `getAllPlayers()`** — tokens are sensitive bearer credentials. Admin fetches a single token on-demand via a dedicated `getInviteLinkFn` server function to minimize exposure surface (prevents XSS/extension from harvesting all tokens at once).
11. **Rate limiting on `/invite/$token`** — reuse the same in-memory rate-limiter pattern as login. 10 lookups per IP per 15 min. Prevents brute-force token enumeration.
12. **Auto-login invalidates other sessions** — when a player is auto-logged in via invite token, all their existing sessions are deleted first. Prevents silent session accumulation if a token leaks.
13. **Password change requires current password (for activated accounts)** — if the player already has a `passwordHash` set, they must provide their current password to change it. This prevents an attacker with a stolen session from locking out the legitimate player. Players who just activated (first time on settings page after invite setup) have their password freshly set — this is not burdensome.
14. **Zod v4 `.refine()` + `path` compatibility** — Zod v4 supports `.refine()` with `path` for error attribution, but this must be verified at dev time with TanStack Form + Standard Schema. If field-level error routing fails, switch to `.superRefine()` with `ctx.addIssue()` which gives explicit control over error path.
15. **Invite route uses `loader` (not `beforeLoad`) for side-effects** — `beforeLoad` is designed for navigation guards. The auto-login flow (session creation + redirect) is a side-effect that belongs in `loader`. Using `loader` also avoids potential double-execution from navigation re-triggers or prefetching.

## Implementation Plan

### Tasks

- [x] **Task 1: Schema migration — `inviteToken` + `passwordHash` nullable + remove `hasSeenWelcome`**
  - File: `src/db/schema.ts`
  - Action: Modify `players` table definition:
    1. Add column: `inviteToken: text('invite_token').unique()`
    2. Change column: `passwordHash: text('password_hash')` (remove `.notNull()`)
    3. Remove column: `hasSeenWelcome` (entire line)
  - File: Drizzle migration
  - Action: Run `pnpm drizzle-kit generate` to create migration, then `pnpm drizzle-kit migrate`
  - Notes: Existing players in DB already have `passwordHash` set — nullable migration is safe. Existing rows get `inviteToken: null` — admin can generate tokens individually or in bulk (see Task 6). Migration is backward-compatible; rollback would require re-adding the columns with sensible defaults but no data is lost since `hasSeenWelcome` state is no longer needed (replaced by `passwordHash IS NULL` check).

- [x] **Task 2: Update `SessionData` type and `getSession()` — remove `hasSeenWelcome`**
  - File: `src/lib/auth.ts`
  - Action:
    1. Remove `hasSeenWelcome` from `SessionData` type (L18)
    2. Remove `hasSeenWelcome` from the SELECT in `getSession()` query (L35)
    3. Add null check in `loginPlayer()` (L82-94): if player's `passwordHash` is null, return false immediately before calling `bcryptjs.compare()`
    4. Add `deletePlayerSessions(playerId: string)` function: `DELETE FROM sessions WHERE playerId = $id` — used by auto-login to invalidate prior sessions
  - File: `src/lib/session-queries.ts`
  - Action: No structural change needed — `SessionData` type update propagates automatically
  - Notes: TypeScript will flag all broken references to `hasSeenWelcome` after this change — use compiler errors as a cleanup checklist.

- [x] **Task 3: Update player queries — `createPlayer()`, `getAllPlayers()`, new invite queries**
  - File: `src/db/queries/players.ts`
  - Action:
    1. Modify `createPlayer(username: string, displayName?: string)`:
       - Remove `passwordHash` parameter
       - Auto-generate `inviteToken: crypto.randomUUID()`
       - Insert with `passwordHash: null`, `displayName: displayName ?? username`
       - Return `{ id, username, displayName, inviteToken }` (add `inviteToken` to returning clause)
    2. `getAllPlayers()` remains unchanged — do NOT add `inviteToken` to SELECT (token is sensitive, fetched on-demand only)
    3. Remove `markPlayerWelcomeSeen()` function entirely (L14-16)
    4. Add new function `getPlayerByInviteToken(token: string)`:
       - `SELECT id, username, displayName, passwordHash, inviteToken FROM players WHERE inviteToken = token`
       - Returns player or null
    5. Add new function `activatePlayer(playerId: string, passwordHash: string, displayName: string)`:
       - Wrapped in a **transaction**: re-check `passwordHash IS NULL` before updating (optimistic lock — prevents race condition where two concurrent activations both succeed)
       - `UPDATE players SET passwordHash = $hash, displayName = $name WHERE id = $id AND passwordHash IS NULL`
       - If 0 rows affected: throw error "Player already activated" (concurrent request lost the race)
    6. Add new function `regenerateInviteToken(playerId: string)`:
       - `UPDATE players SET inviteToken = crypto.randomUUID() WHERE id = $id RETURNING inviteToken`
       - If 0 rows affected: return null (player not found — caller must handle)
    7. Add new function `updatePlayerPassword(playerId: string, passwordHash: string)`:
       - `UPDATE players SET passwordHash = $hash WHERE id = $id`
    8. Add new function `getPlayerInviteToken(playerId: string)`:
       - `SELECT inviteToken FROM players WHERE id = $id`
       - Returns `{ inviteToken: string | null }` or null (player not found)
       - Used by admin UI to fetch a single token on-demand
    9. Add new function `generateAllMissingInviteTokens()`:
       - `UPDATE players SET inviteToken = gen_random_uuid() WHERE inviteToken IS NULL AND passwordHash != '!no-login!' RETURNING id, inviteToken`
       - PostgreSQL `gen_random_uuid()` used for bulk UPDATE (Node `crypto.randomUUID()` cannot be used in SQL)
       - Returns count of tokens generated
       - Excludes ghost player (sentinel hash check)
  - Notes: `ensureGhostPlayer()` unchanged — ghost uses `'!no-login!'` sentinel, not null.

- [x] **Task 4: Update validators — replace `createPlayerSchema`, add invite and password schemas**
  - File: `src/lib/validators.ts`
  - Action:
    1. Replace `createPlayerSchema` (currently has `tempPassword`):
       ```typescript
       export const createPlayerSchema = z.object({
         username: z.string().trim().min(2).max(50),
         displayName: z.string().trim().min(1).max(100).optional(),
       })
       ```
    2. Add `inviteSetupSchema`:
       ```typescript
       export const inviteSetupSchema = z.object({
         displayName: z.string().trim().min(1).max(100),
         password: z.string().min(6).max(100),
         confirmPassword: z.string().min(6).max(100),
       }).superRefine((d, ctx) => {
         if (d.password !== d.confirmPassword) {
           ctx.addIssue({
             code: 'custom',
             message: 'Les mots de passe ne correspondent pas',
             path: ['confirmPassword'],
           })
         }
       })
       ```
       Note: Uses `.superRefine()` + `ctx.addIssue()` instead of `.refine()` + `path` — more reliable error path attribution with TanStack Form + Zod v4 Standard Schema integration. Verify at dev time that field-level errors render correctly.
    3. Add `changePasswordSchema`:
       ```typescript
       export const changePasswordSchema = z.object({
         currentPassword: z.string().min(1).max(100).optional(),
         newPassword: z.string().min(6).max(100),
         confirmNewPassword: z.string().min(6).max(100),
       }).superRefine((d, ctx) => {
         if (d.newPassword !== d.confirmNewPassword) {
           ctx.addIssue({
             code: 'custom',
             message: 'Les mots de passe ne correspondent pas',
             path: ['confirmNewPassword'],
           })
         }
       })
       ```
       Note: `currentPassword` is optional at the schema level — the server function enforces it conditionally (required only if the player already has a password set). See Task 9.
    4. Remove `UpdateDisplayNameInput` type export if only used by WelcomeModal
  - Notes: Keep `updateDisplayNameSchema` — it may be reused in settings. Remove only if confirmed unused after WelcomeModal deletion.

- [x] **Task 5: Update admin player creation form and server function**
  - File: `src/routes/admin/index.tsx`
  - Action:
    1. Update `createPlayerFn` (L15-43):
       - Remove `tempPassword` from validator (use new `createPlayerSchema`)
       - Remove `bcryptjs.hash()` call
       - Call `createPlayer(username, displayName)` (no hash)
       - Return `{ id, username, displayName, inviteToken }`
    2. Update create player form UI:
       - Remove password input field
       - Keep username field
       - Add optional display name field
    3. `listPlayersFn` return — `getAllPlayers()` does NOT include `inviteToken` (fetched on-demand)
  - Notes: Admin no longer sets passwords. The only password entry point is the invite setup page or settings.

- [x] **Task 6: Admin UI — copy invite link + regenerate link + bulk generate buttons**
  - File: `src/routes/admin/index.tsx`
  - Action:
    1. Add `getInviteLinkFn` server function:
       - Middleware: `adminMiddleware`
       - Validator: `z.object({ playerId: z.string().uuid() })`
       - Action: call `getPlayerInviteToken(playerId)` — if player not found, return error `{ code: 'PLAYER_NOT_FOUND' }`
       - Return: `ServerResult<{ inviteToken: string | null }>`
    2. Add invite link button per player row (conditional label):
       - If token unknown (default state): label "Copier le lien"
       - onClick: call `getInviteLinkFn({ playerId })` → if `inviteToken` is null, call `regenerateInviteTokenFn` first → then copy URL to clipboard
       - Button state: default icon (link/copy) → "Copié !" for 2 seconds → back to default
       - Hide for admin's own row (admin doesn't need an invite link)
    3. Add "Regénérer" button per player row:
       - onClick: open confirmation dialog/modal
       - Confirmation text: "Regénérer le lien d'invitation ? L'ancien lien sera définitivement invalidé."
       - On confirm: call `regenerateInviteTokenFn({ playerId })`
       - On success: clear cached token state for that player
       - Hide for admin's own row
    4. Add `regenerateInviteTokenFn` server function:
       - Middleware: `adminMiddleware`
       - Validator: `z.object({ playerId: z.string().uuid() })`
       - **Guard**: reject if `playerId === session.playerId` (admin cannot regenerate own token — return error `{ code: 'CANNOT_REGENERATE_OWN' }`)
       - Action: call `regenerateInviteToken(playerId)` — if null returned (player not found), return error `{ code: 'PLAYER_NOT_FOUND' }`
       - Return: `ServerResult<{ inviteToken: string }>`
    5. Add "Générer tous les liens manquants" button (bulk action):
       - Visible only if at least one player has `inviteToken: null` (use a boolean flag from `listPlayersFn` or count)
       - onClick: call `generateAllMissingTokensFn({ })`
       - On success: invalidate player list query, show count of generated tokens
    6. Add `generateAllMissingTokensFn` server function:
       - Middleware: `adminMiddleware`
       - Action: call `generateAllMissingInviteTokens()`
       - Return: `ServerResult<{ count: number }>`
    7. Update `listPlayersFn` to include a `hasMissingTokens: boolean` flag (derived from query: `EXISTS (SELECT 1 FROM players WHERE inviteToken IS NULL AND passwordHash != '!no-login!')`)
  - Notes: Use shadcn `AlertDialog` for confirmation (already available). Copy feedback via button text change (no toast system needed). Token is fetched on-demand per click, never pre-loaded in the player list response — minimizes exposure surface.

- [x] **Task 7: Create invite route `/invite/$token` — setup page + auto-login**
  - File: `src/routes/invite.$token.tsx` (new file)
  - Action:
    1. **Rate limiter** (same pattern as `login.tsx`):
       - In-memory Map keyed by IP address (extracted from request headers)
       - 10 token lookups per IP per 15 min
       - On limit exceeded: return `{ status: 'rate_limited' as const }` — render "Trop de tentatives, réessayez plus tard." with link to `/login`
    2. Route `loader` (NOT `beforeLoad` — the auto-login creates sessions, which is a side-effect that belongs in `loader`):
       - Check rate limit first — reject if exceeded
       - Extract `token` from route params
       - Call `getPlayerByInviteTokenFn({ token })` (server function)
       - If not found: return `{ status: 'invalid' as const }`
       - If found + `passwordHash` is null: return `{ status: 'setup' as const, player: { id, displayName } }`
       - If found + `passwordHash` is not null: call `autoLoginViaInviteFn({ token })` (server function that invalidates existing sessions + creates new session) → `throw redirect({ to: '/' })` — no flash of content
    3. Component rendering:
       - `status === 'rate_limited'`: error page with "Trop de tentatives" message + link to `/login`
       - `status === 'invalid'`: error page with "Lien invalide" message + link to `/login` (intentionally generic — does not distinguish between "token never existed" and "player was deleted", to avoid leaking account existence info)
       - `status === 'setup'`: setup form (see below)
    4. Setup form (TanStack Form + `inviteSetupSchema`):
       - Display name input (pre-filled, editable, `<Input>` component)
       - Password input (`type="password"`)
       - Confirm password input (`type="password"`)
       - Submit button: "C'est parti"
       - Inline field validation errors (verify that `.superRefine()` error on `confirmPassword` path renders correctly at dev time)
    5. Setup submit server function `completeInviteSetupFn`:
       - No auth middleware (unauthenticated route)
       - Check rate limit (same limiter as loader — prevents spamming submit)
       - Validate with `inviteSetupSchema`
       - Call `activatePlayer(playerId, hash, displayName)` — this function uses optimistic locking internally (checks `passwordHash IS NULL` in WHERE clause, see Task 3). If it throws (player already activated by concurrent request), return error `{ code: 'ALREADY_ACTIVATED' }`
       - `bcryptjs.hash(password, 12)`
       - Call `createSession(playerId)`
       - Redirect to `/`
    6. `autoLoginViaInviteFn` server function:
       - No auth middleware (unauthenticated — the token IS the credential)
       - Validate: `z.object({ token: z.string().uuid() })`
       - Re-lookup player by token (fresh check — prevent TOCTOU)
       - If not found or `passwordHash` is null: return error (should not happen if loader called correctly)
       - **Invalidate all existing sessions for this player**: `DELETE FROM sessions WHERE playerId = $id` — prevents silent session accumulation from leaked tokens
       - Call `createSession(playerId)`
       - Return success (caller does the redirect)
    7. Page styling: warm, welcoming — title "Bienvenue dans Campaign TOW !", brief intro text, Campaign TOW branding
  - File: `src/routes/__root.tsx`
  - Action: Add `/invite` to the `beforeLoad` exclusion list (L49). Use `location.pathname.startsWith('/invite')` to match all `/invite/*` paths.
  - Notes: The auto-login uses `loader` + `throw redirect()` for a seamless server-side redirect — no flash of content. `autoLoginViaInviteFn` is a separate server function from the lookup to keep concerns clean.

- [x] **Task 8: Remove WelcomeModal and all `hasSeenWelcome` references**
  - File: `src/components/welcome-modal.tsx`
  - Action: Delete entire file
  - File: `src/routes/index.tsx`
  - Action:
    1. Remove `WelcomeModal` import
    2. Remove `markWelcomeSeenFn` server function (L15-21)
    3. Remove `updateDisplayNameFn` server function (L23-31) — display name editing moves to settings
    4. Remove `modalOpen`, `modalDismissed` state variables and `handleDismiss`, `handleUpdateDisplayName` handlers
    5. Remove `<WelcomeModal>` JSX block (L342-348)
    6. Remove `hasSeenWelcome` from any reactive query destructuring (L171-172)
  - File: `src/db/queries/players.ts`
  - Action: Verify `markPlayerWelcomeSeen()` was already removed in Task 3
  - File: grep for remaining `hasSeenWelcome` references across codebase
  - Action: Remove all remaining references (test files, type assertions, etc.)
  - Notes: Run `pnpm typecheck` after this task — TypeScript will catch any missed references.

- [x] **Task 9: Settings page — password change + display name edit**
  - File: `src/routes/settings.tsx` (new file) or add section to existing profile/header menu
  - Action:
    1. Create settings route `/settings` (protected by auth, `beforeLoad` checks session)
    2. Password change form (TanStack Form + `changePasswordSchema`):
       - Current password field (conditionally shown — see below)
       - New password field
       - Confirm new password field
       - Submit button: "Changer le mot de passe"
       - **Current password logic**: the form shows the `currentPassword` field only if the player's account has been activated (i.e., they previously set a password). To determine this, use the session context: if the player reached settings, they are authenticated. The `changePasswordFn` server function enforces this check server-side regardless of the UI state.
    3. `changePasswordFn` server function:
       - Middleware: `authMiddleware`
       - Validate with `changePasswordSchema`
       - **Server-side guard**: look up the player's current `passwordHash` from DB. If it is not null (account was previously activated), `currentPassword` is required — verify with `bcryptjs.compare()`. If `currentPassword` is missing or wrong, return error `{ code: 'INVALID_CURRENT_PASSWORD' }`.
       - If `passwordHash` is null (freshly activated via invite, hasn't set password yet — edge case), skip current password check.
       - Hash new password: `bcryptjs.hash(newPassword, 12)`
       - Call `updatePlayerPassword(session.playerId, newHash)`
       - Return success
    4. Display name edit form (reuse `updateDisplayNameSchema`):
       - Pre-filled input with current `session.displayName`
       - `updateDisplayNameFn` server function (moved from campaign page)
       - On success: invalidate session query
    5. Add "Paramètres" link in AppHeader menu (alongside "Se déconnecter")
  - File: `src/routes/__root.tsx`
  - Action: Add "Paramètres" link in AppHeader dropdown/menu (L121-399)
  - Notes: Hide settings link for guests (`session.isGuest`). Settings page should be clean and minimal — just the two forms.

- [x] **Task 10: Update existing tests + write new tests**
  - File: `src/lib/validators.test.ts`
  - Action:
    1. Update `createPlayerSchema` tests (remove `tempPassword` assertions)
    2. Add `inviteSetupSchema` tests: valid input, password mismatch (error on `confirmPassword` path), short password, empty display name
    3. Add `changePasswordSchema` tests: valid input, password mismatch (error on `confirmNewPassword` path), short password
    4. Verify `.superRefine()` error path attribution: assert that the error `path` array includes the correct field name (not root-level)
  - File: `tests/integration/admin.test.ts`
  - Action:
    1. Update `createPlayerFn` tests: no tempPassword, returns inviteToken
    2. Add `regenerateInviteTokenFn` tests: generates new token, old token invalid
    3. Add `regenerateInviteTokenFn` guard test: admin cannot regenerate own token → returns error `CANNOT_REGENERATE_OWN`
    4. Add `regenerateInviteTokenFn` test: non-existent playerId → returns error `PLAYER_NOT_FOUND`
    5. Add `getInviteLinkFn` test: returns token for valid player, returns `PLAYER_NOT_FOUND` for invalid player
    6. Add `generateAllMissingTokensFn` test: generates tokens for players without one, skips ghost player, returns count
  - File: `tests/integration/invite.test.ts` (new file)
  - Action:
    1. Test `getPlayerByInviteToken()`: valid token, invalid token, null token
    2. Test `activatePlayer()`: sets passwordHash and displayName; concurrent activation → second call fails (optimistic lock)
    3. Test `completeInviteSetupFn`: full flow — token lookup, password hash, session creation
    4. Test auto-login path: player with password set → existing sessions invalidated → new session created
    5. Test invalid token → error response
    6. Test rate limiting: 11th request within 15 min → rate limited response
  - File: `tests/integration/settings.test.ts` (new file)
  - Action:
    1. Test `changePasswordFn` with current password: correct current password → success
    2. Test `changePasswordFn` with wrong current password → error `INVALID_CURRENT_PASSWORD`
    3. Test `changePasswordFn` without current password for activated account → error
    4. Test `changePasswordFn` password mismatch → validation error
    5. Test `updateDisplayNameFn` (moved from campaign page)
  - File: `e2e/invite-flow.spec.ts` (new file)
  - Action:
    1. Full E2E: admin creates player → copies link → player visits → setup → redirect to campaign
    2. Recovery E2E: player with password visits invite link → auto-login → campaign
    3. Invalid token E2E: visit bad token → error page
    4. Regeneration E2E: admin regenerates → old link fails → new link works
    5. Rate limit E2E: rapid requests → rate limited page shown
  - File: `e2e/welcome-modal.spec.ts`
  - Action: Delete or repurpose — WelcomeModal no longer exists
  - File: `tests/integration/welcome-modal.test.ts`
  - Action: Delete — `markWelcomeSeenFn` and `updateDisplayNameFn` removed from campaign page
  - Notes: Run full test suite after all changes: `pnpm test && pnpm exec playwright test`

### Acceptance Criteria

- [ ] **AC1**: Given an admin on the player creation page, when they submit a username (and optional display name), then a player is created with `passwordHash: null` and a unique `inviteToken`, and the admin sees the new player in the list with a "Copier le lien" button.

- [ ] **AC2**: Given an admin viewing the player list, when they click "Copier le lien" for a player, then the token is fetched on-demand, the full invite URL (`{origin}/invite/{token}`) is copied to clipboard, and the button shows "Copié !" feedback for 2 seconds.

- [ ] **AC3**: Given a player with `passwordHash: null`, when they visit `/invite/:token` with a valid token, then they see a setup page titled "Bienvenue dans Campaign TOW !" with pre-filled display name (editable), password, and confirm password fields. After submitting valid data, they are logged in and redirected to the campaign page.

- [ ] **AC4**: Given a player with `passwordHash` set (account activated), when they visit `/invite/:token` with a valid token, then all their existing sessions are invalidated, a new session is created, and they are redirected to the campaign page (no setup form shown).

- [ ] **AC5**: Given a non-existent or invalidated token, when someone visits `/invite/:token`, then they see a generic error message "Lien invalide" with a link to `/login`, and no session is created. The error does not reveal whether the token never existed or the player was deleted.

- [ ] **AC6**: Given an admin viewing the player list, when they click "Regénérer" and confirm in the dialog, then the player gets a new `inviteToken`, the cached token is cleared, and the old token returns "Lien invalide" (AC5). The "Regénérer" button is hidden for the admin's own row.

- [ ] **AC7**: Given an authenticated player with an existing password on the settings page, when they submit their current password and a new password (with matching confirmation), then their password is updated and they remain logged in. If the current password is wrong, an error is shown.

- [ ] **AC8**: Given a player with a set password, when they log in via `/login` with username and password, then they are authenticated as before (no regression). If a player has `passwordHash: null`, login via `/login` fails with the standard "Identifiants invalides" error.

- [ ] **AC9**: Given any player logging in (classic or invite), when they reach the campaign page, then no WelcomeModal is displayed (component deleted).

- [ ] **AC10**: Given an authenticated non-guest player, when they open the header menu, then they see a "Paramètres" link. Guests do not see this link.

- [ ] **AC11**: Given an admin viewing a player with `inviteToken: null` (existing player before migration), when they click "Copier le lien", the system generates a token first (via `regenerateInviteTokenFn`), then copies the new link. Alternatively, the admin can use the "Générer tous les liens manquants" bulk action.

- [ ] **AC12**: Given a player who already has an active session, when they visit `/invite/:token` with their own valid token and `passwordHash` is set, then their existing sessions are invalidated, a new session is created, and they are redirected to the campaign page.

- [ ] **AC13**: Given more than 10 invite link visits from the same IP within 15 minutes, when the 11th request arrives, then the user sees "Trop de tentatives, réessayez plus tard." with a link to `/login`, and no token lookup is performed.

## Additional Context

### Dependencies

- No new packages required. All dependencies already installed:
  - `drizzle-orm` + `drizzle-kit` (schema + migrations)
  - `crypto.randomUUID()` (Node.js built-in)
  - `bcryptjs` (password hashing)
  - `@tanstack/react-form` + `zod` v4 (form validation)
  - `navigator.clipboard` API (browser built-in)
  - shadcn components: `Button`, `Input`, `AlertDialog`, `Label` (already installed)

### Testing Strategy

- **Unit tests** (`src/**/*.test.ts`):
  - Zod validators: `inviteSetupSchema`, `changePasswordSchema`, updated `createPlayerSchema`
  - Coupled assertions per memory rule (regex patterns for linked behavior)
  - `.superRefine()` error path attribution verification

- **Integration tests** (`tests/integration/`):
  - Player creation with auto-generated token (no password)
  - Invite token lookup: valid (first access), valid (recovery), invalid
  - Player activation: hash set + displayName updated, concurrent activation rejected
  - Token regeneration: new token generated, old token orphaned, admin self-regen blocked, invalid playerId handled
  - On-demand token fetch: valid player, invalid player
  - Bulk token generation: generates for players without token, skips ghost, returns count
  - Password change: correct current password → success, wrong current password → rejected, password mismatch → rejected
  - Classic login regression: still works with set password, fails with null hash
  - Rate limiting: 11th request blocked
  - Auto-login: existing sessions invalidated

- **E2E tests** (`e2e/`):
  - Full invite onboarding flow (admin → player)
  - Recovery flow (auto-login via link)
  - Invalid/regenerated token error page
  - Settings password change (with current password)
  - Classic login unchanged
  - Rate limiting behavior
  - Delete `e2e/welcome-modal.spec.ts` and `tests/integration/welcome-modal.test.ts`

### Migration Strategy for Existing Players

Existing players in the database already have `passwordHash` set (non-null). After migration:
- They can still log in via classic `/login` — no disruption
- Their `inviteToken` will be null — admin can use "Générer tous les liens manquants" bulk action or regenerate individually
- No data loss, no forced password reset

### Security Considerations

- **Invite token is a permanent bearer token.** Acceptable for this closed-audience campaign app (< 20 players, trusted network). Regeneration provides the escape hatch if a link is compromised.
- **Rate limiting** on `/invite/$token` prevents brute-force token enumeration (10 attempts per IP per 15 min). 122-bit UUID entropy makes enumeration infeasible even without rate limiting, but defense in depth.
- **Auto-login invalidates prior sessions** to prevent silent session accumulation from leaked tokens. If an attacker uses a leaked token, the legitimate player's session is terminated — they'll notice on next visit and can ask the admin to regenerate the token.
- **Password change requires current password** for activated accounts. Combined with session invalidation on auto-login, this prevents an attacker with a stolen session from silently locking out the legitimate player.
- **Tokens not pre-loaded in admin list** — fetched on-demand per click to minimize exposure. An XSS on the admin page cannot harvest all tokens from a single API response.
- **HTTPS** — the invite token is visible in the URL path and transmitted in server function requests. Production deployment MUST use HTTPS. Development over plain HTTP is acceptable (localhost only). Add a note in deployment docs if not already present.
- **Generic error on invalid token** — `/invite/:token` returns "Lien invalide" for all failure cases (bad token, deleted player, rate limited after lookup). Does not leak account existence information.

### Notes

- **Deletion list**: `src/components/welcome-modal.tsx`, `e2e/welcome-modal.spec.ts`, `tests/integration/welcome-modal.test.ts`, all `hasSeenWelcome` references
- **`seed-admin.ts`**: unaffected — admin is created with a real `passwordHash` from env var, not via invite flow
- **Guest access (`isGuest`)**: completely unaffected — ghost player keeps `'!no-login!'` sentinel hash
- **Task ordering rationale**: Schema first (Task 1) → type updates (Task 2) → queries (Task 3) → validators (Task 4) → admin form (Task 5) → admin UI buttons (Task 6) → invite route (Task 7) → cleanup WelcomeModal (Task 8) → settings (Task 9) → tests (Task 10). Each task builds on the previous — lowest dependency first.
