---
title: 'Deroute Sanglante — XP Loss with Tier-Down Gain Removal'
slug: 'deroute-sanglante-xp-tier-down'
created: '2026-03-24'
status: 'Completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['TypeScript', 'Drizzle ORM', 'PostgreSQL', 'React', 'Vitest']
files_to_modify: ['src/db/schema.ts', 'src/db/queries/evolutions.ts', 'src/components/post-match-wizard.tsx', 'src/lib/tier.ts', 'src/lib/constants.ts', 'src/lib/validators.ts', 'src/routes/match/$matchId/post-match.tsx', 'tests/4-3-batch-commit-consequences.test.ts']
code_patterns: ['atomic transaction in completeEvolutionsWithGainsTransaction', 'soft-delete via cleared boolean', 'XP delta via upsertMatchXpEntryWithIncrement', 'tier detection via calculateTier + UNIT_THRESHOLDS', 'tier-up gains are unitGains only (no statModifiers for Progression)']
test_patterns: ['Vitest unit tests in tests/', 'TDD RED-GREEN pattern', 'schema validation tests + transaction logic tests']
---

# Tech-Spec: Deroute Sanglante — XP Loss with Tier-Down Gain Removal

**Created:** 2026-03-24

## Overview

### Problem Statement

When a unit suffers a "Deroute Sanglante" (bloody rout, destruction table roll 2-3), it loses XP based on its current tier (after XP gain from the battle). If this XP loss causes the unit to drop below a tier threshold, the improvements (stat bonuses, skills) gained at that tier must be removed. However, champion and banner gains (earned at honour thresholds — see `HONOUR_THRESHOLDS` constant) must be preserved regardless of tier loss. Currently, the system records the XP loss description but does not actually decrement total XP or remove tier gains. Additionally, if a unit tiers up from match XP but then gets knocked back down by deroute, the tier-up improvement must NOT be offered in Phase 2.

**Existing bug:** `post-match-wizard.tsx:473` caps XP loss at the match's XP gain (`Math.min(tierLoss, currentXpGained)`), but rules say the loss applies to total XP. A unit at 30 XP gaining 5 XP (=35) with an Experimentee deroute (-15) should go to 20, not back to 30.

**Rule:** XP loss is calculated based on the tier AFTER XP gain, BEFORE deroute. The loss applies to total XP, floored at 0.

### Solution

1. Add `thresholdXp` (nullable int) to `unitGains` to track which tier threshold each gain was awarded at.
2. Add `clearedByMatchParticipantId` (nullable text FK) to `unitGains` for reversible soft-delete tracking.
3. Add `derouteXpLost` (int, not null, default 0, **CHECK ≥ 0**) to `matchXpEntries` to track deroute XP loss separately from XP gain.
4. Add `HONOUR_THRESHOLDS = [3, 9]` named constant in `constants.ts` — all honour-exclusion logic references this constant, never raw literals.
5. Populate `thresholdXp` when tier-up improvements are saved.
6. Fix the wizard to apply XP loss to total (via `derouteXpLost`), update `xpResultsRef` with post-deroute XP for correct Phase 2 tier detection. **All deroute consequences for the match must be processed sequentially before `transitionToPhase2OrComplete` reads `xpResultsRef`.**
7. In `completeEvolutionsWithGainsTransaction`: detect lost tiers and soft-delete `unitGains` for lost thresholds (excluding `HONOUR_THRESHOLDS`), with `clearedByMatchParticipantId` for reversibility. **Lock the `units` row (`FOR UPDATE`) when reading current XP inside the transaction.**
8. On re-entry: un-clear gains that were cleared by this matchParticipantId.

**Key insight:** Tier-up improvements are stored ONLY as `unitGains` (textual descriptions like "+1 CC"). There are NO `statModifiers` rows with `source='Progression'`. The `delta-composer.ts` / `parseGainStat` converts gain descriptions to stat deltas at read time. Therefore, clearing a `unitGain` row automatically removes its stat effect from the computed view — no `statModifiers` clearing needed for deroute.

### Scope

**In Scope:**
- Schema: add `thresholdXp` (nullable int) to `unitGains`
- Schema: add `clearedByMatchParticipantId` (nullable text FK, `onDelete: 'set null'`) to `unitGains`
- Schema: add `derouteXpLost` (int, not null, default 0, **CHECK ≥ 0**) to `matchXpEntries`
- New named constant `HONOUR_THRESHOLDS = [3, 9]` in `constants.ts` — single source of truth for honour threshold exclusion
- Populate `thresholdXp` on tier-up gain insertion
- New pure function `detectLostThresholds(preXp, postXp, unitType)` in `tier.ts`
- Fix wizard XP loss: use `derouteXpLost` on `matchXpEntries`, not capped at match gain
- Soft-delete `unitGains` for lost tiers (excluding `HONOUR_THRESHOLDS`) with `clearedByMatchParticipantId`
- Re-entry reversibility: un-clear gains cleared by this matchParticipantId, reverse deroute XP loss
- Handle multi-deroute: sequential processing of all deroute consequences before Phase 2 tier detection
- XP floor at 0
- Deroute sanglante applies only to units (non-Personnages)
- Unit tests + integration test for full wizard flow (Phase 1 → 1.5 → 2)

**Out of Scope:**
- UI changes to display cleared/removed gains
- Modification of the destruction wizard UX component
- Character injury table changes
- Data backfill (DB will be wiped)

## Context for Development

### Codebase Patterns

- **Atomic transactions:** All gain/modifier writes happen inside `completeEvolutionsWithGainsTransaction` (single DB transaction with row-level locking on matchParticipants).
- **Soft-delete:** `cleared: boolean` on `unitGains` and `statModifiers`. Cleared entries remain in DB for timeline history but are excluded from army view by `delta-composer.ts`.
- **Tier-up gains are unitGains only:** Tier-up improvements ("+1 CC", "+1 Force", etc.) are stored as `unitGains.description` rows. There are NO `statModifiers` rows for tier-up progression. `delta-composer.ts` / `parseGainStat` converts descriptions to stat deltas at read time. Clearing a `unitGain` (set `cleared=true`) automatically removes its stat effect from the computed army view.
- **XP tracking:** `matchXpEntries` tracks per-unit per-match XP. `upsertMatchXpEntryWithIncrement` handles atomic XP delta on `units.xp`.
- **Re-entry flow:** On re-entry (`isReentry`), all `unitGains` and `statModifiers` for the current `matchParticipantId` are hard-deleted before re-inserting. For gains from PREVIOUS matches soft-deleted by deroute, `clearedByMatchParticipantId` tracks which match caused the clearing, enabling un-clear on re-entry.
- **Wizard flow:** Phase 1 (XP) -> Phase 1.5 (consequences) -> Phase 2 (tier-ups). `xpResultsRef` stores `{oldXp, newXp}` per unit. `transitionToPhase2OrComplete` calls `detectTierCrossings(oldXp, newXp)` — since `newXp` reflects post-deroute XP, tier-ups "undone" by deroute are naturally excluded.
- **Multi-deroute:** Multiple units can suffer deroute sanglante in the same match. Phase 1.5 processes consequences **sequentially** (one unit at a time via `handleConsequenceConfirm`). Each deroute updates `xpResultsRef` for its unit before moving to the next. `transitionToPhase2OrComplete` is called only **after all consequences are processed** — it reads the final `xpResultsRef` state. This sequential guarantee is critical: tier-up crossings must be computed on fully post-deroute XP values.
- **Tier calculation:** `calculateTier(xp, unitType)` returns TierLevel 0-4. `DEROUTE_XP_LOSS[tier]` gives the loss amount. Tier is computed AFTER XP gain, BEFORE deroute loss.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/db/schema.ts:103-109` | `unitGains` table definition — add `thresholdXp` + `clearedByMatchParticipantId` |
| `src/db/schema.ts:142-154` | `matchXpEntries` table definition — add `derouteXpLost` |
| `src/db/queries/evolutions.ts:116-159` | `upsertMatchXpEntryWithIncrement` — extend with deroute XP loss |
| `src/db/queries/evolutions.ts:173-369` | `completeEvolutionsWithGainsTransaction` — add re-entry reversal + tier-down logic |
| `src/components/post-match-wizard.tsx:465-489` | `handleConsequenceConfirm` deroute branch — fix XP loss |
| `src/components/post-match-wizard.tsx:274-301` | `transitionToPhase2OrComplete` — already uses post-deroute XP from xpResultsRef |
| `src/components/post-match-wizard.tsx:386-401` | `preMatchXp` calculation — must account for `derouteXpLost` |
| `src/lib/tier.ts:61-75` | `detectTierCrossings` — model for new `detectLostThresholds` |
| `src/lib/constants.ts:36-42` | `DEROUTE_XP_LOSS` — XP loss per tier level |
| `src/lib/constants.ts:104-191` | `UNIT_THRESHOLDS` — unit tier thresholds (3, 9, 10, 25, 50, 80) |
| `src/lib/constants.ts` (new) | `HONOUR_THRESHOLDS` — honour XP values [3, 9] excluded from deroute clearing |
| `src/lib/delta-composer.ts` | `parseGainStat` / `composeUnitView` — confirms gains are computed at read time, not stored as statModifiers |
| `tests/4-3-batch-commit-consequences.test.ts` | Existing consequence tests — extend |

### Technical Decisions

1. **`thresholdXp` on unitGains only:** Tracks which XP threshold a gain was awarded at. Enables precise removal: only gains at thresholds above the new post-deroute XP are cleared. Champion/banner gains (`thresholdXp` in `HONOUR_THRESHOLDS`) are always excluded. NOT needed on `statModifiers` because tier-up improvements don't create statModifier rows.

2. **`clearedByMatchParticipantId` on unitGains only:** When deroute soft-deletes gains from a PREVIOUS match, this field records which matchParticipantId caused the clearing. On re-entry, gains cleared by this matchParticipantId are un-cleared (SET cleared=false, clearedByMatchParticipantId=NULL). NOT needed on `statModifiers` — same reason as above.

3. **`derouteXpLost` on matchXpEntries:** Tracks deroute XP loss separately from battle XP gain. This solves two problems:
   - The `xpGained` check constraint (`>= 0`) cannot represent net-negative XP changes.
   - On re-entry, `preMatchXp` can be correctly calculated: `preMatchXp = unit.xp - previousXpGained + previousDerouteXpLost`.
   - The `upsertMatchXpEntryWithIncrement` function handles both increments atomically. **Explicit delta SQL:**
     ```sql
     -- Phase 1 call: xpGained=5, derouteXpLost=0 (default)
     -- Phase 1.5 call: xpGained=5 (unchanged), derouteXpLost=15
     -- Delta = (newXpGained - prevXpGained) - (newDerouteXpLost - prevDerouteXpLost)
     --       = (5 - 5) - (15 - 0) = -15
     UPDATE units SET xp = GREATEST(0, xp + delta) WHERE id = :unitId;
     -- UPSERT matchXpEntries SET xp_gained = :xpGained, deroute_xp_lost = :derouteXpLost;
     ```
   - **Constraint:** `derouteXpLost` has CHECK ≥ 0 (mirrors `xpGained` constraint). Zod schema must use `.nonnegative()`.

4. **Intermediate crash safety (re-entry between Phase 1 and Phase 1.5):** If the player re-enters after Phase 1 `submitUnitXpFn` but before the Phase 1.5 deroute call, `derouteXpLost` is still 0 in `matchXpEntries`. The `preMatchXp` formula `unit.xp - previousXpGained + previousDerouteXpLost` still holds: `previousDerouteXpLost = 0`, so `preMatchXp = unit.xp - previousXpGained` — identical to the pre-deroute code path. Phase 1.5 will re-apply the deroute normally. **No special handling needed** because `upsertMatchXpEntryWithIncrement` is idempotent: calling it again with the same `xpGained` and `derouteXpLost=0` produces delta=0.

5. **`clearedByMatchParticipantId` FK orphan safety:** `onDelete: 'set null'` means if a matchParticipant is hard-deleted, `clearedByMatchParticipantId` becomes NULL but `cleared` remains `true`. The gain stays cleared (conservative — no accidental restoration). To restore such orphaned gains, an admin must manually SET `cleared=false`. This is acceptable: matchParticipant deletion is an exceptional admin action, not a normal flow.

6. **Wizard does NOT skip `submitUnitXpFn` for deroute:** Instead, it calls an extended version that also passes `derouteXpLost`. This keeps XP changes going through the same atomic upsert mechanism, avoiding split-brain between wizard and transaction.

7. **Tier-down detection is a pure function:** `detectLostThresholds(preXp, postXp, unitType)` returns the list of `ThresholdEntry.xp` values that were lost (thresholds where `preXp >= threshold > postXp`). Excludes `HONOUR_THRESHOLDS` by filtering against the named constant. Pure, testable, no DB.

8. **No statModifiers clearing for deroute:** Since tier-up gains are stored as `unitGains` descriptions only (not as `statModifiers` rows), clearing a `unitGain` is sufficient. The `delta-composer` excludes `cleared=true` gains from stat computation automatically.

9. **No backfill needed:** DB will be wiped before deployment.

## Implementation Plan

### Tasks

- [x] Task 1: Schema migration — add new columns
  - File: `src/db/schema.ts`
  - Action: Add `thresholdXp` (nullable int) to `unitGains` table
  - Action: Add `clearedByMatchParticipantId` (nullable text, FK to matchParticipants.id, onDelete: 'set null') to `unitGains` table
  - Action: Add `derouteXpLost` (int, not null, default 0, **CHECK(deroute_xp_lost >= 0)**) to `matchXpEntries` table
  - Notes: Run `pnpm db:generate && pnpm db:push` after. No backfill needed (DB wipe). Mirror the existing `CHECK(xp_gained >= 0)` pattern.

- [x] Task 1b: Add `HONOUR_THRESHOLDS` named constant
  - File: `src/lib/constants.ts`
  - Action: Add `export const HONOUR_THRESHOLDS = [3, 9] as const` near `UNIT_THRESHOLDS`. This is the single source of truth for honour threshold XP values excluded from deroute clearing.
  - Notes: All code that filters out honour thresholds (detectLostThresholds, SQL in Task 4) must import and reference this constant — no raw 3/9 literals.

- [x] Task 2: Pure function — `detectLostThresholds`
  - File: `src/lib/tier.ts`
  - Action: Add `detectLostThresholds(preXp: number, postXp: number, unitType: string): number[]`
  - Logic: Returns array of threshold XP values where `preXp >= threshold.xp > postXp`. Filters out thresholds whose `xp` is in `HONOUR_THRESHOLDS` (named constant, not raw literals). Only uses `UNIT_THRESHOLDS` (deroute is unit-only). Returns empty array if `postXp >= preXp`.
  - Notes: Mirror of `detectTierCrossings` but in reverse. Pure function, no DB. Import `HONOUR_THRESHOLDS` from `constants.ts`.

- [x] Task 3: Extend `upsertMatchXpEntryWithIncrement` with deroute XP loss
  - File: `src/db/queries/evolutions.ts`
  - Action: Add optional `derouteXpLost` parameter (default 0, validated `.nonnegative()` in Zod). Upsert now also handles `derouteXpLost` field. Return also `previousDerouteXpLost`.
  - **Delta computation (explicit):**
    ```
    prevXpGained   = existing matchXpEntry.xpGained   ?? 0
    prevDeroute    = existing matchXpEntry.derouteXpLost ?? 0
    xpDelta        = (xpGained - prevXpGained) - (derouteXpLost - prevDeroute)
    ```
    - Phase 1 call: `upsert(mp, unit, xpGained=5, derouteXpLost=0)` → delta = `(5-0)-(0-0) = +5`
    - Phase 1.5 call: `upsert(mp, unit, xpGained=5, derouteXpLost=15)` → delta = `(5-5)-(15-0) = -15`
    - Re-entry Phase 1: `upsert(mp, unit, xpGained=5, derouteXpLost=0)` → delta = `(5-5)-(0-15) = +15` (restores)
  - Notes: Keeps XP changes atomic in one upsert. `units.xp` is floored at 0 via SQL `GREATEST(0, xp + delta)`. Both calls use the **same function** — Phase 1.5 just passes a non-zero `derouteXpLost`.

- [x] Task 4: Extend `completeEvolutionsWithGainsTransaction` — tier-down gain removal
  - File: `src/db/queries/evolutions.ts`
  - Action (re-entry reversal): Before deleting current match gains, un-clear any `unitGains` where `clearedByMatchParticipantId = matchParticipantId` (SET `cleared = false`, `clearedByMatchParticipantId = NULL`).
  - Action (populate thresholdXp): When inserting tier-up gains (lines 240-248), pass `thresholdXp` from the gain's threshold entry. Requires extending the `gains` parameter to include `thresholdXp` per gain group.
  - Action (deroute processing): In the `deroute_sanglante` case:
    1. Read the unit's current XP from the `units` table **with `FOR UPDATE` row lock** (prevents concurrent modification during the transaction). This is `postDerouteXp` — Phase 1 already incremented and Phase 1.5 already decremented via `upsertMatchXpEntryWithIncrement`.
    2. Read `xpGained` and `derouteXpLost` from `matchXpEntries` for this `matchParticipantId`/`unitId`. Compute `preMatchXp = postDerouteXp - xpGained + derouteXpLost`. (**Single derivation method — no alternatives.**)
    3. Call `detectLostThresholds(preMatchXp, postDerouteXp, unitType)` to get lost threshold XP values.
    4. For lost thresholds: UPDATE `unitGains` SET `cleared = true`, `clearedByMatchParticipantId = matchParticipantId` WHERE `unitId = consequence.unitId` AND `thresholdXp` IN (lost thresholds) AND `thresholdXp NOT IN (select from HONOUR_THRESHOLDS)` AND `cleared = false`.
  - Notes: No statModifiers clearing needed — tier-up gains are unitGains only, delta-composer handles the rest. The unit type guard (`!= 'Personnages'`) is already guaranteed by the wizard but add for safety. The `FOR UPDATE` lock on `units` is scoped to this unit's row only — no table-level lock.

- [x] Task 5: Extend `gains` parameter to include `thresholdXp`
  - File: `src/lib/validators.ts`
  - Action: Update `completeEvolutionsWithGainsSchema.gains` to accept optional `thresholdXp` (nullable int) per gain group: `gains: z.array(z.object({ unitId, descriptions, thresholdXp: z.number().int().nullable().optional() }))`.
  - Action: Update `submitInitialXpSchema` (or its extended version) to accept `derouteXpLost: z.number().int().nonnegative().default(0)`.
  - File: `src/components/post-match-wizard.tsx`
  - Action: In `handleTierUpConfirm` and `transitionToPhase2OrComplete`, include `thresholdXp` from the `TierUpQueueEntry.xp` value when building the gains array for batch commit.

- [x] Task 6: Fix wizard XP loss calculation
  - File: `src/components/post-match-wizard.tsx`
  - Action (handleConsequenceConfirm, deroute branch — lines 465-489):
    1. Remove `const actualLoss = Math.min(tierLoss, currentXpGained)` (line 473).
    2. Calculate: `const newTotalXp = Math.max(0, xpEntry.newXp - tierLoss)`.
    3. Instead of calling `submitUnitXpFn` with adjusted `xpGained`, call with original `xpGained` (unchanged from Phase 1) AND `derouteXpLost = tierLoss`. Use extended server function wrapping `upsertMatchXpEntryWithIncrement` with `derouteXpLost` param.
    4. Update `xpResultsRef`: `newXp = newTotalXp` (not capped at match gain).
    5. Store `xpLostAmount = tierLoss` on consequence. **Note:** current code stores `actualLoss` (the capped value) — this must change to `tierLoss` (the full deroute loss before floor). The timeline description must reflect the actual rules loss, not the old capped value.
  - Action (preMatchXp calculation — line 389):
    1. Account for deroute: `preMatchXp = currentUnit.xp - (currentUnit.previousXpGained ?? 0) + (currentUnit.previousDerouteXpLost ?? 0)`.
    2. This requires `loadPostMatchDataFn` to also return `previousDerouteXpLost` from `matchXpEntries`. **The LEFT JOIN may return `null` for units without a `matchXpEntries` row — map to 0 in the loader** (e.g. `derouteXpLost: entry?.derouteXpLost ?? 0`).
  - File: `src/routes/match/$matchId/post-match.tsx`
  - Action: Update `loadPostMatchDataFn` to include `derouteXpLost` from `matchXpEntries` in the returned unit data (default 0 for null). Extend `submitUnitXpFn` (or add new server function) to accept `derouteXpLost`.
  - **Invariant guard (AC4):** Add a `console.assert` or runtime check at the top of `transitionToPhase2OrComplete` verifying that **all** units with pending deroute consequences in `pendingConsequencesRef` have their `xpResultsRef.newXp` already updated. This makes AC4's implicit ordering dependency explicit and will catch regressions if the wizard flow is refactored.

- [x] Task 7: Tests
  - File: `src/lib/__tests__/tier.test.ts` (new or extend)
  - File: `tests/4-3-batch-commit-consequences.test.ts` (extend)
  - Tests for `detectLostThresholds`:
    - `detectLostThresholds(35, 20, 'Infanterie')` returns `[25]` (lost Experimentee)
    - `detectLostThresholds(12, 2, 'Infanterie')` returns `[10]` (lost Aguerri, 3 and 9 excluded)
    - `detectLostThresholds(55, 20, 'Infanterie')` returns `[25, 50]` (lost Experimentee + Veteran, both > 20)
    - `detectLostThresholds(5, 0, 'Infanterie')` returns `[]` (no tier thresholds lost, 3 excluded)
    - `detectLostThresholds(20, 25, 'Infanterie')` returns `[]` (XP went up, not down)
  - Tests for transaction tier-down:
    - Unit at 30 XP (Experimentee) with gain "+1 CC" at thresholdXp=25 -> deroute -15 -> 15 XP: gain cleared with clearedByMatchParticipantId set
    - Unit at 12 XP (Aguerri) with gain "+1 Initiative" at thresholdXp=10 AND "Champion gratuit" at thresholdXp=3 -> deroute -10 -> 2 XP: Initiative gain cleared, Champion preserved
    - Unit at 55 XP (Veteran) with gains at thresholds 10, 25, 50 -> deroute -20 -> 35 XP: gain at 50 cleared (50 > 35), gains at 10 and 25 preserved (both ≤ 35)
    - Unit at 5 XP (Bleusaille) -> deroute -10 -> 0 XP: no tier gains to clear
    - Re-entry: un-clear previously cleared gains before reprocessing
  - Tests for wizard XP loss:
    - Unit at 30 XP, gains 5 (=35), Experimentee deroute (-15) -> xpResultsRef.newXp = 20 (not 30)
    - Unit at 8 XP, gains 3 (=11), Aguerri deroute (-10) -> xpResultsRef.newXp = 1
    - Unit at 2 XP, gains 1 (=3), Bleusaille deroute (-10) -> xpResultsRef.newXp = 0 (floored)
    - Unit tiers up (22->27, crosses 25) then deroute -15 -> 12: Phase 2 detectTierCrossings(22, 12) returns NO crossings -> no tier-up offered
  - Tests for multi-deroute (same match):
    - Two units in same match both suffer deroute: each unit's xpResultsRef is updated independently, Phase 2 tier crossings computed on fully post-deroute XP for both
    - Unit A deroute processed, then Unit B deroute processed: xpResultsRef for A is not affected by B's processing
  - Tests for delta-composer non-regression:
    - Gain with cleared=true is excluded from composeUnitView stat computation
  - **Integration test — full wizard flow (Phase 1 → 1.5 → 2):**
    - Unit at 22 XP gains 5 (=27, crosses threshold 25) -> deroute Experimentee (-15) -> 12 XP: `submitUnitXpFn` called twice (Phase 1 with xpGained=5, Phase 1.5 with derouteXpLost=15), `xpResultsRef.newXp = 12`, `transitionToPhase2OrComplete` detects NO tier crossings (22→12), `completeEvolutionsWithGainsTransaction` receives empty gains + deroute consequence, no tier-up gains inserted, units.xp = 12 in DB
    - Same scenario with re-entry: all steps repeat, gains from previous run cleared by matchParticipantId are un-cleared, then re-cleared by new deroute processing — final state identical

### Acceptance Criteria

- [x] AC1: Given a unit with active tier gains, when it suffers a deroute sanglante that drops it below a tier threshold, then the unitGains for that threshold are soft-deleted (cleared=true) with clearedByMatchParticipantId set.
- [x] AC2: Given a unit with a champion or banner gain (`thresholdXp` in `HONOUR_THRESHOLDS`), when it suffers any deroute sanglante regardless of XP loss severity, then champion and banner gains are NEVER cleared.
- [x] AC3: Given a unit at 30 XP that gains 5 XP (total 35) and suffers Experimentee deroute (-15 XP), when the post-match flow completes, then units.xp = 20 (not 30).
- [x] AC4: Given a unit that tiers up from match XP gain (e.g. 22 XP -> 27 XP crossing threshold 25) but then suffers deroute dropping it below 25, when Phase 2 tier-ups are computed, then NO tier-up improvement is offered for threshold 25.
- [x] AC5: Given a unit at 5 XP (Bleusaille) that suffers deroute (-10 XP), when the post-match flow completes, then units.xp = 0 (never negative).
- [x] AC6: Given a player who re-enters the post-match flow after a deroute was committed, when they change the consequence (e.g. from deroute to survivants_endurcis), then previously cleared tier gains are restored (cleared=false, clearedByMatchParticipantId=NULL) and XP is corrected.
- [x] AC7: Given a unit that loses multiple tiers in one deroute (e.g. Veteran 55 XP -> 35 XP, losing threshold 50 only), when gains are processed, then only gains at thresholds above the new XP are cleared (threshold 50 cleared, thresholds 10 and 25 preserved).
- [x] AC8: Given tier-up gains are saved via completeEvolutionsWithGainsTransaction, when the gains are inserted, then each gain row has thresholdXp set to the threshold XP value it was awarded at.
- [x] AC9: Given a deroute sanglante consequence, when `detectLostThresholds(preXp, postXp, unitType)` is called, then it returns only unit tier thresholds (10, 25, 50, 80) that were lost, never thresholds in `HONOUR_THRESHOLDS`.
- [x] AC10: Given a unit with a cleared tier gain (cleared=true from deroute), when the army view is rendered, then the stat bonus from that gain is NOT included in the computed effective stats (delta-composer excludes cleared gains).
- [x] AC11: Given two units in the same match both suffering deroute sanglante, when Phase 1.5 processes both consequences sequentially, then each unit's `xpResultsRef.newXp` reflects its own deroute independently, and Phase 2 tier crossings are computed on the final post-deroute XP of both units.
- [x] AC12: Given `transitionToPhase2OrComplete` is called, when any unit has a pending deroute consequence in `pendingConsequencesRef`, then an invariant check verifies that the unit's `xpResultsRef.newXp` has been updated to reflect the deroute loss (guard against ordering regressions).

## Review Notes

- Adversarial review completed (Opus agent)
- Findings: 12 total, 7 fixed, 5 skipped (noise/pre-existing)
- Resolution approach: auto-fix
- F1 (Critical): xpResultsRef now uses server-returned newXp
- F3 (High): Double HONOUR_THRESHOLDS filtering removed from evolutions.ts
- F4 (High): preMatchXp floored at 0 with Math.max(0, ...)
- F5 (High): console.assert replaced with throw new Error (AC12 invariant)
- F7 (Medium): FOR UPDATE added on matchXpEntries read in deroute transaction
- F9 (Medium): 2 boundary tests added (XP=10→0, XP=0)
- F12 (Low): HONOUR_SET hoisted to module-level constant in tier.ts
- Skipped: F2 (DB wipe documented), F6 (pre-existing + server-side guard), F8, F10, F11 (pre-existing patterns)

## Additional Context

### Dependencies

- No new external libraries required.
- Depends on existing: Drizzle ORM, Vitest, UNIT_THRESHOLDS/DEROUTE_XP_LOSS constants.
- Requires `pnpm db:generate && pnpm db:push` after schema changes.

### Testing Strategy

- **Unit tests (pure functions):** `detectLostThresholds` — exhaustive threshold boundary tests in `src/lib/__tests__/tier.test.ts`.
- **Unit tests (schema):** Validate `completeEvolutionsWithGainsSchema` accepts `thresholdXp` in gains.
- **Integration tests (transaction):** Test `completeEvolutionsWithGainsTransaction` with deroute consequences against a real DB. Verify gain clearing, re-entry reversal.
- **Component tests:** Verify wizard `xpResultsRef` reflects post-deroute XP and Phase 2 tier-up queue excludes undone tier-ups.
- **Non-regression:** Verify `delta-composer` / `composeUnitView` excludes cleared gains from stat computation (existing behavior, confirm with test).

### Notes

- **Wizard XP tracking complexity.** Adding `derouteXpLost` to `matchXpEntries` changes the `preMatchXp` calculation. All existing code paths that compute `preMatchXp` must be audited.
- **Multi-deroute in same match.** Multiple units can suffer deroute sanglante in the same match. The wizard processes consequences sequentially (one unit at a time). The implementation must ensure `xpResultsRef` is fully updated for all deroute units before `transitionToPhase2OrComplete` runs. AC11 and AC12 cover this.
- **Intermediate crash safety.** If the player's session crashes between Phase 1 and Phase 1.5, re-entry reconstructs `preMatchXp` correctly because `derouteXpLost` defaults to 0 in `matchXpEntries`. See Technical Decision 4.
- **`clearedByMatchParticipantId` FK orphan.** If a matchParticipant is hard-deleted, the FK becomes NULL but `cleared` stays true (conservative). See Technical Decision 5.
- **Future consideration:** If characters ever get a similar mechanic, `detectLostThresholds` already accepts `unitType` and can be extended.
- **Simplification from Party Mode review:** `statModifiers` table is NOT touched by deroute — tier-up improvements are unitGains-only. Removed `clearedByMatchParticipantId` and `thresholdXp` from `statModifiers` scope.
