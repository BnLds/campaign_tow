---
title: 'Refactor PostMatchWizard — useReducer + composants par phase'
slug: 'refactor-post-match-wizard'
created: '2026-03-25'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['react 19', 'typescript', 'tanstack-start', 'vitest', 'react-testing-library']
files_to_modify:
  - 'src/components/post-match-wizard.tsx → src/components/post-match-wizard/index.tsx'
  - 'src/components/post-match-wizard/types.ts (new)'
  - 'src/components/post-match-wizard/reducer.ts (new)'
  - 'src/components/post-match-wizard/wizard-header.tsx (new)'
  - 'src/components/post-match-wizard/wizard-empty.tsx (new)'
  - 'src/components/post-match-wizard/phase-xp.tsx (new)'
  - 'src/components/post-match-wizard/phase-consequences.tsx (new)'
  - 'src/components/post-match-wizard/phase-tierup.tsx (new)'
code_patterns: ['useReducer', 'discriminated union state', 'phase-based wizard', 'callbacks over refs']
test_patterns:
  - 'vitest + react-testing-library (jsdom)'
  - 'data-testid selectors (40+ unique)'
  - 'onSubmitUnitXp / onCompleteEvolutions mock injection via props'
---

# Tech-Spec: Refactor PostMatchWizard — useReducer + composants par phase

**Created:** 2026-03-25

## Overview

### Problem Statement

`src/components/post-match-wizard.tsx` is a 1,560-line single component managing 3 sequential phases (XP entry, consequences, tier-ups) with 28 interleaved declarations (13 `useState` + 15 `useRef`), duplicated inline styles across render branches, and business logic (gains rollback, XP adjustments, constraint checks) mixed directly into JSX. This makes the component difficult to reason about, test in isolation, and extend safely.

### Solution

Extract a centralized `useReducer` with a discriminated union state (keyed by phase), split each phase into its own component file, and create a shared `WizardHeader` component for the duplicated back/progress/cancel bar.

### Scope

**In Scope:**
- Extract `useReducer` + typed actions for all phase transitions
- Split into per-phase components: `PhaseXp`, `PhaseConsequences`, `PhaseTierUp`
- Extract shared `WizardHeader` component (back, progress, cancel)
- Extract empty-army edge case into `WizardEmpty`
- Create shared `types.ts` for wizard state, actions, and shared types
- Adapt `data-testid` attributes as needed (test changes allowed)

**Out of Scope:**
- Modification of child sub-components (`TierUpStep`, `InjuryBonusStep`, `UnitDestructionStep`, `InitialConsequenceStep`)
- Functional behavior changes (same UX, same server calls, same transitions)
- Style system migration (inline styles stay for now)
- XState or other external state machine libraries
- E2E tests (no new or modified E2E tests)

## Context for Development

### Codebase Patterns

- React 19 + TypeScript with TanStack Start
- Inline styles throughout (no CSS modules or styled-components)
- `data-testid` attributes used extensively (40+ unique selectors across 3 unit test files)
- Dynamic imports for server functions (`import('../routes/match/$matchId/post-match')`) — 6 call sites in current file
- Refs used heavily to avoid unnecessary re-renders during wizard flow
- Test injection pattern: `onSubmitUnitXp` and `onCompleteEvolutions` optional props allow tests to bypass server calls

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/components/post-match-wizard.tsx` | Current monolithic component (1,560 lines) — source of truth for all behavior |
| `src/components/tier-up-step.tsx` | Phase 2 sub-component — unchanged |
| `src/components/injury-bonus-step.tsx` | Phase 1.5 sub-component (characters) — unchanged, exports `InjuryResult` |
| `src/components/unit-destruction-step.tsx` | Phase 1.5 sub-component (units) — unchanged, exports `DestructionResult` |
| `src/components/initial-consequence-step.tsx` | Phase 1 inline consequences (initial-xp mode) — unchanged, exports `InitialConsequenceItem` |
| `src/lib/xp-conditions.ts` | `getXpConditionsForType()`, `computeXpTotal()` — Phase 1 only |
| `src/lib/tier.ts` | `detectTierCrossings()`, `calculateTier()` — orchestrator transition logic |
| `src/lib/delta-composer.ts` | `parseGainStat()`, `STAT_CAP`, `UNCAPPED_STATS`, `CD_STAT` — Phase 2 constraint checks |
| `src/lib/constants.ts` | `ThresholdEntry`, `Improvement` types, `DEROUTE_XP_LOSS`, `CHARACTER_MINOR_IMPROVEMENTS` |
| `src/lib/validators.ts` | `ConsequenceEntry` type (Zod-inferred) |
| `src/lib/types.ts` | `ServerResult<T>` discriminated union |
| `src/routes/match/$matchId/post-match.tsx` | **Only production consumer** — imports via `'../../../components/post-match-wizard'` |

### Test Files

| File | Lines | Scope |
| ---- | ----- | ----- |
| `src/components/__tests__/post-match-wizard.test.tsx` | 1,849 | Phase 1 XP, back/cancel, initial-xp mode |
| `src/components/__tests__/post-match-wizard-tierup.test.tsx` | 854 | Phase 2 tier-ups, constraints, sub-flows |
| `tests/4-3-wizard-consequence-flow.test.tsx` | 435 | Phase 1.5 MHC/Détruite toggle, consequence flow |

All 3 test files import `PostMatchWizard` from relative path — import resolves correctly after directory move (`post-match-wizard` → `post-match-wizard/index.tsx`).

### Technical Decisions

- **Lightweight useReducer for phase transitions**: Reducer absorbs 5 of the 13 current `useState` calls: `phase` (implicit via discriminant), `currentStep`, `consequenceIndex`, `tierUpStep`, and `tierUpQueue`. The remaining 8 `useState` (`checkedConditions`, `isSubmitting`, `error`, `numericXpValue`, `bonusXp`, `showPreviousXpHint`, `isConsequenceChecked`, `isChampionKilledChecked`) become local state in each phase component. `initialConsequences` stays in the orchestrator as a `useState` (accumulates across XP steps — cannot be local to `PhaseXp` which resets via `key`). This keeps the reducer at ~80-100 lines and phase component props lean (~10 instead of ~18). Cross-mount state persistence is handled by existing refs in the orchestrator.
- **Refs stay in orchestrator, exposed via callbacks**: `xpResultsRef`, `pendingGainsRef`, `pendingConsequencesRef`, `cumulativeGainsRef`, `cumulativeHonourSelectionsRef` are intentionally refs (not reducer state) to avoid re-renders. They remain in the orchestrator (`index.tsx`); phase components receive typed callbacks (`onSubmitXp`, `onRecordConsequence`, `onRecordGain`) instead of raw refs. This keeps mutation encapsulated and phase APIs clean.
- **No external dependencies**: Pure React patterns only (useReducer + components). No XState, no new libraries.
- **Directory structure**: New `src/components/post-match-wizard/` directory with barrel `index.tsx` re-exporting `PostMatchWizard` and `PostMatchWizardProps` to preserve import paths.
- **`expandQueueEntry`**: Pure function — moves to `phase-tierup.tsx` (sole consumer).
- **`buildConsequencesArray` / `buildChampionKilledIds`**: Cross-phase ref readers — stay in orchestrator.
- **Dynamic imports consolidated**: 6 duplicate `import('../routes/match/$matchId/post-match')` sites → 1 helper in orchestrator, results passed via callbacks.
- **Import path preservation**: `src/components/post-match-wizard` resolves to `src/components/post-match-wizard/index.tsx` — production and test imports unchanged.

## Implementation Plan

### Tasks

- [x] Task 1: Create directory structure and `types.ts`
  - File: `src/components/post-match-wizard/types.ts` (new)
  - Action: Create the shared types file containing:
    - Move `PostMatchWizardProps` from current file (keep exact same shape)
    - Move `TierUpQueueEntry` (internal, extends `ThresholdEntry`)
    - Move `FlaggedUnit` type
    - Define `WizardPhase = 'xp' | 'consequences' | 'tierup'`
    - Define `WizardUnit` type alias for the inline `units` array element type (extracted from `PostMatchWizardProps['units'][number]`)
    - Re-export needed types from dependencies (`InjuryResult`, `DestructionResult`, `InitialConsequenceItem`, `ConsequenceEntry`, `ServerResult`)
  - Notes: No behavior change. Just type extraction. Verify `tsc --noEmit` passes.

- [x] Task 2: Create `reducer.ts` — lightweight phase-transition reducer
  - File: `src/components/post-match-wizard/reducer.ts` (new)
  - Action: Define a lightweight reducer for phase transitions only. UI state (`checkedConditions`, `isSubmitting`, `error`, `numericXpValue`, `bonusXp`, etc.) is managed locally by each phase component via `useState`.
    - `WizardState` discriminated union (phase navigation only):
      ```
      | { phase: 'xp'; currentStep: number }
      | { phase: 'consequences'; consequenceIndex: number }
      | { phase: 'tierup'; tierUpQueue: TierUpQueueEntry[]; tierUpStep: number }
      | { phase: 'complete' }
      ```
      The `phase` field replaces the former `useState<'xp' | 'consequences' | 'tierup'>` — it is now implicit via the discriminant. The `complete` variant is a terminal state: the orchestrator checks `state.phase === 'complete'` after each dispatch and calls `onCompleteEvolutions` when reached. This avoids side-effects inside the reducer.
    - `WizardAction` union (~12 actions, phase transitions only):
      `NEXT_XP_STEP`, `PREV_XP_STEP`, `ENTER_CONSEQUENCES`, `NEXT_CONSEQUENCE`, `PREV_CONSEQUENCE`, `BACK_TO_XP`, `ENTER_TIERUP`, `NEXT_TIERUP_STEP`, `PREV_TIERUP_STEP`, `BACK_TO_CONSEQUENCES`, `INSERT_TIERUP_SUBSTEPS`, `COMPLETE`
      - `ENTER_TIERUP` payload: `{ type: 'ENTER_TIERUP'; queue: TierUpQueueEntry[] }` — the orchestrator builds the queue (via `detectTierCrossings`) and passes it in. If `queue` is empty, the reducer returns `{ phase: 'complete' }`.
      - `ENTER_CONSEQUENCES` payload: `{ type: 'ENTER_CONSEQUENCES'; startIndex: number }` — orchestrator provides starting consequence index.
      - `INSERT_TIERUP_SUBSTEPS` payload: `{ type: 'INSERT_TIERUP_SUBSTEPS'; entries: TierUpQueueEntry[]; afterIndex: number }` — splices new entries into the queue.
    - `wizardReducer` function with exhaustive switch (~80-100 lines)
    - `initialWizardState(): WizardState` factory (returns `{ phase: 'xp', currentStep: 0 }`)
  - Notes: Pure function, fully unit-testable. **useState migration map:** `phase` → absorbed into discriminant; `currentStep` / `consequenceIndex` / `tierUpQueue` / `tierUpStep` → reducer fields. `initialConsequences` → stays as orchestrator `useState` (cross-step accumulation). `checkedConditions` / `numericXpValue` / `bonusXp` / `showPreviousXpHint` / `isConsequenceChecked` / `isChampionKilledChecked` → local `useState` in `PhaseXp`. `isSubmitting` / `error` → local `useState` in each phase component. The `submittingRef` stays in orchestrator (ref-based synchronous guard).

- [x] Task 3: Create `wizard-header.tsx`
  - File: `src/components/post-match-wizard/wizard-header.tsx` (new)
  - Action: Extract the duplicated header bar (back button + progress label + cancel button) into a shared component:
    ```tsx
    type WizardHeaderProps = {
      onBack?: () => void    // undefined = hide back button
      onCancel: () => void
      progressLabel: string  // e.g. "Unité 1 / 3" or "Amélioration 2 / 5"
      backAriaLabel?: string // defaults to "Étape précédente"
      modeHeader?: string    // optional sub-header (e.g. "XP initiale" in initial-xp mode)
    }
    ```
  - Notes: Preserves `data-testid="wizard-back-button"`, `data-testid="wizard-cancel-button"`, `data-testid="wizard-progress"`, `data-testid="wizard-mode-header"`. Same inline styles as current code.

- [x] Task 4: Create `wizard-empty.tsx`
  - File: `src/components/post-match-wizard/wizard-empty.tsx` (new)
  - Action: Extract the `units.length === 0` early-return branch (lines 198-236 of current file) into:
    ```tsx
    type WizardEmptyProps = {
      onRetour: () => Promise<void>  // orchestrator handles dynamic import + server call
      isSubmitting: boolean
      error: string | null
    }
    ```
  - Notes: `WizardEmpty` does NOT do its own dynamic import — consistent with the "dynamic imports centralized in orchestrator" decision. The orchestrator builds the `onRetour` callback using `getPostMatchServerFns()` and handles the `onCompleteEvolutions` fallback logic. `WizardEmpty` only renders the UI and calls `onRetour` on click.

- [x] Task 5: Create `phase-xp.tsx`
  - File: `src/components/post-match-wizard/phase-xp.tsx` (new)
  - Action: Extract the Phase 1 render block (current lines 1049-1558) and its local logic into a `PhaseXp` component.
    - **Props from orchestrator (~10):**
      - `unit: WizardUnit` (current unit)
      - `currentStep: number`, `total: number`
      - `mode: 'post-match' | 'initial-xp'`
      - `catchupBonusXp?: number`, `catchupDeltaXp?: number`
      - `onNext: (xpData: { checkedConditions: Set<string>; numericXpValue: number; bonusXp: number; isConsequenceChecked: boolean; isChampionKilledChecked: boolean }) => Promise<void>`
      - `onBack: () => void`, `onCancel: () => void`
      - `initialConsequences`, `campaignPlayers`, `onAddInitialConsequence`, `onRemoveInitialConsequence` (initial-xp mode — `initialConsequences` is owned by orchestrator `useState`, passed as read-only prop)
    - **Local `useState` (managed internally):**
      - `checkedConditions: Set<string>` — checkbox state, pre-filled from `unit.previousXpGained` on mount
      - `numericXpValue: number` — numeric input for initial-xp mode
      - `bonusXp: number` — catchup bonus stepper (init from `catchupBonusXp` prop)
      - `showPreviousXpHint: boolean` — derived from `unit.previousXpGained` on mount
      - `isConsequenceChecked: boolean` — MHC/Détruite toggle
      - `isChampionKilledChecked: boolean` — champion killed toggle
      - `isSubmitting: boolean`, `error: string | null` — async submit state
    - **Key behavior:** `onNext` returns a `Promise<void>`. `PhaseXp` sets `isSubmitting = true`, awaits the promise, and catches errors to set `error`. The orchestrator's `handleNext` performs the server call, updates refs, and dispatches the reducer action — the returned promise resolves on success or rejects with an error message.
    - **`initialConsequences` is NOT local to `PhaseXp`**: It accumulates across XP steps (initial-xp mode) and would be destroyed by the `key` reset pattern. It stays as orchestrator `useState` with `initialConsequencesRef` sync. `PhaseXp` receives it as a read-only prop and mutates it via `onAddInitialConsequence` / `onRemoveInitialConsequence` callbacks.
  - Notes: Uses `WizardHeader` internally. Keeps `getXpConditionsForType`/`computeXpTotal` imports. `InitialConsequenceStep` is rendered inside `PhaseXp` (not in `PhaseConsequences`) — it is an inline sub-step of the XP phase in initial-xp mode. All `data-testid` values preserved. Component keyed on `currentStep` by orchestrator to reset per-step local state (but not cross-step state like `initialConsequences`).

- [x] Task 6: Create `phase-consequences.tsx`
  - File: `src/components/post-match-wizard/phase-consequences.tsx` (new)
  - Action: Extract the Phase 1.5 render block (current lines 950-1043) into a `PhaseConsequences` component. Props:
    - `flaggedUnit: FlaggedUnit`
    - `consequenceIndex: number`, `totalConsequences: number`
    - `onConfirm: (result: InjuryResult | DestructionResult) => void`
    - `onBack: () => void`, `onCancel: () => void`
  - Notes: Uses `WizardHeader`. Renders `InjuryBonusStep` or `UnitDestructionStep` based on `flaggedUnit.type`. **Does NOT render `InitialConsequenceStep`** — that is an inline sub-step of `PhaseXp` in initial-xp mode, not part of the post-match consequence flow. Key on `consequenceIndex` for state reset. All `data-testid` values preserved.

- [x] Task 7: Create `phase-tierup.tsx`
  - File: `src/components/post-match-wizard/phase-tierup.tsx` (new)
  - Action: Extract the Phase 2 render block (current lines 686-944) into a `PhaseTierUp` component.
    - **Props from orchestrator:**
      - `currentTierUp: TierUpQueueEntry`
      - `tierUpStep: number`, `totalTierUps: number`
      - `isLastStep: boolean`
      - `units: WizardUnit[]` (for existingGains + effectiveStats lookups)
      - `cumulativeHonourSelections: Map<string, Set<string>>`
      - `cumulativeGains: Map<string, string[]>`
      - `onConfirm: (result: { descriptions: string[] }) => Promise<void>`
      - `onBack: () => void`, `onCancel: () => void`
    - **Local `useState` (managed internally):**
      - `isSubmitting: boolean`, `error: string | null` — async submit state
    - Move `expandQueueEntry` function into this file (not exported — internal helper).
  - Notes: All disabled-ID constraint logic (Mouvement 1x, PV 2x char, Attaque 1x, Endurance 1x unit, Commandement cap) stays in this component. Uses `parseGainStat`, `STAT_CAP`, `UNCAPPED_STATS`, `CD_STAT` from `delta-composer`. Uses `WizardHeader`. Keyed on `tierUpStep` by orchestrator for `TierUpStep` state reset. `onConfirm` returns a Promise — component manages `isSubmitting`/`error` locally based on resolution/rejection.

- [x] Task 8: Create orchestrator `index.tsx` and wire everything
  - File: `src/components/post-match-wizard/index.tsx` (new)
  - Action: Replace `src/components/post-match-wizard.tsx` with directory-based module:
    1. Delete old `src/components/post-match-wizard.tsx`
    2. Create `index.tsx` that:
       - Exports `PostMatchWizard` function and `PostMatchWizardProps` type
       - Uses `useReducer(wizardReducer, initialWizardState())`
       - Keeps `initialConsequences` as orchestrator `useState` (cross-step accumulation in initial-xp mode) + `initialConsequencesRef` + `nextLocalIdRef` for sync
       - Keeps all `useRef` declarations (`xpResultsRef`, `pendingGainsRef`, `pendingConsequencesRef`, `cumulativeGainsRef`, `cumulativeHonourSelectionsRef`, `submittingRef`, `submittedUnitsRef`, `submittedXpByStep`, `submittedTierUpsByStepRef`, `initialConsequencesRef`, `nextLocalIdRef`, `consequenceFlagsRef`, `championFlagsRef`, `flaggedUnitsRef`)
       - Keeps `buildConsequencesArray()` and `buildChampionKilledIds()` helpers
       - Keeps `transitionToPhase2OrComplete()` logic
       - Keeps `handleNext()` async logic (server call + dispatch)
       - Keeps `handleConsequenceConfirm()` async logic (XP adjustments + dispatch)
       - Keeps `handleTierUpConfirm()` async logic (gain accumulation + server batch commit + dispatch)
       - Centralizes dynamic import: `const getServerFns = () => import('../../routes/match/$matchId/post-match')`
       - Renders: `<WizardEmpty>` if no units, else switch on `state.phase` → `<PhaseXp>`, `<PhaseConsequences>`, `<PhaseTierUp>`
       - Keys phase components on step index (`key={state.currentStep}` for PhaseXp) so local `useState` resets on navigation
    3. Pass `cumulativeHonourSelections` and `cumulativeGains` as deep-copied snapshots to `PhaseTierUp` on each render — these are ref-based but PhaseTierUp needs them for constraint display. **Deep copy required:** `new Map([...ref.current].map(([k, v]) => [k, new Set(v)]))` for `cumulativeHonourSelections` (values are `Set<string>`), and `new Map([...ref.current].map(([k, v]) => [k, [...v]]))` for `cumulativeGains` (values are `string[]`). A shallow `new Map(ref)` would share mutable inner collections.
    4. `handleNext` receives `xpData` from `PhaseXp.onNext()`, performs server call, updates refs, dispatches `NEXT_XP_STEP` or `ENTER_CONSEQUENCES`/`ENTER_TIERUP`. Returns a Promise so PhaseXp can manage its own `isSubmitting`/`error`.
    5. `handleTierUpConfirm` receives `{ descriptions }` from `PhaseTierUp.onConfirm()`, accumulates gains in refs, dispatches `NEXT_TIERUP_STEP` or calls `onCompleteEvolutions`. Returns a Promise for same pattern.
    6. `useEffect` hooks for syncing per-step UI state (checkbox reset, numeric value reset) on step change are no longer needed — `PhaseXp` manages its own state and resets via `key` prop. **However**, any state that accumulates across steps (e.g. `initialConsequences`) must NOT be local to a keyed component — it stays in the orchestrator. Before removing a `useEffect`, verify whether it performs per-step reset (safe to remove — `key` handles it) or cross-step persistence/sync (must stay or be replaced by orchestrator state).
  - Notes: This is the largest task. The orchestrator is the only file that knows about refs and server calls. Phase components are pure render + callbacks. The `key` pattern replaces per-step `useEffect` syncing, but cross-step state (`initialConsequences`, `initialConsequencesRef`) remains in the orchestrator.

- [x] Task 9: Update test import paths
  - Files:
    - `src/components/__tests__/post-match-wizard.test.tsx`
    - `src/components/__tests__/post-match-wizard-tierup.test.tsx`
    - `tests/4-3-wizard-consequence-flow.test.tsx`
  - Action: Verify imports resolve. `from '../post-match-wizard'` should auto-resolve to `../post-match-wizard/index.tsx`. If not, update imports. Run full test suite: `pnpm vitest run --reporter=verbose` — all existing tests must pass with zero behavior change.
  - Notes: No test logic changes. Pure import path verification.

- [x] Task 10: Add unit tests for `reducer.ts`
  - File: `src/components/post-match-wizard/__tests__/reducer.test.ts` (new)
  - Action: Test the reducer function in isolation:
    - Test `initialWizardState` factory returns correct defaults
    - Test each action type produces expected state transitions
    - Test phase transitions: `xp → consequences`, `xp → tierup`, `consequences → tierup`, back transitions
    - Test `ENTER_TIERUP` with empty queue returns `{ phase: 'complete' }` (terminal state — orchestrator reacts to this, no side-effect in reducer)
    - Test `INSERT_TIERUP_SUBSTEPS` splices queue correctly
  - Notes: Pure function tests — no React rendering needed. Fast and stable.

- [x] Task 11: Cleanup and verify
  - Action:
    1. Delete `src/components/post-match-wizard.tsx` (old monolithic file)
    2. Run `pnpm typecheck` — zero errors
    3. Run `pnpm vitest run` — all tests pass
    4. Run `pnpm lint` — no new violations
    5. Verify production import in `src/routes/match/$matchId/post-match.tsx` resolves correctly
  - Notes: Final validation. If any test fails, the incremental approach (Tasks 1-8) should make the failing point easy to isolate.

### Acceptance Criteria

- [x] AC1: Given the old `src/components/post-match-wizard.tsx` is replaced by `src/components/post-match-wizard/index.tsx`, when `src/routes/match/$matchId/post-match.tsx` imports `PostMatchWizard`, then the import resolves without changes to the route file.

- [x] AC2: Given the refactored wizard, when the 3 existing unit test files run (`pnpm vitest run`), then all tests pass with zero behavior change. Allowed test modifications: import path updates and minor timing adjustments (`waitFor` / `findBy` tweaks) if the `useReducer` dispatch changes render timing. No test logic or assertion changes.

- [x] AC3: Given the lightweight `wizardReducer` function (~12 actions, phase transitions only), when each action type is dispatched, then the state transitions match the original `useState`/`setPhase` behavior exactly (verified by reducer unit tests).

- [x] AC4: Given a Phase 1 XP flow with multiple units, when the user clicks Next on each unit, then `onSubmitUnitXp` is called with correct arguments and the wizard advances — same behavior as before refactor.

- [x] AC5: Given a Phase 1.5 consequence flow (MHC/Détruite flagged), when the user confirms each consequence, then XP adjustments (miracule/fureur +2, deroute loss) are applied and `pendingConsequencesRef` is updated — same behavior as before.

- [x] AC6: Given a Phase 2 tier-up flow, when the user selects improvements and confirms, then gains accumulate in `pendingGainsRef` and the final "Terminer" step calls `onCompleteEvolutions` with all gains + consequences — same behavior as before.

- [x] AC7: Given the back button in any phase, when clicked, then the wizard navigates to the correct previous step/phase with proper state rollback (XP result cleanup, cumulative gains rollback) — same behavior as before.

- [x] AC8: Given `WizardHeader` is used across all 3 phases, when rendered, then it displays `data-testid="wizard-back-button"`, `data-testid="wizard-cancel-button"`, and `data-testid="wizard-progress"` — preserving test selectors.

- [x] AC9: Given the refactored codebase, when `pnpm typecheck` runs, then zero TypeScript errors are reported.

- [x] AC10: Given the refactored codebase, when `pnpm lint` runs, then no new lint violations are introduced.

- [x] AC11: Given the reducer unit tests in `reducer.test.ts`, when run, then all phase transitions, edge cases (empty queue, back from first step), and action types are covered.

## Additional Context

### Dependencies

No new dependencies. Pure refactor using existing React APIs (`useReducer`, `useRef`, `useEffect`).

### Testing Strategy

- **Existing unit tests (3 files, 3,138 lines):** Must pass unchanged (except import paths). These serve as the regression safety net — they test the full wizard behavior through the public API (`PostMatchWizardProps`).
- **New reducer unit tests (Task 10):** Test `wizardReducer` in isolation — pure function, no rendering. Covers all action types and phase transitions.
- **No E2E tests:** Out of scope for this refactor.
- **Integration wiring gap:** No dedicated tests exist for the orchestrator ↔ phase wiring (e.g. does `handleNext` dispatch the right action after server call?). The existing unit tests cover this indirectly by testing the full wizard as a black box. If any test fails post-refactor, suspect wiring issues (wrong callback argument, missed dispatch) first.
- **Manual smoke test:** After all tasks pass, manually run through a post-match wizard flow in dev to verify rendering. Not required for spec completion but recommended.
- **Incremental verification:** Each task (1-8) must compile + pass `pnpm typecheck` before proceeding. Tasks 5-8 must additionally pass `pnpm vitest run` after each extraction.

### Notes

- The current component already has a natural 3-branch structure (`if (phase === 'tierup')`, `if (phase === 'consequences')`, default XP render) — the extraction follows this existing seam.
- `expandQueueEntry` helper is pure — move to `phase-tierup.tsx` (only consumer).
- `buildConsequencesArray` and `buildChampionKilledIds` read cross-phase refs — they stay in the orchestrator (`index.tsx`).
- Dynamic imports (`import('../routes/match/$matchId/post-match')`) appear 6 times — centralize into a `getPostMatchServerFns()` helper in the orchestrator, pass resolved fns via callbacks to phases.
- `data-testid` attributes: preserve existing values wherever possible to minimize test churn. `WizardHeader` reuses `wizard-back-button`, `wizard-cancel-button`, `wizard-progress`.
- Extraction order must be incremental: each step must compile and existing unit tests must pass before proceeding to the next extraction. No big-bang refactor.

### Party Mode Decisions (2026-03-25)

Recommendations accepted from group discussion (Winston, Amelia, Quinn, Barry):

| Decision | Rationale |
|---|---|
| Refs exposed via callbacks, not passed to phases | Encapsulates mutation in orchestrator; clean phase APIs |
| `expandQueueEntry` → `phase-tierup.tsx` | Only consumer; pure function with no cross-phase deps |
| Dynamic imports centralized in orchestrator | 6 duplicate import sites → 1 helper |
| `data-testid` preserved where possible | Minimizes test update surface |
| Incremental extraction order | Each step compiles + tests pass; bugs isolatable |
| No E2E tests in scope | Unit tests only for this refactor |
| Lightweight reducer (phase transitions only) | UI state in local `useState` per phase; reducer ~80-100 lines vs ~200; refs handle cross-mount persistence |
| `PhaseXp` props reduced (~10 vs ~18) | Local state not lifted; `onNext(xpData)` passes snapshot up |
| `key` prop for state reset | Orchestrator keys phase components on step index; eliminates `useEffect` syncing |

### Review Notes (2026-03-25)

- Adversarial review completed (opus agent)
- Findings: 6 total, 3 fixed, 3 skipped (pre-existing or non-issues)
- Resolution approach: auto-fix real findings
- Fixed: F2 (useEffect deps), F3 (dual onComplete paths → unified via COMPLETE dispatch), F6 (dead code)
- Skipped: F1 (PhaseConsequences error handling — pre-existing), F4 (tierup back rollback — pre-existing), F5 (expandQueueEntry export — non-issue)
- Additional fix: 4 pre-existing test failures corrected (trailing undefined args in onSubmitUnitXp)
