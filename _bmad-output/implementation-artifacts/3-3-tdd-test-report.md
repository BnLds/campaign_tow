# TDD Test Report — Story 3.3: Match Result Entry

**Date:** 2026-03-16
**Phase:** RED (tests written before implementation)
**Story:** 3.3 — Match Result Entry

---

## Test Files Created

| File | Tests | Status |
|---|---|---|
| `src/db/__tests__/queries-match-results.test.ts` | 23 | RED — 23 failing |
| `src/components/__tests__/timeline-entry-result.test.tsx` | 27 | RED — 20 failing, 7 passing* |
| `tests/server-fns/submit-match-result.test.ts` | 29 | RED — 29 failing |
| `src/lib/__tests__/validators-match.test.ts` | 16 | RED — 16 failing |
| **Total** | **95** | **88 failing / 7 passing*** |

*\* 7 tests pass because they verify backward-compatible behavior (e.g., `isEditable=false` does NOT render selection buttons — the existing component already satisfies this). These tests are correctly written: they will continue to pass after implementation and guard against regressions.*

---

## AC Coverage

| AC | Story Task | Test IDs | Files |
|---|---|---|---|
| AC1 — Player can enter a match result | 7.1, 7.5, 7.12, 7.13, 7.16, 7.18, 7.19 | 3.3-QRY-001–023, 3.3-COMP-001–005, 3.3-COMP-017–019, 3.3-SFN-001–004, 3.3-SFN-015–018, 3.3-SFN-021–025, 3.3-VAL-001–016 | all 4 files |
| AC2 — Both players' results displayed on timeline | 7.14, 7.21 | 3.3-COMP-006–011, 3.3-SFN-020, 3.3-SFN-026–029 | component, server-fns |
| AC3 — Symmetric result entry | 7.4, 7.5, 7.6, 7.7, 7.8, 7.16 | 3.3-QRY-009–023, 3.3-COMP-017–019, 3.3-SFN-014 | queries, component, server-fns |
| AC4 — Authorization: only participants can modify | 7.9, 7.10, 7.11 | 3.3-SFN-005–013 | server-fns |
| AC5 — Result modification (re-entry) | 7.8, 7.14, 7.21 | 3.3-QRY-014–023, 3.3-COMP-006–011, 3.3-SFN-019–029 | queries, component, server-fns |
| AC6 — Optimistic feedback and loading state | 7.13, 7.15, 7.17 | 3.3-COMP-001–005, 3.3-COMP-012–016, 3.3-COMP-020–022, 3.3-COMP-023–027 | component |

---

## Story Task Coverage

| Task | Coverage |
|---|---|
| 7.1 `getMatchParticipantByMatchAndArmy` returns participant row | 3.3-QRY-001–008 |
| 7.2 `getMatchParticipantByMatchAndArmy` returns null (non-participant) | 3.3-QRY-006–008 |
| 7.3 `getMatchParticipantByMatchAndArmy` returns null (nonexistent matchId) | 3.3-QRY-006–008 |
| 7.4 `invertResult` all 3 cases | 3.3-QRY-009–013 |
| 7.5 `updateMatchResults` victory → defeat for opponent | 3.3-QRY-014–023 |
| 7.6 `updateMatchResults` defeat → victory for opponent | 3.3-QRY-014–023 |
| 7.7 `updateMatchResults` draw → draw for both | 3.3-QRY-014–023 |
| 7.8 `updateMatchResults` re-entry overwrites both results | 3.3-QRY-014–023 |
| 7.9 `submitMatchResultFn` rejects guests (UNAUTHORIZED) | 3.3-SFN-005–007 |
| 7.10 `submitMatchResultFn` rejects no-army (FORBIDDEN) | 3.3-SFN-008–010 |
| 7.11 `submitMatchResultFn` rejects non-participant (FORBIDDEN) | 3.3-SFN-011–013 |
| 7.12 `submitMatchResultFn` success path | 3.3-SFN-014–018 |
| 7.13 `TimelineEntry` isEditable+null renders 3 buttons | 3.3-COMP-001–005 |
| 7.14 `TimelineEntry` isEditable+result renders badge + Modifier | 3.3-COMP-006–011 |
| 7.15 `TimelineEntry` isEditable=false no selection UI | 3.3-COMP-012–016 |
| 7.16 Button click calls onResultSubmit(matchId, result) | 3.3-COMP-017–019 |
| 7.17 Buttons disabled during submission, error on failure | 3.3-COMP-020–022 |
| 7.18 `submitMatchResultSchema` validates correct/invalid input | 3.3-VAL-001–016 |
| 7.19 Campaign view shows result buttons for logged-in player | 3.3-SFN-021–025 |
| 7.20 Campaign view: guest sees no result entry buttons | 3.3-SFN-024 |
| 7.21 Army detail: isEditable=true only when isOwner=true | 3.3-SFN-027 |

All 21 test cases (7.1–7.21) are covered.

---

## Test Patterns Used

- **File-contract tests** (file-content assertions via `readFileSync`): queries, server-fns, some component structural tests
- **Runtime Zod validation tests** (dynamic import + `safeParse`): validators-match
- **React component render tests** (`@testing-library/react`): timeline-entry-result
- **Async behavior tests** (`waitFor`, `vi.fn().mockResolvedValue`, `mockRejectedValue`): timeline-entry-result
- **`// AC: N` comments** on every test for traceability

---

## Red Phase Confirmation

Command run: `pnpm test`

```
❯ src/db/__tests__/queries-match-results.test.ts   (23 tests | 23 failed)
❯ src/components/__tests__/timeline-entry-result.test.tsx (27 tests | 20 failed)
❯ tests/server-fns/submit-match-result.test.ts   (29 tests | 29 failed)
❯ src/lib/__tests__/validators-match.test.ts   (16 tests | 16 failed)
```

88 of 95 tests fail because the implementation does not exist yet:
- `getMatchParticipantByMatchAndArmy`, `invertResult`, `updateMatchResults` — not yet added to `src/db/queries.ts`
- `submitMatchResultSchema` / `SubmitMatchResultInput` — not yet added to `src/lib/validators.ts`
- `submitMatchResultFn` — not yet added to `src/routes/index.tsx`
- `TimelineEntry` — `isEditable`, `onResultSubmit` props and interactive UI not yet implemented
- `isOwner` wiring in `armies/$armyId.tsx` — not yet connected to TimelineEntry

The 7 passing tests verify backward compatibility and will continue to pass after implementation.

No pre-existing tests were broken by the new test files.

---

## Notes for Implementation

1. **`invertResult`** must be exported (not just used internally) — tests import it via the queries file structure.
2. **`updateMatchResults`** must use `ne(matchParticipants.armyId, myArmyId)` for opponent update — tests check for this exact pattern.
3. **`submitMatchResultFn`** must be exported from `src/routes/index.tsx` so `armies/$armyId.tsx` can import it.
4. **`TimelineEntry` props** `isEditable` and `onResultSubmit` must be optional with safe defaults — 7 backward-compat tests already pass and must continue to pass.
5. **`data-testid` attributes required** in `TimelineEntry`: `result-select-victory`, `result-select-defeat`, `result-select-draw`, `modify-result`, `result-error`.
6. **French labels required** in selection buttons: "Victoire", "Défaite"/"Defaite", "Égalité"/"Egalite".
