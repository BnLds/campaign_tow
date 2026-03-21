# Story 4.2: Tier-Up Detection & Improvement Choice

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want the app to detect when a unit or character crosses an XP tier after I finish entering all XP, and let me choose improvements in a second pass,
So that the tier-up moment is a satisfying reward that doesn't interrupt my XP entry flow.

## Acceptance Criteria

**AC1 — Phase 2 starts after all XP is entered:**
Given I have entered XP for all units and characters in the post-match wizard (Phase 1),
When the last unit's XP is submitted successfully,
Then the wizard computes tier crossings for ALL units (comparing pre-match XP vs post-XP) and, if any crossings exist, transitions to Phase 2 (tier-up flow) instead of calling `completeEvolutionsFn`.

**AC2 — Phase 2 presents tier-ups one at a time:**
Given Phase 2 has started with one or more tier crossings detected,
When the wizard enters Phase 2,
Then it presents a TierUpStep for the first unit/threshold — showing the tier name, the unit name, and the list of available improvements — with the same navigation pattern as Phase 1 (back button, cancel button, progress indicator "Amélioration X / N").

**AC3 — Improvement selection saves as unit_gains:**
Given a TierUpStep is displayed for a unit,
When I select the required number of improvements and tap "Suivant" (or "Terminer" on the last step),
Then the selected improvements are saved as `unit_gains` entries (via `submitTierUpFn` → `insertUnitGain`) and the wizard advances.

**AC4 — Mandatory selection before advancing:**
Given a TierUpStep is displayed,
When I have not yet selected the required number of improvements,
Then the "Suivant" / "Terminer" button is disabled — selection is mandatory before continuing.

**AC5 — Multi-tier crossing generates multiple steps:**
Given a unit's XP crosses multiple thresholds at once (e.g. 0 → 15 XP crosses Honneur de bataille at 3 and 9 for units),
When Phase 2 is built,
Then one TierUpStep is created for each crossed threshold, in ascending XP order, and each requires a separate improvement selection.

**AC6 — No Phase 2 when no tier crossings:**
Given I have entered XP for all units,
When no unit or character has crossed a tier threshold,
Then Phase 2 is skipped entirely, `completeEvolutionsFn` is called, and the wizard completes as before.

**AC7 — Wizard resume with delta=0 does not trigger tier-ups:**
Given I re-open the wizard for a match where XP was partially entered (story 4-1b resume),
When I re-submit the same XP values (delta = 0 for all units),
Then no tier crossings are detected and Phase 2 does not appear.

**AC8 — Back button in Phase 2 navigates between tier-up steps:**
Given I am on a TierUpStep that is not the first,
When I tap the back button,
Then the wizard returns to the previous TierUpStep (restoring any previously selected improvements for that step). If I am on the first TierUpStep, back returns to the last XP step (Phase 1).

**AC9 — Cancel in Phase 2 aborts the entire wizard:**
Given I am in Phase 2,
When I tap cancel,
Then the wizard closes (same behavior as Phase 1 cancel). XP entries from Phase 1 are preserved (already saved server-side), but unsaved tier-up selections from the current session are lost.

**AC10 — `calculateTier` updated with new thresholds:**
Given the campaign rules have been updated with new XP thresholds,
When `calculateTier(xp, unitType)` is called,
Then it returns the correct tier based on unit type:
- Units: 0→Bleusaille, 10→Aguerri, 25→Expérimenté, 50→Vétéran, 80→Légendaire
- Characters: 0→(none), 6→Aguerri, 20→Expérimenté, 40→Vétéran, 70→Héroïque

## Context & Background

This story extends the existing post-match wizard (stories 4-1 and 4-1b) with a **second phase**. The existing XP entry flow (Phase 1) is untouched. After all XP is entered, the wizard detects tier crossings and presents a new flow (Phase 2) with the same UX patterns (step-by-step, back/cancel buttons) for choosing improvements.

### Flow overview

```
Phase 1 (EXISTING — unchanged)
  Unit 1 → XP input → Suivant
  Unit 2 → XP input → Suivant
  ...
  Last unit → XP input → Suivant (NOT "Terminer")

Transition (invisible to user)
  → For each unit: compare oldXp vs newXp (from server responses)
  → Collect all threshold crossings
  → Build tierUpQueue

If no crossings → completeEvolutionsFn → home (same as before)

Phase 2 (NEW — same UX pattern)
  ‹ back | "Amélioration 1 / N" | ✕ cancel
  TierUpStep 1 → tier name + improvements list → select → Suivant
  TierUpStep 2 → ...
  Last TierUpStep → select → "Terminer"
  → completeEvolutionsFn → home
```

### IMPORTANT — Phase 1 back button and xpResults cleanup

When the player taps the back button during Phase 1, the existing code deletes the previous unit from `submittedUnitsRef` (allowing re-submission). The new `xpResults` map must also be updated: when going back to step N, delete the xpResults entry for the unit at step N. Otherwise, stale `{ oldXp, newXp }` from a previous submission would persist. On re-submission with a different XP value, `handleNext()` overwrites xpResults naturally — but the delete-on-back ensures consistency if the player navigates back but does NOT re-submit (e.g. goes back then forward without changing the value — the already-submitted guard skips the server call, so xpResults would not be updated).

### Campaign rules — Tier thresholds and improvements (source: `docs/xp_rules.md`)

**Unit tiers:**

| XP | Tier | Improvements |
|---|---|---|
| 0 | Bleusaille | — |
| 10 | Aguerri | 1 minor improvement |
| 25 | Experimente | 1 major improvement |
| 50 | Veteran | 2 minor improvements |
| 80 | Legendaire | 2 major + 1 minor improvement |

**Unit honneurs de bataille (separate from tiers):**

| XP | Reward |
|---|---|
| 3 | 1 champion or banner (free) |
| 9 | 1 champion or banner (free) |

**Character tiers:**

| XP | Tier | Improvements |
|---|---|---|
| 6 | Aguerri | 1 minor improvement |
| 20 | Experimente | 1 major improvement |
| 40 | Veteran | 1 major + 2 minor improvements |
| 70 | Heroique | 2 major + 2 minor improvements |

**Unit minor improvements:** +1 Initiative, +1 CC, +1 Mouvement (once), +1 Commandement (max 10), a skill from unit profile

**Unit major improvements:** +1 CT, +1 Force, +1 Endurance (max +1), +1 Attaque (max +1), a skill (bien entraine, veteran, tenace, mur de bouclier)

> **Mounted units (cavalry & chariots):** Stat improvements apply to riders/crew only, never to mounts.

**Character minor improvements:** +1 Initiative, +1 CC or +1 CT, +1 Mouvement (once), +1 Commandement (max 10)

**Character major improvements:** +1 Force, +1 Endurance (needs 2 major slots), +1 PV (max 2x), +1 Attaque, +1 magic level if wizard (max 4), 2 minor improvements

> **Mounted characters (cavalry & chariots):** Stat improvements apply to the character only, never to the mount.

### What "Honneur de bataille" means

Honneurs de bataille (XP 3 and 9) are unit-only intermediate rewards. They are NOT visual tiers (no border/glow change on UnitCard). However, they DO trigger a TierUpStep in Phase 2 when XP crosses those thresholds.

### IMPORTANT — Mixed constraint architecture (ThresholdEntry redesign)

For `mixed` constraint tiers (Veteran char, Legendaire unit, Heroique char), using a single `selectCount` is insufficient. The component needs to know exactly how many major AND how many minor picks are required. The `ThresholdEntry` type uses explicit `majorCount` and `minorCount` fields:

```typescript
type ThresholdEntry = {
  xp: number
  tierLabel: string
  majorImprovements: Improvement[]  // available major choices
  minorImprovements: Improvement[]  // available minor choices
  majorCount: number                // how many major to pick (0 for honour/minor-only tiers)
  minorCount: number                // how many minor to pick (0 for major-only tiers)
}
```

This replaces the original `selectCount + selectConstraint` design. Benefits:
- TierUpStep renders two separate sections ("Choisir N majeures" / "Choisir M mineures") naturally from the data
- Validation is trivial: `majorSelected.length === majorCount && minorSelected.length === minorCount`
- No ambiguity about what "mixed" means per tier

### IMPORTANT — Character +1 Endurance costs 2 major slots

Per `docs/xp_rules.md`, "+1 Endurance (nécessite deux améliorations majeures)" means selecting +1 Endurance consumes 2 of the available major improvement slots. **MVP decision: exclude +1 Endurance from the selectable list when `majorCount < 2`.** When `majorCount >= 2`, include it but mark it with a `(2 emplacements)` label. The `Improvement` type gains an optional `slotCost: number` field (default 1). TierUpStep validation checks that `sum(slotCost for selected majors) === majorCount`.

### IMPORTANT — Skill improvements are free-text in MVP

Per `docs/xp_rules.md`, unit minor improvements include "une compétence présente sur la fiche d'unité" — these are unit-specific skills, NOT a fixed list. For MVP, the improvement option is labeled "Compétence (voir fiche)" and saved as the literal text "Compétence (voir fiche)". The player notes the specific skill manually. Same for unit major skill "Compétence au choix (bien entraîné, vétéran, tenace, mur de bouclier)" — saved as literal label text. No free-text input field needed in MVP.

### What this story creates

**New file — `src/lib/constants.ts`:**
- `UNIT_THRESHOLDS`: array including Honneurs de bataille (3, 9) and tiers (10, 25, 50, 80)
- `CHARACTER_THRESHOLDS`: array of character tiers (6, 20, 40, 70)
- Improvement lists for each type/category
- `ThresholdEntry` and `Improvement` types (with `slotCost` for Endurance)

**New functions in `src/lib/tier.ts`:**
- `detectTierCrossings(oldXp, newXp, unitType)` — returns crossings between oldXp and newXp
- Update `calculateTier()` — new thresholds per unit type, returns 0-4
- Update `getTierLabel()` — add Bleusaille (0), Legendaire/Heroique (4)
- Update `getTierColor()` — add tier 4 color

**New component — `src/components/tier-up-step.tsx`:**
- Same visual structure as XP step (not a modal/overlay)
- Shows tier name, unit name, improvement options
- Radio (selectCount=1) or checkbox (selectCount>1) selection
- Disabled "Suivant"/"Terminer" until required selections made

**New server function — `submitTierUpFn` in `post-match.tsx`:**
- Saves selected improvements as `unit_gains` entries

**New validator — `submitTierUpSchema` in `validators.ts`**

### What this story modifies

**`PostMatchWizard` (`src/components/post-match-wizard.tsx`):**
- Add `phase: 'xp' | 'tierup'` state
- Collect `newXp` results during Phase 1 (store per unit)
- After last XP step: compute all tier crossings → build `tierUpQueue`
- Phase 2: iterate through `tierUpQueue` with same back/cancel UX
- `completeEvolutionsFn` moved to end of Phase 2 (or end of Phase 1 if no crossings)
- Back button in Phase 1 must also clear `xpResults` entry for the previous step's unit

**`calculateTier()` in `src/lib/tier.ts`:**
- Now uses `unitType` parameter (was ignored)
- Units: 0→0, 10→1, 25→2, 50→3, 80→4
- Characters: 0→0, 6→1, 20→2, 40→3, 70→4

**`PostMatchRoute` in `post-match.tsx`:**
- Pass `onSubmitTierUp` callback to wizard

**Call sites requiring `0|1|2|3` → `0|1|2|3|4` type update (enumerated from codebase grep):**
- `src/components/unit-card.tsx` line 15: `tier: 0 | 1 | 2 | 3` prop type → `0 | 1 | 2 | 3 | 4`
- `src/components/unit-card.tsx` line 23: `tierBorderStyle(tier: 0 | 1 | 2 | 3)` — add `case 4` (reinforced gold border)
- `src/components/unit-edit-panel.tsx` line 64: `UpdateXpFn` return type `tier: 0 | 1 | 2 | 3` → `0 | 1 | 2 | 3 | 4`
- `src/components/unit-edit-panel.tsx` line 179: `currentTier` state type → `0 | 1 | 2 | 3 | 4 | null`
- `src/routes/armies/$armyId.tsx` line 289: `tier: 0 | 1 | 2 | 3` in unit data shape → `0 | 1 | 2 | 3 | 4`
- `src/routes/armies/$armyId.tsx` line 255: `updateXpFn` handler returns `{ tier }` from `calculateTier` — return type auto-updated

### Scope boundaries

**IN scope:**
- 2-phase wizard flow (XP then tier-ups)
- New constants, detection logic, TierUpStep component
- Updated `calculateTier` with new thresholds
- `submitTierUpFn` server function
- Unit tests for all new/modified code

**OUT of scope:**
- TierUpScreen gold pulse animation (post-MVP)
- Character injuries/bonuses (story 4.3)
- Stat modifier auto-creation from improvements (text gains only)
- Honneur de bataille champion/banner tracking in DB
- E2E tests

## Tasks / Subtasks

- [ ] Task 1 — Update `calculateTier()` and related functions in `src/lib/tier.ts` (AC: 10)
  - [ ] 1.1 — Update `calculateTier(xp, unitType)` to use unitType-specific thresholds. Units: 10→1, 25→2, 50→3, 80→4. Characters: 6→1, 20→2, 40→3, 70→4. Return type becomes `0 | 1 | 2 | 3 | 4`. Export `TierLevel = 0 | 1 | 2 | 3 | 4` type alias.
  - [ ] 1.2 — Update `getTierLabel(tier, unitType?)` — tier 0 + unitType !== 'Personnages': 'Bleusaille'; tier 0 + Personnages: '' (empty). Tier 4: unitType !== 'Personnages' → '✦ Légendaire', Personnages → '✦ Héroïque'.
  - [ ] 1.3 — Update `getTierColor(tier)` — tier 4: reinforced gold (`--color-gold-strong` or gold with glow/shadow)
  - [ ] 1.4 — Update all call sites (enumerated list — see "Call sites requiring type update" in Context section): `unit-card.tsx` (prop type + `tierBorderStyle` case 4), `unit-edit-panel.tsx` (UpdateXpFn return type + currentTier state type), `$armyId.tsx` (unit data shape type)

- [ ] Task 2 — Create `src/lib/constants.ts` with improvement data (AC: 2, 3, 5)
  - [ ] 2.1 — Define `Improvement` type: `{ id: string; label: string; category: 'minor' | 'major' | 'honour'; slotCost?: number }`. Default slotCost is 1. Endurance has slotCost: 2.
  - [ ] 2.2 — Define `ThresholdEntry` type: `{ xp: number; tierLabel: string; majorImprovements: Improvement[]; minorImprovements: Improvement[]; majorCount: number; minorCount: number }`. For honour thresholds, use `minorImprovements` with honour items and `minorCount: 1, majorCount: 0`.
  - [ ] 2.3 — Define `UNIT_MINOR_IMPROVEMENTS`: `[{ id: 'u-min-init', label: '+1 Initiative' }, { id: 'u-min-cc', label: '+1 CC' }, { id: 'u-min-mouv', label: '+1 Mouvement (unique)' }, { id: 'u-min-cd', label: '+1 Commandement (max 10)' }, { id: 'u-min-skill', label: 'Compétence (voir fiche)' }]`
  - [ ] 2.4 — Define `UNIT_MAJOR_IMPROVEMENTS`: `[{ id: 'u-maj-ct', label: '+1 CT' }, { id: 'u-maj-f', label: '+1 Force' }, { id: 'u-maj-e', label: '+1 Endurance (max +1)' }, { id: 'u-maj-a', label: '+1 Attaque (max +1)' }, { id: 'u-maj-skill', label: 'Compétence au choix (bien entraîné, vétéran, tenace, mur de bouclier)' }]`. Note: unit Endurance has NO slotCost override (default 1). The "(max +1)" means it can only be taken once across the campaign, NOT that it costs 2 slots. Only CHARACTER Endurance has slotCost=2.
  - [ ] 2.5 — Define `UNIT_HONOUR_IMPROVEMENTS`: `[{ id: 'u-hon-champ', label: 'Champion gratuit', category: 'honour' }, { id: 'u-hon-ban', label: 'Bannière gratuite', category: 'honour' }]`
  - [ ] 2.6 — Define `CHARACTER_MINOR_IMPROVEMENTS`: `[{ id: 'c-min-init', label: '+1 Initiative' }, { id: 'c-min-ccct', label: '+1 CC ou +1 CT' }, { id: 'c-min-mouv', label: '+1 Mouvement (unique)' }, { id: 'c-min-cd', label: '+1 Commandement (max 10)' }]`
  - [ ] 2.7 — Define `CHARACTER_MAJOR_IMPROVEMENTS`: `[{ id: 'c-maj-f', label: '+1 Force' }, { id: 'c-maj-e', label: '+1 Endurance (2 emplacements)', slotCost: 2 }, { id: 'c-maj-pv', label: '+1 PV (max 2x)' }, { id: 'c-maj-a', label: '+1 Attaque' }, { id: 'c-maj-mag', label: '+1 Niveau de magie (sorcier, max 4)' }, { id: 'c-maj-2min', label: '2 améliorations mineures' }]`
  - [ ] 2.8 — Define `UNIT_THRESHOLDS`: `[{ xp:3, tierLabel:'Honneur de bataille', majorImprovements:[], minorImprovements:HONOUR, majorCount:0, minorCount:1 }, { xp:9, ...same }, { xp:10, 'Aguerri', major:[], minor:UNIT_MINOR, majorCount:0, minorCount:1 }, { xp:25, 'Expérimenté', major:UNIT_MAJOR, minor:[], majorCount:1, minorCount:0 }, { xp:50, 'Vétéran', major:[], minor:UNIT_MINOR, majorCount:0, minorCount:2 }, { xp:80, 'Légendaire', major:UNIT_MAJOR, minor:UNIT_MINOR, majorCount:2, minorCount:1 }]`
  - [ ] 2.9 — Define `CHARACTER_THRESHOLDS`: `[{ xp:6, 'Aguerri', major:[], minor:CHAR_MINOR, majorCount:0, minorCount:1 }, { xp:20, 'Expérimenté', major:CHAR_MAJOR, minor:[], majorCount:1, minorCount:0 }, { xp:40, 'Vétéran', major:CHAR_MAJOR, minor:CHAR_MINOR, majorCount:1, minorCount:2 }, { xp:70, 'Héroïque', major:CHAR_MAJOR, minor:CHAR_MINOR, majorCount:2, minorCount:2 }]`
  - [ ] 2.10 — Export all types and constants. Ensure `ThresholdEntry` is the public type used by `detectTierCrossings` return.

- [ ] Task 3 — Add `detectTierCrossings()` to `src/lib/tier.ts` (AC: 1, 5, 6, 7)
  - [ ] 3.1 — Import thresholds from `constants.ts`
  - [ ] 3.2 — Implement `detectTierCrossings(oldXp, newXp, unitType)`: filter thresholds where `threshold.xp > oldXp && threshold.xp <= newXp`, sorted ascending. Use UNIT_THRESHOLDS when unitType !== 'Personnages', CHARACTER_THRESHOLDS otherwise.
  - [ ] 3.3 — When `newXp <= oldXp` (delta=0 or negative), return empty array

- [ ] Task 4 — Add `submitTierUpSchema` to `src/lib/validators.ts` (AC: 3)
  - [ ] 4.1 — Define schema: `{ unitId: z.string().min(1), matchParticipantId: z.string().min(1), improvements: z.array(z.object({ description: z.string().min(1) })).min(1) }`
  - [ ] 4.2 — Export `SubmitTierUpInput` type

- [ ] Task 5 — Add `submitTierUpFn` server function to `post-match.tsx` (AC: 3)
  - [ ] 5.1 — Create server function with POST, authMiddleware, submitTierUpSchema
  - [ ] 5.2 — Handler: verify non-guest, verify unit belongs to player's army
  - [ ] 5.3 — For each improvement: call `insertUnitGain(data.unitId, improvement.description)`
  - [ ] 5.4 — Return `ServerResult<{ unitId: string; gainsCreated: number }>`

- [ ] Task 6 — Create `TierUpStep` component in `src/components/tier-up-step.tsx` (AC: 2, 4)
  - [ ] 6.1 — Props: `{ tierLabel, majorImprovements, minorImprovements, majorCount, minorCount, unitName, onConfirm, isMounted?: boolean }`. `onConfirm` receives `{ descriptions: string[] }`.
  - [ ] 6.2 — Render inline in wizard flow (NOT modal/overlay) — same card layout as XP step
  - [ ] 6.3 — Header: tier badge (Cinzel, tier color) + unit name
  - [ ] 6.4 — When only one section has items (majorCount > 0 XOR minorCount > 0): single list with radio (count=1) or checkboxes (count>1). When both sections have items (mixed): render two separate labeled sections ("Choisir N amélioration(s) majeure(s)" and "Choisir M mineure(s)"), each with its own checkbox group.
  - [ ] 6.5 — "Confirmer" button disabled until `sum(slotCost of selected majors) === majorCount && minorSelected.length === minorCount`. For non-mixed tiers this simplifies to `selected.length === majorCount + minorCount`.
  - [ ] 6.6 — On confirm: build `{ descriptions }` array from selected improvement labels (majors first, then minors), call `onConfirm`
  - [ ] 6.7 — Style: design tokens (--font-display, --font-body, --color-gold, etc.)
  - [ ] 6.8 — When `isMounted` is true, show callout below tier badge: "Les améliorations s'appliquent au cavalier/servant uniquement" (subtle text, `--color-text-secondary`)
  - [ ] 6.9 — For character tiers: filter out Endurance (slotCost=2) from major list when `majorCount < 2` to prevent impossible selection. Unit Endurance has no slotCost override and is always selectable.

- [ ] Task 7 — Extend `PostMatchWizard` for 2-phase flow (AC: 1, 6, 7, 8, 9)
  - [ ] 7.1 — Add state: `phase: 'xp' | 'tierup'` (default 'xp')
  - [ ] 7.2 — Add ref: `xpResultsRef: useRef<Map<string, { oldXp: number; newXp: number }>>` — collect server responses during Phase 1. Use ref (not state) to avoid re-renders on each XP submit.
  - [ ] 7.3 — During Phase 1 `handleNext()`: after successful XP submit, store `{ oldXp: newXp - delta, newXp }` in xpResultsRef for the unit. `delta = xpGained - (previousXpGained ?? 0)` — same delta computation as `submitUnitXpFn`.
  - [ ] 7.4 — Change last-step button text: always "Suivant" during Phase 1 (never "Terminer" during XP entry)
  - [ ] 7.5 — After last XP step: compute `tierUpQueue` by calling `detectTierCrossings` for each unit using stored xpResults. Flatten into ordered list of `{ unitId, unitName, unitType, ...crossing }`. Order: iterate units array in wizard order, and for each unit append its crossings in ascending XP order.
  - [ ] 7.6 — If tierUpQueue is empty → call `completeEvolutionsFn` → done (AC6)
  - [ ] 7.7 — If tierUpQueue has entries → set phase='tierup', tierUpStep=0
  - [ ] 7.8 — Phase 2 rendering: show TierUpStep instead of XP input. Progress shows "Amélioration X / N".
  - [ ] 7.9 — Phase 2 back button: if tierUpStep > 0, go to previous tier-up step (restore selections). If tierUpStep === 0, go back to last XP step (phase='xp').
  - [ ] 7.10 — Phase 2 cancel: same as Phase 1 cancel (`onCancel()`)
  - [ ] 7.11 — Phase 2 "Terminer" on last tier-up step: after confirm → `completeEvolutionsFn` → done
  - [ ] 7.12 — Add `onSubmitTierUp` optional prop (injectable for tests)
  - [ ] 7.13 — Add state: `submittedTierUpsByStep: Map<number, string[]>` for back-button restore of selections
  - [ ] 7.14 — Phase 1 back button: when navigating back to step N, also delete `xpResultsRef.current.delete(units[N].id)` to ensure stale results don't persist if the player re-submits with different XP. Add this alongside the existing `submittedUnitsRef.current.delete(prevUnit.id)`.
  - [ ] 7.15 — Pass `isMounted` prop to TierUpStep: detect mounted status by checking if the unit has any sub-profile with `isMount: true`. This requires extending the `units` prop type to include sub-profile mount info, OR passing a separate `mountedUnitIds: Set<string>` prop. **Decision: extend unit type** in wizard props to include `hasMount: boolean` (set by loader from sub-profiles data).

- [ ] Task 8 — Update `PostMatchRoute` to pass `onSubmitTierUp` (AC: 3)
  - [ ] 8.1 — Add `handleSubmitTierUp` wrapper calling `submitTierUpFn`
  - [ ] 8.2 — Pass `onSubmitTierUp={handleSubmitTierUp}` to `PostMatchWizard`

- [ ] Task 9 — Write unit tests for `constants.ts` and `detectTierCrossings` (AC: 1, 5, 6, 7, 10)
  - [ ] 9.1 — Test UNIT_THRESHOLDS has 6 entries at XP 3, 9, 10, 25, 50, 80
  - [ ] 9.2 — Test CHARACTER_THRESHOLDS has 4 entries at XP 6, 20, 40, 70
  - [ ] 9.3 — Test all improvements have unique id values (across all improvement arrays)
  - [ ] 9.4 — Test unit 0→15 XP: returns 3 crossings (3, 9, 10) with correct majorCount/minorCount per entry
  - [ ] 9.5 — Test unit 8→10 XP: returns 2 crossings (9, 10). Note: 9 > 8 so XP 9 IS crossed.
  - [ ] 9.6 — Test character 0→25 XP: returns 2 crossings (6, 20) — no Honneur thresholds for characters
  - [ ] 9.7 — Test delta=0 (oldXp === newXp): returns empty
  - [ ] 9.8 — Test negative delta (newXp < oldXp): returns empty
  - [ ] 9.9 — Test crossings sorted ascending by XP
  - [ ] 9.10 — Test Legendaire threshold (unit 0→80) has majorCount=2, minorCount=1
  - [ ] 9.11 — Test Heroique threshold (char 0→70) has majorCount=2, minorCount=2
  - [ ] 9.12 — Test Endurance improvement has slotCost=2 in CHARACTER_MAJOR only. Unit Endurance should have default slotCost (1 or undefined).
  - [ ] 9.13 — Test unit 0→80 XP: returns 6 crossings (3, 9, 10, 25, 50, 80) — all unit thresholds

- [ ] Task 10 — Write unit tests for updated `calculateTier` (AC: 10)
  - [ ] 10.1 — Test unit thresholds: 0→0, 9→0, 10→1, 24→1, 25→2, 49→2, 50→3, 79→3, 80→4
  - [ ] 10.2 — Test character thresholds: 0→0, 5→0, 6→1, 19→1, 20→2, 39→2, 40→3, 69→3, 70→4
  - [ ] 10.3 — Test getTierLabel with unitType for tier 4

- [ ] Task 11 — Write unit tests for `TierUpStep` component (AC: 2, 4)
  - [ ] 11.1 — Test renders tier label and unit name
  - [ ] 11.2 — Test button disabled when no selection
  - [ ] 11.3 — Test button enabled after selecting required count (single section)
  - [ ] 11.4 — Test calls onConfirm with selected descriptions
  - [ ] 11.5 — Test radio mode (single section, count=1: e.g. Aguerri)
  - [ ] 11.6 — Test checkbox mode (single section, count=2: e.g. Veteran unit with 2 minor)
  - [ ] 11.7 — Test mixed mode (two sections: e.g. Legendaire with majorCount=2, minorCount=1) — button disabled until both sections filled
  - [ ] 11.8 — Test Endurance slotCost=2: selecting Endurance in a majorCount=2 tier consumes both slots, disabling further major selection
  - [ ] 11.9 — Test character Endurance (slotCost=2) filtered out when majorCount < 2 (e.g. character Experimente with majorCount=1). Unit Endurance is never filtered.
  - [ ] 11.10 — Test mounted callout shown when isMounted=true
  - [ ] 11.11 — Test mounted callout hidden when isMounted=false or undefined

- [ ] Task 12 — Write unit tests for wizard 2-phase flow (AC: 1, 6, 8, 9)
  - [ ] 12.1 — Test: all XP entered, tier crossings exist → Phase 2 starts
  - [ ] 12.2 — Test: all XP entered, no crossings → wizard completes (no Phase 2)
  - [ ] 12.3 — Test: Phase 2 back button navigates between tier-up steps
  - [ ] 12.4 — Test: Phase 2 back from first step returns to last XP step
  - [ ] 12.5 — Test: Phase 2 cancel calls onCancel
  - [ ] 12.6 — Test: Phase 2 "Terminer" on last step calls completeEvolutionsFn

- [ ] Task 13 — Write unit tests for `submitTierUpFn` (AC: 3)
  - [ ] 13.1 — Test: creates unit_gains entries for each improvement
  - [ ] 13.2 — Test: rejects guest session
  - [ ] 13.3 — Test: rejects unit not belonging to player's army
  - [ ] 13.4 — Test: validates input schema

- [ ] Task 14 — Quality gates
  - [ ] 14.1 — `pnpm typecheck` — zero errors
  - [ ] 14.2 — `pnpm lint` — zero errors
  - [ ] 14.3 — `pnpm build` — succeeds
  - [ ] 14.4 — All existing tests still pass (no regressions)

## Dev Notes

### CRITICAL — 2-Phase Flow Architecture

The existing `PostMatchWizard` is extended, NOT replaced. Phase 1 (XP entry) remains identical. The key changes:

1. **During Phase 1:** Collect `{ oldXp, newXp }` from each `submitUnitXpFn` response. `oldXp = newXp - delta` where `delta = xpGained - (previousXpGained ?? 0)`.
2. **After last XP step:** Build `tierUpQueue` from all collected results. Do NOT call `completeEvolutionsFn` yet.
3. **Phase 2:** Same wizard shell, different content (TierUpStep instead of XP input).
4. **After last tier-up (or if no tier-ups):** Call `completeEvolutionsFn`.

### CRITICAL — New Tier Thresholds

`calculateTier()` must now differentiate by unitType:

```typescript
// Units (type !== 'Personnages')
if (xp >= 80) return 4  // Legendaire
if (xp >= 50) return 3  // Veteran
if (xp >= 25) return 2  // Experimente
if (xp >= 10) return 1  // Aguerri
return 0                 // Bleusaille

// Characters (type === 'Personnages')
if (xp >= 70) return 4  // Heroique
if (xp >= 40) return 3  // Veteran
if (xp >= 20) return 2  // Experimente
if (xp >= 6) return 1   // Aguerri
return 0                 // (no label)
```

Return type changes from `0|1|2|3` to `0|1|2|3|4`. All call sites must be checked.

### CRITICAL — Honneur de bataille is NOT a visual tier

`calculateTier()` does NOT include Honneur de bataille (XP 3 and 9). These are unit-only intermediate rewards. They trigger a TierUpStep in Phase 2 but do NOT change the UnitCard border/glow. The `detectTierCrossings()` function uses a separate threshold list that includes them.

### CRITICAL — majorCount / minorCount per tier

| Threshold | majorCount | minorCount | Details |
|---|---|---|---|
| Honneur de bataille (unit) | 0 | 1 | Champion OR banner (honour category, in minorImprovements) |
| Aguerri (unit/char) | 0 | 1 | 1 minor |
| Expérimenté (unit/char) | 1 | 0 | 1 major |
| Vétéran (unit) | 0 | 2 | 2 minor |
| Vétéran (char) | 1 | 2 | 1 major + 2 minor (mixed — two sections in UI) |
| Légendaire (unit) | 2 | 1 | 2 major + 1 minor (mixed — two sections in UI) |
| Héroïque (char) | 2 | 2 | 2 major + 2 minor (mixed — two sections in UI) |

TierUpStep renders **one or two sections** depending on whether both majorCount and minorCount are > 0. Validation: `sum(slotCost of selected majors) === majorCount && minorSelected.length === minorCount`.

### IMPORTANT — Collecting XP results during Phase 1

The wizard needs to remember `{ oldXp, newXp }` for EVERY unit after Phase 1 completes. This data comes from the `submitUnitXpFn` server response (`newXp`) and the delta calculation (`oldXp = newXp - delta`).

New state: `xpResults: Map<string, { oldXp: number; newXp: number }>` — populated in `handleNext()` after each successful XP submission.

### IMPORTANT — Back button in Phase 2

Phase 2 back button restores previously selected improvements (via `submittedTierUpsByStep` map, same pattern as `submittedXpByStep` in Phase 1). Going back from the first TierUpStep returns to Phase 1's last XP step (set `phase='xp'`, restore `currentStep` to last unit).

### IMPORTANT — TierUpStep is inline, not modal

TierUpStep renders inline within the wizard flow (same container, same nav bar), NOT as a modal/overlay/Sheet. This keeps the UX consistent: the wizard is always a full-page sequential flow.

### IMPORTANT — Mounted units and characters

Per `docs/xp_rules.md`, stat improvements for mounted units (cavalry & chariots) apply to riders/crew only, never to mounts. Same for mounted characters. This is an **informational note** displayed on the TierUpStep when the unit/character is mounted — it does NOT change the improvement options. The note should appear as a subtle callout below the tier badge (e.g. "Les améliorations s'appliquent au cavalier/servant uniquement").

**Detection of mounted status (DECIDED):** Use the `isMount` boolean on sub-profiles (already in DB). In the loader (`loadPostMatchDataFn`), after fetching units via `getUnitsForArmy()`, derive `hasMount: boolean` per unit by checking if any sub-profile has `isMount: true`. Add `hasMount` to the unit objects passed to the wizard. This avoids string matching on unit type names and uses the authoritative data already in the schema.

### IMPORTANT — Improvement saved as text description

Same as before: `insertUnitGain(unitId, description)` saves human-readable text like "+1 Initiative" or "Champion gratuit". No `stat_modifiers` are created automatically.

### Previous Story Intelligence

| Artifact | Location | Relevant Detail |
|---|---|---|
| `calculateTier()` | `src/lib/tier.ts:10` | Returns `0\|1\|2\|3` (needs `0\|1\|2\|3\|4`), `_unitType` param exists but ignored |
| `getTierLabel()` | `src/lib/tier.ts:17` | Switch on `0\|1\|2\|3`, needs case 0 (Bleusaille) + case 4 (Legendaire/Heroique) |
| `getTierColor()` | `src/lib/tier.ts:26` | Switch on `0\|1\|2\|3`, needs case 4 |
| `tierBorderStyle()` | `src/components/unit-card.tsx:23` | Switch on `0\|1\|2\|3`, needs case 4 |
| `UnitCard` props | `src/components/unit-card.tsx:15` | `tier: 0\|1\|2\|3` — needs `TierLevel` |
| `UpdateXpFn` type | `src/components/unit-edit-panel.tsx:64` | Return includes `tier: 0\|1\|2\|3` — needs `TierLevel` |
| `currentTier` state | `src/components/unit-edit-panel.tsx:179` | Type `0\|1\|2\|3\|null` — needs `TierLevel\|null` |
| `updateXpFn` handler | `src/routes/armies/$armyId.tsx:254` | Calls `calculateTier(data.xp, unit.type)` — return type auto-updated |
| Unit data shape | `src/routes/armies/$armyId.tsx:289` | `tier: 0\|1\|2\|3` in mapped unit — needs `TierLevel` |
| `insertUnitGain()` | `src/db/queries.ts:421` | INSERT into unit_gains, returns row |
| `PostMatchWizard` | `src/components/post-match-wizard.tsx` | Sequential wizard, `submittedXpByStep`/`submittedUnitsRef`, back button deletes from `submittedUnitsRef` |
| `submitUnitXpFn` | `src/routes/match/$matchId/post-match.tsx:77` | Returns `{ unitId, newXp }`. `delta = xpGained - (previousXpGained ?? 0)` computed server-side. |
| `loadPostMatchDataFn` | `src/routes/match/$matchId/post-match.tsx:29` | Loader returns units with `{ id, name, type, xp, previousXpGained }`. Needs `hasMount: boolean` added. |
| `getUnitsForArmy()` | `src/db/queries.ts:274` | Returns units with subProfiles — `isMount` field available for mounted detection |
| `unitGains` table | `src/db/schema.ts:87-91` | `{ id, unitId, description }` |
| Unit types | OWB parser | `type` field: "Personnages", "Unités de base", etc. |
| XP rules | `docs/xp_rules.md` | Source of truth for thresholds and improvements |

### Risk — Pre-Mortem

**Risk 1 — Mixed constraint enforcement (DECIDED):**
Veteran char (1 major + 2 minor) and Legendaire unit (2 major + 1 minor) require enforcing category counts. **Decision: use separate sections** in TierUpStep ("Choisir N améliorations majeures" / "Choisir M mineures"). Each section has its own selection count. Simpler and clearer than a single mixed list. **Redesigned ThresholdEntry** to use `majorCount`/`minorCount` instead of `selectCount + selectConstraint`.

**Risk 2 — Phase 2 interruption:**
If wizard closes during Phase 2, XP is saved but improvements are lost. On resume, delta=0 for all units → no crossings detected → Phase 2 doesn't reappear. The player can add missing improvements manually via edit panel. Acceptable for MVP.

**Risk 3 — `calculateTier` return type change:**
Going from `0|1|2|3` to `0|1|2|3|4` may break exhaustive switch statements or conditional checks. **Enumerated call sites** in "What this story modifies" section: `unit-card.tsx` (prop + tierBorderStyle), `unit-edit-panel.tsx` (UpdateXpFn type + state), `$armyId.tsx` (unit data shape). Export a `TierLevel` type alias to avoid hardcoding the union in multiple files.

**Risk 4 — Endurance multi-slot cost (DECIDED):**
Character "+1 Endurance" requires 2 major improvement slots. This means selecting it consumes 2 of the available `majorCount`. **Decision:** add `slotCost` field to `Improvement` type (default 1, Endurance = 2). TierUpStep validates `sum(slotCost) === majorCount`. Filter out Endurance when `majorCount < 2` to prevent impossible selections.

**Risk 5 — xpResults stale data on Phase 1 back navigation:**
When the player goes back in Phase 1, `submittedUnitsRef` is cleared for the previous unit, but `xpResults` was not cleared. If the player then proceeds forward without changing the value, the already-submitted guard would skip the server call, leaving stale xpResults. **Mitigation:** Task 7.14 adds `xpResultsRef.current.delete(units[N].id)` on back.

**Risk 6 — Mounted unit detection requires sub-profile data:**
The TierUpStep needs to know if a unit is mounted (to show the rider-only callout). The current `units` prop in PostMatchWizard doesn't include sub-profile info. **Decision:** extend the loader to include `hasMount: boolean` per unit (derived from sub-profiles `isMount` field). Task 7.15 covers this.

**Risk 7 — Character major "2 améliorations mineures" option:**
Per `docs/xp_rules.md`, one of the character major improvements is "2 améliorations mineures" — spending a major slot to gain 2 minor picks instead. For MVP, this is saved as the literal text "2 améliorations mineures" via `insertUnitGain`. The actual minor picks are NOT tracked separately. This is consistent with the text-only gain approach.

### Project Structure Notes

**New files:**
- `src/lib/constants.ts` — improvement data and threshold arrays
- `src/components/tier-up-step.tsx` — TierUpStep component

**Modified files:**
- `src/lib/tier.ts` — update `calculateTier`, `getTierLabel`, `getTierColor`; add `detectTierCrossings()`, export `TierLevel` type
- `src/lib/validators.ts` — add `submitTierUpSchema`
- `src/routes/match/$matchId/post-match.tsx` — add `submitTierUpFn`, update route, extend loader to include `hasMount` per unit
- `src/components/post-match-wizard.tsx` — 2-phase flow, tierUpQueue, xpResults collection, back-button xpResults cleanup
- `src/components/unit-card.tsx` — update `tier` prop type to `TierLevel`, add `case 4` in `tierBorderStyle`
- `src/components/unit-edit-panel.tsx` — update `UpdateXpFn` return type, `currentTier` state type to `TierLevel`
- `src/routes/armies/$armyId.tsx` — update unit data shape `tier` type to `TierLevel`

**Test files:**
- `tests/4-2-constants-tier.test.ts` — constants + detectTierCrossings
- `tests/4-2-calculate-tier.test.ts` — updated calculateTier
- `src/components/__tests__/tier-up-step.test.tsx` — TierUpStep component
- `src/components/__tests__/post-match-wizard-tierup.test.tsx` — wizard Phase 2
- `src/routes/match/$matchId/__tests__/post-match-tierup.test.ts` — submitTierUpFn

### References

- XP rules (source of truth): `docs/xp_rules.md`
- Epic 4: `_bmad-output/planning-artifacts/epics/epic-4-post-match-flow-xp-progression.md` — Story 4.2
- Story 4-1: `_bmad-output/implementation-artifacts/4-1-post-match-flow-xp-entry-per-unit-character.md`
- Story 4-1b: `_bmad-output/implementation-artifacts/4-1b-match-xp-tracking-wizard-resume.md`
- Architecture patterns: `_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md`
