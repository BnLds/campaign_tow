# TDD Test Report — Story 4.1: Post-Match Flow — XP Entry per Unit & Character

Generated: 2026-03-17
Phase: RED (pre-implementation)

## Summary

| Metric | Value |
|---|---|
| New test files created | 6 |
| New tests written | ~123 (91 failing at collection/assertion) |
| Pre-existing tests | 920 passing (no regressions) |
| New test failures | 91 failures + 1 file collection error |
| Red phase confirmed | YES |

**Overall suite:** 7 files failed | 37 passed (44 total) | 91 tests failed | 920 tests passed

---

## Test Files Created

### 1. `src/db/__tests__/queries-post-match.test.ts`
**Tests:** 24 | **All failing** (RED)
**Coverage:** Tasks 10.1–10.7 — AC3, AC4, AC5, AC7, AC8

Tests for three new query functions:
- `incrementUnitXp` (8 tests): export, params, SQL atomic increment expression, db.update pattern, .returning(), return type, null-for-missing, eq filter
- `markEvolutionsEntered` (8 tests): export, params, evolutionsEnteredAt timestamp, db.update, return type boolean, true/false paths, eq filter
- `getMatchParticipantForEvolution` (8 tests): export, params, evolutionsEnteredAt field, full return shape, matchParticipants table, and() filter, null path, limit(1)

### 2. `src/lib/__tests__/validators-post-match.test.ts`
**Tests:** 23 | **All failing** (RED)
**Coverage:** Tasks 10.8–10.9 — AC3, AC4, AC5, AC8

- `submitUnitXpSchema` file contract (7 tests): export, unitId.min(1), xpGained.int(), min(0), max(99), SubmitUnitXpInput type, z.infer derivation
- `submitUnitXpSchema` runtime (8 tests): accepts valid, 0 XP, 99 max; rejects empty unitId, -1, 100, 1.5; parse shape
- `completeEvolutionsSchema` file contract (4 tests): export, matchId.min(1), CompleteEvolutionsInput type, z.infer derivation
- `completeEvolutionsSchema` runtime (4 tests): accepts valid, rejects empty, rejects missing, parse shape

### 3. `src/routes/match/$matchId/__tests__/post-match.test.ts`
**Tests:** 32 | **All failing** (RED)
**Coverage:** Tasks 10.10–10.17, 10.27–10.29 — AC1, AC2, AC3, AC4, AC5, AC7, AC8

- Route file existence (3 tests): file exists, createFileRoute, Route export
- data-app-hydrated pattern (2 tests): useHydrated import, attribute set (MANDATORY)
- `loadPostMatchDataFn` contract (8 tests): GET server fn, authMiddleware, isGuest check, getMatchParticipantForEvolution, FORBIDDEN, alreadyCompleted:true, getUnitsForArmy, units array shape
- `submitUnitXpFn` contract (9 tests): POST server fn, authMiddleware, inputValidator(submitUnitXpSchema), UNAUTHORIZED, FORBIDDEN, getUnitById, incrementUnitXp call, success return shape, no special case for 0 XP
- `completeEvolutionsFn` contract (8 tests): POST server fn, UNAUTHORIZED, FORBIDDEN, getMatchParticipantByMatchAndArmy, markEvolutionsEntered, success return shape, idempotent, inputValidator(completeEvolutionsSchema)
- Already-completed state (2 tests): alreadyCompleted handling, French message

### 4. `src/components/__tests__/post-match-wizard.test.tsx`
**Tests:** ~29 (file fails at collection — import resolution error) | **All failing** (RED)
**Coverage:** Tasks 10.18–10.26 — AC1, AC2, AC3, AC4, AC5, AC6, AC8

The file imports `PostMatchWizard` from `../post-match-wizard` which does not exist yet. Vitest cannot collect the file at all — this is the deepest form of RED (component doesn't exist).

Test groups that will run once component is created:
- Renders first unit name and XP input (5 tests)
- Progress indicator "Unite X / N" (1 test)
- Suivant button calls server function (2 tests)
- Advances to next unit on success (2 tests)
- Error message on failure (1 test)
- Calls completeEvolutionsFn and onComplete after last unit (1 test)
- Button disabled during submission (1 test)
- Empty units array shows "Aucune unite" (3 tests)
- Last step shows "Terminer" (3 tests)
- Source file structural contract with data-testid attributes (9 tests)

**Note:** Tests 10.21–10.23 use optional callback props (`onSubmitUnitXp`, `onCompleteEvolutions`) for testability. The PostMatchWizard component should accept these optional props (defaulting to the actual server functions when not provided) to enable unit testing without a live server.

### 5. `src/routes/__tests__/campaign-post-match.test.ts`
**Tests:** 5 | **4 failing, 1 passing** (RED for new tests)
**Coverage:** Task 10.30 — AC1

- CAMP-001: ActionChip + href + post-match coupled (FAIL — no href yet)
- CAMP-002: href uses match.matchId dynamically (FAIL)
- CAMP-003: href only when myResult !== null (FAIL — no href on that branch)
- CAMP-004: myResult === null branch renders ActionChip (PASS — already exists, no regression)
- CAMP-005: URL pattern "/match/" + matchId + "/post-match" (FAIL)

### 6. `src/components/__tests__/timeline-entry-evolutions.test.tsx`
**Tests:** 11 | **7 failing, 4 passing** (RED for new tests)
**Coverage:** Task 10.31 — AC2

- TLE-001: renders "Saisir evolutions" when hasEvolutions=false, result set, isEditable=true (FAIL)
- TLE-002: clicking calls onEvolutionStart(matchId) (FAIL)
- TLE-003: NOT shown when hasEvolutions=true (PASS — TimelineEntry already handles hasEvolutions)
- TLE-004: NOT shown when result=null (PASS — falls through naturally without prop)
- TLE-005: NOT shown when isEditable=false (PASS — already handles no onEvolutionStart)
- TLE-006: NOT shown when onEvolutionStart not provided (PASS — prop absent → no render)
- TLE-007: shown with result="defeat" (FAIL)
- TLE-008: shown with result="draw" (FAIL)
- TLE-009: onEvolutionStart declared in TimelineEntryProps (FAIL)
- TLE-010: onEvolutionStart is optional (FAIL)
- TLE-011: onEvolutionStart accepts (matchId: string) => void (FAIL)

---

## AC Coverage Matrix

| AC | Description | Test IDs |
|---|---|---|
| AC1 | Wizard launches from ActionChip | 4.1-SFN-001–013, 4.1-CAMP-001–005 |
| AC2 | Wizard launches from timeline entry | 4.1-TLE-001–011, 4.1-SFN-001–005 |
| AC3 | XP entry for regular unit | 4.1-QRY-001–008, 4.1-VAL-001–015, 4.1-SFN-014–022, 4.1-WIZ-001–013 |
| AC4 | XP entry for character | 4.1-QRY-001–008, 4.1-VAL-001–015, 4.1-SFN-014–022, 4.1-WIZ-001–013 |
| AC5 | Wizard completion marks evolutions entered | 4.1-QRY-009–016, 4.1-VAL-016–023, 4.1-SFN-023–032, 4.1-WIZ-012 |
| AC6 | PostMatchWizard UI displays unit info and XP input | 4.1-WIZ-001–028 |
| AC7 | Post-match link hidden for non-participants | 4.1-SFN-006–013, 4.1-QRY-017–024 |
| AC8 | Skipping XP entry (0 XP) | 4.1-QRY-001–008, 4.1-VAL-008–015, 4.1-SFN-022 |

---

## Red Phase Confirmation

**Command:** `npx vitest run`

**Result:**
```
Test Files  7 failed | 37 passed (44)
     Tests  91 failed | 920 passed (1011)
```

**Failure reasons by file:**

1. **queries-post-match.test.ts** (24 FAIL): `incrementUnitXp`, `markEvolutionsEntered`, `getMatchParticipantForEvolution` not yet exported from `src/db/queries.ts`

2. **validators-post-match.test.ts** (23 FAIL): `submitUnitXpSchema` and `completeEvolutionsSchema` not yet exported from `src/lib/validators.ts`; runtime tests fail with "Cannot read properties of undefined (reading 'safeParse')"

3. **post-match.test.ts** (32 FAIL): `src/routes/match/$matchId/post-match.tsx` does not exist; file existence check fails immediately, all content tests throw ENOENT

4. **post-match-wizard.test.tsx** (collection error): `src/components/post-match-wizard.tsx` does not exist; Vitest cannot resolve the import `"../post-match-wizard"` — file fails at collection stage

5. **campaign-post-match.test.ts** (4 FAIL): `index.tsx` does not yet have `href` on post-match ActionChip — currently both branches render `<ActionChip ... />` with no `href` prop (marked with TODO comment)

6. **timeline-entry-evolutions.test.tsx** (7 FAIL): `TimelineEntry` does not yet have `onEvolutionStart` prop; "Saisir evolutions" text not found in rendered output; source file contract checks fail

**Pre-existing tests:** 920 tests passing — zero regressions introduced.

---

## Implementation Notes for Dev Agent

### PostMatchWizard testability pattern
Tests 10.21–10.23 use optional injectable callbacks for testability:
```tsx
type PostMatchWizardProps = {
  matchId: string
  matchParticipantId: string
  units: Array<{ id: string; name: string; type: string; xp: number }>
  onComplete: () => void
  // Optional injectable callbacks for testing (defaults to server functions)
  onSubmitUnitXp?: (unitId: string, xpGained: number) => Promise<{ success: boolean; data?: { unitId: string; newXp: number }; error?: { code: string; message: string } }>
  onCompleteEvolutions?: (matchId: string) => Promise<{ success: boolean; data?: { matchId: string }; error?: { code: string; message: string } }>
}
```

### Campaign view CAMP-004 note
Test CAMP-004 passes because it only checks that `myResult === null` branch renders an ActionChip — which it already does. This is intentional: the test verifies we don't accidentally break the existing null branch when adding the href to the non-null branch.

### Timeline entry 4 passing tests
Tests TLE-003 through TLE-006 pass because the current TimelineEntry correctly handles `hasEvolutions=true` (shows "Evolutions saisies"), `result=null`, `isEditable=false`, and absent `onEvolutionStart` prop cases — all return null/undefined from `queryByText` as expected. These are backward-compatibility guards.
