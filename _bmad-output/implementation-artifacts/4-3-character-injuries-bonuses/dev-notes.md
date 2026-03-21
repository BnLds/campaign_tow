# Dev Notes

## CRITICAL — Phase 1.5 is a dedicated consequence phase AFTER XP, BEFORE tier-ups

Flow: Phase 1 (XP entry + toggles) → Phase 1.5 (consequences for flagged units) → Phase 2 (tier-ups/gains). This ensures XP changes from consequences (Miraculé +2, Fureur Vengeresse +2, Déroute Sanglante -N) are reflected in xpResults BEFORE Phase 2 tier crossing detection. Characters are processed first in Phase 1.5, then units.

## CRITICAL — XP changes from consequences must update xpResults before Phase 2

If a character gets "Miraculé" or a unit gets "Fureur Vengeresse", the +2 XP bonus must be reflected in `xpResultsRef`. If a unit gets "Déroute Sanglante", the XP loss must be reflected too. The simplest approach: re-submit XP via `onSubmitUnitXp` with the adjusted value. The server's upsert handles the delta correctly.

## CRITICAL — "Déroute Sanglante" XP loss is tier-dependent

XP loss depends on the unit's tier AT THE TIME OF THE MATCH (after XP gain): Bleusaille −10, Aguerri −10, Expérimenté −15, Vétéran −20, Légendaire −30. Use `calculateTier(newXp, unit.type)` from `src/lib/tier.ts` (NOT constants.ts) to determine the tier, then look up the loss in `DEROUTE_XP_LOSS[tier]`. The `xpGained` value in the re-submit is `max(0, originalXpGained - tierLoss)` — the server's upsert mechanism handles the negative delta correctly.

## CRITICAL — No save on quit + batch commit integration

All consequence data (stat_modifiers + unit_gains) is accumulated client-side in `pendingConsequencesRef` and committed atomically with tier-up gains via `completeEvolutionsWithGainsFn`. If the wizard is quit/cancelled, all pending data is discarded — same discard-on-quit pattern as `pendingGainsRef`. Nothing is committed until the wizard completes successfully.

## CRITICAL — Temporary modifier auto-cleanup

At the START of `completeEvolutionsWithGainsTransaction`, delete all existing temporary `stat_modifiers` (where `temporary = true` AND `source IN ('injury', 'destruction')`) for this army's units. This ensures "next battle only" effects (Blessure Grave -1 PV, Moral Brisé -2 Cd, Pertes Catastrophiques) are automatically removed when the next match completes. New temporary modifiers from the current match are then created in the same transaction.

## IMPORTANT — Permanent injury stat keys must match delta-composer STAT_KEYS

The 1D6 permanent injury sub-table maps to stat keys: `e` (Endurance), `i` (Initiative), `ct` (CT), `cc` (CC), `f` (Force), `cd` (Commandement). These are the same lowercase keys used by `STAT_KEYS` in `delta-composer.ts` and `sub_profiles` columns. The `InjuryResult.stat` field must use these exact keys (not French labels). The `insertStatModifier` function stores `stat` as text — ensure consistency.

## IMPORTANT — "Blessure Permanente" is a two-level selection

The player first selects "Blessure Permanente" from the 2D6 table, then selects the specific stat from the 1D6 sub-table. The InjuryBonusStep handles this as a nested selection within the same step (not a separate wizard step).

## IMPORTANT — "Mort" and text-only effects are markers, not stat changes

Character death ("Mort"), "Pertes Catastrophiques", banner loss, and "Rancune"/"Haine" are recorded as `unit_gains` entries. They are visible on the unit card as text. The UnitCard already displays gains in the delta chips area.

## IMPORTANT — Resume simplification for MVP

Since consequences are batch-committed only when the wizard completes, and the wizard only resumes when `evolutionsEnteredAt IS NULL`, there is no consequence data to reconstruct from the DB on resume. The toggles simply reset to unchecked. If the player re-opens the wizard mid-flow (browser refresh), they re-select the consequence. This is acceptable for MVP.

## IMPORTANT — Red theme for consequences, green for gains

Consequence steps (Phase 1.5) use `--color-malus-bg: #fdf0f0` and `--color-malus: #b82c2c`. Tier-up steps (Phase 2) use `--color-bonus-bg: #edf8ef` and `--color-bonus: #2d7a3a`. This visual distinction reinforces the negative vs. positive nature of each phase.

## IMPORTANT — Stat floor at 0 (display only)

`stat_modifiers` store the raw delta as-is. The display layer (delta-composer, UnitCard) clamps computed stat values to `max(0, base + sum(deltas))`. This means the DB is always accurate and the floor is a presentation concern only. **Implementation location:** In `composeUnitView()` (`src/lib/delta-composer.ts`), change `const rawValue = parseInt(baseValue, 10) + netDelta` to `const rawValue = Math.max(0, parseInt(baseValue, 10) + netDelta)` for non-uncapped stats (line ~191). Uncapped stats (Movement) are not floored. Also update `computeEffectiveStats()` similarly.

## IMPORTANT — Consequences visible on timeline and army view

Consequence-related `stat_modifiers` and `unit_gains` are displayed using the same mechanism as tier-up gains on TimelineEntry and army view. Malus entries use `--color-malus` (red), bonuses use `--color-bonus` (green). The existing delta-composer and UnitCard infrastructure already supports this — stat_modifiers with source 'injury'/'destruction' will be composed alongside existing deltas.

## Previous Story Intelligence

| Artifact | Location | Relevant Detail |
|---|---|---|
| `PostMatchWizard` | `src/components/post-match-wizard.tsx` | 2-phase wizard, `pendingGainsRef`, `xpResultsRef`, batch commit via `onCompleteEvolutions` |
| `TierUpStep` | `src/components/tier-up-step.tsx` | Inline wizard step pattern (not modal), same nav bar |
| `completeEvolutionsWithGainsFn` | `src/routes/match/$matchId/post-match.tsx:265` | Batch commit server fn — needs injury extension |
| `completeEvolutionsWithGainsTransaction` | `src/db/queries.ts` | Transaction helper — needs injury processing |
| `insertStatModifier()` | `src/db/queries.ts:389` | `(unitId, stat, delta, source, temporary)` — used for injuries |
| `insertUnitGain()` | `src/db/queries.ts:421` | `(unitId, description, matchParticipantId?)` — used for Haine/Mort |
| `stat_modifiers` table | `src/db/schema.ts:78-85` | `{ id, unitId, stat, delta, source, temporary }` |
| `unit_gains` table | `src/db/schema.ts:87-92` | `{ id, unitId, description, matchParticipantId }` |
| `submitUnitXpFn` | `src/routes/match/$matchId/post-match.tsx:142` | Upsert-based — re-submitting with higher xpGained applies only the delta |
| `incrementUnitXp` | `src/db/queries.ts:451` | Updates units.xp |
| `parseGainStat()` | `src/lib/delta-composer.ts:101` | Parses "+1 CC" → `{ stat: 'cc', delta: 1 }` — injury stat names must be compatible |
| `calculateTier()` | `src/lib/tier.ts:15` | `(xp: number, unitType: string) → TierLevel (0-4)` — needed for Déroute Sanglante |
| `detectTierCrossings()` | `src/lib/tier.ts:61` | Returns [] when newXp <= oldXp — protects against "tier-down" after XP loss |
| Injury rules | `docs/xp_rules.md` | 2D6 table + 1D6 sub-table |

## Risk — Pre-Mortem

**Risk 1 — XP changes from consequences + tier crossing timing:**
The +2 XP from "Miraculé"/"Fureur Vengeresse" and XP loss from "Déroute Sanglante" must be applied AND reflected in xpResults BEFORE the Phase 2 transition logic runs. Since consequence steps are interleaved in Phase 1, and Phase 2 transition only happens after the LAST step, this is naturally ordered. No race condition.

**Risk 2 — Extending the batch commit schema:**
Adding a `consequences` array to `completeEvolutionsWithGainsSchema` is additive — existing calls with no consequences will pass validation (the field is optional). Backward compatible.

**Risk 3 — Back button from Phase 1.5 to Phase 1:**
When `phase === 'consequences'` and `consequenceIndex === 0`, pressing back must transition back to `phase: 'xp'` and set `currentStep` to the last XP step (`units.length - 1`). This also requires clearing `submittedUnitsRef` and `xpResultsRef` for the last unit (same pattern as the existing Phase 2 → Phase 1 back transition). The consequence flags remain in `consequenceFlagsRef` and are NOT cleared on back — the player can re-visit the last XP step and change the toggle.

**Risk 4 — Phase 1 "last unit has a consequence":**
If the last unit in the wizard has MHC/destroyed checked, Phase 1.5 still triggers normally — the flag is stored in `consequenceFlagsRef` during Phase 1, and the transition to Phase 1.5 happens after the last XP step completes. After the last consequence step confirms, the wizard transitions to Phase 2 (tier-ups) or completes if no tier crossings exist.

**Risk 5 — "Déroute Sanglante" XP loss could theoretically "un-do" a tier:**
If a unit gained enough XP to cross a tier threshold in this match, but then "Déroute Sanglante" removes more XP than was gained, the unit could drop below its previous tier. Phase 2's `detectTierCrossings` compares oldXp vs newXp — if newXp < oldXp, no tier crossing is detected (tier crossings only fire on increase). This is the correct behavior.

**Risk 6 — Story size increased with unit destruction:**
With 28 ACs and 13 tasks, this story is at the upper end of Size S / lower Size M. Manageable because the unit destruction pattern mirrors the character injury pattern closely.

**Risk 7 — Déroute Sanglante XP loss can make unit.xp go below pre-match value:**
If the unit had 48 XP pre-match, gained 5 XP (now 53), and Déroute Sanglante for Vétéran tier costs 20 XP, re-submit sends `max(0, 5-20) = 0`. The upsert delta is `0 - 5 = -5`, so `units.xp` becomes 48. But the `units.xp` column has no `CHECK >= 0` constraint. If pre-match XP was 3 and gained 5 (now 8), loss is 10 (Bleusaille), re-submit sends `max(0, 5-10) = 0`, delta is `-5`, `units.xp` becomes 3. This is correct — the loss is capped by `max(0, xpGained - tierLoss)` which means the unit never loses more than what it gained this match. Safe.

**Risk 8 — `stat_modifiers` without `matchParticipantId` limits traceability:**
The `stat_modifiers` table has no `matchParticipantId` column. Temporary modifiers from injuries/destruction cannot be traced to a specific match. This is acceptable for MVP because: (a) cleanup deletes ALL temporary modifiers for the army, not per-match; (b) the UnitCard shows deltas without needing match attribution; (c) timeline entries use `unit_gains` (which DO have `matchParticipantId`) for human-readable consequence display. Adding `matchParticipantId` to `stat_modifiers` is a future enhancement, not needed for story 4.3.

**Risk 9 — Phase 2 back button to Phase 1.5:**
Currently the Phase 2 → Phase 1 back transition (tierUpStep === 0) goes back to the last XP step. With Phase 1.5, if there were flagged units, Phase 2 back should return to the last consequence step in Phase 1.5, not to Phase 1. The back button logic in Phase 2 must be updated: `if (tierUpStep === 0 && flaggedUnits.length > 0) → phase: 'consequences', consequenceIndex: lastFlaggedIndex`.

## Project Structure Notes

**New files:**
- `src/components/injury-bonus-step.tsx` — InjuryBonusStep component (character injuries)
- `src/components/unit-destruction-step.tsx` — UnitDestructionStep component (unit destruction)

**Modified files:**
- `src/components/post-match-wizard.tsx` — consequence toggles, consequence step injection, pendingConsequencesRef
- `src/lib/validators.ts` — extend `completeEvolutionsWithGainsSchema` with consequences
- `src/lib/constants.ts` — add `DEROUTE_XP_LOSS` tier-based XP loss table
- `src/routes/match/$matchId/post-match.tsx` — update `completeEvolutionsWithGainsFn` handler
- `src/db/queries.ts` — update `completeEvolutionsWithGainsTransaction` to process consequences

**Test files:**
- `src/components/__tests__/injury-bonus-step.test.tsx` — InjuryBonusStep component tests
- `src/components/__tests__/unit-destruction-step.test.tsx` — UnitDestructionStep component tests
- `src/components/__tests__/post-match-wizard-consequence.test.tsx` — wizard consequence flow integration tests
- `src/routes/match/$matchId/__tests__/post-match-consequence.test.ts` — batch commit with consequences tests

## References

- Injury rules (source of truth): `docs/xp_rules.md` — "Blessures des personnages" + "Destruction d'unité" sections
- Epic 4: `_bmad-output/planning-artifacts/epics/epic-4-post-match-flow-xp-progression.md` — Story 4.3
- Story 4-2: `_bmad-output/implementation-artifacts/4-2-tier-up-detection-improvement-choice.md`
- Architecture patterns: `_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md`
