---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-03-08'
workflowType: 'testarch-atdd'
inputDocuments:
  - '_bmad-output/implementation-artifacts/1-2-player-login-session-management.md'
  - 'tests/README.md'
  - 'playwright.config.ts'
  - 'vitest.config.ts'
  - 'tests/integration/scaffold.test.ts'
  - '_bmad/tea/testarch/knowledge/data-factories.md'
  - '_bmad/tea/testarch/knowledge/test-quality.md'
  - '_bmad/tea/testarch/knowledge/test-levels-framework.md'
---

# ATDD Checklist - Epic 1, Story 1.2: Player Login & Session Management

**Date:** 2026-03-08
**Author:** Ben
**Primary Test Level:** Unit + Integration (Vitest)
**TDD Phase:** RED ✅ — All tests written, none pass yet

---

## Story Summary

As a player, I want to log in with my username and password so that I can securely access the campaign app.

**As a** player
**I want** to authenticate with username/password
**So that** I can access the campaign app with a secure HTTP-only session cookie

---

## Acceptance Criteria

1. **AC1** — Unauthenticated users are redirected to `/login` for any protected route
2. **AC2** — Successful login creates an HTTP-only session cookie, updates the `sessions` table, redirects to `/`
3. **AC3** — Invalid credentials show "Identifiant ou mot de passe incorrect" with no session created
4. **AC4** — Server-side session verification via `src/lib/auth.ts` before any protected server function executes
5. **AC5** — `armyOwnerMiddleware` scaffolded (pass-through until Epic 2)

---

## Project Test Strategy Note

Per `tests/README.md`: **No automated E2E for MVP** — UI flows validated manually via checklist. All automated tests use **Vitest** (unit + integration). This story generates:
- Unit tests (Vitest) for pure logic
- Integration tests (Vitest, file-based) for implementation contracts
- Manual E2E checklist (this document, see §Manual Verification)

---

## Failing Tests Created (RED Phase)

### Unit Tests — `src/lib/validators.test.ts` (7 tests)

**File:** `src/lib/validators.test.ts`

All tests fail with `Cannot find module './validators'` until `src/lib/validators.ts` is implemented.

- ❌ **[1.2-UNIT-001]** `accepts valid username and password`
  - **Status:** RED — module not found
  - **Verifies:** AC2 — loginSchema accepts correct credentials

- ❌ **[1.2-UNIT-002]** `accepts username with underscores and numbers`
  - **Status:** RED — module not found
  - **Verifies:** AC2 — loginSchema accepts varied username formats

- ❌ **[1.2-UNIT-003]** `accepts single-character values (min 1 for both fields)`
  - **Status:** RED — module not found
  - **Verifies:** AC2 — boundary: min length is 1

- ❌ **[1.2-UNIT-004]** `rejects empty username`
  - **Status:** RED — module not found
  - **Verifies:** AC3 — empty username triggers validation error

- ❌ **[1.2-UNIT-005]** `rejects empty password`
  - **Status:** RED — module not found
  - **Verifies:** AC3 — empty password triggers validation error

- ❌ **[1.2-UNIT-006]** `rejects missing username field`
  - **Status:** RED — module not found
  - **Verifies:** AC3 — required field enforcement

- ❌ **[1.2-UNIT-007]** `rejects missing password field`
  - **Status:** RED — module not found
  - **Verifies:** AC3 — required field enforcement

---

### Unit Tests — `src/lib/auth.test.ts` (5 tests)

**File:** `src/lib/auth.test.ts`

All tests fail with `Cannot find module './auth'` until `src/lib/auth.ts` is implemented.

- ❌ **[1.2-UNIT-008]** `exports getSession as a function`
  - **Status:** RED — module not found
  - **Verifies:** AC4 — auth module public API

- ❌ **[1.2-UNIT-009]** `exports createSession as a function`
  - **Status:** RED — module not found
  - **Verifies:** AC2 — session creation API

- ❌ **[1.2-UNIT-010]** `exports deleteSession as a function`
  - **Status:** RED — module not found
  - **Verifies:** AC2 — logout/session cleanup API

- ❌ **[1.2-UNIT-011]** `exports authMiddleware (TanStack Start middleware)`
  - **Status:** RED — module not found
  - **Verifies:** AC4 — middleware for route protection

- ❌ **[1.2-UNIT-012]** `exports armyOwnerMiddleware (TanStack Start middleware)`
  - **Status:** RED — module not found
  - **Verifies:** AC5 — ownership middleware scaffolded

---

### Integration Tests — `tests/integration/auth.test.ts` (22 tests)

**File:** `tests/integration/auth.test.ts`

Tests fail because referenced files don't exist or have wrong content in RED phase.

**DB Schema (AC2/AC4):**
- ❌ **[1.2-INT-001]** `schema.ts exports players table` — RED: schema has `export {}`
- ❌ **[1.2-INT-002]** `schema.ts exports sessions table` — RED: schema has `export {}`
- ❌ **[1.2-INT-003]** `sessions references players with cascade delete` — RED: content missing
- ❌ **[1.2-INT-004]** `players has password_hash column` — RED: content missing
- ❌ **[1.2-INT-005]** `sessions has expires_at column` — RED: content missing

**Auth Module (AC4):**
- ❌ **[1.2-INT-006]** `src/lib/auth.ts exists` — RED: file not created
- ❌ **[1.2-INT-007]** `auth.ts exports getSession` — RED: file not created
- ❌ **[1.2-INT-008]** `auth.ts exports createSession` — RED: file not created
- ❌ **[1.2-INT-009]** `auth.ts sets httpOnly: true` — RED: file not created
- ❌ **[1.2-INT-010]** `auth.ts exports authMiddleware with createMiddleware` — RED: file not created

**Login Route (AC2/AC3):**
- ❌ **[1.2-INT-011]** `src/routes/login.tsx exists` — RED: file not created
- ❌ **[1.2-INT-012]** `login.tsx exports loginFn as createServerFn` — RED: file not created
- ❌ **[1.2-INT-013]** `loginFn uses same error message for wrong user/password` — RED: file not created
- ❌ **[1.2-INT-014]** `loginFn uses bcryptjs compare` — RED: file not created
- ❌ **[1.2-INT-015]** `validators.ts exports loginSchema` — RED: file not created

**Route Protection (AC1):**
- ❌ **[1.2-INT-016]** `__root.tsx calls getSession` — RED: `__root.tsx` lacks session check
- ❌ **[1.2-INT-017]** `__root.tsx redirects to /login` — RED: `__root.tsx` lacks redirect

**Admin Seed (AC2):**
- ❌ **[1.2-INT-018]** `src/db/seed-admin.ts exists` — RED: file not created
- ❌ **[1.2-INT-019]** `seed-admin.ts uses bcryptjs not bcrypt` — RED: file not created
- ❌ **[1.2-INT-020]** `package.json has seed:admin script` — RED: script not added

**Army Ownership (AC5):**
- ❌ **[1.2-INT-021]** `auth.ts exports armyOwnerMiddleware` — RED: file not created
- ❌ **[1.2-INT-022]** `armyOwnerMiddleware references FORBIDDEN` — RED: file not created

---

## Required `data-testid` Attributes

Applies to the login page UI (`src/routes/login.tsx`):

### Login Page

- `login-username-input` — Username text field
- `login-password-input` — Password text field
- `login-submit-button` — Submit / "Se connecter" button
- `login-error-message` — Inline error message container

**Implementation Example:**
```tsx
<input data-testid="login-username-input" type="text" />
<input data-testid="login-password-input" type="password" />
<button data-testid="login-submit-button" type="submit">Se connecter</button>
<div data-testid="login-error-message">{errorMessage}</div>
```

> Note: `data-testid` attributes are required for future E2E automation (post-MVP). Add them now to avoid rework.

---

## Implementation Checklist (GREEN Phase Guide)

Work through one test group at a time. Make tests pass in order.

### Group 1: DB Schema (makes INT-001 to INT-005 green)

- [ ] Open `src/db/schema.ts` and replace `export {}` with the full schema (see Dev Notes in story)
- [ ] Run `pnpm drizzle-kit push` to apply schema
- [ ] Run `pnpm test` — verify INT-001 to INT-005 pass ✅

### Group 2: Validators (makes UNIT-001 to UNIT-007 green)

- [ ] Create `src/lib/validators.ts` with `loginSchema` and `insertPlayerSchema`
- [ ] Run `pnpm test` — verify UNIT-001 to UNIT-007 pass ✅

### Group 3: Auth Module (makes UNIT-008 to UNIT-012 and INT-006 to INT-010 green)

- [ ] Create `src/lib/auth.ts` with `getSession`, `createSession`, `deleteSession`, `authMiddleware`, `armyOwnerMiddleware`
- [ ] Ensure `httpOnly: true` on session cookie
- [ ] Run `pnpm test` — verify UNIT-008 to UNIT-012 and INT-006 to INT-010 pass ✅

### Group 4: Login Route (makes INT-011 to INT-015 green)

- [ ] Create `src/routes/login.tsx` with `loginFn` server function
- [ ] Use `bcryptjs` compare (not string equality)
- [ ] Return `'Identifiant ou mot de passe incorrect'` for both wrong-user and wrong-password
- [ ] Run `pnpm test` — verify INT-011 to INT-015 pass ✅

### Group 5: Route Protection (makes INT-016 to INT-017 green)

- [ ] Update `src/routes/__root.tsx` to call `getSession` in `beforeLoad` or `loader`
- [ ] Redirect to `/login` when no session and route is not `/login`
- [ ] Run `pnpm test` — verify INT-016 to INT-017 pass ✅

### Group 6: Admin Seed (makes INT-018 to INT-020 green)

- [ ] Create `src/db/seed-admin.ts` (idempotent)
- [ ] Add `"seed:admin": "tsx src/db/seed-admin.ts"` to `package.json`
- [ ] Run `pnpm test` — verify INT-018 to INT-020 pass ✅

### Group 7: Army Ownership Middleware (makes INT-021 to INT-022 green)

- [ ] Ensure `armyOwnerMiddleware` is exported from `auth.ts` with `FORBIDDEN` reference
- [ ] Run `pnpm test` — verify INT-021 to INT-022 pass ✅

### Final Verification

- [ ] Run `pnpm test` — **all 33 + 34 = 67 tests pass** (33 previous + 34 new)
- [ ] Run `pnpm typecheck` — zero errors
- [ ] Run `pnpm lint` — zero errors
- [ ] Run `pnpm build` — succeeds

---

## Running Tests

```bash
# Run all tests (Vitest)
pnpm test

# Run specific test files
pnpm test src/lib/validators.test.ts
pnpm test src/lib/auth.test.ts
pnpm test tests/integration/auth.test.ts

# Watch mode (during development)
pnpm test --watch

# Run with verbose output
pnpm test --reporter=verbose
```

---

## Manual E2E Verification Checklist (MVP)

Per project strategy, E2E is manual. Verify these flows after implementation:

### AC1 — Redirect unauthenticated users
- [ ] Open incognito browser, navigate to `http://localhost:3000/`
- [ ] Verify redirect to `/login` page
- [ ] Verify login page shows Campaign TOW title (Cinzel font, navy color)

### AC2 — Successful login
- [ ] On `/login`, enter valid admin credentials
- [ ] Submit form
- [ ] Verify redirect to `/` (Campaign view)
- [ ] Verify HTTP-only session cookie `session_id` is set (DevTools → Application → Cookies)
- [ ] Verify `sessions` table has new row (pnpm drizzle-kit studio)

### AC3 — Failed login
- [ ] On `/login`, enter wrong username or wrong password
- [ ] Verify error message "Identifiant ou mot de passe incorrect" appears inline (no toast)
- [ ] Verify no session cookie is created

### AC4 — Session expiry
- [ ] Log in, then manually expire session in DB (update `expires_at` to past date)
- [ ] Refresh page — verify redirect to `/login`

### AC5 — Army ownership (not fully testable in Story 1.2)
- [ ] Defer to Story 2.1 (armies table does not exist yet)

---

## Red-Green-Refactor Workflow

### RED Phase ✅ (Current)

- ✅ 34 failing tests written (7 unit validators + 5 unit auth + 22 integration)
- ✅ Tests assert expected behavior — not placeholders
- ✅ All ACs covered by at least one test
- ✅ `data-testid` requirements documented

### GREEN Phase (Dev Team — Next Steps)

1. Follow **Implementation Checklist** above, group by group
2. Run `pnpm test` after each group — watch tests turn green
3. `pnpm test` must pass with **all** tests before story is done

### REFACTOR Phase (After All Tests Pass)

1. Review auth.ts for security edge cases
2. Ensure session expiry is enforced server-side
3. Verify no `console.log` with sensitive data
4. Run `pnpm typecheck` + `pnpm lint`

---

## Test Count Summary

| File | Tests | Level | Status |
|------|-------|-------|--------|
| `src/lib/validators.test.ts` | 7 | Unit | RED ❌ |
| `src/lib/auth.test.ts` | 5 | Unit | RED ❌ |
| `tests/integration/auth.test.ts` | 22 | Integration | RED ❌ |
| **Total new** | **34** | | **All RED** |
| Existing (story 1.1) | 33 | Unit+Integration | GREEN ✅ |

> When story 1.2 is complete: `pnpm test` = 67 tests, all passing.

---

## Notes

- **bcryptjs vs bcrypt**: Use `bcryptjs` only — pure JS, no native addons, Railway compatible
- **Zod v4**: TanStack Form supports Zod v4 via Standard Schema — no `@tanstack/zod-form-adapter` needed
- **Cookie API**: Verify current API with `npx @tanstack/cli search-docs "setCookie getCookie" --library start --framework react` before implementing `auth.ts`
- **AC5 scope**: `armyOwnerMiddleware` is a pass-through scaffold in story 1.2 — fully implemented in Epic 2
- **Session duration**: 30 days default (`SESSION_DURATION_DAYS = 30`)

---

**Generated by BMAD TEA Agent** — 2026-03-08
