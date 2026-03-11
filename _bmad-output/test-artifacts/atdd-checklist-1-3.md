---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-03-09'
inputDocuments:
  - _bmad-output/implementation-artifacts/1-3-first-login-welcome-modal-display-name.md
  - src/lib/auth.ts
  - src/lib/validators.ts
  - src/routes/index.tsx
  - tests/integration/auth.test.ts
  - playwright.config.ts
  - _bmad/tea/config.yaml
---

# ATDD Checklist: Story 1.3 — First-Login Welcome Modal & Display Name

## Context

- **Story:** 1.3 — First-Login Welcome Modal & Display Name
- **Date:** 2026-03-09
- **Stack:** fullstack (TanStack Start + React + PostgreSQL/Drizzle)
- **Test framework:** Vitest (integration/unit) + Playwright (E2E)
- **Execution mode:** sequential (AI generation)
- **TDD Phase:** RED ✅

---

## TDD Red Phase Status

| Test file | Tests | Status |
|---|---|---|
| `tests/integration/welcome-modal.test.ts` | 17 | 🔴 All FAILING (red phase) |
| `e2e/welcome-modal.spec.ts` | 7 | ⏭ All SKIPPED (`test.skip()`) |
| **Total** | **24** | **RED** |

**Baseline preserved:** 67 existing tests still PASS ✅

---

## Acceptance Criteria Coverage

| AC | Description | Integration tests | E2E tests | Priority |
|---|---|---|---|---|
| AC1 | Welcome modal appears on first login | 1.3-INT-001, 002, 006, 007, 008, 016, 017 | 1.3-E2E-001 | P0 |
| AC2 | Dismissing marks modal as seen | 1.3-INT-009, 012, 013 | 1.3-E2E-002, 003 | P0 |
| AC3 | Display name update succeeds | 1.3-INT-003, 004, 010, 011, 014, 015 | 1.3-E2E-004 | P0 |
| AC4 | Validation rejects empty/whitespace | 1.3-INT-005 | 1.3-E2E-005, 006 | P0/P1 |
| AC5 | Modal absent on subsequent logins | 1.3-INT-001, 017 | 1.3-E2E-007 | P0 |

---

## Integration Tests Detail (`tests/integration/welcome-modal.test.ts`)

### AC1 / AC5 — Auth module: hasSeenWelcome in SessionData

| ID | Description | Fail reason (RED) |
|---|---|---|
| 1.3-INT-001 | `auth.ts` `SessionData` includes `hasSeenWelcome: boolean` | Field not in type yet |
| 1.3-INT-002 | `getSession()` selects `hasSeenWelcome: players.hasSeenWelcome` | SELECT missing |

### AC3 / AC4 — Validator: updateDisplayNameSchema

| ID | Description | Fail reason (RED) |
|---|---|---|
| 1.3-INT-003 | `validators.ts` exports `updateDisplayNameSchema` | Not exported yet |
| 1.3-INT-004 | `validators.ts` exports `UpdateDisplayNameInput` type | Not exported yet |
| 1.3-INT-005 | Schema uses `.trim().min(1)` — whitespace rejection | Schema not defined |

### AC1 / AC2 / AC3 / AC4 — WelcomeModal component

| ID | Description | Fail reason (RED) |
|---|---|---|
| 1.3-INT-006 | `src/components/welcome-modal.tsx` exists | File missing |
| 1.3-INT-007 | Exports `WelcomeModal` function | File missing |
| 1.3-INT-008 | Imports `Dialog` from `./ui/dialog` | File missing |
| 1.3-INT-009 | `onOpenChange` attribute calls `onDismiss` | File missing |
| 1.3-INT-010 | Uses `updateDisplayNameSchema` for validation | File missing |
| 1.3-INT-011 | Uses `useForm` from `@tanstack/react-form` — no adapter | File missing |

### AC2 / AC3 — Server functions

| ID | Description | Fail reason (RED) |
|---|---|---|
| 1.3-INT-012 | `markWelcomeSeenFn = createServerFn(...)` in `index.tsx` | Not defined |
| 1.3-INT-013 | `markWelcomeSeenFn` chains `.middleware([authMiddleware])` | Not defined |
| 1.3-INT-014 | `updateDisplayNameFn = createServerFn(...)` in `index.tsx` | Not defined |
| 1.3-INT-015 | `updateDisplayNameFn` uses `.inputValidator(updateDisplayNameSchema)` | Not defined |

### AC1 / AC5 — WelcomeModal integration

| ID | Description | Fail reason (RED) |
|---|---|---|
| 1.3-INT-016 | `index.tsx` imports `WelcomeModal` | Not imported |
| 1.3-INT-017 | `useState(session?.hasSeenWelcome === false)` | Not integrated |

---

## E2E Tests Detail (`e2e/welcome-modal.spec.ts`)

All tests use `test.skip()` — server must be running + auth fixtures needed for green phase.

| ID | Description | AC | Priority |
|---|---|---|---|
| 1.3-E2E-001 | First-login user sees WelcomeModal with title + form | AC1 | P0 |
| 1.3-E2E-002 | Dismiss button closes modal | AC2 | P0 |
| 1.3-E2E-003 | Escape key closes modal (onOpenChange handler) | AC2 | P1 |
| 1.3-E2E-004 | Valid display name submission closes modal | AC3 | P0 |
| 1.3-E2E-005 | Empty display name shows inline error | AC4 | P0 |
| 1.3-E2E-006 | Whitespace-only display name shows inline error | AC4 | P1 |
| 1.3-E2E-007 | Modal absent when hasSeenWelcome = true | AC5 | P0 |

---

## Test Quality Validation

- [x] All integration tests fail for the right reason (implementation missing)
- [x] All E2E tests use `test.skip()` (server required)
- [x] No placeholder assertions (`expect(true).toBe(true)`)
- [x] All assertions are coupled (MEMORY.md rule: no false positives from independent `toContain`)
- [x] Existing 67 tests still pass (no regression)
- [x] Naming convention: `[story_id-TYPE-NNN]` + `[ACx][Py]` tags
- [x] No orphaned browser sessions (E2E tests are skipped)

---

## Architecture Compliance Checks (from story spec)

- [x] `auth.ts` is the ONLY module reading cookies/session — `hasSeenWelcome` added to `getSession()` there
- [x] `markWelcomeSeenFn` must use `authMiddleware` — tested in 1.3-INT-013
- [x] `WelcomeModal` is pure UI — no direct server calls, only callbacks — not tested (component purity)
- [x] `updateDisplayNameFn` uses `.inputValidator()` not `.validator()` — tested in 1.3-INT-015
- [x] TanStack Form + Zod v4 native Standard Schema — no adapter — tested in 1.3-INT-011

---

## Next Steps — TDD Green Phase

After implementing story 1.3:

1. **Run integration tests:** `pnpm test` → all 17 new tests should PASS
2. **Remove `test.skip()`** from `e2e/welcome-modal.spec.ts`
3. **Set up auth fixtures** for E2E tests (auth cookie for first-time vs returning user)
4. **Run E2E tests:** `pnpm playwright test e2e/welcome-modal.spec.ts`
5. **Quality gates:** `pnpm typecheck && pnpm lint && pnpm build`
6. **Verify baseline:** `pnpm test` → 84+ tests passing (67 baseline + 17 new)

## Implementation Tasks (from story spec)

1. `src/lib/auth.ts` — Add `hasSeenWelcome: boolean` to `SessionData` + `getSession()`
2. `src/lib/validators.ts` — Add `updateDisplayNameSchema` + `UpdateDisplayNameInput`
3. `src/components/welcome-modal.tsx` — Create `WelcomeModal` component (shadcn Dialog + TanStack Form)
4. `src/routes/index.tsx` — Add `markWelcomeSeenFn` + `updateDisplayNameFn` server functions
5. `src/routes/index.tsx` — Integrate `WelcomeModal` into `CampaignView`
6. Update tests: `auth.test.ts` (add `hasSeenWelcome` to mocks), `validators.test.ts` (add schema tests)
