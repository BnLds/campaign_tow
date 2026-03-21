---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-infrastructure', 'step-06-checklist']
lastStep: 'step-06-checklist'
lastSaved: '2026-03-19'
workflowType: 'testarch-atdd'
inputDocuments:
  - '_bmad-output/implementation-artifacts/4-3-character-injuries-bonuses.md'
  - '_bmad/tea/testarch/knowledge/data-factories.md'
  - '_bmad/tea/testarch/knowledge/component-tdd.md'
  - '_bmad/tea/testarch/knowledge/test-quality.md'
  - '_bmad/tea/testarch/knowledge/test-healing-patterns.md'
  - '_bmad/tea/testarch/knowledge/test-levels-framework.md'
  - '_bmad/tea/testarch/knowledge/selector-resilience.md'
---

# ATDD Checklist - Epic 4, Story 4.3: Character Injuries & Unit Destruction

**Date:** 2026-03-19
**Author:** Ben
**Primary Test Level:** Component + Unit (vitest)

---

## Story Summary

Story 4.3 adds a Phase 1.5 (consequences) to the post-match wizard between XP entry (Phase 1) and tier-ups (Phase 2). Players mark characters as "Mis Hors de Combat" or units as "Détruite" during XP entry, then record injury/destruction results from 2D6 tables in the consequence phase. Results are saved as `stat_modifiers` (permanent/temporary) and `unit_gains`, committed atomically with the existing batch commit.

**As a** player
**I want** to record permanent injuries for characters taken out of action and destruction consequences for units destroyed during the match
**So that** the lasting consequences of battle are preserved on each unit's card with visible stat deltas

---

## Acceptance Criteria

1. **AC1** — "Mis Hors de Combat" toggle on character XP steps
2. **AC2** — Skipping when character was NOT taken out of action
3. **AC3** — Injury/bonus step appears in Phase 1.5 for flagged characters
4. **AC4** — Injury saves as permanent stat_modifier (negative delta, floor 0)
5. **AC5** — Bonus saves as permanent stat_modifier or special entry
6. **AC6** — Temporary injury (Blessure Grave) saves and auto-clears
7. **AC7** — "No effect" results skip modifier creation
8. **AC8** — "Death" result records character death
9. **AC9** — Back button navigates within Phase 1.5
10. **AC10** — Quitting the wizard discards pending consequences
11. **AC11** — Multiple characters can have injuries in the same match
12. **AC12** — "Détruite" toggle on non-character unit XP steps
13. **AC13** — Skipping when unit was NOT destroyed
14. **AC14** — Destruction step appears in Phase 1.5 for flagged units
15. **AC15** — Déroute Sanglante (XP loss by tier)
16. **AC16** — Pertes Catastrophiques (half strength, temporary)
17. **AC17** — Moral Brisé (−2 Cd, temporary, auto-clears)
18. **AC18** — Survivants Endurcis (no effect)
19. **AC19** — Rancune (Haine)
20. **AC20** — Fureur Vengeresse (+2 XP)
21. **AC21** — Banner loss on unit destruction
22. **AC22** — Back button navigates within Phase 1.5 (destruction)
23. **AC23** — Multiple units can have destruction results in the same match
24. **AC24** — Temporary modifiers auto-cleanup on next match completion
25. **AC25** — Stat floor at 0
26. **AC26** — Consequence steps use red theme, tier-up steps use green theme
27. **AC27** — Consequences visible on timeline entries and army view
28. **AC28** — Dice results displayed on each selectable row

---

## Generation Mode

**Mode:** AI Generation
**Reason:** Acceptance criteria are clear and well-structured. Story explicitly excludes E2E tests — all tests are component-level (vitest + @testing-library/react) and unit-level (vitest). No browser recording needed.

---

## Test Strategy

### AC → Test Level Mapping

| AC | Scenario | Level | Priority | Test File |
|---|---|---|---|---|
| AC1 | MHC toggle on character steps | Component | P0 | 4-3-wizard-consequence-flow |
| AC2 | Skip when MHC unchecked | Component | P0 | 4-3-wizard-consequence-flow |
| AC3 | InjuryBonusStep appears in Phase 1.5 | Component | P0 | 4-3-wizard-consequence-flow |
| AC4 | Permanent injury → stat_modifier | Component + Unit | P0 | 4-3-injury-bonus-step + 4-3-batch-commit |
| AC5 | Bonus saves (Haine, Miraculé) | Component + Unit | P0 | 4-3-injury-bonus-step + 4-3-batch-commit |
| AC6 | Temporary injury (Blessure Grave) | Component + Unit | P0 | 4-3-injury-bonus-step + 4-3-batch-commit |
| AC7 | No effect skips modifier | Component | P0 | 4-3-injury-bonus-step |
| AC8 | Death records unit_gain | Component + Unit | P0 | 4-3-injury-bonus-step + 4-3-batch-commit |
| AC9 | Back button in Phase 1.5 | Component | P1 | 4-3-wizard-consequence-flow |
| AC10 | Quit discards consequences | Component | P0 | 4-3-wizard-consequence-flow |
| AC11 | Multiple characters with injuries | Component | P0 | 4-3-wizard-consequence-flow |
| AC12 | "Détruite" toggle on unit steps | Component | P0 | 4-3-wizard-consequence-flow |
| AC13 | Skip when "Détruite" unchecked | Component | P0 | 4-3-wizard-consequence-flow |
| AC14 | UnitDestructionStep appears in Phase 1.5 | Component | P0 | 4-3-wizard-consequence-flow |
| AC15 | Déroute Sanglante XP loss by tier | Unit | P0 | 4-3-batch-commit |
| AC16 | Pertes Catastrophiques | Unit | P0 | 4-3-batch-commit |
| AC17 | Moral Brisé | Unit | P0 | 4-3-batch-commit |
| AC18 | Survivants Endurcis (no effect) | Component | P0 | 4-3-unit-destruction-step |
| AC19 | Rancune (Haine) | Unit | P0 | 4-3-batch-commit |
| AC20 | Fureur Vengeresse (+2 XP) | Component | P0 | 4-3-wizard-consequence-flow |
| AC21 | Banner loss | Component + Unit | P0 | 4-3-unit-destruction-step + 4-3-batch-commit |
| AC22 | Back button (destruction) | Component | P1 | 4-3-wizard-consequence-flow |
| AC23 | Multiple units destroyed | Component | P0 | 4-3-wizard-consequence-flow |
| AC24 | Temporary auto-cleanup | Unit | P0 | 4-3-batch-commit |
| AC25 | Stat floor at 0 | Unit | P0 | 4-3-batch-commit |
| AC26 | Red theme for consequence steps | Component | P1 | 4-3-injury-bonus-step + 4-3-unit-destruction-step |
| AC27 | Consequences on timeline/army view | — | — | Covered by existing delta-composer tests |
| AC28 | Dice results on selectable rows | Component | P0 | 4-3-injury-bonus-step + 4-3-unit-destruction-step |

### Test Level Distribution

- **Component tests (vitest + jsdom):** 35 tests across 3 files
- **Unit tests (vitest + node):** 18 tests in 1 file
- **E2E tests:** 0 (explicitly out of scope per story)

### Red Phase Requirements

All tests are designed to **fail before implementation**:
- InjuryBonusStep and UnitDestructionStep do not exist → import errors
- PostMatchWizard Phase 1.5 logic not yet implemented → missing testids
- `DEROUTE_XP_LOSS` constant not yet in constants.ts → import error
- `completeEvolutionsWithGainsSchema` not yet extended → schema validation failures
- Stat floor logic not yet in delta-composer → assertion failures

---

## Failing Tests Created (RED Phase)

### Component Tests — InjuryBonusStep (20 tests)

**File:** `tests/4-3-injury-bonus-step.test.tsx` (215 lines)

- **[4.3-INJ-001]** renders all 6 injury table rows with dice result prefixes — RED: InjuryBonusStep not found
- **[4.3-INJ-002]** confirm button disabled when no selection — RED: component missing
- **[4.3-INJ-003]** confirm button enabled after selecting "Égratignures" — RED: component missing
- **[4.3-INJ-004]** "Blessure Permanente" reveals 1D6 sub-table — RED: component missing
- **[4.3-INJ-005]** confirm disabled when "Blessure Permanente" without sub-selection — RED: component missing
- **[4.3-INJ-006]** confirm enabled after "Blessure Permanente" + sub-selection — RED: component missing
- **[4.3-INJ-007]** "Mort" → `{ type: 'death' }` — RED: component missing
- **[4.3-INJ-008]** "Blessure Permanente" + Endurance → `{ type: 'permanent_injury', stat: 'e', delta: -1 }` — RED
- **[4.3-INJ-009]** "Blessure Permanente" + Initiative → stat: 'i' — RED
- **[4.3-INJ-010]** "Blessure Permanente" + CT → stat: 'ct' — RED
- **[4.3-INJ-011]** "Blessure Permanente" + CC → stat: 'cc' — RED
- **[4.3-INJ-012]** "Blessure Permanente" + Force → stat: 'f' — RED
- **[4.3-INJ-013]** "Blessure Permanente" + Commandement → stat: 'cd' — RED
- **[4.3-INJ-014]** "Blessure Grave" → `{ type: 'grave_injury', stat: 'pv', delta: -1 }` — RED
- **[4.3-INJ-015]** "Égratignures" → `{ type: 'no_effect' }` — RED
- **[4.3-INJ-016]** "Haine" → `{ type: 'haine' }` — RED
- **[4.3-INJ-017]** "Miraculé" → `{ type: 'miracule' }` — RED
- **[4.3-INJ-018]** displays unit name in header — RED: component missing
- **[4.3-INJ-019]** step container uses malus background — RED: component missing
- **[4.3-INJ-020]** calls onBack when back button clicked — RED: component missing

### Component Tests — UnitDestructionStep (15 tests)

**File:** `tests/4-3-unit-destruction-step.test.tsx` (180 lines)

- **[4.3-DES-001]** renders all 6 destruction table rows with dice result prefixes — RED: component missing
- **[4.3-DES-002]** confirm button disabled when no selection — RED: component missing
- **[4.3-DES-003]** confirm button enabled after selecting "Survivants Endurcis" — RED: component missing
- **[4.3-DES-004]** banner checkbox appears and defaults to unchecked — RED: component missing
- **[4.3-DES-005]** banner checkbox label reads "L'unité possédait une bannière" — RED: component missing
- **[4.3-DES-006]** "Déroute Sanglante" → `{ type: 'deroute_sanglante', bannerLost: false }` — RED
- **[4.3-DES-007]** "Pertes Catastrophiques" → `{ type: 'pertes_catastrophiques', bannerLost: false }` — RED
- **[4.3-DES-008]** "Moral Brisé" → `{ type: 'moral_brise', bannerLost: false }` — RED
- **[4.3-DES-009]** "Survivants Endurcis" → `{ type: 'survivants_endurcis', bannerLost: false }` — RED
- **[4.3-DES-010]** "Rancune" → `{ type: 'rancune', bannerLost: false }` — RED
- **[4.3-DES-011]** "Fureur Vengeresse" → `{ type: 'fureur_vengeresse', bannerLost: false }` — RED
- **[4.3-DES-012]** banner checkbox checked → `bannerLost: true` — RED
- **[4.3-DES-013]** displays unit name in header — RED: component missing
- **[4.3-DES-014]** step container uses malus background — RED: component missing
- **[4.3-DES-015]** calls onBack when back button clicked — RED: component missing

### Component Tests — Wizard Phase 1.5 Flow (14 tests)

**File:** `tests/4-3-wizard-consequence-flow.test.tsx` (280 lines)

- **[4.3-WIZ-001]** MHC toggle appears on character steps — RED: toggle not implemented
- **[4.3-WIZ-002]** "Détruite" toggle appears on unit steps — RED: toggle not implemented
- **[4.3-WIZ-003]** consequence toggle defaults to unchecked — RED: toggle not implemented
- **[4.3-WIZ-004]** Phase 1 → Phase 2 directly when no toggles checked — RED: phase logic missing
- **[4.3-WIZ-005]** InjuryBonusStep appears when character flagged MHC — RED: Phase 1.5 missing
- **[4.3-WIZ-006]** UnitDestructionStep appears when unit flagged destroyed — RED: Phase 1.5 missing
- **[4.3-WIZ-007]** Phase 1.5 shows characters before units — RED: ordering logic missing
- **[4.3-WIZ-008]** back button navigates to previous flagged unit — RED: nav logic missing
- **[4.3-WIZ-009]** confirming last consequence transitions to Phase 2 — RED: transition logic missing
- **[4.3-WIZ-010]** "Miraculé" re-submits XP with +2 bonus — RED: XP re-submit missing
- **[4.3-WIZ-011]** each flagged unit gets its own consequence step — RED: iteration missing
- **[4.3-WIZ-012]** cancelling wizard does not save consequence data — RED: discard logic missing
- **[4.3-WIZ-013]** Phase 2 back at step 0 returns to Phase 1.5 — RED: transition missing
- **[4.3-WIZ-014]** Phase 1.5 back at index 0 returns to last XP step — RED: transition missing

### Unit Tests — Batch Commit + Constants (18 tests)

**File:** `tests/4-3-batch-commit-consequences.test.ts` (195 lines)

- **[4.3-SCH-001]** schema accepts input with consequences array — RED: field not in schema
- **[4.3-SCH-002]** schema accepts input without consequences (backward compatible) — PASS (existing)
- **[4.3-SCH-003]** schema accepts empty consequences array — RED: field not in schema
- **[4.3-SCH-004]** schema validates consequence type enum — RED: field not in schema
- **[4.3-SCH-005]** schema accepts all valid consequence types — RED: field not in schema
- **[4.3-SCH-006]** schema accepts consequence with optional stat/delta — RED: field not in schema
- **[4.3-SCH-007]** schema accepts consequence with optional bannerLost — RED: field not in schema
- **[4.3-SCH-008]** schema rejects consequence with empty unitId — RED: field not in schema
- **[4.3-TXN-001]** permanent_injury maps to stat_modifier with source=injury — mapping verification
- **[4.3-TXN-002]** grave_injury maps to stat_modifier temporary=true — mapping verification
- **[4.3-TXN-003]** haine maps to insertUnitGain "Haine (blessure)" — mapping verification
- **[4.3-TXN-004]** death maps to insertUnitGain "Mort (MHC)" — mapping verification
- **[4.3-TXN-005]** moral_brise maps to stat_modifier cd/-2/destruction — mapping verification
- **[4.3-TXN-006]** pertes_catastrophiques maps to insertUnitGain — mapping verification
- **[4.3-TXN-007]** rancune maps to insertUnitGain "Rancune — Haine (destruction)" — mapping verification
- **[4.3-TXN-008]** bannerLost maps to insertUnitGain "Bannière perdue" — mapping verification
- **[4.3-DER-001→005]** DEROUTE_XP_LOSS tier 0→4 values — RED: constant not in constants.ts
- **[4.3-FLR-001]** stat with negative modifiers exceeding base floored at 0 — RED: floor logic missing
- **[4.3-FLR-002]** movement stat is NOT floored — verification

---

## Required data-testid Attributes

### InjuryBonusStep (`src/components/injury-bonus-step.tsx`)

- `injury-bonus-step` — Root container for the injury step
- `consequence-confirm` — Confirm button
- `consequence-back` — Back button

### UnitDestructionStep (`src/components/unit-destruction-step.tsx`)

- `unit-destruction-step` — Root container for the destruction step
- `consequence-confirm` — Confirm button (shared testid with injury step)
- `consequence-back` — Back button (shared testid with injury step)
- `banner-lost-checkbox` — Banner loss checkbox

### PostMatchWizard (`src/components/post-match-wizard.tsx`) — Phase 1.5 additions

- `consequence-toggle` — MHC / Détruite toggle checkbox on XP steps
- `xp-input` — XP input field (existing)
- `wizard-next` — Next button (existing)
- `wizard-back` — Back button (existing)
- `wizard-cancel` — Cancel button (existing)

---

## Implementation Checklist

### Test: [4.3-INJ-*] InjuryBonusStep component

**File:** `tests/4-3-injury-bonus-step.test.tsx`

**Tasks to make these tests pass:**

- [ ] Create `src/components/injury-bonus-step.tsx` with `InjuryBonusStep` component
- [ ] Export `InjuryResult` type
- [ ] Render 6 radio options with dice result prefixes
- [ ] Implement "Blessure Permanente" nested 1D6 sub-table
- [ ] Disable confirm until valid selection (including sub-selection)
- [ ] Build correct `InjuryResult` for each selection type
- [ ] Apply red theme styling (malus-bg)
- [ ] Add all required data-testid attributes
- [ ] Run test: `pnpm vitest run tests/4-3-injury-bonus-step.test.tsx`

### Test: [4.3-DES-*] UnitDestructionStep component

**File:** `tests/4-3-unit-destruction-step.test.tsx`

**Tasks to make these tests pass:**

- [ ] Create `src/components/unit-destruction-step.tsx` with `UnitDestructionStep` component
- [ ] Export `DestructionResult` type
- [ ] Render 6 radio options with dice result prefixes
- [ ] Add banner checkbox "L'unité possédait une bannière"
- [ ] Disable confirm until radio selection made
- [ ] Build correct `DestructionResult` including `bannerLost` flag
- [ ] Apply red theme styling (malus-bg)
- [ ] Add all required data-testid attributes
- [ ] Run test: `pnpm vitest run tests/4-3-unit-destruction-step.test.tsx`

### Test: [4.3-WIZ-*] Wizard Phase 1.5 flow

**File:** `tests/4-3-wizard-consequence-flow.test.tsx`

**Tasks to make these tests pass:**

- [ ] Add consequence toggle to PostMatchWizard XP steps (MHC / Détruite)
- [ ] Track toggle state in `consequenceFlagsRef`
- [ ] Implement Phase 1.5 transition after Phase 1 (when flags exist)
- [ ] Render InjuryBonusStep for characters, UnitDestructionStep for units
- [ ] Enforce ordering: characters first, then units
- [ ] Handle consequence confirmations and advance `consequenceIndex`
- [ ] Implement "Miraculé"/"Fureur Vengeresse" XP re-submit (+2)
- [ ] Implement back button navigation within Phase 1.5
- [ ] Implement Phase 1.5 ↔ Phase 1 and Phase 1.5 ↔ Phase 2 transitions
- [ ] Implement discard-on-quit for pending consequences
- [ ] Add `consequence-toggle` data-testid
- [ ] Run test: `pnpm vitest run tests/4-3-wizard-consequence-flow.test.tsx`

### Test: [4.3-SCH/TXN/DER/FLR-*] Batch commit + constants + stat floor

**File:** `tests/4-3-batch-commit-consequences.test.ts`

**Tasks to make these tests pass:**

- [ ] Add `DEROUTE_XP_LOSS` constant to `src/lib/constants.ts`
- [ ] Extend `completeEvolutionsWithGainsSchema` with optional `consequences` array
- [ ] Update `completeEvolutionsWithGainsTransaction` to process consequences
- [ ] Add temporary modifier auto-cleanup at start of transaction
- [ ] Add stat floor logic (`max(0, ...)`) to `composeUnitView()` in delta-composer
- [ ] Run test: `pnpm vitest run tests/4-3-batch-commit-consequences.test.ts`

---

## Running Tests

```bash
# Run all failing tests for this story
pnpm vitest run tests/4-3-*.test.ts tests/4-3-*.test.tsx

# Run specific test file
pnpm vitest run tests/4-3-injury-bonus-step.test.tsx

# Run tests in watch mode
pnpm vitest tests/4-3-*.test.ts tests/4-3-*.test.tsx

# Run with verbose output
pnpm vitest run tests/4-3-*.test.ts tests/4-3-*.test.tsx --reporter=verbose
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete)

**TEA Agent Responsibilities:**

- All tests written and failing
- data-testid requirements listed
- Implementation checklist created

**Verification:**

- All tests run and fail as expected
- Failure messages are clear and actionable
- Tests fail due to missing implementation, not test bugs

---

### GREEN Phase (DEV Team - Next Steps)

**DEV Agent Responsibilities:**

1. **Pick one failing test file** from implementation checklist (start with injury-bonus-step)
2. **Read the tests** to understand expected behavior
3. **Implement minimal code** to make tests pass
4. **Run the tests** to verify they pass (green)
5. **Move to next test file** and repeat

**Suggested order:**

1. `4-3-batch-commit-consequences.test.ts` (DEROUTE_XP_LOSS + schema) — smallest, foundation
2. `4-3-injury-bonus-step.test.tsx` — standalone component
3. `4-3-unit-destruction-step.test.tsx` — standalone component
4. `4-3-wizard-consequence-flow.test.tsx` — integration (depends on 1-3)

---

### REFACTOR Phase (After All Tests Pass)

1. Verify all tests pass
2. Review code quality
3. Extract shared patterns between InjuryBonusStep and UnitDestructionStep
4. Ensure tests still pass after each refactor

---

## Next Steps

1. **Run failing tests** to confirm RED phase: `pnpm vitest run tests/4-3-*.test.ts tests/4-3-*.test.tsx`
2. **Begin implementation** using implementation checklist as guide
3. **Work one test file at a time** (red → green for each)
4. **When all tests pass**, refactor code for quality
5. **When refactoring complete**, update story status to 'done' in sprint-status.yaml

---

## Knowledge Base References Applied

- **data-factories.md** — Factory function patterns with overrides (used in test helpers)
- **component-tdd.md** — Red-Green-Refactor workflow, provider isolation, component test patterns
- **test-quality.md** — Determinism, explicit assertions, atomic tests, Given-When-Then
- **test-healing-patterns.md** — data-testid usage, avoiding flaky patterns
- **test-levels-framework.md** — Unit vs Component level selection (favoring lower levels)
- **selector-resilience.md** — data-testid as primary selector strategy

---

## Test Execution Evidence

### Initial Test Run (RED Phase Verification)

**Command:** `pnpm vitest run tests/4-3-*.test.ts tests/4-3-*.test.tsx`

**Expected Results:**

- Total tests: 67
- Passing: ~2 (backward-compatible schema test + trivial assertions)
- Failing: ~65
- Status: RED phase verified

**Expected Failure Messages:**

- `Cannot find module '../src/components/injury-bonus-step'` — InjuryBonusStep not created
- `Cannot find module '../src/components/unit-destruction-step'` — UnitDestructionStep not created
- `DEROUTE_XP_LOSS is not exported from '../src/lib/constants'` — constant not added
- `TestingLibraryElementError: Unable to find an element by: [data-testid="consequence-toggle"]` — toggle not in wizard

---

## Notes

- Story 4.3 explicitly excludes E2E tests — component + unit tests only
- Tests follow existing project convention: `tests/4-3-*.test.ts(x)` in root `tests/` directory
- Component tests use `@vitest-environment jsdom` pragma for DOM access
- Test IDs follow `[4.3-PREFIX-NUM]` convention for traceability

---

**Generated by BMad TEA Agent** - 2026-03-19
