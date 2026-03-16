---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate']
lastStep: 'step-04c-aggregate'
lastSaved: '2026-03-13'
workflowType: 'testarch-atdd'
inputDocuments:
  - '_bmad-output/implementation-artifacts/1-7-guest-access-read-only.md'
  - 'src/db/schema.ts'
  - 'src/lib/auth.ts'
  - 'src/db/queries.ts'
  - 'src/routes/login.tsx'
  - 'src/routes/__root.tsx'
  - 'src/routes/index.tsx'
  - 'e2e/global-setup.ts'
  - 'e2e/helpers/waitForHydration.ts'
  - 'e2e/admin-list-delete.spec.ts'
  - 'tests/integration/admin-list-delete.test.ts'
---

# ATDD Checklist — Epic 1, Story 1.7: Guest Access (Read-Only)

**Date:** 2026-03-13
**Author:** Ben
**Primary Test Level:** Integration (static file-contract) + E2E (Playwright)

---

## Story Summary

An unauthenticated visitor can click a guest link on the login page to access the app in read-only mode. A guest session is created pointing to a dedicated ghost player (isGuest: true). All three tabs are accessible but write UI elements are hidden and server functions reject writes. A "Invité" identity indicator and "Se connecter" button replace the normal user identity and logout button.

**As a** unauthenticated visitor
**I want** to browse the campaign in read-only mode
**So that** I can follow the campaign without needing an account

---

## Acceptance Criteria

1. **AC1** — "Continuer en tant qu'invité" link visible on /login page (blue, below login form)
2. **AC2** — Clicking guest link creates a session for the ghost player (isGuest=true), sets cookie, redirects to /
3. **AC3** — Guest can navigate all 3 tabs (Campagne, Armées, Références) without redirect
4. **AC4** — Write UI absent for guests (WelcomeModal, FAB); server functions reject non-reads; ghost absent from admin list
5. **AC5** — Identity indicator shows "Invité" for guest, "Admin" for admin, displayName otherwise
6. **AC6** — Guest session menu shows "Se connecter" not "Se déconnecter"; "Administration" link absent
7. **AC7** — Clicking "Se connecter" as guest clears session and redirects to /login
8. **AC8** — Write routes (/admin) already protected by existing isAdmin guard (no change needed)

---

## Failing Tests Created (RED Phase)

### Integration Tests (17 tests)

**File:** `tests/integration/guest-access.test.ts`

- ✅ **Test:** `[1.7-INT-001]` isGuest boolean column in players schema
  - **Status:** RED — `src/db/schema.ts` doesn't have `isGuest` column yet
  - **Verifies:** AC2 — schema has `isGuest: boolean('is_guest').notNull().default(false)`

- ✅ **Test:** `[1.7-INT-002]` SessionData.isGuest is boolean (not optional)
  - **Status:** RED — `auth.ts` currently has `isGuest?: boolean` (optional)
  - **Verifies:** AC5 — type is `isGuest: boolean` (non-optional)

- ✅ **Test:** `[1.7-INT-003]` getSession reads isGuest from DB (not hardcoded false)
  - **Status:** RED — `auth.ts` line 49 hardcodes `isGuest: false`
  - **Verifies:** AC2/AC5 — `players.isGuest` in select, `row.isGuest` in return

- ✅ **Test:** `[1.7-INT-004]` queries.ts exports ensureGhostPlayer
  - **Status:** RED — function doesn't exist yet
  - **Verifies:** AC2 — ghost player creation/upsert

- ✅ **Test:** `[1.7-INT-005]` queries.ts exports getGhostPlayerId
  - **Status:** RED — function doesn't exist yet
  - **Verifies:** AC2 — ghost player ID lookup for session creation

- ✅ **Test:** `[1.7-INT-006]` ensureGhostPlayer upserts with username '__guest__'
  - **Status:** RED — function doesn't exist yet
  - **Verifies:** AC2 — ghost player canonical username

- ✅ **Test:** `[1.7-INT-007]` getAllPlayers filters out ghost player (isGuest: false)
  - **Status:** RED — `getAllPlayers` has no isGuest filter yet
  - **Verifies:** AC4 — ghost absent from admin player list

- ✅ **Test:** `[1.7-INT-008]` guestLoginFn assigned to createServerFn
  - **Status:** RED — `guestLoginFn` doesn't exist in `login.tsx`
  - **Verifies:** AC2 — server function for guest session creation

- ✅ **Test:** `[1.7-INT-009]` guestLoginFn uses getGhostPlayerId and createSession
  - **Status:** RED — `guestLoginFn` doesn't exist yet
  - **Verifies:** AC2 — guest session creation logic

- ✅ **Test:** `[1.7-INT-010]` guestLoginFn has POST method and no middleware
  - **Status:** RED — `guestLoginFn` doesn't exist yet
  - **Verifies:** AC2 — public endpoint (no auth required to access guest link)

- ✅ **Test:** `[1.7-INT-011]` guestLoginFn uses dynamic imports (import-protection)
  - **Status:** RED — `guestLoginFn` doesn't exist yet
  - **Verifies:** Architecture — dynamic imports for server-only code

- ✅ **Test:** `[1.7-INT-012]` guest link has data-testid="guest-login-link"
  - **Status:** RED — guest link doesn't exist in login.tsx yet
  - **Verifies:** AC1 — E2E selector contract for guest link

- ✅ **Test:** `[1.7-INT-013]` guest link text coupled with data-testid (same element)
  - **Status:** RED — guest link doesn't exist yet
  - **Verifies:** AC1 — "Continuer en tant qu'invité" text on correct element

- ✅ **Test:** `[1.7-INT-014]` AppHeader identity indicator shows "Invité" for isGuest (coupled)
  - **Status:** RED — `__root.tsx` currently shows `session.isAdmin ? 'Admin' : session.displayName` (no isGuest)
  - **Verifies:** AC5 — "Invité" text for guest sessions

- ✅ **Test:** `[1.7-INT-015]` AppHeader renders login-button for guests (coupled with isGuest)
  - **Status:** RED — `__root.tsx` always renders logout-button (no guest conditional)
  - **Verifies:** AC6 — "Se connecter" button for guests

- ✅ **Test:** `[1.7-INT-016]` login-button and logout-button mutually exclusive via isGuest ternary
  - **Status:** RED — no isGuest ternary in AppHeader yet
  - **Verifies:** AC6 — only one button rendered at a time

- ✅ **Test:** `[1.7-INT-017]` CampaignView guards WelcomeModal with !session?.isGuest
  - **Status:** RED — `index.tsx` has no isGuest guard on WelcomeModal
  - **Verifies:** AC4 — WelcomeModal never opens for guests

### E2E Tests (7 tests)

**File:** `e2e/guest-access.spec.ts`

- ✅ **Test:** `[1.7-E2E-001]` Guest link visible on login page (AC1)
  - **Status:** RED — guest link element doesn't exist yet
  - **Verifies:** AC1 — "Continuer en tant qu'invité" visible on /login

- ✅ **Test:** `[1.7-E2E-002]` Click guest link → redirect to / → "Invité" indicator (AC2)
  - **Status:** RED — guest link and guestLoginFn don't exist yet
  - **Verifies:** AC2 — complete guest login flow

- ✅ **Test:** `[1.7-E2E-003]` Guest can access Campaign view without redirect (AC3)
  - **Status:** RED — guest storageState (.auth/guest.json) doesn't exist yet (global-setup fails)
  - **Verifies:** AC3 — guest read access to app

- ✅ **Test:** `[1.7-E2E-004]` Identity indicator shows "Invité" for guest (AC5)
  - **Status:** RED — isGuest not in AppHeader logic yet
  - **Verifies:** AC5 — "Invité" identity indicator

- ✅ **Test:** `[1.7-E2E-005]` Guest sees "Se connecter" not "Se déconnecter" (AC6)
  - **Status:** RED — AppHeader always shows logout-button
  - **Verifies:** AC6 — session action button for guests

- ✅ **Test:** `[1.7-E2E-006]` "Administration" link absent from DOM for guest (AC6)
  - **Status:** RED — will pass once admin-link is behind session.isAdmin (already is — but needs guest session to verify)
  - **Verifies:** AC6 — admin link absent for guests

- ✅ **Test:** `[1.7-E2E-007]` "Se connecter" click clears session → /login redirect (AC7)
  - **Status:** RED — login-button doesn't exist for guests yet
  - **Verifies:** AC7 — guest session termination

---

## Data Factories Created

None required for this story. The ghost player is created via `ensureGhostPlayer()` in `src/db/queries.ts` and in `e2e/global-setup.ts`.

---

## Fixtures Created

No new fixture files. The guest auth state is saved to `.auth/guest.json` by `saveGuestAuthState()` in `e2e/global-setup.ts`.

---

## Mock Requirements

None — this story uses real server functions and real DB operations (no external services to mock).

---

## Required data-testid Attributes

### Login Page (`src/routes/login.tsx`)

- `guest-login-link` — the "Continuer en tant qu'invité" button/link below the login form

### AppHeader (`src/routes/__root.tsx`)

- `login-button` — "Se connecter" button shown for guest sessions (replaces logout-button)
- `logout-button` — already exists, shown only for non-guest sessions after this story

---

## Implementation Checklist

### Test: [1.7-INT-001] isGuest column in schema

**File:** `tests/integration/guest-access.test.ts`

**Tasks to make this test pass:**

- [ ] Add `isGuest: boolean('is_guest').notNull().default(false)` to `players` table in `src/db/schema.ts`
- [ ] Run `pnpm drizzle-kit generate` then `pnpm drizzle-kit push`
- [ ] Verify `pnpm typecheck` passes
- [ ] Run test: `pnpm test tests/integration/guest-access.test.ts`
- [ ] ✅ Test passes (green phase)

---

### Test: [1.7-INT-002 + INT-003] SessionData.isGuest type fix + getSession reads from DB

**File:** `tests/integration/guest-access.test.ts`

**Tasks to make this test pass:**

- [ ] In `src/lib/auth.ts`, change `isGuest?: boolean` to `isGuest: boolean` in `SessionData` type
- [ ] Add `isGuest: players.isGuest` to the `.select()` in `getSession()`
- [ ] Replace `isGuest: false` with `isGuest: row.isGuest` in the return object
- [ ] Run test: `pnpm test tests/integration/guest-access.test.ts`
- [ ] ✅ Tests pass

---

### Test: [1.7-INT-004 + INT-005 + INT-006] Ghost player queries

**File:** `tests/integration/guest-access.test.ts`

**Tasks to make this test pass:**

- [ ] Add `ensureGhostPlayer()` to `src/db/queries.ts` (upserts ghost player with `username: '__guest__'`)
- [ ] Add `getGhostPlayerId()` to `src/db/queries.ts` (SELECT id WHERE username = '__guest__')
- [ ] Call `ensureGhostPlayer()` at startup or from `guestLoginFn`
- [ ] Run test: `pnpm test tests/integration/guest-access.test.ts`
- [ ] ✅ Tests pass

---

### Test: [1.7-INT-007] getAllPlayers filters ghost

**File:** `tests/integration/guest-access.test.ts`

**Tasks to make this test pass:**

- [ ] Add `.where(eq(players.isGuest, false))` to `getAllPlayers()` in `src/db/queries.ts`
- [ ] Run test: `pnpm test tests/integration/guest-access.test.ts`
- [ ] ✅ Test passes

---

### Test: [1.7-INT-008 to INT-013] guestLoginFn + guest link

**File:** `tests/integration/guest-access.test.ts`

**Tasks to make this test pass:**

- [ ] Add `guestLoginFn` (POST, no middleware, dynamic imports) to `src/routes/login.tsx`
- [ ] Add guest link button with `data-testid="guest-login-link"` and text "Continuer en tant qu'invité"
- [ ] Add `handleGuestLogin` function in `LoginPage`
- [ ] Add required data-testid: `guest-login-link`
- [ ] Run test: `pnpm test tests/integration/guest-access.test.ts`
- [ ] ✅ Tests pass

---

### Test: [1.7-INT-014 to INT-016] AppHeader guest-aware identity + session button

**File:** `tests/integration/guest-access.test.ts`

**Tasks to make this test pass:**

- [ ] Update identity indicator in `AppHeader` to: `session.isGuest ? 'Invité' : session.isAdmin ? 'Admin' : session.displayName`
- [ ] Add conditional session button: guest → `data-testid="login-button"` ("Se connecter"), others → existing logout-button
- [ ] Both buttons call `handleLogout` (clears session → /login)
- [ ] Run test: `pnpm test tests/integration/guest-access.test.ts`
- [ ] ✅ Tests pass

---

### Test: [1.7-INT-017] WelcomeModal guard

**File:** `tests/integration/guest-access.test.ts`

**Tasks to make this test pass:**

- [ ] In `src/routes/index.tsx`, wrap `WelcomeModal` in `{!session?.isGuest && ...}`
- [ ] Run test: `pnpm test tests/integration/guest-access.test.ts`
- [ ] ✅ Test passes

---

### Test: [1.7-E2E-001 to E2E-007] E2E guest access tests

**File:** `e2e/guest-access.spec.ts`

**Tasks to make these tests pass:**

- [ ] Complete all integration tasks above (implementation must be done first)
- [ ] Update `e2e/global-setup.ts` ghost player creation and `saveGuestAuthState()` (already written — will work once implementation is done)
- [ ] Verify `.auth/guest.json` is created by global-setup
- [ ] Run test: `pnpm exec playwright test e2e/guest-access.spec.ts`
- [ ] ✅ All 7 E2E tests pass

---

## Running Tests

```bash
# Run all integration tests for this story
pnpm test tests/integration/guest-access.test.ts

# Run all E2E tests for this story
pnpm exec playwright test e2e/guest-access.spec.ts

# Run E2E tests in headed mode (see browser)
pnpm exec playwright test e2e/guest-access.spec.ts --headed

# Run all tests (integration + E2E) — verify zero regressions
pnpm test && pnpm exec playwright test

# Run specific test in debug mode
pnpm exec playwright test e2e/guest-access.spec.ts --debug
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

**TEA Agent Responsibilities:**

- ✅ 17 integration tests written and failing
- ✅ 7 E2E tests written and failing
- ✅ Global-setup updated with ghost player + saveGuestAuthState
- ✅ data-testid requirements documented
- ✅ Implementation checklist created

**Verification:**

- Integration tests fail because source files don't have the expected structure yet
- E2E tests fail because guest link, guestLoginFn, and AppHeader changes don't exist
- Global-setup fails because `isGuest` column doesn't exist in schema yet

---

### GREEN Phase (DEV Team - Next Steps)

**DEV Agent Responsibilities:**

1. **Start with schema** (Task 1) — foundational, all other tasks depend on it
2. **Add ghost player queries** (Task 2) — needed by guestLoginFn and global-setup
3. **Fix getSession** (Task 3) — isGuest must come from DB
4. **Add guestLoginFn + guest link** (Task 4) — AC1 and AC2
5. **Update AppHeader** (Task 5) — AC5, AC6, AC7
6. **Guard WelcomeModal** (Task 6) — AC4
7. **Filter getAllPlayers** (Task 7) — AC4
8. Run `pnpm test` (integration) — verify 17 new tests + 0 regressions
9. Run `pnpm exec playwright test` (E2E) — verify 7 new tests + 0 regressions

---

## Notes

- **Schema change first**: All other tasks depend on `isGuest` column existing in DB. Do not skip `pnpm drizzle-kit push`.
- **Ghost player singleton**: Only one `__guest__` player per DB. `ensureGhostPlayer()` must be idempotent (upsert, not insert).
- **Never `session === null` for guest check**: Guests have valid sessions. Always check `player.isGuest`.
- **`!no-login!` password hash**: Not a valid bcrypt hash — `compare()` always returns false. Ghost can never log in via the password form.
- **data-app-hydrated pattern**: All route components already have the hydration pattern (`useHydrated()` + `useEffect`). `waitForHydration(page)` works on all current routes.
- **Test baseline (story 1.6 done)**: 156 integration + 24 E2E — do NOT break any.
- **E2E test 003 (tab bar)**: Tab bar doesn't exist yet in story 1.7. Test checks for `Campagne`, `Armées`, `Références` text visibility. Will fail until tab bar is implemented (future story). This is intentional RED phase.
- **E2E test 006 (admin-link absent)**: `admin-link` is already behind `session.isAdmin && ...`. Since guest has `isAdmin: false`, this test should pass once guest auth state is working. Acts as regression guard.

---

## Knowledge Base References Applied

- **MEMORY.md — Règle assertions couplées**: All assertions in integration tests couple related elements in a single regex to avoid false positives.
- **MEMORY.md — data-app-hydrated pattern**: `waitForHydration(page)` used in all E2E tests.
- **MEMORY.md — E2E auth fixtures**: `storageState` pattern for guest tests (`.auth/guest.json`).
- **MEMORY.md — Server fn URL**: `/_serverFn` pattern used in `Promise.all([waitForResponse, click()])`.
- **Existing patterns**: `admin-list-delete.spec.ts` and `admin-list-delete.test.ts` used as reference.

---

**Generated by BMad TEA Agent** — 2026-03-13
