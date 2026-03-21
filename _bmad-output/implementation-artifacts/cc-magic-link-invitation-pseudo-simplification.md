# Story CC: Magic Link Invitation & Pseudo Simplification

Status: ready-for-dev

## Story

As Ben (admin),
I want to create player accounts (pseudo only) and generate invitation links automatically, so that players just need to set their password via the link,
And I want to simplify the player model to a single "pseudo" field (replacing username + displayName), removing the WelcomeModal flow entirely.

## Context

Epic 1 (auth) is complete. The current flow requires Ben to manually create each player account (username + temp password) and share credentials. With ~15 players onboarding and Ben entering the final test phase, this manual setup is a bottleneck. This change makes onboarding admin-driven (Ben creates the account + gets a link to share) while simplifying the data model.

**Key design decisions:**
- Admin creates player (pseudo only) → account created with sentinel `password_hash = '!not-set!'` → invitation link auto-generated → URL displayed in copyable field
- Player setup via `/invite/$token`: password + confirmation only (pseudo shown read-only)
- Login before activation: explicit message ("Ton compte n'est pas encore activé — utilise le lien que Ben t'a envoyé")
- Route `/invite/$token` (dedicated route, not modal on `/login`)
- No SetupAccountModal — the form is directly in the invite route
- Two password fields (password + confirmPassword with Zod `.refine()`)
- No new e2e tests — delete obsolete ones, manual verification only
- Invitation link = generated URL to copy-paste (no email service)
- Pseudo is permanent — not editable after signup
- Guest access unchanged
- Admin can regenerate link for non-activated players

## Acceptance Criteria

**AC1 — Schema migration:**
Given the players table has columns `username`, `display_name`, `has_seen_welcome`,
When the migration runs,
Then `username` is renamed to `pseudo` (UNIQUE preserved), `display_name` and `has_seen_welcome` are dropped, and an `invitations` table is created with columns: id, token (unique), player_id (FK players, NOT NULL), expires_at, used_at, created_at.

**AC2 — Admin creates player and gets invitation link:**
Given I am logged in as admin,
When I enter a pseudo and submit,
Then a player record is created (password_hash = '!not-set!'), an invitation is auto-generated (token = UUID, expires in 7 days), and the full URL `/invite/:token` is displayed in a copyable field.

**AC3 — Admin manages players and regenerates links:**
Given I am in the admin panel,
When I view the player list,
Then I see each player with their status (Actif / En attente) and a "Regenerer le lien" button for non-activated players (generates a new invitation, invalidates the previous one).

**AC4 — Player opens valid invitation:**
Given I have a valid invitation link,
When I navigate to `/invite/$token`,
Then I see a setup form with my pseudo displayed read-only and fields for password + confirm password.

**AC5 — Player activates account via invitation:**
Given I am on the invitation setup form,
When I enter a password (6-100 chars), a matching confirmation, and submit,
Then `players.password_hash` is updated (bcrypt 12 rounds), the invitation is consumed (used_at set), a session is created, and I am redirected to `/`.

**AC6 — Login before activation:**
Given I have an account that has not been activated (password_hash = '!not-set!'),
When I try to log in on `/login`,
Then I see the message "Ton compte n'est pas encore active — utilise le lien que Ben t'a envoye" and no session is created.

**AC7 — Invalid/expired invitation:**
Given I have an invalid, expired, or already-used invitation link,
When I navigate to `/invite/$token`,
Then I see an error message ("Ce lien n'est plus valide — contacte Ben pour en obtenir un nouveau") with a link to `/login`.

**AC8 — Login with pseudo:**
Given I have an existing activated account,
When I navigate to `/login`,
Then I see a form with "Pseudo" label (not "Identifiant") and can log in with my pseudo + password.

**AC9 — Player list shows pseudo:**
Given I am in the admin panel,
When I view the player list,
Then each player shows their `pseudo` (no separate displayName column).

**AC10 — Header shows pseudo:**
Given I am logged in,
When I view any page,
Then the header identity indicator shows my `pseudo` (was `displayName`).

**AC11 — Guest access unchanged:**
Given I am on /login,
When I click "Continuer en tant qu'invite",
Then guest access works exactly as before.

**AC12 — WelcomeModal removed:**
Given I log in for the first time (or any time),
When the campaign view loads,
Then no WelcomeModal appears — the setup happened at invitation acceptance.

## Tasks / Subtasks

- [ ] Task 1 — Schema migration (AC1)
  - [ ] `src/db/schema.ts` — rename `username` -> `pseudo`, drop `displayName` + `hasSeenWelcome`, add `invitations` table with `player_id FK NOT NULL` + relations
  - [ ] `src/db/seed-admin.ts` — adapt to new column names
  - [ ] Delete `src/db/reset-welcome.ts`
  - [ ] Run `pnpm db:generate` — **manually inspect SQL**: must use `RENAME COLUMN` not DROP+ADD
  - [ ] Run `pnpm db:push` to apply

- [ ] Task 2 — Auth module + validators (AC5, AC6, AC8)
  - [ ] `src/lib/auth.ts` — `SessionData`: `displayName` -> `pseudo`, remove `hasSeenWelcome`. `getSession()`: select `players.pseudo`. `loginPlayer(pseudo, password)`: query by `players.pseudo`. **Detect `password_hash === '!not-set!'`** -> return explicit error message (AC6)
  - [ ] `src/lib/validators.ts` — delete `updateDisplayNameSchema` + `createPlayerSchema`. Rename `loginSchema.username` -> `.pseudo`. Add `setupAccountSchema` (password only):
    ```ts
    z.object({
      password: z.string().min(6).max(100),
      confirmPassword: z.string(),
    }).refine(d => d.password === d.confirmPassword, {
      message: 'Les mots de passe ne correspondent pas',
      path: ['confirmPassword'],
    })
    ```
  - [ ] Add `createPlayerAdminSchema` (admin-side, pseudo only):
    ```ts
    z.object({
      pseudo: z.string().trim().min(2).max(50),
    })
    ```
  - [ ] `src/lib/auth.test.ts` — adapt SessionData assertions
  - [ ] `src/lib/validators.test.ts` — delete obsolete tests, add setupAccount + createPlayerAdmin tests, adapt login tests

- [ ] Task 3 — DB queries (AC2, AC3, AC5, AC7, AC9)
  - [ ] `src/db/queries.ts` — delete `markPlayerWelcomeSeen()`, `updatePlayerDisplayName()`
  - [ ] Rename `checkUsernameExists()` -> `checkPseudoExists()`, adapt `createPlayer()` -> takes `pseudo` only, sets `password_hash = '!not-set!'`
  - [ ] Adapt `ensureGhostPlayer()`, `getGhostPlayerId()`, `getAllPlayers()` — renamed columns
  - [ ] Adapt `getAllArmies()`, `getPlayerArmy()`, `getArmyWithUnits()`, `getTimelineForArmy()` — `playerDisplayName` -> `playerPseudo`, select `players.pseudo`
  - [ ] Add: `createInvitation(playerId)` (generates token, expires 7 days), `getInvitationByToken(token)`, `consumeInvitation(invitationId)` (sets used_at), `getActiveInvitationForPlayer(playerId)`, `invalidatePlayerInvitations(playerId)` (for regeneration)
  - [ ] Add: `activatePlayer(playerId, passwordHash)` — updates `players.password_hash`
  - [ ] Add: `isPlayerActivated(playerId)` — checks `password_hash !== '!not-set!'`

- [ ] Task 4 — Root layout + header (AC10, AC12)
  - [ ] `src/routes/__root.tsx` — `beforeLoad`: add exception for `/invite/`:
    ```ts
    if (location.pathname === '/login' || location.pathname.startsWith('/invite/'))
      return { session: null, army: null, record: null }
    ```
  - [ ] `AppHeader`: `session.displayName` -> `session.pseudo`
  - [ ] Remove all `hasSeenWelcome` references

- [ ] Task 5 — Login page (AC6, AC8)
  - [ ] `src/routes/login.tsx` — label "Identifiant" -> "Pseudo", field `username` -> `pseudo`, `loginFn` passes `pseudo` to `loginPlayer()`
  - [ ] Handle "not activated" error response — display the explicit message from AC6

- [ ] Task 6 — Admin panel — create players + manage invitations (AC2, AC3, AC9)
  - [ ] `src/routes/admin/index.tsx` — replace `createPlayerFn` (was username + tempPassword) with new flow: `createPlayerAndInviteFn` takes `{ pseudo }` -> creates player (password_hash = '!not-set!') + creates invitation -> returns full URL `/invite/:token`
  - [ ] UI: form with pseudo input + submit -> displays copyable invitation URL
  - [ ] Player list: show `pseudo` + status column (Actif / En attente based on password_hash sentinel)
  - [ ] "Regenerer le lien" button for non-activated players -> `regenerateInvitationFn` (invalidates old invitations, creates new one, returns URL)
  - [ ] Constant `INVITATION_EXPIRY_DAYS = 7`

- [ ] Task 7 — Invitation route `/invite/$token` (AC4, AC5, AC7)
  - [ ] Create `src/routes/invite/$token.tsx`
  - [ ] `beforeLoad`: validate token server-side (exists, not expired, not used). If invalid -> show error + link to `/login`. If valid -> return player pseudo for display
  - [ ] Render form: pseudo read-only (displayed as info), password + confirm password fields
  - [ ] Server function `acceptInvitationFn` (POST): validate password schema, hash password (bcrypt 12), call `activatePlayer(playerId, hash)`, consume invitation, create session, redirect to `/`
  - [ ] Include `useHydrated` + `data-app-hydrated` block (mandatory E2E pattern)

- [ ] Task 8 — Cleanup UI + tests (AC10, AC11, AC12)
  - [ ] Delete `src/components/welcome-modal.tsx`
  - [ ] `src/routes/index.tsx` — remove all WelcomeModal imports, `markWelcomeSeenFn`, `updateDisplayNameFn`, `modalOpen` state, handlers, `<WelcomeModal>` JSX
  - [ ] Grep global for `displayName` / `playerDisplayName` — fix all remaining references:
    - `src/routes/armies/$armyId.tsx`, `src/routes/armies/index.tsx`, `src/components/army-list-item.tsx`, `src/routes/match/$matchId/post-match.tsx`
  - [ ] Delete `e2e/welcome-modal.spec.ts`
  - [ ] Adapt e2e files (displayName -> pseudo, remove hasSeenWelcome):
    - `e2e/global-setup.ts`, `e2e/helpers/db.ts`, `e2e/admin.spec.ts`, `e2e/admin-list-delete.spec.ts`, `e2e/logout.spec.ts`
  - [ ] Adapt integration tests: `tests/integration/auth.test.ts`, other test files referencing `displayName`

## Dev Notes

### Execution order
Task 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 (linear dependencies on schema + types)

### Migration risk
Drizzle `generate` may interpret column rename as DROP+ADD. **Always inspect the generated SQL file** and manually correct to `ALTER TABLE players RENAME COLUMN username TO pseudo` if needed. The UNIQUE constraint is preserved automatically by PostgreSQL on rename.

### Ghost player
`ensureGhostPlayer()` and `getGhostPlayerId()` query by `players.username = '__guest__'`. After rename, this becomes `players.pseudo = '__guest__'`. Update both functions.

### Password sentinel pattern
Players created by admin get `password_hash = '!not-set!'` (same pattern as `!no-login!` for the ghost player). This sentinel is:
- Checked in `loginPlayer()` to return an explicit "not activated" message
- Checked in admin player list to determine status (Actif vs En attente)
- Replaced by a real bcrypt hash when the player activates via `/invite/$token`
- **Never valid as a bcrypt hash** — bcrypt hashes always start with `$2b$`

### Invitation regeneration
When admin clicks "Regenerer le lien" for a player:
1. All existing invitations for that player are invalidated (set used_at = now)
2. A new invitation is created (new token, new 7-day expiry)
3. The new URL is returned and displayed

### Existing sessions
Column rename preserves data — existing sessions remain valid. No session invalidation needed.

### Invitation token format
`crypto.randomUUID()` — 122 bits of entropy, URL-safe, consistent with all other IDs in the project.

### Files inventory (24+ files affected)

**Schema/Data:**
- `src/db/schema.ts`, `src/db/queries.ts`, `src/db/seed-admin.ts`
- `src/db/reset-welcome.ts` (DELETE)

**Auth/Validation:**
- `src/lib/auth.ts`, `src/lib/validators.ts`
- `src/lib/auth.test.ts`, `src/lib/validators.test.ts`

**Routes:**
- `src/routes/__root.tsx`, `src/routes/index.tsx`, `src/routes/login.tsx`
- `src/routes/admin/index.tsx`
- `src/routes/invite/$token.tsx` (NEW)
- `src/routes/armies/$armyId.tsx`, `src/routes/armies/index.tsx`

**Components:**
- `src/components/welcome-modal.tsx` (DELETE)
- `src/components/army-list-item.tsx`

**E2E/Tests:**
- `e2e/welcome-modal.spec.ts` (DELETE)
- `e2e/global-setup.ts`, `e2e/helpers/db.ts`, `e2e/admin.spec.ts`
- `e2e/admin-list-delete.spec.ts`, `e2e/logout.spec.ts`
- `tests/integration/auth.test.ts`

## Verification

1. `pnpm db:push` — migration applied without error
2. `pnpm typecheck` — zero TS errors
3. `pnpm test` — all unit tests pass
4. `pnpm lint` — zero errors
5. Manual test:
   - Admin creates player "Thibault" in `/admin` -> invitation URL displayed
   - Copy URL -> open in private browsing -> `/invite/$token` -> pseudo "Thibault" shown read-only + password form
   - Enter password + confirm -> redirected to `/`
   - Log out -> log in with pseudo "Thibault" + password on `/login`
   - Admin creates player "Lucas" -> try logging in as Lucas on `/login` before activation -> explicit "not activated" message
   - Admin clicks "Regenerer le lien" for Lucas -> new URL displayed
   - Open new URL -> activate -> works
   - Old URL -> shows "invalid link" error
   - Guest access still works
   - Admin player list shows pseudo + status correctly
