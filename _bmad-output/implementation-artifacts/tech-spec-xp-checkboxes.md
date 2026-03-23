---
title: 'Post-match XP checkboxes'
slug: 'post-match-xp-checkboxes'
created: '2026-03-23'
status: 'implementation-complete'
stepsCompleted: [1, 2, 3, 4]
tech_stack: [react, tanstack-start, tailwind, vitest, testing-library]
files_to_modify: [src/lib/xp-conditions.ts, src/components/post-match-wizard.tsx, src/components/__tests__/post-match-wizard.test.tsx, src/lib/__tests__/xp-conditions.test.ts]
code_patterns: [useState+useRef for Phase 1 state, useEffect on currentStep for pre-fill, consequenceFlagsRef checkbox+ref pattern]
test_patterns: [vitest+RTL, render+fireEvent+waitFor, onSubmitUnitXp mock prop, data-testid selectors]
---

# Tech-Spec: Post-match XP checkboxes

**Created:** 2026-03-23

## Overview

### Problem Statement

The player currently has to manually type an XP number per unit in Phase 1 of the post-match wizard. This is error-prone and forces consulting the rules separately.

### Solution

Replace the numeric `<input>` with checkboxes matching XP conditions from `docs/xp_rules.md`. The conditions differ between characters (`Personnages`) and units (all other types). Each checkbox shows its XP value. A running total is displayed and auto-calculated. Exploits (characters) and faits d'armes (units) are independent multi-select checkbox lists (each checked = +1 XP). Each exploit/feat type can only be checked once — the rules say "possibilité d'en valider **plusieurs différents**", meaning multiple distinct exploits/feats, not the same one stacked.

### Scope

**In Scope:**
- Dynamic checkboxes based on `unit.type` (Personnages vs other)
- XP value displayed per condition + auto-calculated total
- Checkbox state memory for back button (same session, via ref Map)
- "Précédemment : X XP" info label on re-entry (new session, from `previousXpGained`)
- Warning when re-entry total is about to be replaced by 0
- Adapt existing tests

**Out of Scope:**
- DB persistence of individual flags (no migration)
- Automatic match result detection / general identification
- Changes to `submitUnitXpFn` contract (still sends a numeric total)

## Context for Development

### Codebase Patterns

- Phase 1 state uses `useState<number>` for `xpGained` and `useRef<Map<number, number>>` for `submittedXpByStep` (back-button pre-fill)
- `useEffect` on `[currentStep, units]` reads from `submittedXpByStep` or `previousXpGained` to pre-fill the XP value — search: `// Pre-fill XP input from previousXpGained`
- Unit type is available as `currentUnit.type` (string: `"Personnages"` or other like `"Infanterie"`, `"Cavalerie"`, etc.). Any type other than `"Personnages"` uses unit conditions (safe fallback).
- Consequence toggles (MHC / Détruite) already use a similar checkbox + ref pattern (`consequenceFlagsRef` + `useEffect` sync on step change)
- `handleNext()` calls `Math.floor(xpGained)` before submitting — this stays, but `xpGained` will now be computed from checked conditions
- The XP input HTML block is marked by `{/* XP input */}` comment (the `<input type="number">` to replace)
- Phase 1 render starts at the `{/* Phase 1 */}` comment
- Tests use `data-testid` selectors extensively: `wizard-xp-input`, `wizard-unit-name`, `wizard-progress`, `wizard-next-button`, `wizard-error`
- **CRITICAL — test fixture bug**: `sampleUnits` fixture uses `type: 'Personnage'` (singular) but the actual codebase uses `'Personnages'` (plural). This must be fixed FIRST (Task 0) or all character-branch tests will silently test the wrong code path.

### Impacted Tests (file: `src/components/__tests__/post-match-wizard.test.tsx`)

| Test ID | What it checks | Impact |
|---|---|---|
| `WIZ-002` | `wizard-xp-input` exists | **Replace**: check for `wizard-xp-checkboxes` container |
| `WIZ-003` | `xpInput.value === '0'` | **Replace**: check total displays 0 |
| `WIZ-004` | `min=0, max=99` attributes | **Remove**: no longer applicable |
| `WIZ-008` | `fireEvent.change(xpInput, { value: '3' })` | **Replace**: click checkboxes to reach XP 3 |
| `WIZ-016` | `wizard-xp-input` absent for empty state | **Adapt**: check `wizard-xp-checkboxes` absent |

Tests NOT impacted: `WIZ-001` (unit name), `WIZ-005` (current XP display), `WIZ-006` (progress), `WIZ-007` (Suivant button text), `WIZ-009`-`WIZ-010` (advance), `WIZ-011` (error), `WIZ-012` (complete), `WIZ-013` (disabled), `WIZ-014`-`WIZ-015` (empty state text/button), `WIZ-017`-`WIZ-022` (structural)

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/components/post-match-wizard.tsx` | Phase 1 XP entry UI + state management |
| `src/routes/match/$matchId/post-match.tsx` | Route loader, `submitUnitXpFn` server function |
| `src/lib/validators.ts` | `submitUnitXpSchema` — `xpGained: z.number().int().min(0).max(99)` (max 99 is safe — theoretical max is 8 for characters, 7 for units) |
| `docs/xp_rules.md` | Source of truth for XP conditions |
| `src/components/__tests__/post-match-wizard.test.tsx` | Existing Phase 1 tests |
| `src/routes/match/$matchId/__tests__/post-match.test.ts` | Route-level post-match tests |

### Technical Decisions

- **Client-side calculation only**: The checkboxes compute a total XP number client-side. `submitUnitXpFn` still receives `xpGained: number`. No server or schema changes needed.
- **No DB flag persistence**: Individual checkbox states are not stored in DB. On re-entry (new session), only the numeric total is available via `previousXpGained`. Checkboxes start unchecked with a hint showing the previous total.
- **Condition IDs are stable strings**: Each condition gets a stable ID (e.g., `"deployed"`, `"alive"`, `"general_win"`, `"exploit_duel"`) used as keys in the checkbox state map.
- **No match result / general detection**: The player selects applicable conditions themselves. The wizard does not auto-determine victory/defeat or who is the general.
- **Unknown unit types fall back to unit conditions**: `getXpConditionsForType` returns unit conditions for any type that is not `'Personnages'`. This is the safe default (no general_win/draw).
- **Exploits/feats are unique, not stackable**: Each exploit/feat is a single checkbox. A player can check multiple different exploits, but not the same exploit twice. This matches the rules: "possibilité d'en valider plusieurs différents".
- **Wizard state is per-mount only**: The wizard is mounted once per navigation to the post-match route. A remount (navigate away + return) restarts from scratch — this is the existing behavior. `previousXpGained` covers inter-session recovery.

## Implementation Plan

### Tasks

- [x] Task 0: Fix test fixture `type` values
  - File: `src/components/__tests__/post-match-wizard.test.tsx`
  - Action: Fix `sampleUnits` fixture (line 29) and re-entry fixture (line 796): change `type: 'Personnage'` to `type: 'Personnages'` (plural, matching the actual codebase).
  - Notes: Run the full test suite before AND after this fix to identify any regressions. This is a prerequisite for all subsequent tasks — without it, character-branch tests silently test unit conditions.

- [x] Task 1: Define XP condition constants
  - File: `src/lib/xp-conditions.ts` (new file)
  - Action: Create two constant arrays `CHARACTER_XP_CONDITIONS` and `UNIT_XP_CONDITIONS`, each entry having `{ id: string, label: string, xp: number, group?: 'base' | 'general' | 'exploit' | 'feat', inputType?: 'radio' }`. Use the French labels from `docs/xp_rules.md` verbatim. `general_win` and `general_draw` get `group: 'general'` and `inputType: 'radio'` (mutually exclusive — see Task 6). Export helpers:
    - `getXpConditionsForType(unitType: string)` — returns `CHARACTER_XP_CONDITIONS` if `unitType === 'Personnages'`, otherwise `UNIT_XP_CONDITIONS`
    - `computeXpTotal(checkedIds: Set<string>, unitType: string): number` — sums the `xp` values of checked condition IDs from the matching conditions array. Unknown IDs are silently ignored (sum 0).
  - Notes: Separating constants AND computation from the component keeps the wizard file manageable and makes both testable independently without mounting React components.

- [x] Task 2: Change `submittedXpByStep` ref type
  - File: `src/components/post-match-wizard.tsx`
  - Action: Change `useRef<Map<number, number>>` to `useRef<Map<number, Set<string>>>`. This stores checked condition IDs per wizard step instead of a raw number.
  - Notes: All reads/writes to this ref must be updated — search for `submittedXpByStep` to find all usages.

- [x] Task 3: Replace `xpGained` state with `checkedConditions` state
  - File: `src/components/post-match-wizard.tsx`
  - Action: Replace `const [xpGained, setXpGained] = useState(0)` with `const [checkedConditions, setCheckedConditions] = useState<Set<string>>(new Set())`. Derive `xpGained` as a computed const: `const xpGained = computeXpTotal(checkedConditions, currentUnit.type)` (imported from `xp-conditions.ts`).
  - Notes: `handleNext()` already uses `Math.floor(xpGained)` — this stays unchanged since `xpGained` is now a derived number.
  - **CRITICAL — React `Set` immutability**: `Set` is a mutable reference. React will NOT re-render if the same `Set` object is mutated. The toggle handler MUST create a new `Set` on every change:
    ```ts
    const toggleCondition = (id: string) => {
      setCheckedConditions(prev => {
        const next = new Set(prev)
        next.has(id) ? next.delete(id) : next.add(id)
        return next
      })
    }
    ```
    Never do `checkedConditions.add(id); setCheckedConditions(checkedConditions)` — this is a silent no-op.

- [x] Task 4: Update `useEffect` pre-fill logic for back button
  - File: `src/components/post-match-wizard.tsx`
  - Action: The existing `useEffect` (search: `// Pre-fill XP input from previousXpGained`) reads from `submittedXpByStep` to pre-fill. Update it to read `Set<string>` and call `setCheckedConditions(savedSet)`. When no saved state exists and `previousXpGained` is non-null (re-entry), leave checkboxes unchecked and set a flag to show the "Précédemment" info.
  - Notes: Add a `const [showPreviousXpHint, setShowPreviousXpHint] = useState(false)` state for the re-entry info display.

- [x] Task 5: Update `handleNext()` to save checkbox state
  - File: `src/components/post-match-wizard.tsx`
  - Action: In `handleNext()`, replace `submittedXpByStep.current.set(currentStep, xpGained)` (search: `submittedXpByStep.current.set`) with `submittedXpByStep.current.set(currentStep, new Set(checkedConditions))`.
  - Notes: The `xpGained` value passed to `submitUnitXpFn` is now the derived const — no change to the server call.

- [x] Task 6: Replace Phase 1 XP input render with checkboxes
  - File: `src/components/post-match-wizard.tsx`
  - Action: Replace the `{/* XP input */}` block with:
    1. A re-entry hint: if `showPreviousXpHint` and `previousXpGained` is non-null, render `<p data-testid="wizard-previous-xp">Précédemment : {previousXpGained} XP</p>`
    2. A re-entry warning: if `showPreviousXpHint` and `previousXpGained > 0` and `xpGained === 0`, render `<p data-testid="wizard-xp-warning" style={{ color: 'var(--color-malus)' }}>Attention : vous aviez précédemment gagné {previousXpGained} XP. Soumettre 0 XP remplacera cette valeur.</p>`
    3. A container `<div data-testid="wizard-xp-checkboxes" role="group" aria-label="Conditions d'XP">` with:
       - For each condition from `getXpConditionsForType(currentUnit.type)`:
         - Conditions with `inputType: 'radio'` (`general_win`, `general_draw`): render inside a `<fieldset role="radiogroup" aria-label="Résultat en tant que général">` with `<input type="radio" name="general_result">` + a third default "Aucun" option (unchecked by default). This ensures correct HTML semantics and accessibility.
         - All other conditions: a `<label>` with a checkbox `<input type="checkbox" data-testid="xp-condition-{id}">`, the condition label, and a `<span>` showing `+{xp} XP`
       - Group exploits/feats under a sub-header ("Exploits" for characters, "Faits d'armes" for units)
    4. A total line: `<p data-testid="wizard-xp-total" aria-live="polite">Total : {xpGained} XP</p>`
  - Notes: Use the same styling patterns as consequence toggles (flex row, gap, font-body, color-text-secondary).

- [x] Task 7: Adapt impacted tests
  - File: `src/components/__tests__/post-match-wizard.test.tsx`
  - **Prerequisite**: Task 0 (fixture fix) must be done first.
  - Action:
    - `WIZ-002`: Replace `wizard-xp-input` lookup with `wizard-xp-checkboxes` container
    - `WIZ-003`: Replace `xpInput.value === '0'` with checking `wizard-xp-total` contains "0"
    - `WIZ-004`: Remove the `min=0, max=99` test entirely (no numeric input anymore)
    - `WIZ-008`: Replace `fireEvent.change(xpInput, { value: '3' })` with clicking 3 checkboxes (e.g. `deployed` + `alive` + one exploit) and asserting `onSubmitUnitXp` was called with `xpGained: 3`
    - `WIZ-016`: Replace `wizard-xp-input` with `wizard-xp-checkboxes` for empty state check
  - For `WIZ-008`, the adapted test must explicitly assert the mock call: `expect(onSubmitUnitXp).toHaveBeenCalledWith('unit-1', 3, PARTICIPANT_ID)` to verify the computed total is correctly passed through.

- [x] Task 8: Add new tests for XP checkboxes behavior
  - File: `src/components/__tests__/post-match-wizard.test.tsx`
  - Action: Add tests for:
    - Character unit shows character-specific conditions (general_win, exploits)
    - Non-character unit shows unit-specific conditions (survived, feats)
    - Checking a condition updates the displayed total
    - Back button restores previously checked conditions
    - Re-entry shows "Précédemment : X XP" hint when `previousXpGained` is set (setup: pass `previousXpGained: 3` in unit fixture)
    - Re-entry warning appears when `previousXpGained > 0` and total is 0
    - Total XP is correctly summed (e.g. `general_win` = +2, not +1)
    - `general_win` and `general_draw` are mutually exclusive (selecting one deselects the other)
    - Re-entry + advance + back button: hint disappears after player advances (saved checkbox state exists), back button restores checkboxes not hint
    - Accessibility: `role="group"` with `aria-label="Conditions d'XP"` is present, `role="radiogroup"` wraps general conditions for characters
  - Notes: Use `data-testid="xp-condition-{id}"` to target specific checkboxes. Use `screen.getByRole('group', { name: /conditions d'xp/i })` for a11y tests.

- [x] Task 9: Add unit tests for `computeXpTotal` and `getXpConditionsForType`
  - File: `src/lib/__tests__/xp-conditions.test.ts` (new file)
  - Action: Pure logic tests (no DOM needed, `environment: 'node'`):
    - `computeXpTotal(new Set(['deployed', 'general_win']), 'Personnages')` returns 3
    - `computeXpTotal(new Set([]), 'Infanterie')` returns 0
    - `computeXpTotal(new Set(['deployed', 'survived', 'feat_destroy_unit']), 'Infanterie')` returns 3
    - `computeXpTotal(new Set(['deployed', 'FAKE_ID']), 'Personnages')` returns 1 (unknown ID ignored)
    - `getXpConditionsForType('Personnages')` returns character conditions (has `general_win`, no `survived`)
    - `getXpConditionsForType('Infanterie')` returns unit conditions (has `survived`, no `general_win`)
    - `getXpConditionsForType('Artillerie')` returns unit conditions (unknown type → fallback)
    - `getXpConditionsForType('')` returns unit conditions (empty string → fallback)
    - `getXpConditionsForType('Personnage')` returns unit conditions (singular ≠ plural — must not match character branch)
    - Max possible XP per match fits within `submitUnitXpSchema` limit (99):
      ```ts
      const maxChar = CHARACTER_XP_CONDITIONS.reduce((s, c) => s + c.xp, 0)
      const maxUnit = UNIT_XP_CONDITIONS.reduce((s, c) => s + c.xp, 0)
      expect(Math.max(maxChar, maxUnit)).toBeLessThanOrEqual(99)
      ```
  - Notes: These are fast, stable tests that validate business logic without React rendering overhead.

### Acceptance Criteria

- [ ] AC1: Given a unit with `type === 'Personnages'`, when the wizard renders Phase 1 for that unit, then character-specific XP conditions are shown (deployed, alive, general_win, general_draw, 4 exploits) and unit-specific conditions (survived, feats) are NOT shown.
- [ ] AC2: Given a unit with `type !== 'Personnages'` (e.g. Infanterie), when the wizard renders Phase 1 for that unit, then unit-specific XP conditions are shown (deployed, survived, 5 feats) and character-specific conditions (general_win, general_draw, exploits) are NOT shown.
- [ ] AC3: Given no checkboxes are checked, when the wizard displays the total, then it shows "Total : 0 XP".
- [ ] AC4: Given the player checks "deployed" (+1) and "general_win" (+2) for a character, when the total updates, then it shows "Total : 3 XP" and `submitUnitXpFn` is called with `xpGained: 3`.
- [ ] AC5: Given the player checked conditions for unit at step 1 and advanced to step 2, when they press the back button, then step 1 shows the previously checked conditions restored.
- [ ] AC6: Given the player returns to the post-match flow in a new session (re-entry), when `previousXpGained` is non-null and no saved checkbox state exists, then a hint "Précédemment : X XP" is displayed and checkboxes start unchecked.
- [ ] AC7: Given the exploit/feat section, when multiple exploits/feats are checked, then each contributes +1 XP independently to the total.
- [ ] AC8: Given the consequence toggles (MHC / Détruite / Champion killed), when XP checkboxes are present, then the consequence toggles still appear below the XP section and function as before.
- [ ] AC9: Given `general_win` is selected as radio, when the player selects `general_draw`, then `general_win` is deselected and the total adjusts (from +2 to +1). And vice versa. Selecting "Aucun" deselects both.
- [ ] AC10: Given a re-entry session with `previousXpGained: 3`, when the player advances to step 2 then presses back to step 1, then the checkboxes are restored from saved state (not empty) and the "Précédemment" hint is NOT shown (saved state takes priority over re-entry hint).
- [ ] AC11: Given `computeXpTotal` is called with `new Set(['deployed', 'general_win'])` and type `'Personnages'`, then it returns `3` (1+2).
- [ ] AC12: Given re-entry with `previousXpGained: 3` and no checkbox checked (total = 0), when the wizard renders, then a warning is displayed: "Attention : vous aviez précédemment gagné 3 XP. Soumettre 0 XP remplacera cette valeur."
- [ ] AC13: Given `getXpConditionsForType` is called with an unknown type (e.g. `'Artillerie'`, `''`, `'Personnage'`), then it returns unit conditions (fallback — no general_win/draw).

## Additional Context

### Dependencies

- None (no new packages, no migration, no server changes)

### Testing Strategy

**Pure logic tests (Vitest, node env) — `src/lib/__tests__/xp-conditions.test.ts`:**
- `computeXpTotal` — correct sums for various condition combinations, including unknown IDs
- `getXpConditionsForType` — returns correct array per unit type, including fallback for unknown types
- Schema coherence — max possible XP fits within `submitUnitXpSchema` limit

**Component tests (Vitest + RTL) — `src/components/__tests__/post-match-wizard.test.tsx`:**
- Fix fixture `type` values first (Task 0)
- Adapt 5 existing tests (WIZ-002, 003, 004, 008, 016)
- Add ~10 new tests covering: condition type differentiation, total calculation, back button restore, re-entry hint, re-entry warning, multi-exploit sum, general_win gives +2, general mutual exclusivity (radio), re-entry+back combo, a11y roles

**Manual testing:**
- Navigate to post-match flow with an army containing both characters and units
- Verify character shows character conditions, unit shows unit conditions
- Check/uncheck conditions and verify total updates in real-time
- Use back button to verify checkbox state is restored
- Complete the flow and verify correct XP is saved
- Verify screen reader announces total changes (aria-live)

### Notes

- XP conditions from `docs/xp_rules.md` (French labels — use verbatim in code):

**Personnages :**
| Condition | XP | ID | Input |
|---|---|---|---|
| Le personnage est déployé sur le champ de bataille | 1 | `deployed` | checkbox |
| Le personnage est en vie et n'est pas en fuite à la fin de la bataille | 1 | `alive` | checkbox |
| C'est le général et il remporte la bataille | 2 | `general_win` | radio |
| C'est le général et la partie est une égalité | 1 | `general_draw` | radio |
| Exploit : Remporter un duel contre un autre personnage ou un champion qui a 2 PV ou plus | 1 | `exploit_duel` | checkbox |
| Exploit : Détruire une unité à lui seul | 1 | `exploit_destroy_unit` | checkbox |
| Exploit : Accomplir un objectif de scénario | 1 | `exploit_objective` | checkbox |
| Exploit : Lancer/Dissiper 3 sorts | 1 | `exploit_spells` | checkbox |

**Unités (non-Personnages) :**
| Condition | XP | ID | Input |
|---|---|---|---|
| L'unité est déployée sur le champ de bataille | 1 | `deployed` | checkbox |
| L'unité survit à plus de 50 % et n'est pas en fuite à la fin de la bataille | 1 | `survived` | checkbox |
| Fait d'armes : Détruire une unité en combat (tir, corps à corps, poursuite) | 1 | `feat_destroy_unit` | checkbox |
| Fait d'armes : Mettre hors combat un personnage ennemi | 1 | `feat_kill_character` | checkbox |
| Fait d'armes : Protéger le train de bagage | 1 | `feat_protect_baggage` | checkbox |
| Fait d'armes : Détruire le train de bagage ennemi | 1 | `feat_destroy_baggage` | checkbox |
| Fait d'armes : Accomplir un objectif du scénario | 1 | `feat_objective` | checkbox |

- **Exploits / Faits d'armes — non stackables** : Chaque exploit ou fait d'armes est un checkbox unique. Le joueur peut en cocher plusieurs différents, mais pas le même deux fois. Conforme aux règles : "possibilité d'en valider plusieurs différents".
- Back button memory: `submittedXpByStep` changes from `Map<number, number>` to `Map<number, Set<string>>` storing checked condition IDs per wizard step.
- Re-entry: when `previousXpGained` is non-null and no saved checkbox state exists, display "Précédemment : X XP" info text above the checkboxes. If total is 0 and previous > 0, show a warning.
- Wizard state is per-mount only. Remounting resets all refs — `previousXpGained` handles inter-session recovery.
