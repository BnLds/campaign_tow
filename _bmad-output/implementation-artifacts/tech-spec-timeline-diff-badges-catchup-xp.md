---
title: 'Timeline XP/Points Differential Badges + Editable Catchup XP Bonus'
slug: 'timeline-diff-badges-catchup-xp'
created: '2026-03-25'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['TanStack Start', 'React', 'Drizzle ORM', 'PostgreSQL', 'Zod v4', 'Tailwind v4']
files_to_modify: ['src/db/queries/matches.ts', 'src/db/queries/units.ts', 'src/components/timeline-entry.tsx', 'src/components/post-match-wizard.tsx', 'src/routes/index.tsx', 'src/routes/match/$matchId/post-match.tsx']
code_patterns: ['createServerFn co-located in route files', 'getTimelineForArmy -> loadCampaignTimelineFn -> TimelineEntry prop chain', 'computeXpTotal(checkedIds, unitType) for XP calculation', 'submitUnitXpFn accepts xpGained 0-200 via submitInitialXpSchema (server guard must match)', 'CSS custom properties for palette tokens']
test_patterns: ['vitest + @testing-library/react for component tests', 'Playwright for E2E', 'tests/ dir for integration, src/**/__tests__/ for unit/component', 'coupled assertions pattern (regex matching)']
---

# Tech-Spec: Timeline XP/Points Differential Badges + Editable Catchup XP Bonus

**Created:** 2026-03-25

## Overview

### Problem Statement

Players have no visibility on the XP and army points gap between opponents when looking at the campaign timeline. Additionally, the XP catchup bonus rule (match_rule.md: +1 XP per unit per full 10 XP difference) is not implemented in the post-match wizard.

### Solution

1. Display dynamic army totals + delta badges (XP and points) on each standard `TimelineEntry` card, computed from live army values. Shows absolute totals for both players and the computed difference.
2. Add an editable "Bonus rattrapage" field in the post-match wizard, pre-filled from the computed catchup value, adjustable via +/- buttons, applied to every unit at submission time.

### Scope

**In Scope:**
- Dynamic XP/Points absolute totals + differential line on `TimelineEntry` (standard matches only)
- Batch aggregate query for army XP and points totals
- Editable catchup XP bonus field in `PostMatchWizard` with +/- stepper buttons
- Pre-fill bonus from computed delta (floor(abs(deltaXP) / 10))
- Bonus added to each unit's XP total at submission time
- Bonus value persisted on wizard reentry (not recalculated)

**Out of Scope:**
- Snapshot/freeze of XP/points totals at match creation (totals are always live-computed)
- Tactical bonuses for army points gap (Coup du Destin, Maitrise du Deploiement, etc.)
- Modification of the match creation dialog (CreateMatchFab)

## Context for Development

### Codebase Patterns

**Data flow — Timeline:**
- `getTimelineForArmy(armyId)` in `src/db/queries/matches.ts` returns `TimelineEntryData[]`
- Called by `loadCampaignTimelineFn` server fn in `src/routes/index.tsx`
- Passed to `<TimelineEntry>` component via props mapping (lines ~512-548 in index.tsx)
- Currently no XP/points totals per army — opponent data is just name/faction/playerName
- No `getArmyTotals` aggregation function exists yet

**Data flow — Post-match wizard:**
- `PostMatchWizard` receives `units[]` with `id, name, type, xp, previousXpGained, hasMount, existingGains, commandement, effectiveStats`
- Phase 1: User toggles XP condition checkboxes -> `computeXpTotal(checkedConditions, unitType)` -> displayed as "Total : {xpGained} XP"
- Submit per unit: `submitUnitXpFn({ matchParticipantId, unitId, xpGained, derouteXpLost })` — schema allows 0-200 XP, so adding bonus fits without schema change
- XP submit happens in `handleNext` (wizard lines ~400-406): `xpToSubmit = Math.floor(xpGained)`
- `xpResultsRef` (Map<unitId, {oldXp, newXp}>) tracks results for tier-crossing detection

**Key schema — units table:**
- `xp: integer NOT NULL DEFAULT 0` — cumulative XP
- `points: integer NULLABLE` — army points cost per unit
- Active units filtered by `status = 'active'`

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/db/queries/matches.ts` | `getTimelineForArmy` — enrich with army XP/points totals via opponent armyId |
| `src/db/queries/units.ts` | `getUnitsForArmy` — already returns xp & points per unit; add batch aggregate helper |
| `src/components/timeline-entry.tsx` | Add totals + delta line below opponent info (standard matches only) |
| `src/components/post-match-wizard.tsx` | Add editable bonus XP stepper in Phase 1 UI, include in xpToSubmit |
| `src/routes/index.tsx` | Pass new armyTotals props from loader to TimelineEntry |
| `src/routes/match/$matchId/post-match.tsx` | `loadPostMatchDataFn` — compute and pass XP delta for pre-fill |
| `src/lib/xp-conditions.ts` | `computeXpTotal` — bonus XP added on top, not inside this function |
| `src/lib/validators.ts` | `submitInitialXpSchema` — max 200, sufficient for checkbox XP + bonus |
| `docs/match_rule.md` | Catchup XP rule source of truth |

### Technical Decisions

- **No snapshot columns.** XP/points deltas computed dynamically from live `units.xp` and `units.points` sums per army (not frozen at match creation). One minor schema addition: `bonus_xp` on `match_participants` for reentry persistence (Task 7).
- **Batch aggregate query.** Single `SELECT army_id, COALESCE(SUM(xp), 0), COALESCE(SUM(points), 0) FROM units WHERE army_id IN (...) AND status = 'active' GROUP BY army_id` instead of N individual calls. New function `getArmyXpAndPointsTotalsBatch(armyIds: string[])` returns `Map<armyId, { totalXp, totalPoints }>`.
- **Submit schema already sufficient.** `submitInitialXpSchema` allows 0-200 XP, which covers max checkbox XP (~8) + realistic bonus (~10). Bonus simply added to `xpGained` before submit. **Note:** the existing server-side guard in `submitUnitXpFn` rejects `> 99` for standard matches — this must be raised to 200 (Task 0).
- **Bonus field is global per wizard session**, not per unit. One value applied uniformly to all units (per the catchup rule). Displayed once above the unit carousel, not repeated per unit.
- **+/- stepper buttons** for mobile UX. Min 0, no hard max (on fait confiance aux joueurs).
- **armyTotals type** exposes both raw values and pre-computed deltas to avoid recalculation in the component:
  ```typescript
  armyTotals?: {
    playerXp: number
    playerPoints: number
    opponentXp: number
    opponentPoints: number
    deltaXp: number      // playerXp - opponentXp
    deltaPoints: number  // playerPoints - opponentPoints
  }
  ```
- **Bonus persisted on reentry.** When the player re-enters the wizard ("Modifier le dernier rapport"), the previously submitted bonus value is restored, not recalculated from live data. This requires storing the bonus XP in `matchXpEntries` or deriving it from the difference between submitted XP and checkbox XP — see Task 6 notes.
- **Dynamic totals — known limitation.** Totals are computed from live unit data, not frozen at match creation. If player A submits post-match XP before player B opens the wizard, B's catchup bonus will reflect post-battle values. Accepted trade-off to avoid additional DB columns; snapshotting can be revisited later if needed.
- **Partial points data.** `SUM(points)` ignores NULL values — if some units have points and others don't, the total is partial. This is acceptable: points are display-only and the column is progressively filled by players.

## Implementation Plan

### Tasks

- [ ] Task 0: Raise server-side XP guard to 200 for standard matches
  - File: `src/routes/match/$matchId/post-match.tsx`
  - Action: In `submitUnitXpFn`, change the server-side guard from `data.xpGained > 99` to `data.xpGained > 200` (line ~241). The `submitInitialXpSchema` already allows 0-200; the server guard must match to allow bonus XP.
  - Notes: The schema Zod `max(200)` is the canonical limit. The server guard is a defence-in-depth check, not a separate business rule.

- [ ] Task 1: Add `getArmyXpAndPointsTotalsBatch` aggregate query
  - File: `src/db/queries/units.ts`
  - Action: Add new exported async function `getArmyXpAndPointsTotalsBatch(armyIds: string[]): Promise<Map<string, { totalXp: number, totalPoints: number }>>`. Use a single Drizzle query: `SELECT army_id, COALESCE(SUM(xp), 0) as total_xp, COALESCE(SUM(points), 0) as total_points FROM units WHERE army_id IN (...) AND status = 'active' GROUP BY army_id`. Return a Map keyed by armyId. For armyIds not present in the result (army has no active units), default to `{ totalXp: 0, totalPoints: 0 }`.
  - Notes: Handle empty `armyIds` array (return empty Map). Filter out null/undefined armyIds before querying (opponent without army). Use `sql` template from drizzle-orm for the aggregate with `inArray`.

- [ ] Task 2: Enrich `getTimelineForArmy` to return armyTotals
  - File: `src/db/queries/matches.ts`
  - Action:
    1. Add `oppArmyId: oppArmy.id` to the main timeline query's select clause (currently not returned).
    2. After the main query, collect all unique armyIds: the player's own `armyId` (function parameter) + all non-null `oppArmyId` values from results.
    3. Call `getArmyXpAndPointsTotalsBatch(allArmyIds)` once.
    4. Extend `TimelineEntryData` type with optional `armyTotals?: { playerXp: number, playerPoints: number, opponentXp: number, opponentPoints: number, deltaXp: number, deltaPoints: number }`.
    5. For each standard match entry, compute and populate `armyTotals` from the batch results. For `initial_setup` matches or matches where `oppArmyId` is null, leave `armyTotals` undefined.
  - Notes: The player's totals are the same for all entries — compute once. Opponent totals vary by opponent armyId but are cached in the batch Map.

- [ ] Task 3: Pass armyTotals from loader to TimelineEntry
  - File: `src/routes/index.tsx`
  - Action: In the `timeline.map(...)` render block (~lines 512-548), pass the new `armyTotals` prop from `TimelineEntryData` to `<TimelineEntry>`.
  - Notes: No transformation needed — pass through as-is.

- [ ] Task 4: Display totals + delta line on TimelineEntry
  - File: `src/components/timeline-entry.tsx`
  - Action:
    1. Add optional `armyTotals` prop to `TimelineEntryProps` with shape `{ playerXp: number, playerPoints: number, opponentXp: number, opponentPoints: number, deltaXp: number, deltaPoints: number }`.
    2. When `armyTotals` is defined and match is not `initial_setup`, render a dedicated line below the opponent info (after faction/playerName `<p>`), inside the existing opponent `<div style={{ flex: 1, minWidth: 0 }}>`:
       ```
       Vous 45 XP · 1200 pts  —  Adv. 81 XP · 1350 pts
       Δ -36 XP · Δ -150 pts
       ```
    3. Styling:
       - Font: `var(--font-body)`, `font-size: 0.75rem` (matches existing chip size)
       - "Vous ..." and "Adv. ..." in `var(--color-text-secondary)`
       - Delta values colored: `var(--color-bonus)` if positive (player ahead), `var(--color-malus)` if negative (player behind), `var(--color-text-secondary)` if zero
       - Two lines: first line for absolute totals, second line for deltas. Uses `flex-wrap: wrap` so it degrades gracefully on narrow screens (320px) instead of truncating the most important information
       - `margin: 0`, consistent with existing `<p>` spacing in the component
    4. When opponent has no army (`armyTotals` undefined because `oppArmyId` is null), do not render this line.
  - Notes: The two-line layout adds ~36px height to the card. Acceptable trade-off for readability on mobile.

- [ ] Task 5: Compute and pass catchupBonusXp to post-match wizard
  - File: `src/routes/match/$matchId/post-match.tsx`
  - Action:
    1. In `loadPostMatchDataFn`, after loading the player's army and identifying the opponent, extend the opponent query to also select `oppParticipant.armyId` (alias: `oppArmyId`).
    2. Collect both armyIds (player's `army.id` + `oppArmyId` if non-null) and call `getArmyXpAndPointsTotalsBatch`.
    3. Compute `catchupBonusXp`:
       - If `oppArmyId` is null: `catchupBonusXp = 0`
       - If `playerTotalXp >= opponentTotalXp`: `catchupBonusXp = 0`
       - Else: `catchupBonusXp = Math.floor((opponentTotalXp - playerTotalXp) / 10)`
    4. Add `catchupBonusXp: number` and `catchupDeltaXp: number` to `PostMatchLoaderData` type. `catchupDeltaXp` is the exact XP difference (`opponentTotalXp - playerTotalXp`, 0 when player is ahead).
    5. Pass to `<PostMatchWizard catchupBonusXp={loaderData.catchupBonusXp} catchupDeltaXp={loaderData.catchupDeltaXp}>`.
    6. For `initial-xp` mode, set `catchupBonusXp: 0` and `catchupDeltaXp: 0`.
  - Notes: Reuses the same batch function from Task 1.

- [ ] Task 6: Add editable bonus XP stepper to PostMatchWizard
  - File: `src/components/post-match-wizard.tsx`
  - Action:
    1. Add `catchupBonusXp?: number` and `catchupDeltaXp?: number` to `PostMatchWizardProps`.
    2. Add state: `const [bonusXp, setBonusXp] = useState(props.catchupBonusXp ?? 0)`.
    3. In the Phase 1 UI, **above** the unit carousel (so it's visible for all units and persists across unit navigation), render a "Bonus rattrapage" section:
       - Label: **"Bonus rattrapage"** (`font-weight: 600`, `font-size: 0.875rem`, `color: var(--color-text-primary)`)
       - Row layout: `[−]  {value}  [+]`
         - Buttons: 44x44px min touch target, `background: #334155`, `color: #fff`, `border-radius: 8px`, `font-size: 1.25rem`, `font-weight: 700`
         - "−" button: `disabled` when `bonusXp === 0` (opacity 0.4, cursor not-allowed)
         - Value: centered, `font-weight: 700`, `font-size: 1rem`, `min-width: 2rem`, `text-align: center`
       - Hint line below (only when `catchupBonusXp > 0`): `"Suggestion : +{catchupBonusXp} (ecart de {catchupDeltaXp} XP)"` in `var(--color-text-secondary)`, `font-size: 0.75rem`
         - Uses the exact `catchupDeltaXp` value passed from the loader (not an approximation)
    4. Only show this section when `mode === 'post-match'` (not `initial-xp`).
    5. In `handleNext`, modify xpToSubmit calculation:
       ```typescript
       const xpToSubmit = mode === 'initial-xp'
         ? Math.max(0, Math.floor(numericXpValue))
         : Math.floor(xpGained) + bonusXp
       ```
       **Tier-crossing safety:** `xpResultsRef` stores `oldXp` / `newXp` from the server response (`submitUnitXpFn` returns `newXp`). Since `xpToSubmit` includes the bonus, the server-side `newXp` already reflects it. `detectTierCrossings(oldXp, newXp)` will therefore correctly detect thresholds crossed by the combined XP — no additional change needed in Phase 2.
    6. Update the "Total" display (data-testid `wizard-xp-total`):
       - If `bonusXp > 0`: `"Total : {xpGained} + {bonusXp} bonus = {xpGained + bonusXp} XP"`
       - If `bonusXp === 0`: `"Total : {xpGained} XP"` (unchanged)
    7. **Reentry behavior:** On wizard reentry (when `previousXpGained` is set for units), the bonus should be restored from the previously submitted value. Since `previousXpGained` includes the bonus, and we can recompute checkbox-only XP from the stored `matchXpEntries` conditions, the simplest approach: add `previousBonusXp?: number` to the loader data. In `loadPostMatchDataFn`, when reentry is detected (existing XP entries), compute `previousBonusXp` by reading the stored value from a new nullable column `bonus_xp` on `match_xp_entries` — **OR** simpler: store `bonusXp` as a field on `match_participants` since it's match-level, not unit-level.

       **Recommended approach (simplest):** Add a nullable `bonus_xp integer` column to `match_participants` table (Task 7). Write it on the first unit XP submission (condition: `WHERE bonus_xp IS NULL`), read it back on reentry and pass as `catchupBonusXp` to the wizard. This is a minor schema addition but avoids fragile reverse-calculation.
  - Notes: `bonusXp` state is shared across all units — set once, applied to each unit's submission. Min value 0, no upper bound. The hint uses the exact `catchupDeltaXp` from the loader.

- [ ] Task 7: Add `bonusXp` column to `match_participants` for reentry persistence
  - File: `src/db/schema.ts`
  - Action: Add `bonusXp: integer('bonus_xp')` (nullable) to `matchParticipants` table.
  - Notes: Nullable — existing rows get NULL (no bonus recorded). Only set for post-match mode. Run `drizzle-kit push` to apply migration.

- [ ] Task 8: Store and retrieve bonusXp on submit/reentry
  - File: `src/routes/match/$matchId/post-match.tsx`
  - Action:
    1. In `submitUnitXpFn`, accept an optional `bonusXp` field in the input. Extend `submitInitialXpSchema` with `bonusXp: z.number().int().nonnegative().optional()`. On each unit submission, if `data.bonusXp` is provided and `match_participants.bonus_xp IS NULL`, write it: `UPDATE match_participants SET bonus_xp = data.bonusXp WHERE id = data.matchParticipantId AND bonus_xp IS NULL`. The `WHERE bonus_xp IS NULL` guard ensures idempotency — only the first submission writes, concurrent calls don't race.
    2. In `loadPostMatchDataFn`, when detecting reentry (participant has existing XP entries), read `match_participants.bonus_xp` and pass it as `catchupBonusXp` in loader data (overriding the live-computed value). Also pass `catchupDeltaXp: 0` on reentry (the hint is irrelevant when restoring a persisted value).
  - Notes: The `submitInitialXpSchema` change adds an optional field — non-breaking. The `WHERE bonus_xp IS NULL` condition makes the write safe under concurrency without a transaction lock.

### Acceptance Criteria

- [ ] AC1: Given a standard match in the timeline with two armies having different XP totals, when the campaign view loads, then the TimelineEntry displays absolute XP totals for both players and a colored "Δ XP: +/-N" indicator.
- [ ] AC2: Given a standard match in the timeline with two armies having different points totals, when the campaign view loads, then the TimelineEntry displays absolute points totals for both players and a colored "Δ Pts: +/-N" indicator.
- [ ] AC3: Given an initial_setup match in the timeline, when the campaign view loads, then no totals/delta line is displayed on that entry.
- [ ] AC4: Given an army whose units' XP or points change after match creation, when the campaign timeline reloads, then the totals and deltas reflect the updated live values.
- [ ] AC5: Given a post-match wizard for a standard match where the opponent has 36 more total XP, when the wizard opens, then the bonus XP stepper is pre-filled with 3 (floor(36/10)) and labeled "Bonus rattrapage".
- [ ] AC6: Given the bonus XP stepper showing value 3, when the player taps "+", then the value becomes 4.
- [ ] AC7: Given the bonus XP stepper showing value 0, when the player taps "-", then the value stays at 0 (cannot go negative).
- [ ] AC8: Given a unit with 5 XP from checkboxes and bonus XP set to 3, when the player submits that unit, then `submitUnitXpFn` receives `xpGained: 8` (5 checkbox + 3 bonus).
- [ ] AC9: Given a post-match wizard in `initial-xp` mode, when the wizard loads, then the bonus XP stepper is not displayed.
- [ ] AC10: Given the player's army has MORE total XP than the opponent, when the wizard loads, then the bonus XP stepper is pre-filled with 0.
- [ ] AC11: Given the bonus XP stepper is set to a value, when the player navigates between units in the wizard, then the bonus value persists (not reset per unit).
- [ ] AC12: Given a match against a player with no army (armyId null), when the campaign view loads, then no totals/delta line is displayed for that TimelineEntry.
- [ ] AC13: Given an army where all units have `points: null`, when the timeline loads, then points totals display as 0 (COALESCE).
- [ ] AC14: Given a player who already submitted post-match XP with bonusXp = 3, when they re-enter the wizard via "Modifier le dernier rapport", then the bonus stepper shows 3 (persisted value, not recalculated).
- [ ] AC15: Given two armies with exactly the same total XP, when the wizard loads, then the bonus XP stepper is pre-filled with 0.
- [ ] AC16: Given a unit with 5 XP from checkboxes and bonus XP set to 3, when the combined total (8) causes a tier crossing, then the tier-up Phase 2 correctly detects and presents the improvement choices.

## Additional Context

### Dependencies

- Minor schema addition: `bonus_xp` nullable integer column on `match_participants`. Requires `drizzle-kit push`.
- No new external packages needed.

### Testing Strategy

**Unit tests (vitest):**
- `src/db/queries/__tests__/queries-army-totals.test.ts`: Test `getArmyXpAndPointsTotalsBatch` — empty array input, army with no active units, army with null points, multiple armies in one call, unknown armyId defaults to zeros.
- `src/components/__tests__/timeline-entry-delta.test.tsx`: Test totals+delta line rendering — positive/negative/zero deltas, initial_setup exclusion, null opponent army exclusion, color coding.
- `src/components/__tests__/post-match-wizard-bonus.test.tsx`: Test bonus stepper — pre-fill, increment/decrement, min 0 constraint, persistence across units, total display breakdown, inclusion in xpToSubmit, hidden in initial-xp mode.

**Integration tests (vitest):**
- `tests/timeline-delta.test.ts`: Test enriched `getTimelineForArmy` returns correct `armyTotals` with batch query.
- `tests/post-match-catchup-bonus.test.ts`: Test `loadPostMatchDataFn` returns correct `catchupBonusXp` and `catchupDeltaXp`, that `submitUnitXpFn` receives checkbox XP + bonus, that reentry restores persisted bonusXp, and that the server-side guard allows up to 200 XP for standard matches (Task 0).

**Manual testing:**
- Create two armies with different XP totals, create a match, verify totals+delta line on timeline.
- Complete a post-match flow, verify bonus stepper pre-fill and that final XP includes the bonus.
- Re-enter the wizard, verify bonus value is restored (not recalculated).
- Modify army units (add XP), reload timeline, verify values update.
- Test with opponent without army — no totals line displayed.

### Notes

- Catchup formula: `floor(abs(totalXpArmy1 - totalXpArmy2) / 10)` = bonus XP per unit for the weaker army.
- Points differential is display-only (no gameplay effect implemented in this spec).
- The bonus XP stepper is shown only in `post-match` mode, not `initial-xp` mode.
- Risk: If `submitInitialXpSchema` max (200) is exceeded in edge cases (very high bonus + max checkbox XP), the submit will fail with validation error. Current max realistic: ~8 checkbox + ~25 bonus = 33, well within 200. Task 0 aligns the server-side guard to 200 as well.
- Future consideration: The points differential could trigger tactical bonus selection in a later spec (Coup du Destin, etc.).
- The `bonus_xp` column on `match_participants` is the simplest persistence mechanism for reentry. Alternative (reverse-calculating from stored XP minus checkbox conditions) is fragile and error-prone.
- **Performance:** `getArmyXpAndPointsTotalsBatch` adds one aggregate query to `getTimelineForArmy` (now 5 queries total). The batch approach (single `IN (...)` + `GROUP BY`) keeps this at O(1) queries regardless of timeline length. For campaigns with 50+ matches, the distinct opponent armyId set is still small (number of players in the campaign), so the batch stays lightweight.
