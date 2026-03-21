# Story CC: Tier-Up Improvement Constraints & UX Fixes

Status: review

## Story

As a player,
I want improvement selection to enforce campaign rules (uniqueness constraints, max limits, conditional availability) and allow me to change my choice before confirming,
So that I cannot accidentally pick invalid improvements and the selection experience is smooth.

## Acceptance Criteria

**AC1 — Radio toggle fix:**
Given I am on a TierUpStep with a single-pick section (majorCount=1 or minorCount=1),
When I click a different improvement than the one already selected,
Then the selection switches to the newly clicked item.

**AC2 — Unit +1 Mouvement unique:**
Given a unit already has "+1 Mouvement" in its existingGains OR selected it in an earlier tier-up step this session,
When I see the improvement list for that unit,
Then "+1 Mouvement (unique)" is disabled.

**AC3 — +1 Commandement max 10:**
Given a unit/character whose Commandement (base + gains) is already 10,
When I see the improvement list,
Then "+1 Commandement (max 10)" is disabled.

**AC4 — Character +1 Endurance availability:**
Given the campaign rule says "+1 Endurance" cannot be the first major improvement (available from 40 XP tier),
When the character is at the Expérimenté tier (20 XP, first major),
Then "+1 Endurance" is NOT in the available major improvements.
When the character is at Vétéran (40 XP) or Héroïque (70 XP),
Then "+1 Endurance" IS available (costs 1 major slot, not 2).

**AC5 — Character +1 PV max 2x:**
Given a character already has 2 "+1 PV" gains (existingGains + session),
When I see the major improvement list,
Then "+1 PV (max 2x)" is disabled.

**AC6 — "2 améliorations mineures" sub-flow:**
Given I select "2 améliorations mineures" as a major improvement and confirm,
When the wizard processes this choice,
Then a follow-up minor-only step (minorCount=2) is inserted immediately after in the queue.
The DB records the 2 actual minor descriptions chosen (not "2 améliorations mineures").
The timeline shows the 2 actual minor improvement labels.

**AC7 — Unit +1 Endurance and +1 Attaque max once:**
Given a unit already has "+1 Endurance" or "+1 Attaque" in existingGains + session,
When I see the major improvement list,
Then the already-taken improvement is disabled.

**AC8 — Unit +1 Commandement blocked at 10:**
Same as AC3 but for units specifically.

## Context & Background

This is a corrective story for 4-2. The tier-up improvement selection was implemented with labels indicating constraints ("unique", "max 10", etc.) but no actual enforcement. Additionally, a radio toggle bug prevents changing selection in major single-pick mode.

### Key changes

1. **Radio toggle bug** — Fix `handleMajorClick` to allow replacement when `majorCount === 1`
2. **Character Endurance** — Remove `slotCost: 2` mechanism. Instead, simply exclude Endurance from the 20 XP tier's improvement list. Include it at 40 XP and 70 XP with normal slotCost (1).
3. **Constraint enforcement** — Add `disabledImprovementIds` prop to TierUpStep. The wizard computes this from `existingGains` + cumulative session selections.
4. **"2 améliorations mineures"** — When confirmed, dynamically insert a minor-only step in the queue. Save actual minor labels instead of "2 améliorations mineures".
5. **Commandement check** — Add `commandement` field to unit data so the wizard can check if CD is already 10.

### Constraint rules summary

| Improvement | Type | Rule |
|---|---|---|
| +1 Mouvement (unique) | Unit minor | Max 1 total (existingGains + session) |
| +1 Commandement (max 10) | Unit minor | Disabled if CD base + gains >= 10 |
| +1 Endurance (max +1) | Unit major | Max 1 total |
| +1 Attaque (max +1) | Unit major | Max 1 total |
| +1 Mouvement (unique) | Char minor | Max 1 total |
| +1 Commandement (max 10) | Char minor | Disabled if CD base + gains >= 10 |
| +1 Endurance | Char major | NOT available at 20 XP tier; available at 40+ XP; costs 1 slot |
| +1 PV (max 2x) | Char major | Max 2 total |
| +1 Attaque | Char major | Max 1 total |
| 2 améliorations mineures | Char major | Opens sub-flow; records 2 actual minors |

## Tasks / Subtasks

- [x] Task 1 — Fix radio toggle bug in TierUpStep `handleMajorClick` (AC1)
  - [x] 1.1 — When `majorCount === 1`, allow clicking a new item to replace the current selection (skip `remaining >= cost` check in radio mode)

- [x] Task 2 — Rework character Endurance: remove slotCost mechanism, use tier-based exclusion (AC4)
  - [x] 2.1 — Remove `slotCost: 2` from CHARACTER_MAJOR_IMPROVEMENTS and all CHARACTER_THRESHOLDS entries for Endurance
  - [x] 2.2 — Remove Endurance from the 20 XP (Expérimenté) threshold's majorImprovements list
  - [x] 2.3 — Keep Endurance in 40 XP (Vétéran) and 70 XP (Héroïque) threshold lists (slotCost=1 / default)
  - [x] 2.4 — Remove the slotCost-based filter in TierUpStep (`filteredMajors` filter). Replace with simpler `disabledImprovementIds` mechanism.
  - [x] 2.5 — Update TierUpStep validation: `selectedMajorIds.length === majorCount` (no more slotCost sum)

- [x] Task 3 — Add `disabledImprovementIds` prop to TierUpStep (AC2, AC3, AC5, AC7)
  - [x] 3.1 — Add prop `disabledImprovementIds?: string[]` to TierUpStepProps
  - [x] 3.2 — In render, mark improvements in disabledImprovementIds as disabled (greyed out, not selectable)
  - [x] 3.3 — In click handlers, ignore clicks on disabled improvements

- [x] Task 4 — Add `commandement` field to unit data and pass to wizard (AC3, AC8)
  - [x] 4.1 — Extend `PostMatchLoaderData` unit type to include `commandement: number`
  - [x] 4.2 — In `loadPostMatchDataFn`, compute commandement = base CD value + count of "+1 Commandement" in existingGains. Use the first non-mount sub-profile's `cd` stat as base.
  - [x] 4.3 — Extend `PostMatchWizardProps` units type to include `commandement?: number`

- [x] Task 5 — Compute `disabledImprovementIds` in PostMatchWizard and pass to TierUpStep (AC2, AC3, AC5, AC7, AC8)
  - [x] 5.1 — Add `cumulativeGainsRef: Map<string, string[]>` to track all gain descriptions per unit within this session (across tier-up steps). Update after each successful tier-up confirm.
  - [x] 5.2 — Before rendering TierUpStep, compute disabled IDs based on: existingGains + cumulativeGains for the current unit.
  - [x] 5.3 — Constraint: "+1 Mouvement" disabled if count(Mouvement gains) >= 1
  - [x] 5.4 — Constraint: "+1 Commandement" disabled if unit.commandement + count(Commandement gains in session) >= 10
  - [x] 5.5 — Constraint: "+1 Endurance" (unit major) disabled if count(Endurance gains) >= 1
  - [x] 5.6 — Constraint: "+1 Attaque" (unit major) disabled if count(Attaque gains) >= 1
  - [x] 5.7 — Constraint: "+1 PV" (char major) disabled if count(PV gains) >= 2
  - [x] 5.8 — Constraint: "+1 Attaque" (char major) disabled if count(Attaque gains) >= 1
  - [x] 5.9 — Pass computed `disabledImprovementIds` to TierUpStep

- [x] Task 6 — "2 améliorations mineures" sub-flow (AC6)
  - [x] 6.1 — In `handleTierUpConfirm`, detect if descriptions include "2 améliorations mineures"
  - [x] 6.2 — If detected: remove "2 améliorations mineures" from the descriptions to save, and insert a new minor-only TierUpQueueEntry (minorCount=2, majorCount=0, character minor improvements) right after the current step in the queue
  - [x] 6.3 — The inserted step is a normal tier-up step — the player picks 2 minors, which are saved as unit_gains normally
  - [x] 6.4 — On the timeline, the gains show the 2 actual minor labels ("+1 Initiative", "+1 CC", etc.) instead of "2 améliorations mineures"

- [x] Task 7 — Update tests
  - [x] 7.1 — Test radio toggle: clicking different major when majorCount=1 replaces selection
  - [x] 7.2 — Test disabled improvements are not selectable
  - [x] 7.3 — Test constraint computation (Mouvement unique, CD max 10, etc.)
  - [x] 7.4 — Test "2 améliorations mineures" flow inserts sub-step
  - [x] 7.5 — Test character Endurance not available at 20 XP, available at 40+ XP (updated existing tests)

- [x] Task 8 — Quality gates
  - [x] 8.1 — `pnpm typecheck` — zero errors
  - [x] 8.2 — `pnpm lint` — zero new errors (1 preexisting: defensive guard H3)
  - [x] 8.3 — All 1273 tests pass (8 new, 5 updated)

## Dev Notes

### Radio toggle bug root cause
In `handleMajorClick`, when `majorCount === 1` and a selection exists:
- `usedMajorSlots = 1` (from the existing selection)
- `remaining = majorCount - usedMajorSlots = 0`
- `remaining >= cost` → `0 >= 1` → false → click blocked

Fix: check `majorCount === 1` BEFORE the `remaining` check, same pattern as `handleMinorClick`.

### Character Endurance — slotCost removal
The `slotCost: 2` mechanism was meant to model "requires 2 major slots". But the actual rule is "cannot be the first major improvement" — meaning it's unavailable at the Expérimenté tier (20 XP) and available from Vétéran (40 XP). At 40 XP, majorCount=1, so slotCost=2 would still filter it out incorrectly.

Solution: remove slotCost entirely. Simply exclude Endurance from the 20 XP threshold. At 40 XP and 70 XP, include it with normal cost.

### Commandement detection
The CD stat is stored as a string in sub_profiles (e.g., "8"). The base value comes from the first non-mount sub-profile. Gains of "+1 Commandement" are in existingGains. Current CD = parseInt(base) + count("+1 Commandement" in existingGains).

### "2 améliorations mineures" flow
When the player selects "2 améliorations mineures" and confirms:
1. The descriptions array will contain "2 améliorations mineures" along with any other major picks
2. Remove it from descriptions (don't save it as a gain)
3. Save only the other major picks as gains
4. Insert a new queue entry after the current step with the character's minor improvements and minorCount=2
5. The wizard advances to this new step, the player picks 2 minors
6. Those 2 minors are saved as normal gains

## File List

**Modified:**
- `src/components/tier-up-step.tsx` — radio toggle fix, disabledImprovementIds prop, removed slotCost filter
- `src/lib/constants.ts` — removed slotCost from char Endurance, excluded Endurance from 20 XP tier
- `src/components/post-match-wizard.tsx` — constraint computation, cumulativeGainsRef, "2 améliorations mineures" sub-flow, commandement in queue
- `src/routes/match/$matchId/post-match.tsx` — added commandement to loader data
- `src/components/__tests__/tier-up-step.test.tsx` — 5 updated + 5 new tests
- `src/components/__tests__/post-match-wizard-tierup.test.tsx` — 3 new tests
- `tests/4-2-constants-tier.test.ts` — 2 updated tests (slotCost → tier-based exclusion)

**New:**
- `_bmad-output/implementation-artifacts/cc-tier-up-improvement-constraints.md` — this story

## Change Log

- 2026-03-19: Implemented all 8 tasks — radio toggle fix, constraint enforcement, Endurance rework, "2 améliorations mineures" sub-flow, commandement check, 8 new tests, 7 updated tests

## Dev Agent Record

### Implementation Plan
1. Fix radio toggle bug in handleMajorClick (check majorCount===1 before remaining check)
2. Remove slotCost mechanism for character Endurance, use tier-based exclusion instead
3. Add disabledImprovementIds prop to TierUpStep for constraint enforcement
4. Add commandement field to unit data (computed from base CD + gains in loader)
5. Compute disabled IDs in PostMatchWizard based on existingGains + session cumulative gains
6. Handle "2 améliorations mineures" by inserting dynamic sub-step in tierUpQueue

### Debug Log
- slotCost removal caused 5 test failures → updated tests to match new Endurance model
- `toBeInTheDocument` not available in test env → used `.not.toBeNull()` pattern
- `toBeDisabled` not available → used `.disabled` property check
- Radio deselect test replaced with "confirm sends replaced selection" test (HTML radios don't natively deselect on re-click)
- lint: fixed unnecessary optional chain on riderProfile, removed unused cdCount variable

### Completion Notes
All 8 tasks complete. 1273 tests pass (8 new, 7 updated). Typecheck clean. No new lint errors.
