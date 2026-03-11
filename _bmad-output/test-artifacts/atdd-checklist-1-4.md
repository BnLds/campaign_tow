---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04a-subagent-api-failing', 'step-04b-subagent-e2e-failing', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-03-10'
workflowType: 'testarch-atdd'
inputDocuments:
  - '_bmad-output/implementation-artifacts/1-4-admin-player-account-creation.md'
  - 'src/lib/validators.test.ts'
  - 'src/lib/auth.test.ts'
  - 'tests/integration/auth.test.ts'
  - 'tests/integration/welcome-modal.test.ts'
  - 'e2e/welcome-modal.spec.ts'
  - 'e2e/global-setup.ts'
  - 'playwright.config.ts'
  - 'vitest.config.ts'
---

# ATDD Checklist — Epic 1, Story 1.4: Admin — Player Account Creation

**Date:** 2026-03-10
**Author:** Ben
**Primary Test Level:** Integration (static code analysis) + Unit (Zod validator) + E2E (Playwright)
**TDD Phase:** RED — all tests written before implementation

---

## Story Summary

As Ben (admin), I want to create player accounts so that all campaign participants can log in with their own credentials. The feature introduces an `/admin` route protected by a new `adminMiddleware`, a `createPlayerFn` server function that hashes passwords with bcryptjs, and a UI form for creating players with username/password.

**As a** Ben (admin)
**I want** to create player accounts from an admin page
**So that** campaign participants can log in with their own credentials

---

## Acceptance Criteria

1. **AC1** — Admin navigates to `/admin` and sees a create-player form
2. **AC2** — Submitting valid form creates a player: `isAdmin=false`, `hasSeenWelcome=false`, `displayName=username`, bcrypt-hashed password
3. **AC3** — Newly created player can log in and sees WelcomeModal
4. **AC4** — Non-admin access to `/admin` is denied (redirect to `/`)
5. **AC5** — Duplicate username shows validation error, no duplicate created

---

## Test Strategy

| AC | Test Level | File | Priority | Mechanism |
|---|---|---|---|---|
| AC1 | Integration | `tests/integration/admin.test.ts` | P0 | readFileSync — route exists + form in component |
| AC1 | E2E | `e2e/admin.spec.ts` | P0 | Playwright — heading + form fields visible |
| AC2 | Unit | `src/lib/validators.test.ts` | P0 | safeParse — valid input, trimming, max lengths |
| AC2 | Integration | `tests/integration/admin.test.ts` | P0 | readFileSync — createPlayerFn, bcryptjs, queries |
| AC2 | E2E | `e2e/admin.spec.ts` | P0 | Playwright — success message after form submit |
| AC3 | E2E | `e2e/admin.spec.ts` | P2 | Playwright — new player login → WelcomeModal |
| AC4 | Integration | `tests/integration/admin.test.ts` | P0 | readFileSync — beforeLoad redirect, adminMiddleware |
| AC4 | E2E | `e2e/admin.spec.ts` | P0 | Playwright — non-admin redirected to `/` |
| AC5 | Unit | `src/lib/validators.test.ts` | P0 | safeParse — empty/short username, short password |
| AC5 | Integration | `tests/integration/admin.test.ts` | P0 | readFileSync — checkUsernameExists in queries |
| AC5 | E2E | `e2e/admin.spec.ts` | P1 | Playwright — duplicate username error shown |

---

## Failing Tests Created (RED Phase)

### Unit Tests — `src/lib/validators.test.ts` (+10 tests)

**File:** `src/lib/validators.test.ts` (additions to existing file)
**RED mechanism:** `createPlayerSchema` is `undefined` until exported from `validators.ts` → `TypeError: Cannot read properties of undefined (reading 'safeParse')`

- ✅ **[1.4-UNIT-001]** `createPlayerSchema` accepts valid username and temp password
  - **Status:** RED — `createPlayerSchema` undefined until implemented
  - **Verifies:** AC2 happy path

- ✅ **[1.4-UNIT-002]** trims leading/trailing whitespace from username
  - **Status:** RED — `createPlayerSchema` undefined
  - **Verifies:** AC2 — `.trim()` on username field

- ✅ **[1.4-UNIT-003]** accepts username at max length (50 chars)
  - **Status:** RED — `createPlayerSchema` undefined
  - **Verifies:** AC2 max length boundary

- ✅ **[1.4-UNIT-004]** accepts password at max length (100 chars)
  - **Status:** RED — `createPlayerSchema` undefined
  - **Verifies:** AC2 max length boundary

- ✅ **[1.4-UNIT-005]** preserves spaces in `tempPassword` (no trim)
  - **Status:** RED — `createPlayerSchema` undefined
  - **Verifies:** AC2 — no `.trim()` on password

- ✅ **[1.4-UNIT-006]** rejects empty username
  - **Status:** RED — `createPlayerSchema` undefined
  - **Verifies:** AC5 empty username

- ✅ **[1.4-UNIT-007]** rejects username shorter than 2 characters (after trim)
  - **Status:** RED — `createPlayerSchema` undefined
  - **Verifies:** AC5 min length

- ✅ **[1.4-UNIT-008]** rejects username exceeding 50 characters
  - **Status:** RED — `createPlayerSchema` undefined
  - **Verifies:** AC5 max length violation

- ✅ **[1.4-UNIT-009]** rejects `tempPassword` shorter than 6 characters
  - **Status:** RED — `createPlayerSchema` undefined
  - **Verifies:** AC5 password min length

- ✅ **[1.4-UNIT-010]** rejects `tempPassword` exceeding 100 characters
  - **Status:** RED — `createPlayerSchema` undefined
  - **Verifies:** AC5 password max length

### Unit Tests — `src/lib/auth.test.ts` (+1 test)

**File:** `src/lib/auth.test.ts` (addition to existing file)
**RED mechanism:** `adminMiddleware` is `undefined` until exported from `middleware.ts`

- ✅ **[1.4-UNIT-011]** exports `adminMiddleware` (TanStack Start middleware)
  - **Status:** RED — `adminMiddleware` undefined until implemented
  - **Verifies:** AC4 — middleware exported and accessible

### Integration Tests — `tests/integration/admin.test.ts` (22 tests, new file)

**File:** `tests/integration/admin.test.ts`
**RED mechanism:** Files don't exist / expected patterns not present until implemented

- ✅ **[1.4-INT-001]** `middleware.ts` exports `adminMiddleware` via `createMiddleware`
  - **Status:** RED — `adminMiddleware` not yet in `middleware.ts`
  - **Verifies:** AC4

- ✅ **[1.4-INT-002]** `adminMiddleware` chains `authMiddleware`
  - **Status:** RED — not yet implemented
  - **Verifies:** AC4 — middleware chain correct

- ✅ **[1.4-INT-003]** `adminMiddleware` throws `FORBIDDEN` error
  - **Status:** RED — not yet implemented
  - **Verifies:** AC4 — access control

- ✅ **[1.4-INT-004]** `validators.ts` exports `createPlayerSchema`
  - **Status:** RED — schema not yet added
  - **Verifies:** AC2, AC5

- ✅ **[1.4-INT-005]** `validators.ts` exports `CreatePlayerInput` type
  - **Status:** RED — type not yet added
  - **Verifies:** AC2

- ✅ **[1.4-INT-006]** `createPlayerSchema` uses `tempPassword` field
  - **Status:** RED — schema not yet added
  - **Verifies:** AC2 — field naming

- ✅ **[1.4-INT-007]** `username` applies `.trim().min(2)` (coupled)
  - **Status:** RED — schema not yet added
  - **Verifies:** AC2, AC5 — validation chain

- ✅ **[1.4-INT-008]** `queries.ts` exports `checkUsernameExists`
  - **Status:** RED — function not yet added
  - **Verifies:** AC5

- ✅ **[1.4-INT-009]** `queries.ts` exports `createPlayer`
  - **Status:** RED — function not yet added
  - **Verifies:** AC2

- ✅ **[1.4-INT-010]** `queries.ts` does NOT import `bcryptjs`
  - **Status:** RED — will pass (inverted) — catches architectural violation if bcrypt added to queries
  - **Verifies:** AC2 separation of concerns

- ✅ **[1.4-INT-011]** `createPlayer` inserts `isAdmin: false`
  - **Status:** RED — function not yet added
  - **Verifies:** AC2

- ✅ **[1.4-INT-012]** `createPlayer` inserts `hasSeenWelcome: false`
  - **Status:** RED — function not yet added
  - **Verifies:** AC2, AC3

- ✅ **[1.4-INT-013]** `src/routes/admin/index.tsx` exists
  - **Status:** RED — file not yet created
  - **Verifies:** AC1

- ✅ **[1.4-INT-014]** admin route exports `Route` via `createFileRoute`
  - **Status:** RED — file not yet created
  - **Verifies:** AC1

- ✅ **[1.4-INT-015]** `createPlayerFn` assigned to `createServerFn`
  - **Status:** RED — file not yet created
  - **Verifies:** AC2

- ✅ **[1.4-INT-016]** `createPlayerFn` uses `.middleware([adminMiddleware])`
  - **Status:** RED — file not yet created
  - **Verifies:** AC4 — server-side protection

- ✅ **[1.4-INT-017]** admin route has `beforeLoad` that checks `isAdmin`
  - **Status:** RED — file not yet created
  - **Verifies:** AC4

- ✅ **[1.4-INT-018]** `beforeLoad` redirects to `"/"` for non-admin
  - **Status:** RED — file not yet created
  - **Verifies:** AC4

- ✅ **[1.4-INT-019]** `adminMiddleware` imported from `lib/middleware`
  - **Status:** RED — file not yet created
  - **Verifies:** AC4 — import-protection pattern

- ✅ **[1.4-INT-020]** admin route handler uses `bcryptjs`
  - **Status:** RED — file not yet created
  - **Verifies:** AC2 — hashing in handler

- ✅ **[1.4-INT-021]** `index.tsx` shows admin link when `isAdmin` is true
  - **Status:** RED — admin link not yet added to index.tsx
  - **Verifies:** AC1

- ✅ **[1.4-INT-022]** admin link navigates to `/admin`
  - **Status:** RED — admin link not yet added
  - **Verifies:** AC1

### E2E Tests — `e2e/admin.spec.ts` (5 tests, new file)

**File:** `e2e/admin.spec.ts`
**RED mechanism:** All tests use `test.skip()` — intentional TDD red phase. Remove `test.skip()` after implementation.

- ✅ **[1.4-E2E-001][P0][AC1]** admin navigates to `/admin` and sees create-player form
  - **Status:** RED — `test.skip()` + route not implemented
  - **Verifies:** AC1

- ✅ **[1.4-E2E-002][P0][AC2]** admin submits valid form — success message shown, form resets
  - **Status:** RED — `test.skip()` + route not implemented
  - **Verifies:** AC2

- ✅ **[1.4-E2E-003][P0][AC4]** non-admin redirected from `/admin` to `/`
  - **Status:** RED — `test.skip()` + route not implemented
  - **Verifies:** AC4

- ✅ **[1.4-E2E-004][P1][AC5]** duplicate username shows validation error
  - **Status:** RED — `test.skip()` + route not implemented
  - **Verifies:** AC5

- ✅ **[1.4-E2E-005][P2][AC3]** newly created player logs in and sees WelcomeModal
  - **Status:** RED — `test.skip()` + route not implemented
  - **Verifies:** AC3

---

## Required data-testid Attributes

### Admin Page (`src/routes/admin/index.tsx`)

- `admin-username-input` — username text field
- `admin-password-input` — temp password field
- `admin-create-player-button` — submit button
- `admin-success-message` — success message after player creation
- `admin-error-message` — server error / validation error message

> Note: E2E tests use `getByLabel()` and `getByRole()` (resilient selectors) — `data-testid` only needed as fallback if labels are ambiguous.

---

## Fixture Requirements

### E2E — `e2e/global-setup.ts` (modification required for green phase)

Before un-skipping E2E tests, add admin user to `global-setup.ts`:

```typescript
// Add to TEST_USERS in global-setup.ts
admin: {
  username: 'e2e_admin',
  password: 'E2eAdminPwd1!',
  displayName: 'E2E Admin',
  hasSeenWelcome: true,
  isAdmin: true,
}

// Add auth state save:
await upsertTestUser('e2e_admin', adminHash, 'E2E Admin', true, true) // isAdmin=true
await saveAuthState('e2e_admin', 'E2eAdminPwd1!', '.auth/admin.json')
```

> Note: `upsertTestUser` needs to accept `isAdmin` param. Update function signature accordingly.

---

## Implementation Checklist (RED → GREEN)

### Test: [1.4-UNIT-001 to 010] — `createPlayerSchema` validator

**File:** `src/lib/validators.test.ts`

**Tasks to make these tests pass:**

- [ ] Add `createPlayerSchema` to `src/lib/validators.ts` with `username` (trim, min 2, max 50) and `tempPassword` (min 6, max 100, no trim)
- [ ] Export `CreatePlayerInput` type
- [ ] Run: `pnpm test src/lib/validators.test.ts` → verify 10 new tests pass
- [ ] ✅ Tests pass (green phase)

**Estimated effort:** 0.5h

---

### Test: [1.4-UNIT-011] — `adminMiddleware` export

**File:** `src/lib/auth.test.ts`

**Tasks:**

- [ ] Add `adminMiddleware` to `src/lib/middleware.ts` using `createMiddleware`, chaining `authMiddleware`, checking `context.session.isAdmin`, throwing `new Error('FORBIDDEN')`
- [ ] Run: `pnpm test src/lib/auth.test.ts` → verify test passes
- [ ] ✅ Test passes (green phase)

**Estimated effort:** 0.5h

---

### Tests: [1.4-INT-001 to 022] — Integration (static analysis)

**File:** `tests/integration/admin.test.ts`

**Tasks to make all tests pass:**

- [ ] `middleware.ts`: add `adminMiddleware` (INT-001, 002, 003)
- [ ] `validators.ts`: add `createPlayerSchema` + `CreatePlayerInput` (INT-004, 005, 006, 007)
- [ ] `queries.ts`: add `checkUsernameExists()` + `createPlayer()` without bcryptjs (INT-008, 009, 010, 011, 012)
- [ ] Create `src/routes/admin/index.tsx` with `Route`, `createPlayerFn`, `beforeLoad`, imports from `lib/middleware`, bcryptjs hashing (INT-013 to 020)
- [ ] `src/routes/index.tsx`: add admin link conditional on `session?.isAdmin` (INT-021, 022)
- [ ] Run: `pnpm test tests/integration/admin.test.ts` → verify all 22 pass
- [ ] Run: `pnpm test` → verify all 93+33=126 tests pass (no regression)
- [ ] ✅ All tests pass (green phase)

**Estimated effort:** 3h

---

### Tests: [1.4-E2E-001 to 005] — E2E Playwright

**File:** `e2e/admin.spec.ts`

**Tasks:**

- [ ] Implement all story 1.4 tasks (see above)
- [ ] Update `e2e/global-setup.ts` to create admin user (`e2e_admin`) and save `.auth/admin.json`
- [ ] Remove `test.skip()` from all 5 E2E tests
- [ ] Run: `pnpm playwright test e2e/admin.spec.ts` → verify all pass
- [ ] ✅ Tests pass (green phase)

**Estimated effort:** 1h (for green phase — implementation is the main work)

---

## Running Tests

```bash
# Run unit + integration tests (vitest)
pnpm test

# Run only new story 1.4 tests
pnpm test -- --reporter=verbose tests/integration/admin.test.ts src/lib/validators.test.ts src/lib/auth.test.ts

# Run E2E tests (after removing test.skip())
pnpm playwright test e2e/admin.spec.ts

# Run E2E in headed mode for debugging
pnpm playwright test e2e/admin.spec.ts --headed

# Full quality gate
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

**TEA Agent responsibilities:**

- ✅ 33 tests written and in RED state (11 unit, 22 integration, 5 E2E with `test.skip()`)
- ✅ Import additions don't break 93 baseline tests (`createPlayerSchema = undefined` → TypeError only in new tests)
- ✅ Integration tests use `readFileSync` static analysis (project-established pattern)
- ✅ E2E tests use `test.skip()` with meaningful assertions
- ✅ Fixture requirements documented
- ✅ Implementation checklist created
- ✅ `data-testid` requirements listed

**Verification:**

- Unit + integration tests fail due to missing exports / missing files (not test bugs)
- E2E tests are skipped (will be un-skipped after implementation)
- Existing 93 tests continue to pass

---

### GREEN Phase (DEV Agent — next steps)

1. Pick one failing test from implementation checklist (start with P0)
2. Read the test to understand expected behavior
3. Implement minimal code to make that specific test pass
4. Run test to verify GREEN
5. Check off task in implementation checklist
6. Move to next test

**Recommended order:**
1. `adminMiddleware` in `middleware.ts` (unlocks INT-001/002/003 + UNIT-011)
2. `createPlayerSchema` in `validators.ts` (unlocks UNIT-001 to 010 + INT-004 to 007)
3. `checkUsernameExists` + `createPlayer` in `queries.ts` (unlocks INT-008 to 012)
4. `src/routes/admin/index.tsx` (unlocks INT-013 to 020)
5. Admin link in `index.tsx` (unlocks INT-021/022)
6. Global setup + un-skip E2E tests (unlocks E2E-001 to 005)

---

### REFACTOR Phase (DEV Agent — after all tests pass)

- All 126 tests pass (93 baseline + 33 new)
- Review admin route for code quality
- Ensure design tokens applied throughout admin page
- Run `pnpm typecheck` + `pnpm lint` — zero errors
- Run `pnpm build` — succeeds

---

## Architecture Compliance Notes

Critical boundaries to enforce during implementation:

- [ ] `adminMiddleware` in `src/lib/middleware.ts` — NOT in route file
- [ ] `adminMiddleware` chains `authMiddleware` — no direct cookie access
- [ ] bcryptjs hashing in server function handler — NOT in `queries.ts`
- [ ] DB access via named functions in `queries.ts` — no direct `db` import in route
- [ ] `createPlayerSchema` in `src/lib/validators.ts` (client-safe, pure Zod)
- [ ] `ServerResult<T>` return type from `src/lib/types.ts`
- [ ] Admin link NOT in TabBar — utility link on Campaign view only
- [ ] `beforeLoad` in admin route redirects non-admin to `/`
- [ ] `bcryptjs` (not native `bcrypt`) — consistent with `seed-admin.ts`

---

## Notes

- **Test baseline:** 93 tests (post-story-1.3). New tests add 33 = 126 total expected after story 1.4.
- **Vitest import behavior:** `import { createPlayerSchema } from './validators'` gives `undefined` when export doesn't exist (ES module named import). Tests using it fail with `TypeError: Cannot read properties of undefined (reading 'safeParse')`. This is clean RED-phase behavior — only new tests fail, existing tests unaffected.
- **E2E auth state:** `.auth/admin.json` doesn't exist yet — global-setup.ts must be updated before un-skipping E2E tests. Modify `upsertTestUser` to accept `isAdmin` param.
- **createServerFn API:** Story notes `.inputValidator()` vs `.validator()` ambiguity. The dev MUST run `npx @tanstack/cli search-docs "createServerFn validator" --library start --framework react` before implementing the server function.
- **E2E test [1.4-E2E-005]:** Uses `browser` fixture (not `page`) to create two browser contexts (admin + new player). This is more complex than typical E2E tests — consider a simpler approach (API-based player creation for setup) if preferred.

---

## Next Steps

1. **Hand off to dev workflow**: Use `bmad-bmm-dev-story` with story file `_bmad-output/implementation-artifacts/1-4-admin-player-account-creation.md`
2. **Run failing tests** to confirm RED phase: `pnpm test tests/integration/admin.test.ts`
3. **Begin implementation** using implementation checklist as guide
4. **Work one test at a time** (red → green for each)
5. **When all tests pass**, update sprint-status.yaml: mark story 1.4 as `done`

---

**Generated by BMad TEA Agent** — 2026-03-10
