---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-03-13'
workflowType: 'testarch-atdd'
inputDocuments:
  - '_bmad-output/implementation-artifacts/1-5-player-logout.md'
  - 'src/routes/__root.tsx'
  - 'src/lib/auth.ts'
  - 'e2e/global-setup.ts'
  - 'tests/integration/auth.test.ts'
  - 'playwright.config.ts'
---

# ATDD Checklist — Epic 1, Story 1.5: Player Logout

**Date:** 2026-03-13
**Author:** Ben
**Primary Test Level:** Integration (Vitest file-contract) + E2E (Playwright)
**TDD Phase:** 🔴 RED — Failing tests generated, awaiting implementation

---

## Story Summary

As a player, I want to log out of the app so that I can end my session and return to the login page.
The logout action appears in a persistent app header visible on all authenticated pages.
Tapping "Se déconnecter" clears the server-side session and redirects to /login.
Protected routes reject access after logout (back button included).

**As a** player (authenticated, non-guest)
**I want** to tap "Se déconnecter" in the app header
**So that** my session is cleared and I return to /login

---

## Acceptance Criteria

1. **AC1** — Authenticated player sees "Se déconnecter" action in the header on every authenticated page. Button NOT visible on /login.
2. **AC2** — Tapping "Se déconnecter" clears the session cookie, deletes the `sessions` table row, and redirects to /login.
3. **AC3** — After logout, the back button stays on /login (session gone, `beforeLoad` rejects protected routes).
4. **AC4 [DEFERRED TO 1.7]** — `SessionData` gains `isGuest?: boolean` (type only, no DB column). Guest logic activates in story 1.7.
5. **AC5 [DEFERRED TO 1.7]** — Guest session clear on "Se connecter". Out of scope for this story.

---

## Failing Tests Created (RED Phase)

### Integration Tests — Vitest (10 tests)

**File:** `tests/integration/logout.test.ts` (107 lines)

Project pattern: static file-contract tests (read source, assert structure) — no `test.skip()`, tests fail naturally when source doesn't match expectations.

| Test ID | Status | Verifies |
|---|---|---|
| `[1.5-INT-001]` | 🔴 RED | `logoutFn = createServerFn({ method: 'POST' })` in `__root.tsx` |
| `[1.5-INT-002]` | 🔴 RED | `logoutFn` uses dynamic import-protection: `{ deleteSession } = await import('../lib/auth')` |
| `[1.5-INT-003]` | 🔴 RED | Route object assigns `component: RootLayout` |
| `[1.5-INT-004]` | 🔴 RED | `function RootLayout` defined in `__root.tsx` |
| `[1.5-INT-005]` | 🔴 RED | `Outlet` imported from `@tanstack/react-router` |
| `[1.5-INT-006]` | 🔴 RED | `data-testid="logout-button"` in root layout |
| `[1.5-INT-007]` | 🔴 RED | `"Se déconnecter"` text in root layout |
| `[1.5-INT-008]` | 🔴 RED | `session &&` conditional renders header only when authenticated |
| `[1.5-INT-009]` | ✅ GREEN | `redirect({ to: '/login' })` in `beforeLoad` (regression from story 1.2) |
| `[1.5-INT-010]` | 🔴 RED | `isGuest` in `SessionData` type (AC4 deferred forward-compat) |

**Verified RED run:** `9 failed | 127 passed` (136 total — 126 baseline + 10 new)

### E2E Tests — Playwright (6 tests)

**File:** `e2e/logout.spec.ts` (115 lines)

Auth: uses `e2e_returning` storageState for visibility tests. AC2/AC3 tests perform fresh login to avoid session conflict after logout.

| Test ID | Status | Verifies |
|---|---|---|
| `[1.5-E2E-001]` | 🔴 RED | Authenticated user sees `logout-button` with "Se déconnecter" on main page |
| `[1.5-E2E-002]` | 🔴 RED | Identity indicator (displayName) visible in header |
| `[1.5-E2E-003]` | 🔴 RED | Clicking "Se déconnecter" redirects to /login |
| `[1.5-E2E-004]` | 🔴 RED | After logout, navigating to / redirects to /login (session cleared) |
| `[1.5-E2E-005]` | 🔴 RED | After logout, browser back button stays on /login (AC3) |
| `[1.5-E2E-006]` | ✅ GREEN | Logout button NOT visible on /login page (guardrail — no header without session) |

---

## Required data-testid Attributes

### `__root.tsx` — AppHeader component

| data-testid | Element | Description |
|---|---|---|
| `logout-button` | `<button>` | "Se déconnecter" — triggers `logoutFn()` + client navigation to /login |

No other new data-testid attributes required for story 1.5.

---

## Fixtures

**Reuses existing infrastructure (no new fixtures needed):**
- `.auth/returning.json` — storageState for `e2e_returning` (visibility tests, no logout)
- `TEST_USERS.returning` — credentials for fresh login in logout flow tests
- `waitForHydration()` — `html[data-app-hydrated="true"]` selector (all pages)

**Session freshness note:** AC2/AC3 E2E tests do NOT reuse storageState after logout (the session row is deleted server-side). Each test calls `loginAsReturning()` to get a fresh session before logging out.

---

## Mock Requirements

None. Story 1.5 uses only:
- Existing `deleteSession()` from `src/lib/auth.ts` (DB delete + cookie clear)
- Client-side navigation via `router.navigate({ to: '/login' })`

No external services to mock.

---

## Implementation Checklist

### RED → GREEN: Make integration tests pass

**File:** `src/routes/__root.tsx`

- [ ] Add `logoutFn` server function with `createServerFn({ method: 'POST' })` and dynamic import of `deleteSession`
- [ ] Add `component: RootLayout` to the Route definition
- [ ] Add `Outlet` to the `@tanstack/react-router` import
- [ ] Implement `RootLayout` function component with `session &&` guard and `<AppHeader>`
- [ ] Implement `AppHeader` with `data-testid="logout-button"` and "Se déconnecter" text
- [ ] Run: `pnpm test tests/integration/logout.test.ts` → verify tests 001–008 pass
- [ ] ✅ [1.5-INT-001] passes
- [ ] ✅ [1.5-INT-002] passes
- [ ] ✅ [1.5-INT-003] passes
- [ ] ✅ [1.5-INT-004] passes
- [ ] ✅ [1.5-INT-005] passes
- [ ] ✅ [1.5-INT-006] passes
- [ ] ✅ [1.5-INT-007] passes
- [ ] ✅ [1.5-INT-008] passes

**File:** `src/lib/auth.ts`

- [ ] Add `isGuest?: boolean` to `SessionData` type (no DB column, no query change)
- [ ] Run: `pnpm test tests/integration/logout.test.ts` → verify test 010 passes
- [ ] ✅ [1.5-INT-010] passes

### RED → GREEN: Make E2E tests pass

**Pre-conditions:**
- Dev server running (`pnpm dev`)
- DB accessible with test users (from global-setup)

- [ ] `pnpm exec playwright test e2e/logout.spec.ts` → verify tests 001–005 go GREEN
- [ ] ✅ [1.5-E2E-001] passes — logout button visible on /
- [ ] ✅ [1.5-E2E-002] passes — displayName in header
- [ ] ✅ [1.5-E2E-003] passes — logout redirects to /login
- [ ] ✅ [1.5-E2E-004] passes — session cleared after logout
- [ ] ✅ [1.5-E2E-005] passes — back button stays on /login

### Quality gates

- [ ] `pnpm test` — 136 passing (126 baseline + 10 new) — zero regressions
- [ ] `pnpm typecheck` — zero errors
- [ ] `pnpm lint` — zero errors on story 1.5 files
- [ ] `pnpm build` — succeeds

---

## Running Tests

```bash
# Integration tests (Vitest)
pnpm test tests/integration/logout.test.ts

# Full test suite (verify no regressions)
pnpm test

# E2E tests (Playwright — requires running dev server)
pnpm dev &
pnpm exec playwright test e2e/logout.spec.ts

# E2E in headed mode (see browser)
pnpm exec playwright test e2e/logout.spec.ts --headed

# E2E debug specific test
pnpm exec playwright test e2e/logout.spec.ts --debug --grep "1.5-E2E-003"
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

**TEA Agent Responsibilities:**

- ✅ Integration tests written and failing (9 failing, 1 green regression guard)
- ✅ E2E tests written and failing (5 failing, 1 green guardrail)
- ✅ `data-testid` requirements listed (`logout-button`)
- ✅ Session freshness strategy documented (fresh login for logout flow tests)
- ✅ Implementation checklist created

**Verification (2026-03-13):**
```
Tests  9 failed | 127 passed (136)
```
- Failures are due to missing implementation (no `logoutFn`, no `RootLayout`, no `isGuest`)
- No test bugs — failure messages show exact missing content

---

### GREEN Phase (DEV Agent — Next Steps)

**DEV Agent Responsibilities:**

1. Modify `src/routes/__root.tsx` (see Dev Notes in story file)
2. Add `isGuest?: boolean` to `SessionData` in `src/lib/auth.ts`
3. Run `pnpm test` after each change → verify RED tests turn GREEN
4. Run E2E tests to verify full user journey
5. Check quality gates (typecheck, lint, build)

**Key Patterns (from story Dev Notes):**
- `logoutFn` uses `createServerFn({ method: 'POST' })` with dynamic import — do NOT `throw redirect()` from handler
- `RootLayout` uses `useRouteContext({ from: '__root__' })` + `'session' in context ? context.session : null`
- `AppHeader` is minimal: identity indicator left, logout button right
- Import `Outlet` from `@tanstack/react-router` — required for child routes to render

---

### REFACTOR Phase (After All Tests Pass)

1. Verify all 136 integration tests pass + E2E tests pass
2. Review `AppHeader` styling against design tokens (see story Dev Notes)
3. Confirm no duplicate `logoutFn` (remove from `login.tsx` if safe, per story task 2.3)
4. Run `pnpm lint && pnpm typecheck && pnpm build` — all clean

---

## Architecture Boundaries Checklist

- [ ] `logoutFn` uses dynamic import of `deleteSession` from `auth.ts` (import-protection)
- [ ] No direct DB access in route files — `deleteSession()` in `auth.ts` handles it
- [ ] Logout button rendered from root layout, visible on ALL authenticated pages
- [ ] Button NOT visible on `/login` page (`session &&` guard)
- [ ] Session cleared server-side (cookie + DB row) via existing `deleteSession()`
- [ ] Client navigates to `/login` after logout — `beforeLoad` protects all routes

---

## Next Steps

1. **Hand off to dev workflow** → `bmad-bmm-dev-story` with story file `1-5-player-logout.md`
2. **Dev implements** using this checklist as roadmap (integration tests first, then E2E)
3. **When all tests pass**, run full suite to confirm no regressions
4. **Update story status** in `sprint-status.yaml` to `done`

---

## Test Execution Evidence

### Initial Run — RED Phase Verification (2026-03-13)

**Command:** `pnpm test tests/integration/logout.test.ts`

**Results:**
```
Test Files  1 failed | 7 passed (8)
      Tests  9 failed | 127 passed (136)
   Start at  10:51:24
   Duration  838ms
```

**Summary:**
- Integration tests: 9 failing (expected), 1 passing regression guard
- E2E tests: not run (require running dev server) — verified RED by inspection
- Status: ✅ RED phase verified

**Expected failure reasons:**
- [1.5-INT-001–008]: `__root.tsx` has no `logoutFn`, no `RootLayout`, no `Outlet`, no `logout-button`
- [1.5-INT-010]: `auth.ts` `SessionData` type has no `isGuest` field
- [1.5-E2E-001–005]: No AppHeader in the app yet → `getByTestId('logout-button')` not found

---

## Knowledge Base References Applied

- **existing project patterns** — `tests/integration/auth.test.ts` (file-contract test pattern without `test.skip()`)
- **e2e/global-setup.ts** — storageState fixture architecture, `TEST_USERS` export, `waitForHydration`
- **e2e/admin.spec.ts** — inline fresh login pattern (browser.newContext alternative), `waitForHydration` usage
- **selector-resilience** — `getByTestId()` for stable selectors, `getByText()` for content assertions
- **session freshness** — Fresh login pattern for logout flow tests to avoid session conflict

---

**Generated by BMad TEA Agent** — 2026-03-13
