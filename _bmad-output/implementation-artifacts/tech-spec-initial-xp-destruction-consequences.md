---
title: 'Initial XP — Destruction Consequences Multi-Select'
slug: 'initial-xp-destruction-consequences'
created: '2026-03-24'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['react', 'tanstack-start', 'tanstack-query', 'drizzle-orm', 'zod']
files_to_modify: ['src/components/post-match-wizard.tsx', 'src/components/initial-consequence-step.tsx', 'src/routes/match/$matchId/post-match.tsx', 'src/components/__tests__/initial-consequence-step.test.tsx', 'src/components/__tests__/post-match-wizard.test.tsx']
code_patterns: ['phase-based wizard flow (xp -> consequences -> tierup)', 'ref-based state for cross-phase data (pendingConsequencesRef, xpResultsRef)', 'server functions co-located in route files', 'consequence batch commit via ConsequenceEntry[]', 'mode branching via mode prop (post-match | initial-xp)']
test_patterns: ['vitest + @testing-library/react', 'data-testid attributes for selectors', 'mock onSubmitUnitXp / onCompleteEvolutions for unit tests', 'describe blocks grouped by AC/story']
---

# Tech-Spec: Initial XP — Destruction Consequences Multi-Select

**Created:** 2026-03-24

## Overview

### Problem Statement

In `initial-xp` mode (campaign setup), the player only enters a raw numeric XP value per unit. There is no way to record past destruction consequences (Rancune/Haine, Pertes Catastrophiques, Moral Brise, Blessure Permanente, etc.). These permanent or semi-permanent effects must be captured so the army state is complete after migrating into the app.

### Solution

Add an inline "past consequences" section per unit in `initial-xp` mode, below the XP numeric input. A "+ Ajouter une consequence" button opens a mini-flow: pick type (radio) -> optional sub-selection (stat for Blessure Permanente, player for Haine/Rancune) -> cancel or confirm. Added consequences appear as removable chips for immediate visual feedback. The player can add as many as they want (including the same result multiple times). XP-modifying consequences (Deroute Sanglante, Fureur Vengeresse, Miracule), Death, and no-op consequences (Survivants Endurcis, Egratignures) are excluded. Banner loss logic is ignored in initial mode.

### Scope

**In Scope:**
- New optional "past consequences" section per unit in `initial-xp` mode only
- Multi-select: same result selectable multiple times (free trust model)
- Player picker (via `getAllPlayersWithArmyInfo`) for Haine/Rancune target — current player excluded from the list
- Filtered tables: characters use injury table (without Miracule, without Death, without Egratignures/no_effect), units use destruction table (without Deroute Sanglante, without Fureur Vengeresse, without Survivants Endurcis)
- Batch commit of consequences at the same point as currently
- Loader-side change: new `campaignPlayers` field on `PostMatchLoaderData` (server function, initial-xp mode only)

**Out of Scope:**
- Changes to normal post-match flow (mode `post-match`)
- Banner loss logic in initial mode
- Automatic XP adjustment from consequences
- Changes to `ConsequenceEntry` type, `consequenceTypeEnum`, or `completeEvolutionsWithGainsTransaction` (server handler)

## Context for Development

### Codebase Patterns

- PostMatchWizard (`src/components/post-match-wizard.tsx`) already has a `mode` prop (`post-match` | `initial-xp`) that gates behavior
- Phase flow: Phase 1 (XP entry) -> Phase 1.5 (consequences) -> Phase 2 (tier-ups)
- Consequence flags are tracked per-unit during Phase 1 via `consequenceFlagsRef` (boolean per unit) — in initial-xp mode, this toggle does not exist yet
- Phase 1.5 renders `InjuryBonusStep` for characters, `UnitDestructionStep` for units — both use radio buttons (single selection)
- Existing consequence types: `DestructionResult` and `InjuryResult` — stored in `pendingConsequencesRef` as `Map<string, single result>` (keyed by unitId)
- `loadOpponentsFn` in `create-match-fab.tsx` calls `getAllPlayersWithArmyInfo()` and filters out the current player — reusable for player picker
- `ConsequenceEntry` in `src/lib/validators.ts` is the shape sent to server on batch commit
- Server-side `completeEvolutionsWithGainsTransaction` iterates over `consequences[]` sequentially with a switch on `consequence.type` — multiple entries for the same unitId already work correctly
- `pendingConsequencesRef` currently uses `Map.set()` (overwrite per unitId) — must switch to array accumulation for multi-select

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/components/post-match-wizard.tsx` | Main wizard — mode branching, phase flow, consequence handling, `pendingConsequencesRef`, `buildConsequencesArray()` |
| `src/components/unit-destruction-step.tsx` | Unit destruction table data (`DESTRUCTION_OPTIONS`) — reuse for filtered list |
| `src/components/injury-bonus-step.tsx` | Character injury table data (`INJURY_OPTIONS`, `PERMANENT_INJURY_SUBTABLE`) — reuse for filtered list |
| `src/components/create-match-fab.tsx` | `loadOpponentsFn` server function — player list query to reuse |
| `src/lib/validators.ts` | `ConsequenceEntry` type, `consequenceTypeEnum` — server-side consequence shape (no changes needed) |
| `src/db/queries/evolutions.ts` | `completeEvolutionsWithGainsTransaction` — processes consequences array (no changes needed) |
| `src/routes/match/$matchId/post-match.tsx` | Route loader (`PostMatchLoaderData`) + server functions — must add `campaignPlayers` to loader in initial-xp mode |

### Technical Decisions

- **New component `InitialConsequenceStep`**: Multi-select UI with "add consequence" flow. Different from existing radio-select steps. Takes `unitType` to show correct table (injury vs destruction), filtered list (no XP-modifying types), and `campaignPlayers` for Haine/Rancune picker.
- **`pendingConsequencesRef` stays unchanged for post-match mode**. For initial-xp, a separate `initialConsequences` state (`useState<InitialConsequenceItem[]>([])`) accumulates multi-select consequences as a flat array with `_localId` for unambiguous removal (each entry carries its own `unitId`). Using state (not ref) ensures re-renders when consequences are added/removed — no manual version counter needed. `buildConsequencesArray()` appends `initialConsequences` entries directly (stripping `_localId`), **without** passing them through the existing `pendingConsequencesRef` transformation logic.
- **Loader change (server function)**: `PostMatchLoaderData` gains optional `campaignPlayers?: Array<{ playerId: string; playerDisplayName: string }>` populated only in `initial-xp` mode via `getAllPlayersWithArmyInfo()`. This is the only server-side change.
- **Filtered consequence types**: Characters exclude `miracule`, `death`, and `no_effect`. Units exclude `deroute_sanglante`, `fureur_vengeresse`, and `survivants_endurcis`. This yields 3 meaningful options per type.
- **Sub-selections per type**:
  - `permanent_injury`: stat sub-table (6 options from `PERMANENT_INJURY_SUBTABLE`). Entry: `{ unitId, type: 'permanent_injury', stat, delta: -1 }`. Server expects `stat!` and `delta!`.
  - `grave_injury`: no sub-selection. Entry: `{ unitId, type: 'grave_injury' }`. Server hardcodes `stat: 'pv', delta: -1, temporary: true`.
  - `haine` / `rancune`: player picker. Entry: `{ unitId, type, opponentPlayerName }`. Server uses `opponentPlayerName` for the gain description.
  - `pertes_catastrophiques`: no sub-selection. Entry: `{ unitId, type: 'pertes_catastrophiques' }`. Server inserts a unit_gain description.
  - `moral_brise`: no sub-selection. Entry: `{ unitId, type: 'moral_brise' }`. Server hardcodes `stat: 'cd', delta: -2, temporary: true`.
- **`bannerLost` omitted** (not set to `false`): The field is `z.boolean().optional()`. Omitting it is cleaner than `false` — both skip the `=== true` banner logic server-side, but `undefined` unambiguously means "not applicable" rather than "checked and not lost".
- **UX pattern**: Inline "+ Ajouter une consequence" button below XP input. Mini-flow: radio type selection -> optional sub-selection (stat / player) -> confirm or cancel. Removable chips show added consequences. No separate phase transition — stays within Phase 1 per-unit step.
- **Phase flow in initial-xp**: Consequences are collected inline during Phase 1 (per-unit XP step). No Phase 1.5 transition needed. When `handleNext()` fires on last unit, `initialConsequences` is already populated. `transitionToPhase2OrComplete()` picks them up via `buildConsequencesArray()`.
- **Duplicate consequences**: Allowed (e.g. 2x `permanent_injury` on the same stat applies `-1` twice server-side). This matches the trust model — the player is recording actual past history.

## Implementation Plan

### Tasks

- [x] Task 1: Create `InitialConsequenceStep` component
  - File: `src/components/initial-consequence-step.tsx` (new)
  - Action: Create a self-contained component with the following behavior:
    - **Props**: `unitId: string`, `unitType: string`, `campaignPlayers: Array<{ playerId: string; playerDisplayName: string }>`, `consequences: Array<ConsequenceEntry & { _localId: number }>` (current list for this unit), `onAdd: (entry: ConsequenceEntry) => void`, `onRemove: (localId: number) => void`
    - **Filtered options**: Based on `unitType`:
      - `Personnages`: `permanent_injury`, `grave_injury`, `haine` (3 options from `INJURY_OPTIONS`)
      - Other: `pertes_catastrophiques`, `moral_brise`, `rancune` (3 options from `DESTRUCTION_OPTIONS`)
    - **Add flow state** (internal `useState`):
      - `isAdding: boolean` — toggles the add form visibility
      - `selectedType: string | null` — radio selection among filtered options
      - `selectedStat: string | null` — for `permanent_injury` sub-table (from `PERMANENT_INJURY_SUBTABLE`)
      - `selectedPlayerId: string | null` — for `haine` / `rancune` player picker
    - **"+ Ajouter une consequence" button**: Sets `isAdding = true`, shows the radio list
    - **"Annuler" cancel button**: Visible when `isAdding === true`. Sets `isAdding = false` and resets all sub-selections. Allows the user to close the add form without adding a consequence.
    - **Radio list**: Shows filtered options with their `label` and `ruleText` (italic, below selected item — same pattern as `UnitDestructionStep`)
    - **Sub-selection** (conditional):
      - If `permanent_injury` selected: show `PERMANENT_INJURY_SUBTABLE` as nested radios
      - If `haine` or `rancune` selected: show `<select>` dropdown with `campaignPlayers` (value = `playerId`, display = `playerDisplayName`). If `campaignPlayers` is empty, show a disabled message "Aucun autre joueur dans la campagne" and disable the confirm button.
    - **"Ajouter" confirm button**: Disabled until all required sub-selections are complete. On click:
      - Build `ConsequenceEntry` from selections (see "Sub-selections per type" in Technical Decisions for exact field shapes per type)
      - For `permanent_injury`: `{ unitId, type: 'permanent_injury', stat: selectedStat, delta: -1 }`
      - For `grave_injury`: `{ unitId, type: 'grave_injury' }` (no sub-selection needed — server hardcodes stat/delta)
      - For `haine`/`rancune`: `{ unitId, type, opponentPlayerName: selectedPlayer.playerDisplayName }`
      - For `pertes_catastrophiques` / `moral_brise`: `{ unitId, type }` (no sub-selection — server hardcodes effects)
      - Do NOT set `bannerLost` — omit the field entirely
      - Call `onAdd(entry)`, reset add flow state
    - **Consequence chips list**: Renders `consequences` array as removable chips. Each chip shows a short label (type label + stat name for permanent_injury, + player name for haine/rancune). "x" button calls `onRemove(item._localId)`.
    - **Styling**: Malus-themed background (`var(--color-malus-bg)`), consistent with existing consequence steps. Chips use `var(--color-malus)` border.
    - **data-testid attributes**: `initial-consequence-add-btn`, `initial-consequence-cancel-btn`, `initial-consequence-form`, `initial-consequence-type-{type}`, `initial-consequence-stat-{stat}`, `initial-consequence-player-select`, `initial-consequence-confirm-btn`, `initial-consequence-chip-{localId}`, `initial-consequence-remove-{localId}`
  - Notes: Import and reuse option data arrays from `unit-destruction-step.tsx` and `injury-bonus-step.tsx`. Export the arrays from those files if not already exported. Do NOT duplicate the data.

- [x] Task 2: Export option data from existing step components
  - File: `src/components/unit-destruction-step.tsx`
  - Action: Export `DESTRUCTION_OPTIONS` (add `export` keyword to existing `const`)
  - File: `src/components/injury-bonus-step.tsx`
  - Action: Export `INJURY_OPTIONS` and `PERMANENT_INJURY_SUBTABLE` (add `export` keyword to existing `const`)
  - Notes: These are currently module-private (`const` without `export`). Adding export is backward-compatible.

- [x] Task 3: Add `campaignPlayers` to route loader
  - File: `src/routes/match/$matchId/post-match.tsx`
  - Action:
    - Add `campaignPlayers?: Array<{ playerId: string; playerDisplayName: string }>` to `PostMatchLoaderData` type (line ~19)
    - In `loadPostMatchDataFn` handler, after determining `mode === 'initial-xp'` (line ~82):
      - Import `getAllPlayersWithArmyInfo` (already available in the existing import from `../../../db/queries`)
      - Call `getAllPlayersWithArmyInfo()` and map to `{ playerId, playerDisplayName: displayName }`
      - **Exclude** the current player from the list (same as `loadOpponentsFn` — Haine and Rancune are directed at opponents, self-targeting is not a valid game rule)
      - Attach to the returned `PostMatchLoaderData` as `campaignPlayers`
    - For `mode === 'post-match'`, do NOT load `campaignPlayers` (set to `undefined`)
  - Notes: One additional DB query, only in initial-xp mode. Acceptable since initial-xp is a one-time setup flow. This is a server function change (the only server-side modification in this spec).

- [x] Task 4: Add `campaignPlayers` prop to `PostMatchWizard` and wire up initial consequences state
  - File: `src/components/post-match-wizard.tsx`
  - Action:
    - Add `campaignPlayers?: Array<{ playerId: string; playerDisplayName: string }>` to `PostMatchWizardProps` (line ~77)
    - Add `type InitialConsequenceItem = ConsequenceEntry & { _localId: number }` local type
    - Add `[initialConsequences, setInitialConsequences] = useState<InitialConsequenceItem[]>([])` — using state instead of ref so that add/remove triggers re-renders without a manual version counter
    - Add `nextLocalIdRef = useRef(0)` for auto-increment `_localId` generation
    - Add helper functions for the inline consequence management:
      - `handleAddInitialConsequence(entry: ConsequenceEntry)`: `setInitialConsequences(prev => [...prev, { ...entry, _localId: nextLocalIdRef.current++ }])`
      - `handleRemoveInitialConsequence(localId: number)`: `setInitialConsequences(prev => prev.filter(c => c._localId !== localId))`
    - Update `buildConsequencesArray()`: **after** the existing `for...of pendingConsequencesRef.current` loop, append initial consequences as a separate block:
      ```ts
      // Append initial-xp mode consequences (already ConsequenceEntry-shaped, no transformation needed)
      for (const item of initialConsequences) {
        const { _localId, ...entry } = item
        consequences.push(entry)
      }
      ```
      **CRITICAL**: Do NOT pass `initialConsequences` entries through the existing `pendingConsequencesRef` transformation logic. The existing loop hardcodes `opponentPlayerName` from the wizard's `opponentPlayerName` prop (the match opponent). Initial-xp entries already carry their own per-consequence `opponentPlayerName` and must be appended as-is.
  - File: `src/routes/match/$matchId/post-match.tsx`
  - Action: Pass `campaignPlayers={campaignPlayers}` to `<PostMatchWizard>` in the render (line ~402 area)
  - Notes: The `initialConsequences` state is a flat array — each entry carries its `unitId`. No Map needed.

- [x] Task 5: Render `InitialConsequenceStep` inline in Phase 1 (initial-xp mode only)
  - File: `src/components/post-match-wizard.tsx`
  - Action: In the Phase 1 render section (line ~1140 area), after the `mode === 'initial-xp'` numeric input block and before the submit button:
    - Add conditional render: `{mode === 'initial-xp' && campaignPlayers && ( <InitialConsequenceStep ... /> )}`
    - Props:
      - `unitId={currentUnit.id}`
      - `unitType={currentUnit.type}`
      - `campaignPlayers={campaignPlayers}`
      - `consequences={initialConsequences.filter(c => c.unitId === currentUnit.id)}`
      - `onAdd={handleAddInitialConsequence}`
      - `onRemove={(localId) => handleRemoveInitialConsequence(localId)}`
    - The `onRemove` handler receives the `_localId` — no index mapping needed, unambiguous removal.
  - Notes: The component renders inline — no phase transition. **Both** the consequence toggle checkbox (`data-testid="consequence-toggle"`, line ~1364) **and** the champion killed toggle (line ~1389) must be hidden in initial-xp mode — they are post-match-only controls. Add `{mode !== 'initial-xp' && ( ... )}` guard around both labels.

- [x] Task 6: Skip Phase 1.5 in initial-xp mode
  - File: `src/components/post-match-wizard.tsx`
  - Action: In `handleNext()` (line ~414 area), when `isLastXpStep` is true:
    - Add an early branch **before** the `consequenceFlagsRef` computation: `if (mode === 'initial-xp') { submittedXpByStep.current.set(currentStep, new Set(checkedConditions)); await transitionToPhase2OrComplete(); return; }`
    - This unconditionally skips Phase 1.5 for initial-xp, regardless of any flag state. The branch must be placed **before** lines 417-421 (flag computation) to avoid executing dead code.
    - The existing Phase 1.5 flow (`flagged.length > 0` -> `setPhase('consequences')`) remains unchanged for `post-match` mode
  - Notes: This is the key flow change. In initial-xp, Phase 1.5 never activates. All consequences are already collected inline during Phase 1. The early return is defensive — even if `consequenceFlagsRef` were accidentally polluted, initial-xp would still skip Phase 1.5.

- [x] Task 7: Write unit tests for `InitialConsequenceStep`
  - File: `src/components/__tests__/initial-consequence-step.test.tsx` (new)
  - Action: Test the following scenarios:
    - [IC-001] Renders "+ Ajouter" button, no form visible initially
    - [IC-002] Click "+ Ajouter" shows radio list with correct filtered options for unit type (non-Personnages: 3 destruction options — pertes_catastrophiques, moral_brise, rancune)
    - [IC-003] Click "+ Ajouter" shows correct filtered options for Personnages (3 injury options — permanent_injury, grave_injury, haine)
    - [IC-004] Selecting `permanent_injury` shows stat sub-table; "Ajouter" disabled until stat selected
    - [IC-005] Selecting `haine` shows player dropdown; "Ajouter" disabled until player selected
    - [IC-006] Selecting `rancune` shows player dropdown; "Ajouter" disabled until player selected
    - [IC-007] Confirming `permanent_injury` calls `onAdd` with `{ unitId, type: 'permanent_injury', stat, delta: -1 }` — no `bannerLost` field
    - [IC-008] Confirming `grave_injury` calls `onAdd` with `{ unitId, type: 'grave_injury' }` — no stat, no delta, no `bannerLost`
    - [IC-009] Confirming `haine` calls `onAdd` with `{ unitId, type: 'haine', opponentPlayerName }` — no `bannerLost`
    - [IC-010] Confirming `rancune` calls `onAdd` with `{ unitId, type: 'rancune', opponentPlayerName }` — no `bannerLost`
    - [IC-011] Confirming `pertes_catastrophiques` calls `onAdd` with `{ unitId, type: 'pertes_catastrophiques' }` — no extras
    - [IC-012] Confirming `moral_brise` calls `onAdd` with `{ unitId, type: 'moral_brise' }` — no extras
    - [IC-013] Consequence chips render with correct labels and remove buttons
    - [IC-014] Clicking remove button calls `onRemove` with correct `_localId`
    - [IC-015] Multiple consequences: adding 3 consequences shows 3 chips
    - [IC-016] "Ajouter" button resets form state after confirm (can add another immediately)
    - [IC-017] "Annuler" button hides the form and resets selections
    - [IC-018] Back navigation: consequences passed via props for a unit are displayed as chips (tests parent responsibility to preserve state across step changes)
    - [IC-019] Empty `campaignPlayers` array: haine/rancune shows disabled message, confirm button disabled
  - Notes: Use `render()` + `screen` + `fireEvent`/`userEvent`. Mock `onAdd`/`onRemove` with `vi.fn()`.

- [x] Task 8: Write integration tests for wizard initial-xp consequence flow
  - File: `src/components/__tests__/post-match-wizard.test.tsx`
  - Action: Add a new `describe` block for initial-xp consequences:
    - [INIT-CSQ-001] In initial-xp mode, `InitialConsequenceStep` is rendered inline below XP input
    - [INIT-CSQ-002] In initial-xp mode, consequence toggle checkbox (`data-testid="consequence-toggle"`) is NOT rendered
    - [INIT-CSQ-003] In initial-xp mode, champion killed toggle is NOT rendered
    - [INIT-CSQ-004] Adding consequences in initial-xp mode includes them in `onCompleteEvolutions` call with correct per-consequence `opponentPlayerName` (not the wizard-level `opponentPlayerName` prop)
    - [INIT-CSQ-005] Adding consequences for multiple units (navigate forward/back) accumulates correctly
    - [INIT-CSQ-006] Zero consequences in initial-xp mode — `onCompleteEvolutions` called with empty consequences array
    - [INIT-CSQ-007] In post-match mode, `InitialConsequenceStep` is NOT rendered (no regression)
    - [INIT-CSQ-008] Back navigation: navigate to unit 2, go back to unit 1 — consequences added for unit 1 are still visible as chips
    - [INIT-CSQ-009] `buildConsequencesArray` does not set `bannerLost` on initial-xp entries (field absent, not `false`)
  - Notes: Use existing test patterns — mock `onSubmitUnitXp` and `onCompleteEvolutions` with `vi.fn()`. Pass `campaignPlayers` prop.

- [x] Task 9: E2E test for initial-xp consequence flow
  - File: `e2e/initial-xp-consequences.spec.ts` (new)
  - Action: Playwright test covering the full user flow:
    - Create an initial_setup match, open post-match wizard
    - Add a `permanent_injury` consequence to a Personnages unit (select stat)
    - Add a `rancune` consequence to a non-Personnages unit (select opponent player)
    - Add a `moral_brise` consequence (no sub-selection)
    - Complete wizard
    - Verify DB state: `stat_modifiers` table has the permanent_injury row, `unit_gains` table has the rancune and moral_brise rows
  - Notes: Follow existing E2E patterns (auth fixtures, `__reactFiber` hydration wait). This is a critical one-shot flow — manual testing alone is insufficient.

### Acceptance Criteria

- [x] AC1: Given the wizard is in `initial-xp` mode on a unit step, when the step renders, then an "Ajouter une consequence" button is visible below the XP numeric input
- [x] AC2: Given the wizard is in `initial-xp` mode on a non-Personnages unit, when the player clicks "+ Ajouter", then a radio list shows: Pertes Catastrophiques, Moral Brise, Rancune (3 options)
- [x] AC3: Given the wizard is in `initial-xp` mode on a Personnages unit, when the player clicks "+ Ajouter", then a radio list shows: Blessure Permanente, Blessure Grave, Haine (3 options)
- [x] AC4: Given the player selects Blessure Permanente, when the radio is checked, then a sub-table of 6 stats appears and the confirm button is disabled until a stat is selected
- [x] AC5: Given the player selects Haine or Rancune, when the radio is checked, then a dropdown of campaign players (excluding current player) appears and the confirm button is disabled until a player is selected
- [x] AC6: Given the player confirms a consequence, when "Ajouter" is clicked, then a removable chip appears in the consequences list and the add form resets
- [x] AC7: Given consequences have been added, when the player clicks the remove button on a chip, then that consequence is removed from the list
- [x] AC8: Given the player adds multiple consequences (including duplicates), when the wizard completes, then all consequences are included in the `onCompleteEvolutions` batch commit as separate `ConsequenceEntry` objects, each with its own `opponentPlayerName` where applicable
- [x] AC9: Given the wizard is in `initial-xp` mode, when the player does not add any consequences and clicks "Suivant", then the wizard proceeds normally with an empty consequences array
- [x] AC10: Given the wizard is in `post-match` mode, when the step renders, then no `InitialConsequenceStep` is shown, the existing consequence toggle checkbox remains visible, and the champion killed toggle remains visible (no regression)
- [x] AC11: Given the wizard is in `initial-xp` mode, when the last unit's XP is submitted, then Phase 1.5 (consequence selection screen) is skipped unconditionally and the wizard proceeds directly to Phase 2 (tier-ups) or completion
- [x] AC12: Given the player navigates back to a previous unit in `initial-xp` mode, when consequences had been added for that unit, then the consequence chips are still visible and removable
- [x] AC13: Given the add form is open, when the player clicks "Annuler", then the form closes and selections are reset without adding a consequence
- [x] AC14: Given a campaign with only one player, when the player opens the consequence add form and selects Haine or Rancune, then a disabled message is shown and the confirm button is disabled

## Additional Context

### Dependencies

- Existing `getAllPlayersWithArmyInfo()` in `src/db/queries/index.ts` for player list
- Existing `ConsequenceEntry` type and `consequenceTypeEnum` in `src/lib/validators.ts` (no changes)
- Existing `completeEvolutionsWithGainsTransaction` in `src/db/queries/evolutions.ts` (no changes)
- Option data arrays: `DESTRUCTION_OPTIONS` from `unit-destruction-step.tsx`, `INJURY_OPTIONS` + `PERMANENT_INJURY_SUBTABLE` from `injury-bonus-step.tsx`

### Testing Strategy

**Unit tests** (`initial-consequence-step.test.tsx`):
- Component renders correct filtered options per unit type
- Add flow: type selection -> sub-selection -> confirm -> chip appears
- Cancel flow: form closes, no consequence added
- Remove flow: chip remove button -> onRemove called
- Edge cases: multiple adds, duplicate types, form reset after confirm, empty player list
- Exact `ConsequenceEntry` shape per type (no extra fields like `bannerLost`)

**Integration tests** (`post-match-wizard.test.tsx`):
- Initial-xp mode renders inline consequence section
- Initial-xp mode hides consequence toggle AND champion killed toggle
- Post-match mode does NOT render it (regression guard)
- Consequences accumulate across units and reach batch commit with per-consequence `opponentPlayerName`
- Phase 1.5 is skipped unconditionally in initial-xp mode
- Zero-consequence path works correctly
- `bannerLost` absent (not `false`) on initial-xp entries

**E2E tests** (`e2e/initial-xp-consequences.spec.ts`):
- Full flow: create match -> add mixed consequences -> complete -> verify DB state
- Critical for a one-shot migration flow that cannot easily be re-tested manually

**Manual testing**:
- Create an initial_setup match, open post-match wizard
- Add multiple consequences to different units (mix of types)
- Verify Haine/Rancune shows player dropdown populated with campaign players (current player excluded)
- Verify Blessure Permanente shows stat sub-table
- Complete wizard, check DB: `stat_modifiers` and `unit_gains` tables contain expected rows

### Notes

- Trust model: players freely choose consequences — no validation against actual match history
- The same consequence can be added multiple times (e.g. 3 past destructions = 3 separate consequence entries). Server processes each independently — e.g. 2x `permanent_injury` on `cc` applies `-1` twice. This is intentional per the trust model.
- "Survivants Endurcis" and "Egratignures" (no-op types) are excluded from the UI — they add no value and have no server-side handler (fall through the switch statement)
- The `bannerLost` field is **omitted** (not set to `false`) for initial-xp consequences — banner state is implicit in the army data the player enters. `undefined` unambiguously means "not applicable".
- `grave_injury` requires no sub-selection — the server hardcodes `stat: 'pv', delta: -1, temporary: true` (see `evolutions.ts` lines 272-281)
- `moral_brise` requires no sub-selection — the server hardcodes `stat: 'cd', delta: -2, temporary: true` (see `evolutions.ts` lines 304-313)
- `pertes_catastrophiques` requires no sub-selection — the server inserts a descriptive unit_gain (see `evolutions.ts` lines 314-320)
- Current player excluded from Haine/Rancune target list: these are opponent-directed effects per The Old World campaign rules. Self-targeting is not a valid game state.

## Review Notes
- Review adversariale complétée (agent Opus)
- Findings: 13 total, 3 corrigés, 10 ignorés (noise / by-design / F2 exclu)
- Approche: auto-fix sur findings réels
- F1 corrigé: ref miroir `initialConsequencesRef` pour éviter stale closure dans `buildConsequencesArray`
- F7 corrigé: cast plus spécifique `as typeof CHARACTER_ALLOWED[number]` au lieu de `as readonly string[]`
- F8 corrigé: `console.warn` sur le `else { return }` silencieux dans `handleConfirm`
