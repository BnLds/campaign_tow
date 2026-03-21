# TDD Test Report — Story 3.2: Match Creation & Pending Actions

**Status:** RED phase complete — all 154 new tests failing as expected
**Date:** 2026-03-16
**Story:** 3-2-match-creation-pending-actions

---

## Test Files Created

| File | Tests | Coverage |
|---|---|---|
| `src/components/__tests__/create-match-fab.test.tsx` | 58 | AC1, AC2, AC3, AC8, AC9, AC10, AC11, AC12 |
| `src/components/__tests__/action-chip.test.tsx` | 22 | AC5 |
| `src/db/__tests__/queries-pending-matches.test.ts` | 33 | AC5, AC6, AC8 |
| `tests/server-fns/create-match.test.ts` | 41 | AC4, AC5, AC7, AC8, AC9, AC10 |
| **Total** | **154** | **AC1–AC12 (all)** |

---

## AC Coverage

| AC | Description | Test IDs |
|---|---|---|
| AC1 | FAB visible on all authenticated views (navy #334155, aria-label, positioned above TabBar) | 3.2-FAB-001 to 018, 052–056 |
| AC2 | FAB opens match creation dialog with opponent list | 3.2-FAB-016 to 021, 057–058; 3.2-SFN-021 |
| AC3 | Optional date field defaults to today, normalized to midnight UTC | 3.2-FAB-042 to 044; 3.2-SFN-010 to 014 |
| AC4 | Match creation writes correct DB records (transaction, null results) | 3.2-FAB-029 to 041; 3.2-SFN-015 to 020 |
| AC5 | ActionChip strip shows pending matches (case 1: result null, case 2: evolutions null) | 3.2-ACP-001 to 022; 3.2-QRY-008 to 028; 3.2-SFN-021 to 038 |
| AC6 | ActionChip disappears when all actions completed | 3.2-QRY-020, 021 (OR filter ensures completed matches excluded) |
| AC7 | Match appears in both players' timelines | 3.2-SFN-039 to 041 |
| AC8 | Cannot create match with own army; server validates opponent exists | 3.2-FAB-025 to 027, 034, 035; 3.2-SFN-005 to 009; 3.2-QRY-029 to 033 |
| AC9 | Guest users cannot create matches | 3.2-FAB-032, 052–054; 3.2-SFN-001, 002 |
| AC10 | Player without army cannot create matches | 3.2-FAB-020, 021, 033; 3.2-SFN-003, 004 |
| AC11 | Dialog loading and error states | 3.2-FAB-049 to 051 |
| AC12 | Match creation button shows loading state (prevents double-submission) | 3.2-FAB-045 to 048 |

---

## Story Task 8 Sub-item Traceability

| Task 8.x | Description | Test IDs |
|---|---|---|
| 8.1 | CreateMatchFab: circular button, aria-label, data-testid | 3.2-FAB-001 to 013 |
| 8.2 | CreateMatchFab: opens dialog on click (when armyId provided) | 3.2-FAB-016 to 021, 042–048 |
| 8.3 | ActionChip: label with chevron, styling (#eef4ff, pill shape) | 3.2-ACP-006 to 017 |
| 8.4 | ActionChip: renders as `<a>` when href provided, `<button>` otherwise | 3.2-ACP-019 to 022 |
| 8.5 | getPendingMatches: returns matches where result IS NULL | 3.2-QRY-018, 020 |
| 8.6 | getPendingMatches: returns matches where result IS NOT NULL but evolutionsEnteredAt IS NULL | 3.2-QRY-019, 020, 025 |
| 8.7 | getPendingMatches: does NOT return matches where both are set | 3.2-QRY-021 |
| 8.8 | getPendingMatches: includes opponent army name and faction via join | 3.2-QRY-016, 022, 023 |
| 8.9 | getPendingMatches: returns empty array when no pending matches | 3.2-QRY-028 |
| 8.10 | getPendingMatches: uses self-join with ne() exclusion | 3.2-QRY-013 to 015 |
| 8.11 | createMatchFn: rejects guest users | 3.2-FAB-032; 3.2-SFN-001 |
| 8.12 | createMatchFn: rejects player without army | 3.2-FAB-033; 3.2-SFN-003, 004 |
| 8.13 | createMatchFn: rejects self-match | 3.2-FAB-034; 3.2-SFN-005, 006 |
| 8.14 | createMatchFn: rejects nonexistent opponent army | 3.2-FAB-035; 3.2-SFN-007, 008, 009 |
| 8.15 | createMatchFn: rejects invalid date string | 3.2-FAB-036; 3.2-SFN-010, 011 |
| 8.16 | createMatchFn: creates match + 2 participants with null result and null evolutionsEnteredAt | 3.2-FAB-039 to 041; 3.2-SFN-015 to 020 |
| 8.17 | createMatchFn: defaults date to today when not provided | 3.2-FAB-038; 3.2-SFN-013 |
| 8.18 | createMatchFn: date normalized to midnight UTC | 3.2-FAB-037; 3.2-SFN-012, 014 |
| 8.19 | Campaign view: action strip rendered when pending matches exist | 3.2-SFN-027 to 032 |
| 8.20 | Campaign view: action strip not rendered when no pending matches | 3.2-SFN-028 |
| 8.21 | Campaign view: ActionChip label differentiation ("Resultat a entrer" vs "Rapport de bataille") | 3.2-SFN-033 to 038 |
| 8.22 | loadCampaignTimelineFn returns pendingMatches alongside timeline data | 3.2-SFN-021 to 026, 039, 040 |
| 8.23 | loadOpponentsFn: excludes current player's army | 3.2-FAB-022 to 026 |
| 8.24 | loadOpponentsFn: only returns armies with assigned players | 3.2-FAB-027, 028 |
| 8.25 | Opponent list: excludes current player's army from selectable opponents | 3.2-FAB-025 to 027, 057 |

---

## Red Phase Confirmation

All 154 tests fail on run because:

- `src/components/create-match-fab.tsx` — does not exist yet
- `src/components/action-chip.tsx` — does not exist yet
- `src/db/queries.ts` — does not yet export `getPendingMatches`, `PendingMatchData`, or `getArmyById`
- `src/routes/index.tsx` — does not yet import `ActionChip`, `getPendingMatches`, or render the action strip

**Verified by running `pnpm test`:**
```
Test Files  10 failed | 28 passed (38)
Tests  244 failed | 684 passed (928)
```

(The 244 total failing tests include pre-existing failures from other story specs in red phase. The 154 new story 3.2 tests are all failing.)

---

## Test Pattern Notes

All tests follow the established project pattern of **static file-contract assertions** (`readFileSync` + regex/string matching). This approach:

- Does not require a test DB or server runtime
- Fails immediately when the file doesn't exist (clear red signal)
- Verifies structural contracts: exports, props, styles, French error messages, server function patterns
- Is consistent with `tab-bar.test.tsx`, `army-list-item.test.tsx`, `queries-record.test.ts`, `2-4-unit-deltas-server.test.ts`

Each test has an `// AC: N` comment for traceability to the story's acceptance criteria.
