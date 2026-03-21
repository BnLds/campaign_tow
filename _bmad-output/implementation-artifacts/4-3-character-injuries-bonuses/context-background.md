# Context & Background

This story adds a **Phase 1.5** (consequences) between Phase 1 (XP entry) and Phase 2 (tier-ups) in the post-match wizard. During Phase 1, the player marks units as "Mis Hors de Combat" (characters) or "Détruite" (units) via toggle checkboxes. After ALL XP is entered, Phase 1.5 iterates through flagged units to record consequences. This ordering ensures that consequence XP changes (Miraculé +2, Fureur Vengeresse +2, Déroute Sanglante -N) are reflected before Phase 2 tier crossing detection.

## Flow overview

```
Phase 1 (XP entry — existing, + toggles)
  Unit 1 → XP input + [✓ Détruite] → Suivant
  Character 1 → XP input + [✓ Mis Hors de Combat] → Suivant
  Unit 2 → XP input → Suivant (not destroyed)
  Character 2 → XP input → Suivant (not MHC)
  ...
  Last unit → XP input → Suivant

Phase 1.5 (consequences — NEW, red theme)
  Character 1 → InjuryBonusStep (2D6 table with dice results) → select → Confirmer
  Unit 1 → UnitDestructionStep (2D6 table with dice results) → select → Confirmer
  (only flagged units, characters first then units)

Phase 2 (tier-ups — existing, green theme, unchanged)
  ...
```

## 2D6 Injury Table (from `docs/xp_rules.md`)

| Result | Label | Effect |
|---|---|---|
| 2 | Mort | Character killed. Equipment recovered if battle won/drawn. |
| 3 | Blessure Permanente | Roll 1D6 on permanent injury sub-table. |
| 4-7 | Blessure Grave | -1 PV for next battle (temporary). |
| 8-10 | Egratignures | No effect. |
| 11 | Haine | Gains Haine special rule vs. the opposing army. |
| 12 | Miraculé | +2 XP. |

## Permanent Injury Sub-Table (1D6)

| Result | Effect |
|---|---|
| 1 | -1 Endurance |
| 2 | -1 Initiative |
| 3 | -1 CT |
| 4 | -1 CC |
| 5 | -1 Force |
| 6 | -1 Commandement |

## 2D6 Unit Destruction Table (from `docs/xp_rules.md`)

| Result | Label | Effect |
|---|---|---|
| 2-3 | Déroute Sanglante | XP loss: Bleusaille −10, Aguerri −10, Expérimenté −15, Vétéran −20, Légendaire −30 (after match gains). |
| 4-6 | Pertes Catastrophiques | Half strength for next battle. |
| 7-8 | Moral Brisé | -2 Cd for next battle (temporary). |
| 9-10 | Survivants Endurcis | No effect. |
| 11 | Rancune | Gains Haine vs. the opposing army. |
| 12 | Fureur Vengeresse | +2 XP. |

## Banner & Champion sub-rules

- If destroyed unit had a banner: banner permanently lost. Unit must re-earn 3 XP for a new one.
- Champion killed in a duel: improvement lost. Unit must re-earn 3 XP. (Champion tracking is out of scope for MVP — only banner checkbox is implemented.)

## Architecture decisions

**Injury data model:** Injuries use the existing `stat_modifiers` table with `source: 'injury'`. This is the same table used for manual delta edits (story 2.4). Permanent injuries have `temporary: false`, "Blessure Grave" has `temporary: true`. Non-stat results (Haine, Mort) use `unit_gains` entries since they are not numeric stat changes.

**Phase 1.5 is a dedicated phase, NOT interleaved:** Consequences are resolved after ALL XP is entered (Phase 1), before tier-ups (Phase 2). This ensures XP changes from consequences (Miraculé, Fureur Vengeresse, Déroute Sanglante) are accounted for in tier crossing detection. Characters are processed first, then units.

**InjuryBonusStep and UnitDestructionStep are inline:** Like TierUpStep, they render inline in the wizard flow (not a modal). They use the same navigation pattern (back/next).

**Red theme for consequences, green for gains:** Consequence steps use `--color-malus-bg: #fdf0f0` background and `--color-malus: #b82c2c` accents. Tier-up steps continue to use `--color-bonus-bg: #edf8ef` and `--color-bonus: #2d7a3a`.

**Dice results on every row:** Each selectable option shows the 2D6/1D6 result prefix (e.g. "2 — Mort", "4-7 — Blessure Grave") to help players match their paper dice roll.

**Two-level selection for "Blessure Permanente":** When the player selects "Blessure Permanente" (2D6 = 3), a second selection appears for the 1D6 sub-table (which specific stat is affected). This can be implemented as a two-step flow within the same InjuryBonusStep, or as an expandable section.

**MVP: player selects from table, not random roll:** The app does NOT roll dice. The player has already rolled dice on paper during the game and simply records the result. The step presents all options and the player selects what they rolled.

**"Miraculé" (+2 XP) interaction with tier crossings:** If the player selects "Miraculé", the +2 XP must be applied to the character AND the `xpResults` in the wizard must be updated so that tier crossing detection in Phase 2 accounts for this bonus. This is the most complex interaction.

**Batch commit integration:** Injury/destruction `stat_modifiers` and `unit_gains` are accumulated alongside tier-up gains and committed atomically via `completeEvolutionsWithGainsFn`. The schema for this function needs to be extended to support consequence data.

**Unit destruction uses a separate component:** `UnitDestructionStep` is a sibling of `InjuryBonusStep` (not the same component with a mode prop). The two tables have different options, different effect types (XP loss vs. stat penalty), and different sub-rules (banner checkbox vs. permanent injury sub-table). Keeping them separate is clearer.

**Déroute Sanglante XP loss is applied via negative delta on `units.xp`:** The XP loss happens AFTER the match XP gain is recorded. Implementation: re-submit XP via `onSubmitUnitXp` with `max(0, currentXpGained - tierLoss)`. The server's `upsertMatchXpEntry` returns `previousXpGained`, and `incrementUnitXp` applies the delta (`newXpGained - previousXpGained`). If `newXpGained < previousXpGained`, the delta is negative — this is correct and expected. The `xpResultsRef` must also be updated so tier crossings reflect the reduced XP. **Important:** the tier used for loss calculation is the unit's tier AFTER the match XP gain, computed via `calculateTier(newXp, unit.type)` from `src/lib/tier.ts` — both arguments are required.

**Pertes Catastrophiques is a text marker for MVP:** Actual strength/effectif is not tracked in the DB. A `unit_gains` entry serves as a visible reminder. The GM/player manually adjusts army composition before the next match.

**"Détruite" toggle label vs. "Mis Hors de Combat":** Units get "Détruite", characters get "Mis Hors de Combat". Both toggles appear in Phase 1 (XP entry), but the consequence steps fire in Phase 1.5.

**Temporary modifier auto-cleanup:** At the START of `completeEvolutionsWithGainsFn`, all existing temporary `stat_modifiers` (where `temporary = true` AND `source IN ('injury', 'destruction')`) for this army's units are deleted. This ensures "next battle only" effects are automatically removed when the next match completes. New temporary modifiers from the current match are then created in the same transaction.

**Stat floor at 0:** `stat_modifiers` store the raw delta (e.g. `-1`). The display layer (UnitCard, delta-composer) clamps computed stat values to `max(0, base + sum(deltas))`. This means the DB is always accurate, and the floor is a presentation concern only.

**Consequences visible on timeline and army view:** Consequence-related `unit_gains` are displayed on timeline entries using the same mechanism as tier-up gains (joined via `matchParticipantId`). `stat_modifiers` do NOT have a `matchParticipantId` column — they are visible on the **army view** (UnitCard) via `getUnitDeltas`, but NOT individually listed on timeline entries. This is acceptable for MVP: the `unit_gains` entries ("Mort (MHC)", "Haine (blessure)", "Bannière perdue", etc.) provide the human-readable consequence summary on the timeline. Stat modifiers show as red deltas on the unit card. Malus entries use `--color-malus` (red), bonuses use `--color-bonus` (green).

**No save on quit:** Pending consequences are accumulated in `pendingConsequencesRef` (client-side) and only committed via `completeEvolutionsWithGainsFn`. If the wizard is quit/cancelled, all pending data is discarded — same pattern as `pendingGainsRef`.

## What this story creates

**New component — `src/components/injury-bonus-step.tsx`:**
- Presents 2D6 character injury table results as selectable options
- For "Blessure Permanente": shows 1D6 sub-table as nested selection
- Props: `{ unitName, onConfirm }`
- `onConfirm` returns structured data: `{ type: 'death' | 'permanent_injury' | 'grave_injury' | 'no_effect' | 'haine' | 'miracule', stat?: string, delta?: number }`

**New component — `src/components/unit-destruction-step.tsx`:**
- Presents 2D6 unit destruction table results as selectable options
- Includes optional "Bannière perdue" checkbox
- Props: `{ unitName, onConfirm }`
- `onConfirm` returns structured data: `{ type: 'deroute_sanglante' | 'pertes_catastrophiques' | 'moral_brise' | 'survivants_endurcis' | 'rancune' | 'fureur_vengeresse', bannerLost?: boolean }`

## What this story modifies

**`PostMatchWizard` (`src/components/post-match-wizard.tsx`):**
- Add "Mis Hors de Combat" toggle on character steps, "Détruite" toggle on unit steps (Phase 1)
- Track `consequenceFlags: Map<string, boolean>` state (MHC for characters, destroyed for units)
- After XP submit with flag=true: insert InjuryBonusStep (characters) or UnitDestructionStep (units)
- Accumulate consequence data in `pendingConsequencesRef` for batch commit
- "Miraculé" / "Fureur Vengeresse" (+2 XP): update xpResults so tier crossings account for it
- "Déroute Sanglante": apply XP loss via re-submit and update xpResults

**`completeEvolutionsWithGainsSchema` in `validators.ts`:**
- Extend gains schema to include optional `consequences` array (covers both injuries and destruction results)

**`completeEvolutionsWithGainsFn` / `completeEvolutionsWithGainsTransaction` in `post-match.tsx` and `queries.ts`:**
- Process consequence data: create `stat_modifiers` and/or `unit_gains` entries in the same transaction

**`loadPostMatchDataFn` in `post-match.tsx`:**
- No resume changes needed for MVP (consequences are batch-committed; toggles reset to unchecked on resume — see Task 8)

## Scope boundaries

**IN scope:**
- MHC toggle on character XP steps + "Détruite" toggle on unit XP steps
- InjuryBonusStep component with 2D6 character injury table + 1D6 sub-table
- UnitDestructionStep component with 2D6 unit destruction table + banner checkbox
- Saving consequences as `stat_modifiers` (permanent/temporary) and `unit_gains` (Haine, Mort, Pertes, Bannière, etc.)
- "Miraculé" / "Fureur Vengeresse" +2 XP with xpResults update
- "Déroute Sanglante" XP loss based on tier
- Batch commit integration for all consequence types
- Automatic temporary modifier cleanup on next match completion (AC24)
- Stat floor at 0 (display layer clamping) (AC25)
- Red/green color theming for consequence vs gain steps (AC26)
- Consequences visible on timeline and army view (AC27)
- Dice results on selectable rows (AC28)
- No-save-on-quit (same pattern as unit gains) (AC10)
- Unit tests for all new/modified code

**OUT of scope:**
- Equipment recovery tracking for "Mort" result
- Actual strength/effectif tracking for "Pertes Catastrophiques" (text marker only)
- Champion duel death tracking (banner checkbox only, no champion checkbox)
- Automatic dice rolling (player selects what they rolled)
- E2E tests
