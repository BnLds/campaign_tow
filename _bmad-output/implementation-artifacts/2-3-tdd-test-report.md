# TDD Test Report — Story 2.3: Unit Card Display with Campaign Deltas

**Generated:** 2026-03-14
**Phase:** RED (pre-implementation)
**Branch:** dev

---

## Test Files Created

### 1. `tests/2-3-delta-composer.test.ts`
**Tests:** 13
**Covers:** `composeUnitView` pure function (`src/lib/delta-composer.ts` — does not exist yet)

| Test ID | Description |
|---|---|
| 2.3-UNIT-001 | No deltas: all stats have modified=false, delta=null |
| 2.3-UNIT-002 | Numeric bonus: m="4" + delta:+1 → value="5", delta=1, modified=true |
| 2.3-UNIT-003 | Numeric penalty: cc="3" + delta:-1 → value="2", delta=-1, modified=true |
| 2.3-UNIT-004 | Non-numeric base stat: ct="3+" + delta:+1 → value="3+" unchanged, modified=true |
| 2.3-UNIT-005 | Dash base stat: f="-" + delta:+1 → value="-" unchanged, modified=true |
| 2.3-UNIT-006 | Zero base stat: pv="0" + delta:+1 → value="1" (arithmetic applied) |
| 2.3-UNIT-007 | Multiple sub-profiles: 2 sub-profiles → output has 2 entries with correct labels |
| 2.3-UNIT-008 | Empty stat_modifiers → deltas=[], gains=[] |
| 2.3-UNIT-009 | Active unit_gain present in result.gains |
| 2.3-UNIT-010 | Inactive unit_gain (active=false) excluded from result.gains |
| 2.3-UNIT-011 | StatEntry shape: { value: string, delta: number|null, modified: boolean } |
| 2.3-UNIT-012 | Multiple modifiers on same stat are summed: cc (+1 +2) → delta=3 |
| 2.3-UNIT-013 | Dice expression: a="D6" + delta:+1 → value="D6" unchanged, modified=true |

**RED failure mode:** `Cannot find module '../../src/lib/delta-composer'` — import error before any test runs.

---

### 2. `tests/2-3-unit-card.test.tsx`
**Tests:** 11
**Covers:** `UnitCard` React component (`src/components/UnitCard.tsx` — does not exist yet)

Note: File uses `// @vitest-environment jsdom` override (global config is `environment: 'node'`).
`vitest.config.ts` updated to include `tests/**/*.test.tsx` in the `include` pattern.

| Test ID | Description |
|---|---|
| 2.3-COMP-001 | Renders unit name "Archers" |
| 2.3-COMP-002 | Stat bar has header cells for all 9 stat labels (m, cc, ct, f, e, pv, i, a, cd) |
| 2.3-COMP-003 | Modified stat with positive delta has CSS class `.mod` (bonus indicator) |
| 2.3-COMP-004 | Modified stat with negative delta has CSS class `.pen` (malus indicator) |
| 2.3-COMP-005 | Unmodified stat has neither `.mod` nor `.pen` class |
| 2.3-COMP-006 | tier=3 renders "✦ Vétéran" pill |
| 2.3-COMP-007 | tier=2 renders "◆ Expérimenté" pill |
| 2.3-COMP-008 | tier=1 renders "◈ Aguerri" pill |
| 2.3-COMP-009 | tier=0 renders no tier pill |
| 2.3-COMP-010 | Two sub-profiles → two distinct labeled sections rendered |
| 2.3-COMP-011 | Sub-profile label is uppercase (CSS text-transform or uppercased text content) |

**RED failure mode:** `Failed to resolve import "../../src/components/UnitCard"` — import error before any test runs.

---

### 3. `tests/2-3-calculate-tier.test.ts`
**Tests:** 12
**Covers:** `calculateTier` utility (`src/lib/tier.ts` — does not exist yet)

| Test ID | Description |
|---|---|
| 2.3-TIER-001 | xp=0 → tier 0 |
| 2.3-TIER-002 | xp=5 → tier 0 (just below Aguerri threshold) |
| 2.3-TIER-003 | xp=6 → tier 1 (Aguerri, exactly at threshold) |
| 2.3-TIER-004 | xp=12 → tier 2 (Expérimenté, exactly at threshold) |
| 2.3-TIER-005 | xp=20 → tier 3 (Vétéran, exactly at threshold) |
| 2.3-TIER-006 | xp=19 → tier 2 (just below Vétéran) |
| 2.3-TIER-007 | Character (Personnages) at xp=6 → tier 1 |
| 2.3-TIER-008 | Character at xp=5 → tier 0 |
| 2.3-TIER-009 | Character at xp=20 → tier 3 |
| 2.3-TIER-010 | Unit at xp=3 → tier 0 (Honneur de bataille is not a display tier) |
| 2.3-TIER-011 | Unit at xp=9 → tier 1 (within 6–11 range) |
| 2.3-TIER-012 | Returns valid tier (0|1|2|3) for any unitType string |

**RED failure mode:** `Cannot find module '../../src/lib/tier'` — import error before any test runs.

---

## RED Phase Confirmation

**Run command:** `pnpm test`

All three new test files fail at module resolution (import error) — no source files exist yet:

| File | Error |
|---|---|
| `tests/2-3-delta-composer.test.ts` | `Cannot find module '../../src/lib/delta-composer'` |
| `tests/2-3-unit-card.test.tsx` | `Failed to resolve import "../../src/components/UnitCard"` |
| `tests/2-3-calculate-tier.test.ts` | `Cannot find module '../../src/lib/tier'` |

Total new tests: **36** (13 + 11 + 12)

---

## Infrastructure Change

**`vitest.config.ts` updated:** Added `tests/**/*.test.tsx` to the `include` array so that React component test files in the `tests/` directory are picked up by Vitest. Previously only `tests/**/*.test.ts` was included.

---

## Files to Create During Implementation

| File | Purpose |
|---|---|
| `src/lib/delta-composer.ts` | `composeUnitView` pure function + all exported types |
| `src/lib/tier.ts` | `calculateTier` + tier label/color helpers |
| `src/components/UnitCard.tsx` | UnitCard React component |
| `src/db/schema.ts` | Add `statModifiers` and `unitGains` tables |
| `src/db/queries.ts` | Add `getArmyWithUnits`, `getStatModifiers`, `getUnitGains`, `getUnitDeltas` |
| `src/routes/armies/$armyId.tsx` | Army detail route with server loader |
