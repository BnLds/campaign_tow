# Tasks / Subtasks

- [x] Task 1 — Create `InjuryBonusStep` component in `src/components/injury-bonus-step.tsx` (AC: 3, 4, 5, 6, 7, 8, 26, 28)
  - [x] 1.1 — Define `InjuryResult` type: `{ type: 'death' | 'permanent_injury' | 'grave_injury' | 'no_effect' | 'haine' | 'miracule'; stat?: string; delta?: number }`. Export from component file.
  - [x] 1.2 — Props: `{ unitName: string; onConfirm: (result: InjuryResult) => void; onBack?: () => void }`.
  - [x] 1.3 — Render the 6 injury table outcomes as selectable radio options. Each row prefixed with dice result: "2 — Mort", "3 — Blessure Permanente", "4-7 — Blessure Grave", "8-10 — Égratignures", "11 — Haine", "12 — Miraculé".
  - [x] 1.4 — When "Blessure Permanente" is selected: show a nested 1D6 sub-table with 6 radio options, each prefixed with dice result: "1 — -1 Endurance", "2 — -1 Initiative", etc. Both selections required before confirm is enabled.
  - [x] 1.5 — "Confirmer" button disabled until a valid selection is made (including sub-selection for "Blessure Permanente").
  - [x] 1.6 — On confirm: build `InjuryResult` from selection and call `onConfirm`. For "Blessure Permanente": include `stat` and `delta: -1`. For "Blessure Grave": include `stat: 'pv'` and `delta: -1`. For others: type only.
  - [x] 1.7 — Style: red-tinted theme — `--color-malus-bg: #fdf0f0` background, `--color-malus: #b82c2c` accents. Unit name header in Cinzel.

- [x] Task 2 — Add consequence toggles to XP steps in `PostMatchWizard` Phase 1 (AC: 1, 2, 12, 13)
  - [x] 2.1 — Add state: `consequenceFlagsRef: useRef<Map<string, boolean>>` to track toggle per unit ID. Use ref to avoid re-renders.
  - [x] 2.2 — Add local `isConsequenceChecked` state synced from ref on step change (via useEffect on `currentStep`), similar to `xpGained` pre-fill pattern.
  - [x] 2.3 — Render checkbox/toggle on ALL unit steps: label "Mis Hors de Combat" when `currentUnit.type === 'Personnages'`, label "Détruite" otherwise. Styled consistently with the XP input section.
  - [x] 2.4 — On toggle change: update `consequenceFlagsRef.current.set(currentUnit.id, value)`.
  - [x] 2.5 — Back button: when navigating back, toggle is restored from `consequenceFlagsRef` via useEffect (no extra logic needed).

- [x] Task 3 — Implement Phase 1.5 (consequence phase) in `PostMatchWizard` (AC: 3, 9, 10, 11, 14, 22, 23)
  - [x] 3.1 — Add `phase: 'xp' | 'consequences' | 'tierup'` state (extend existing 2-phase to 3-phase).
  - [x] 3.2 — After last XP step in Phase 1: compute `flaggedUnits` from `consequenceFlagsRef`. If any, transition to `phase: 'consequences'`. If none, skip directly to Phase 2 (tier-ups).
  - [x] 3.3 — `flaggedUnits` ordering: characters first (type === 'Personnages'), then units. Within each group, preserve army order.
  - [x] 3.4 — Add `consequenceIndex: number` state to track current position in `flaggedUnits` array.
  - [x] 3.5 — Render logic: when `phase === 'consequences'`: render InjuryBonusStep if current flagged unit is character, else UnitDestructionStep. Progress indicator: "Blessure — {unitName}" or "Destruction — {unitName}".
  - [x] 3.6 — Back button in Phase 1.5: go to previous flagged unit (or back to last XP step if at index 0 — transition to `phase: 'xp'`, `currentStep: units.length - 1`, clear submittedUnitsRef/xpResultsRef for last unit).
  - [x] 3.7 — Cancel/quit: discard all pending consequences (same as pendingGainsRef discard pattern).
  - [x] 3.8 — Phase 2 back button from tierUpStep 0: if flaggedUnits exist, go back to `phase: 'consequences'` at the last consequence index (not to Phase 1 XP step). Requires storing `flaggedUnits` in a ref so Phase 2 can access it.

- [x] Task 4 — Handle consequence confirmations and accumulate data (AC: 4, 5, 6, 7, 8, 10, 15, 16, 17, 18, 19, 20, 21)
  - [x] 4.1 — Add ref: `pendingConsequencesRef: useRef<Map<string, InjuryResult | DestructionResult>>` — maps unitId to selected consequence result. Discarded on wizard cancel (same as pendingGainsRef).
  - [x] 4.2 — `handleConsequenceConfirm(result)`: store in `pendingConsequencesRef`, advance `consequenceIndex`. If last flagged unit, transition to Phase 2 (tier-ups).
  - [x] 4.3 — For "Miraculé" or "Fureur Vengeresse" (+2 XP): re-submit XP with `currentXpGained + 2` via `onSubmitUnitXp`. Update `xpResultsRef` to reflect the new total so Phase 2 tier crossing detection is accurate.
  - [x] 4.4 — For "Egratignures" / "Survivants Endurcis" (no effect): advance to next flagged unit — no data to accumulate.
  - [x] 4.5 — For "Déroute Sanglante" (XP loss): compute tier-based loss, re-submit XP with `max(0, currentXpGained - tierLoss)`. Update `xpResultsRef` accordingly. Phase 2 must NOT detect "tier-down" (tier crossings only trigger on XP increase).

- [x] Task 5 — Create `UnitDestructionStep` component in `src/components/unit-destruction-step.tsx` (AC: 14, 15, 16, 17, 18, 19, 20, 21, 26, 28)
  - [x] 5.1 — Define `DestructionResult` type: `{ type: 'deroute_sanglante' | 'pertes_catastrophiques' | 'moral_brise' | 'survivants_endurcis' | 'rancune' | 'fureur_vengeresse'; bannerLost?: boolean }`. Export from component file.
  - [x] 5.2 — Props: `{ unitName: string; onConfirm: (result: DestructionResult) => void; onBack?: () => void }`.
  - [x] 5.3 — Render the 6 destruction table outcomes as selectable radio options, each prefixed with dice result: "2-3 — Déroute Sanglante", "4-6 — Pertes Catastrophiques", "7-8 — Moral Brisé", "9-10 — Survivants Endurcis", "11 — Rancune", "12 — Fureur Vengeresse".
  - [x] 5.4 — Below the radio options: checkbox "L'unité possédait une bannière" (unchecked by default). Independent of the main selection.
  - [x] 5.5 — "Confirmer" button disabled until a radio selection is made.
  - [x] 5.6 — On confirm: build `DestructionResult` from selection + banner checkbox, call `onConfirm`.
  - [x] 5.7 — Style: red-tinted theme — `--color-malus-bg: #fdf0f0` background, `--color-malus: #b82c2c` accents. Unit name header in Cinzel.

- [x] Task 6 — Extend batch commit to include consequences + temporary cleanup (AC: 4, 5, 6, 8, 15, 16, 17, 19, 21, 24, 25)
  - [x] 6.1 — Extend `completeEvolutionsWithGainsSchema` to include optional `consequences` array.
  - [x] 6.2 — Update `completeEvolutionsWithGainsFn` handler: process consequence data in the same transaction.
  - [x] 6.3 — **Temporary modifier auto-cleanup (AC24):** At the START of `completeEvolutionsWithGainsTransaction`, delete all `stat_modifiers` where `temporary = true` AND `source IN ('injury', 'destruction')` for ALL units belonging to this army.
  - [x] 6.4 — Update `completeEvolutionsWithGainsTransaction` in `queries.ts`: process each consequence type accordingly.
  - [x] 6.5 — In `PostMatchWizard`, when calling `completeEvolutions`: include accumulated consequences from `pendingConsequencesRef`.

- [x] Task 6b — Stat floor at 0 in display layer (AC: 25)
  - [x] 6b.1 — In `delta-composer.ts`: ensure `max(0, base + sum(deltas))` is applied for all non-uncapped stats.
  - [x] 6b.2 — In `UnitCard`: verify stat display clamps to 0 (follows from delta-composer change).
  - [x] 6b.3 — Note: the raw delta is stored as-is in `stat_modifiers`. The floor is a presentation concern only.

- [x] Task 7 — Handle XP bonus/loss from consequence results (AC: 5, 15, 20)
  - [x] 7.1 — "Miraculé" / "Fureur Vengeresse": re-submit XP with `originalXpGained + 2` via `onSubmitUnitXp`. Update `xpResultsRef` (+2 newXp).
  - [x] 7.2 — "Déroute Sanglante": compute tier-based XP loss using `calculateTier(newXp, unit.type)` from `src/lib/tier.ts`, look up in `DEROUTE_XP_LOSS[tier]`. Re-submit XP with `max(0, originalXpGained - tierLoss)`.
  - [x] 7.3 — XP loss tier table constant: add `DEROUTE_XP_LOSS: Record<TierLevel, number>` to `constants.ts`.

- [x] Task 8 — Resume support (MVP simplification) (AC: 10)
  - [x] 8.1 — **MVP simplification:** Consequence data is NOT persisted for resume. Toggle resets to unchecked on resume. Documented in code comment.
  - [x] 8.2 — If `evolutionsEnteredAt IS NOT NULL`, the wizard shows "already completed" — no resume needed.

- [x] Task 9 — Write unit tests for `InjuryBonusStep` component (AC: 3, 4, 5, 6, 7, 8)
  - [x] 9.1 — Test renders all 6 injury options
  - [x] 9.2 — Test confirm button disabled when no selection
  - [x] 9.3 — Test confirm button enabled after selecting "Egratignures"
  - [x] 9.4 — Test selecting "Blessure Permanente" shows sub-table
  - [x] 9.5 — Test confirm button disabled when "Blessure Permanente" selected but no sub-selection
  - [x] 9.6 — Test confirm button enabled after "Blessure Permanente" + sub-selection
  - [x] 9.7 — Test onConfirm called with correct InjuryResult for each type (death, permanent_injury with stat, grave_injury, no_effect, haine, miracule)
  - [x] 9.8 — Test unit name displayed in header

- [x] Task 10 — Write unit tests for `UnitDestructionStep` component (AC: 14, 15, 16, 17, 18, 19, 20, 21)
  - [x] 10.1 — Test renders all 6 destruction options
  - [x] 10.2 — Test confirm button disabled when no selection
  - [x] 10.3 — Test confirm button enabled after selecting "Survivants Endurcis"
  - [x] 10.4 — Test banner checkbox appears and defaults to unchecked
  - [x] 10.5 — Test onConfirm called with correct DestructionResult for each type
  - [x] 10.6 — Test onConfirm includes bannerLost=true when banner checkbox is checked
  - [x] 10.7 — Test unit name displayed in header

- [x] Task 11 — Write unit tests for wizard Phase 1.5 flow integration (AC: 1, 2, 3, 9, 10, 11, 12, 13, 14, 22, 23)
  - [x] 11.1 — Test "Mis Hors de Combat" toggle appears on character steps (type === 'Personnages')
  - [x] 11.2 — Test "Détruite" toggle appears on non-character unit steps
  - [x] 11.3 — Test toggle defaults to unchecked
  - [x] 11.4 — Test no Phase 1.5 when no toggles checked: Phase 1 → Phase 2 directly
  - [x] 11.5 — Test Phase 1.5 triggers when MHC checked: InjuryBonusStep appears after all XP entered
  - [x] 11.6 — Test Phase 1.5 triggers when "Détruite" checked: UnitDestructionStep appears after all XP entered
  - [x] 11.7 — Test Phase 1.5 ordering: characters first, then units
  - [x] 11.8 — Test back button within Phase 1.5 navigates between flagged units
  - [x] 11.9 — Test consequence confirm advances to next flagged unit, then to Phase 2
  - [x] 11.10 — Test "Miraculé" / "Fureur Vengeresse" updates xpResults (+2 XP)
  - [x] 11.11 — Test multiple units with consequences in the same match
  - [x] 11.12 — Test wizard cancel discards all pending consequences (no save on quit)
  - [x] 11.13 — Test Phase 2 back button at tierUpStep 0 returns to Phase 1.5 (last consequence step) when flagged units exist
  - [x] 11.14 — Test Phase 1.5 back button at consequenceIndex 0 returns to Phase 1 (last XP step)

- [x] Task 12 — Write unit tests for batch commit with consequences (AC: 4, 5, 6, 8, 15, 16, 17, 19, 21, 24, 25)
  - [x] 12.1 — Test completeEvolutionsWithGainsSchema accepts consequences array
  - [x] 12.2 — Test permanent_injury creates stat_modifier with source='injury', temporary=false
  - [x] 12.3 — Test grave_injury creates stat_modifier with source='injury', temporary=true, stat='pv', delta=-1
  - [x] 12.4 — Test haine creates unit_gain with description='Haine (blessure)'
  - [x] 12.5 — Test death creates unit_gain with description='Mort (MHC)'
  - [x] 12.6 — Test moral_brise creates stat_modifier with source='destruction', temporary=true, stat='cd', delta=-2
  - [x] 12.7 — Test pertes_catastrophiques creates unit_gain
  - [x] 12.8 — Test rancune creates unit_gain with description='Rancune — Haine (destruction)'
  - [x] 12.9 — Test bannerLost=true creates unit_gain with description='Bannière perdue (destruction)'
  - [x] 12.10 — Test no_effect, miracule, survivants_endurcis, fureur_vengeresse create no DB entries
  - [x] 12.11 — Test consequences are committed in same transaction as gains
  - [x] 12.12 — Test temporary modifier auto-cleanup: existing temporary modifiers from previous match are deleted at start of transaction (AC24)
  - [x] 12.13 — Test stat floor: delta-composer clamps computed values to max(0, base + sum(deltas)) (AC25)

- [x] Task 13 — Quality gates
  - [x] 13.1 — `pnpm typecheck` — zero errors
  - [x] 13.2 — `pnpm lint` — zero errors (src files; pre-existing tsconfig issue in tests/ dir unrelated to this story)
  - [x] 13.3 — `pnpm build` — succeeds
  - [x] 13.4 — All existing tests still pass (no regressions) — 1404/1404 tests pass
