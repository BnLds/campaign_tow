# Acceptance Criteria

**AC1 — "Taken out of action" toggle on character XP step:**
Given the wizard is on a character step (unit type = "Personnages") during Phase 1 (XP entry),
When the step renders,
Then a toggle/checkbox labeled "Mis Hors de Combat" appears below the XP input, defaulting to unchecked.

**AC2 — Skipping when character was NOT taken out of action:**
Given the "Mis Hors de Combat" toggle is unchecked for a character,
When I tap "Suivant",
Then XP is submitted normally and no injury/bonus prompt appears — the wizard advances to the next unit.

**AC3 — Injury/bonus step appears in Phase 1.5 for flagged characters:**
Given I checked "Mis Hors de Combat" for a character during Phase 1,
When Phase 1 completes (all XP entered) and Phase 1.5 begins,
Then the wizard iterates through all flagged characters, showing an InjuryBonusStep for each. Each row displays the dice result (e.g. "2 — Mort", "3 — Blessure Permanente", "4-7 — Blessure Grave"). The step background uses a red-tinted theme (`--color-malus-bg: #fdf0f0`).

**AC4 — Injury saves as permanent stat_modifier (negative delta, floor 0):**
Given the InjuryBonusStep is displayed and I select a permanent injury (e.g. "3 — Blessure Permanente: -1 Endurance"),
When I confirm,
Then a `stat_modifiers` entry is created with `source: 'injury'`, `temporary: false`, and the appropriate negative `delta` and `stat` key. The resulting stat value cannot go below 0. The character card displays the red delta, and the malus is visible on the timeline entry and army view.

**AC5 — Bonus saves as permanent stat_modifier or special entry:**
Given the InjuryBonusStep is displayed and I select a bonus result (e.g. "Miraculé: +2 XP" or "Haine"),
When I confirm,
Then the effect is recorded appropriately:
- "Miraculé: +2 XP" adds 2 XP to the character via `incrementUnitXp` and updates the xpResults for tier crossing recalculation
- "Haine" is saved as a `unit_gains` entry with description "Haine (blessure)" since it is a special rule, not a stat modifier

**AC6 — Temporary injury (Blessure Grave: -1 PV) saves and auto-clears:**
Given I select "4-7 — Blessure Grave" (-1 PV for next battle),
When I confirm,
Then a `stat_modifiers` entry is created with `source: 'injury'`, `temporary: true`, `stat: 'pv'`, `delta: -1`. This modifier is visible on the character card (red delta) and is automatically removed when the army's NEXT match post-match wizard is completed (via `completeEvolutionsWithGainsFn`).

**AC7 — "No effect" results skip modifier creation:**
Given I select "Egratignures" (no effect),
When I confirm,
Then no `stat_modifiers` or `unit_gains` entry is created and the wizard advances normally.

**AC8 — "Death" result records character death:**
Given I select "Mort" (character killed),
When I confirm,
Then a `unit_gains` entry is created with description "Mort (MHC)" to mark the character as deceased. The wizard advances normally. (Equipment recovery is a manual note, not tracked in DB for MVP.)

**AC9 — Back button navigates within Phase 1.5:**
Given I am on an InjuryBonusStep in Phase 1.5,
When I tap the back button,
Then the wizard returns to the previous consequence step (or to the Phase 1.5 intro if this was the first flagged unit).

**AC10 — Quitting the wizard discards pending consequences:**
Given I am in the post-match wizard with pending consequence data (not yet committed),
When I quit/cancel the wizard,
Then no consequence data is saved — same discard-on-quit pattern as unit gains. Consequences are only committed when the wizard completes successfully.

**AC11 — Multiple characters can have injuries in the same match:**
Given a match involves multiple characters in my army,
When each character is taken out of action,
Then each gets its own InjuryBonusStep and each injury is saved independently.

---

## Unit Destruction ACs

**AC12 — "Destroyed" toggle on non-character unit XP steps:**
Given the wizard is on a non-character unit step (type ≠ "Personnages") during Phase 1 (XP entry),
When the step renders,
Then a toggle/checkbox labeled "Détruite" appears below the XP input, defaulting to unchecked.

**AC13 — Skipping when unit was NOT destroyed:**
Given the "Détruite" toggle is unchecked for a unit,
When I tap "Suivant",
Then XP is submitted normally and no destruction prompt appears — the wizard advances to the next unit.

**AC14 — Destruction step appears in Phase 1.5 for flagged units:**
Given I checked "Détruite" for a unit during Phase 1,
When Phase 1 completes and Phase 1.5 begins,
Then the wizard iterates through all flagged units (after characters), showing a UnitDestructionStep for each. Each row displays the dice result (e.g. "2-3 — Déroute Sanglante", "4-6 — Pertes Catastrophiques"). The step background uses a red-tinted theme (`--color-malus-bg: #fdf0f0`).

**AC15 — Déroute Sanglante (XP loss by tier):**
Given the UnitDestructionStep is displayed and I select "Déroute Sanglante" (2D6 = 2-3),
When I confirm,
Then XP is deducted from the unit based on its current tier: Bleusaille −10, Aguerri −10, Expérimenté −15, Vétéran −20, Légendaire −30. The XP loss is applied after the match XP gain. XP cannot go below 0.

**AC16 — Pertes Catastrophiques (half strength, temporary):**
Given I select "Pertes Catastrophiques" (2D6 = 4-6),
When I confirm,
Then a `unit_gains` entry is created with description "Pertes Catastrophiques (effectif réduit de moitié pour la prochaine bataille)". (Actual strength tracking is manual for MVP — the gain serves as a visible reminder on the unit card.)

**AC17 — Moral Brisé (−2 Cd, temporary, auto-clears):**
Given I select "7-8 — Moral Brisé",
When I confirm,
Then a `stat_modifiers` entry is created with `source: 'destruction'`, `temporary: true`, `stat: 'cd'`, `delta: -2`. The resulting Cd cannot go below 0. This modifier is automatically removed when the army's NEXT match post-match wizard is completed.

**AC18 — Survivants Endurcis (no effect):**
Given I select "Survivants Endurcis" (2D6 = 9-10),
When I confirm,
Then no `stat_modifiers` or `unit_gains` entry is created and the wizard advances normally.

**AC19 — Rancune (Haine):**
Given I select "Rancune" (2D6 = 11),
When I confirm,
Then a `unit_gains` entry is created with description "Rancune — Haine (destruction)".

**AC20 — Fureur Vengeresse (+2 XP):**
Given I select "Fureur Vengeresse" (2D6 = 12),
When I confirm,
Then +2 XP is added to the unit via re-submit (same pattern as "Miraculé" for characters) and `xpResultsRef` is updated for tier crossing recalculation.

**AC21 — Banner loss on unit destruction:**
Given the destroyed unit had a banner (noted by the player),
When the UnitDestructionStep renders,
Then a checkbox "L'unité possédait une bannière" appears. If checked, a `unit_gains` entry is created with description "Bannière perdue (destruction)" on confirm.

**AC22 — Back button navigates within Phase 1.5 (destruction):**
Given I am on a UnitDestructionStep in Phase 1.5,
When I tap the back button,
Then the wizard returns to the previous consequence step (or the last injury step if this is the first destruction step).

**AC23 — Multiple units can have destruction results in the same match:**
Given a match involves multiple non-character units in my army,
When each unit is destroyed,
Then each gets its own UnitDestructionStep and each destruction result is saved independently.

---

## Cross-Cutting ACs

**AC24 — Temporary modifiers auto-cleanup on next match completion:**
Given a unit has temporary `stat_modifiers` (source: 'injury' or 'destruction', temporary: true) from a previous match,
When the army's NEXT match post-match wizard is completed (via `completeEvolutionsWithGainsFn`),
Then all existing temporary modifiers for this army's units are deleted at the START of the transaction, before any new consequences are created.

**AC25 — Stat floor at 0:**
Given any stat modifier (injury or destruction) would reduce a stat below 0,
When the modifier is applied,
Then the stat value is floored at 0. The delta is still stored as-is in `stat_modifiers`, but the display (UnitCard) clamps the computed value to `max(0, base + sum(deltas))`.

**AC26 — Consequence steps use red theme, tier-up steps use green theme:**
Given a consequence step (InjuryBonusStep or UnitDestructionStep) is displayed,
Then the step uses a red-tinted background (`--color-malus-bg: #fdf0f0`) and red accent colors.
Given a tier-up step (existing TierUpStep) is displayed,
Then it continues to use its green/gold theme (`--color-bonus-bg: #edf8ef`).

**AC27 — Consequences visible on timeline entries and army view:**
Given a unit has injury/destruction consequences recorded,
When the match appears in the timeline,
Then `unit_gains` entries (e.g. "Mort (MHC)", "Haine (blessure)", "Bannière perdue (destruction)") are displayed alongside XP and tier-up information on the timeline entry, using red color for malus-type gains. On the army view (UnitCard), `stat_modifiers` with `source: 'injury'` or `source: 'destruction'` appear as red delta chips. Note: `stat_modifiers` do NOT appear individually on timeline entries (no `matchParticipantId` column on that table).

**AC28 — Dice results displayed on each selectable row:**
Given an InjuryBonusStep or UnitDestructionStep is displayed,
When the options render,
Then each row shows the dice result prefix (e.g. "2 — Mort", "4-7 — Blessure Grave", "9-10 — Survivants Endurcis") to help the player match their paper dice roll to the correct option.
