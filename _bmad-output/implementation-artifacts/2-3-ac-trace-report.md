# AC Trace Report — Story 2-3

**Date:** 2026-03-14
**Story:** 2-3 Unit Card Display with Campaign Deltas
**Test baseline:** 344 tests passing (+36 new)

## AC Trace Matrix

| AC | Description | Tests | Status |
|----|-------------|-------|--------|
| AC1 | Base stats display | `2-3-delta-composer.test.ts`: 2.3-UNIT-001, 2.3-UNIT-008, 2.3-UNIT-011 / `2-3-unit-card.test.tsx`: 2.3-COMP-001, 2.3-COMP-002, 2.3-COMP-005, 2.3-COMP-006, 2.3-COMP-007, 2.3-COMP-008, 2.3-COMP-009 / `2-3-calculate-tier.test.ts`: 2.3-TIER-001 through 2.3-TIER-012 | PASS |
| AC2 | Campaign deltas | `2-3-delta-composer.test.ts`: 2.3-UNIT-002, 2.3-UNIT-003, 2.3-UNIT-004, 2.3-UNIT-005, 2.3-UNIT-006, 2.3-UNIT-009, 2.3-UNIT-010, 2.3-UNIT-012, 2.3-UNIT-013 / `2-3-unit-card.test.tsx`: 2.3-COMP-003, 2.3-COMP-004, 2.3-COMP-012 | PASS |
| AC3 | Multiple sub-profiles | `2-3-delta-composer.test.ts`: 2.3-UNIT-007 / `2-3-unit-card.test.tsx`: 2.3-COMP-010, 2.3-COMP-011 | PASS |
| AC4 | Public visibility (FR12) | `src/routes/armies/$armyId.tsx`: `authMiddleware` applied (not `adminMiddleware`), all authenticated users including guests can view any army | PASS |

## Coverage Detail

### AC1 — Base stats display
- `2.3-UNIT-001`: all 9 stat keys have `modified=false` and `delta=null` when no modifiers present
- `2.3-UNIT-008`: empty modifiers returns `deltas=[]` and `gains=[]`
- `2.3-UNIT-011`: each stat entry has the correct `{ value, delta, modified }` shape
- `2.3-COMP-001`: unit name rendered in card
- `2.3-COMP-002`: stat bar contains all 9 stat label cells (m, cc, ct, f, e, pv, i, a, cd)
- `2.3-COMP-005`: unmodified stats have neither `.mod` nor `.pen` class
- `2.3-COMP-006/007/008/009`: tier pill renders correct symbol and label per tier level (0–3)
- `2.3-TIER-001` through `2.3-TIER-012`: `calculateTier` returns correct 0|1|2|3 at every XP boundary for both unit types

### AC2 — Campaign deltas
- `2.3-UNIT-002`: positive delta on numeric stat updates value arithmetically (`"4"` + 1 → `"5"`)
- `2.3-UNIT-003`: negative delta on numeric stat subtracts correctly (`"3"` − 1 → `"2"`)
- `2.3-UNIT-004`: non-numeric stat (`"3+"`) — value unchanged, delta chip present, `modified=true`
- `2.3-UNIT-005`: dash stat (`"-"`) — value unchanged, delta chip present
- `2.3-UNIT-006`: zero stat (`"0"`) treated as numeric — arithmetic applied
- `2.3-UNIT-009`: active `unit_gain` is included in `result.gains`
- `2.3-UNIT-010`: inactive `unit_gain` (`active=false`) excluded from `result.gains`
- `2.3-UNIT-012`: multiple modifiers on same stat are summed (net delta)
- `2.3-UNIT-013`: dice expression stat (`"D6"`) treated as non-numeric — value unchanged
- `2.3-COMP-003`: stat with positive delta has `.mod` CSS class (bonus indicator)
- `2.3-COMP-004`: stat with negative delta has `.pen` CSS class (malus indicator)
- `2.3-COMP-012`: delta=0 chip renders as neutral (gray background, not red malus)

### AC3 — Multiple sub-profiles
- `2.3-UNIT-007`: `composeUnitView` with two sub-profiles returns two entries with correct labels
- `2.3-COMP-010`: two sub-profiles render two distinct labeled sections in UnitCard
- `2.3-COMP-011`: sub-profile label has `text-transform: uppercase` inline style (always shown, even with single sub-profile)

### AC4 — Public visibility
- Route `src/routes/armies/$armyId.tsx` applies `authMiddleware` (line 9 import, line 20 `.middleware([authMiddleware])`), not `adminMiddleware`
- Dev notes and task 6.2 explicitly state: "NOT adminMiddleware — all authenticated users including guest can view any army"
- No role-based filtering in loader — all armies accessible to any authenticated session
- No dedicated unit test for AC4 (per spec: "Query tests for getArmyWithUnits covered by type-level DB query definitions — no live DB for unit tests"). Coverage is structural/code-review level.

## Coverage Gaps

**AC4 partial:** No runtime test verifies that a non-admin authenticated user can actually reach a second player's army page. Coverage is structural (code inspection confirms `authMiddleware` used, not `adminMiddleware`). An E2E test with a guest fixture would close this gap. Noted as out of scope per the story's scope boundaries ("E2E tests — optional for this display-only story").

No other gaps identified.

## Files Implemented

| File | Status |
|------|--------|
| `src/db/schema.ts` | Modified — added `statModifiers` and `unitGains` tables |
| `src/db/queries.ts` | Modified — added `getArmyWithUnits`, `getStatModifiers`, `getUnitGains`, `getUnitDeltas` |
| `src/lib/delta-composer.ts` | Created — `composeUnitView` pure function + exported types |
| `src/lib/tier.ts` | Created — `calculateTier`, `getTierLabel`, `getTierColor` |
| `src/components/UnitCard.tsx` | Created — UnitCard React component |
| `src/routes/armies/$armyId.tsx` | Created — army consultation route with `authMiddleware` |
| `src/routeTree.gen.ts` | Modified — added `/armies/$armyId` route |
| `src/test-setup.ts` | Created — testing-library `afterEach(cleanup)` setup |
| `vitest.config.ts` | Modified — added `setupFiles` + `.test.tsx` include |
| `eslint.config.js` | Modified — added test files override for `no-unnecessary-condition` |
| `tests/2-3-calculate-tier.test.ts` | Created — 12 tests for `calculateTier` |
| `tests/2-3-delta-composer.test.ts` | Created — 13 tests for `composeUnitView` |
| `tests/2-3-unit-card.test.tsx` | Created — 12 tests for UnitCard component |
| `drizzle/0003_smiling_patriot.sql` | Created — migration SQL (DB push failed in worktree; schema types generated) |
