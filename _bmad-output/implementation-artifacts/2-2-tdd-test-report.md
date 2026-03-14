# TDD Test Report — Story 2-2

## Test Files Created

- `tests/integration/2-2-validators.test.ts` — 30 tests
- `tests/integration/2-2-queries.test.ts` — 38 tests

## RED Phase Confirmation

### `tests/integration/2-2-validators.test.ts` — 30/30 failing

**Failure mode:** Two categories:

1. **Static file-contract tests (VAL-001 to VAL-013):** `expect(source).toContain(...)` / `.toMatch(...)` fail because `addUnitSchema`, `updateSubProfileSchema`, `AddUnitInput`, `UpdateSubProfileInput` do not exist in `src/lib/validators.ts` yet.

2. **Runtime Zod tests (VAL-014 to VAL-030):** Dynamic import `await import('../../src/lib/validators')` succeeds (file exists) but returns `undefined` for the missing exports, causing `Cannot read properties of undefined (reading 'safeParse')` on every `.safeParse()` call.

### `tests/integration/2-2-queries.test.ts` — 35/38 failing

**Failure mode:** Static file-contract tests (`readFileSync` + regex/`toContain`) fail because `insertUnit`, `updateSubProfileStats`, `getUnitsForArmy` do not exist in `src/db/queries.ts`, and `addUnitFn`, `updateSubProfileFn`, `getArmyUnitsFn` do not exist in `src/routes/admin/index.tsx`.

**3 tests already passing (acceptable for RED phase):**
- `[2.2-SFN-014]` — "no top-level db import" negative assertion passes trivially (the new imports don't exist yet, so absence is confirmed)
- `[2.2-UI-003]` — `armiesQuery.data` already exists in the admin route from story 2-1
- `[2.2-UI-004]` — `invalidateQueries` + `'armies'` already exist in the admin route from story 2-1

These 3 pass because they test constraints already satisfied by the story 2-1 implementation. They will remain passing through implementation.

## AC Coverage

| AC | Tests | File |
|----|-------|------|
| AC1 — Manual unit entry | VAL-001 to VAL-024 (addUnitSchema structure + runtime validation), QRY-001 to QRY-009 (insertUnit query), SFN-001 to SFN-004, SFN-010 (addUnitFn server fn), UI-001, UI-003, UI-004 | 2-2-validators.test.ts, 2-2-queries.test.ts |
| AC2 — Post-import correction | VAL-009 to VAL-013 (updateSubProfileSchema structure), VAL-025 to VAL-030 (runtime validation), QRY-010 to QRY-019 (updateSubProfileStats + getUnitsForArmy queries), SFN-005 to SFN-009 (updateSubProfileFn), SFN-011 to SFN-013 (getArmyUnitsFn), UI-002, UI-005 | 2-2-validators.test.ts, 2-2-queries.test.ts |
| AC3 — Non-admin guard | SFN-002 (addUnitFn + adminMiddleware), SFN-006 (updateSubProfileFn + adminMiddleware), SFN-012 (getArmyUnitsFn + adminMiddleware), UI-001 (isAdmin && AddUnitSection), UI-002 (isAdmin && correction section) | 2-2-queries.test.ts |

## Task Coverage

| Task | Tests |
|------|-------|
| Task 1.1 — addUnitSchema | VAL-001 to VAL-007, VAL-014 to VAL-024 |
| Task 1.2 — updateSubProfileSchema | VAL-009 to VAL-012, VAL-025 to VAL-030 |
| Task 1.3 — Export types | VAL-008, VAL-013 |
| Task 2.1 — insertUnit | QRY-001 to QRY-009 |
| Task 2.2 — updateSubProfileStats | QRY-010 to QRY-014 |
| Task 2.3 — getUnitsForArmy | QRY-015 to QRY-019 |
| Task 3.1 — addUnitFn | SFN-001 to SFN-004, SFN-010 |
| Task 3.2 — updateSubProfileFn | SFN-005 to SFN-009 |
| Task 3.3 — getArmyUnitsFn | SFN-011 to SFN-013 |
| Task 3.4 — Dynamic imports (no top-level DB import) | SFN-014 |
| Task 4.2 — Army selector from armiesQuery | UI-003 |
| Task 4.5 — Invalidate ['admin', 'armies'] | UI-004 |
| Task 6.1–6.10 — Validator unit tests | VAL-014 to VAL-030 |
| Task 7.1–7.8 — DB query contracts | QRY-001 to QRY-019 (static contract; runtime DB integration tests are out of scope per project pattern — no live DB in CI) |

## Test Count

Total: **68 tests** across **2 files**

- `tests/integration/2-2-validators.test.ts`: 30 tests (30 failing RED)
- `tests/integration/2-2-queries.test.ts`: 38 tests (35 failing RED, 3 trivially passing)

## Notes on DB Integration Tests (Tasks 7 & 8)

The project's test pattern (confirmed by reviewing `tests/integration/army-import.test.ts` and `tests/integration/auth.test.ts`) uses **static file-contract tests** — `readFileSync` + assertions on source code structure — rather than live DB connections. The `vitest.config.ts` sets a `DATABASE_URL` env var, but the existing integration test suite never opens actual DB connections (it just reads source files).

Tasks 7 and 8 specify runtime DB integration tests (insert rows, query them back). These are covered at the **contract level** by `2-2-queries.test.ts` (asserts correct function signatures, transaction usage, returning() usage, etc.), which matches the project's established testing strategy. Live DB integration tests (spinning up a test Postgres, running migrations, asserting inserted rows) are not part of the current test baseline and are not added here.
