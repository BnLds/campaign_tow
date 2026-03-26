---
title: 'Refactor InitialConsequenceStep into directory module'
slug: 'refactor-initial-consequence-step'
created: '2026-03-26'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['react', 'tailwindcss-v4', 'vitest', 'testing-library', 'clsx', 'tailwind-merge']
files_to_modify:
  - 'src/components/initial-consequence-step.tsx → src/components/initial-consequence-step/'
  - 'src/components/__tests__/initial-consequence-step.test.tsx → src/components/initial-consequence-step/__tests__/'
code_patterns: ['directory-module', 'custom-hook', 'factory-function', 'cn()-for-conditional-classes', 'arbitrary-values-for-css-vars']
test_patterns: ['rtl-fireEvent', 'data-testid']
---

# Tech-Spec: Refactor InitialConsequenceStep into directory module

**Created:** 2026-03-26

## Overview

### Problem Statement

`src/components/initial-consequence-step.tsx` is a 417-line single-file component with four intertwined problems:

1. **Scattered form state** — 4 `useState` hooks (`isAdding`, `selectedType`, `selectedStat`, `selectedPlayerId`) with cross-reset logic spread across `handleTypeSelect` and `resetForm`. Derived values (`needsStat`, `needsPlayer`, `isConfirmEnabled`) are loose variables in the render scope.
2. **Inline option filtering** — `CHARACTER_ALLOWED` / `UNIT_ALLOWED` filter lists + `.filter()` call embedded in the render body, untestable in isolation.
3. **Fragile entry builder** — `handleConfirm` contains a 6-branch if/else chain to construct the correct `ConsequenceEntry` shape. Not independently testable.
4. **Inline styles noise** — ~250 lines of inline `style={{}}` objects obscure the actual component logic, making the file hard to scan.

### Solution

Decompose into a `src/components/initial-consequence-step/` directory module:
- Extract form state + derived values into `useConsequenceForm()` custom hook
- Extract option filtering into `getFilteredOptions()` pure function
- Extract entry construction into `buildConsequenceEntry()` factory function
- Split JSX into `ConsequenceChips` and `ConsequenceForm` sub-components
- Migrate all inline styles to Tailwind v4 utility classes

### Scope

**In Scope:**
- Directory module: `initial-consequence-step/index.tsx` (barrel re-export)
- Custom hook: `useConsequenceForm.ts`
- Pure helpers: `helpers.ts` (`getFilteredOptions`, `buildConsequenceEntry`, `getChipLabel`)
- Sub-components: `consequence-chips.tsx`, `consequence-form.tsx`
- Inline styles → Tailwind classes (all elements)
- Update test imports if needed (barrel should prevent this)

**Out of Scope:**
- Changing any validation logic, entry shapes, or user-facing behavior
- Modifying parent components (`post-match-wizard/phase-xp.tsx`, etc.)
- Modifying `unit-destruction-step.tsx` or `injury-bonus-step.tsx`
- Adding new features or consequence types
- Changing test assertions (only import paths if barrel breaks)

## Context for Development

### Codebase Patterns

- Directory module pattern already used: `src/components/post-match-wizard/` (barrel `index.tsx` + `types.ts` + `reducer.ts` + 5 sub-components + `__tests__/`)
- `tsconfig.json` has `moduleResolution: "bundler"` — barrel `index.tsx` resolves correctly for `from '../initial-consequence-step'` imports
- Tailwind v4 via CSS (`@import 'tailwindcss'` + `@theme inline` in `src/styles.css`). No `tailwind.config.js`.
- CSS custom variables (`--color-malus`, `--color-malus-bg`, etc.) are **plain CSS variables** in `src/styles/globals.css`, NOT Tailwind theme tokens → must use arbitrary values: `text-[var(--color-malus)]`, `bg-[var(--color-malus-bg)]`
- `cn()` utility available at `src/lib/utils.ts` (clsx + tailwind-merge) — use for conditional class merging
- Testing: vitest + @testing-library/react, `data-testid` attributes, `fireEvent` for interactions
- 19 existing tests in `__tests__/initial-consequence-step.test.tsx` — all must pass unchanged. Tests will be moved into the directory module's own `__tests__/` folder (consistent with `post-match-wizard/` pattern)
- Only 2 consumer files (both in `post-match-wizard/`): `phase-xp.tsx` imports component + type, `types.ts` imports type only
- `DESTRUCTION_OPTIONS` and `INJURY_OPTIONS` are stable public exports from sibling modules (`unit-destruction-step.tsx`, `injury-bonus-step.tsx`) — both are consumed by multiple files. If they are ever relocated, the compiler will catch the broken import

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/components/initial-consequence-step.tsx` | Current monolith — source file to decompose |
| `src/components/__tests__/initial-consequence-step.test.tsx` | 19 tests (IC-001 to IC-019) — must pass unchanged (will be moved to directory module `__tests__/`) |
| `src/components/unit-destruction-step.tsx` | Exports `DESTRUCTION_OPTIONS` — consumed by this component |
| `src/components/injury-bonus-step.tsx` | Exports `INJURY_OPTIONS`, `PERMANENT_INJURY_SUBTABLE` — consumed by this component |
| `src/lib/validators.ts` | Exports `ConsequenceEntry` type |
| `src/components/post-match-wizard/index.tsx` | Reference barrel pattern (9 files, same structure we'll follow) |
| `src/components/post-match-wizard/phase-xp.tsx` | Consumer — imports `InitialConsequenceStep` + `InitialConsequenceItem` |
| `src/components/post-match-wizard/types.ts` | Consumer — imports `InitialConsequenceItem` type |
| `src/lib/utils.ts` | `cn()` utility (clsx + tailwind-merge) — use for conditional classes |
| `src/styles/globals.css` | CSS custom properties (token definitions) |

### Technical Decisions

1. **Custom hook over useReducer**: 4 fields with simple cross-reset logic doesn't warrant reducer boilerplate. `useConsequenceForm()` returns `{ state, actions, derived }` — clean API, testable without rendering.

2. **Helpers in a single `helpers.ts`**: `getFilteredOptions`, `buildConsequenceEntry`, and `getChipLabel` are all small pure functions. A single helpers file avoids file proliferation. All three are independently importable and testable.

3. **Two sub-components, not four**: `ConsequenceChips` (chip list + remove buttons) and `ConsequenceForm` (radio list + conditional sub-fields + confirm/cancel). The player picker and stat subtable stay inside `ConsequenceForm` — they're too small and tightly coupled to the form flow to justify their own files. `ConsequenceForm` receives the hook return via a named `ConsequenceFormApi` interface (exported from `use-consequence-form.ts`) — avoids `ReturnType<typeof ...>` coupling, makes the contract explicit, and keeps sub-component props stable if the hook's internals change.

4. **Barrel re-export preserves imports**: `initial-consequence-step/index.tsx` re-exports `InitialConsequenceStep`, `InitialConsequenceStepProps`, `InitialConsequenceItem`, and `CampaignPlayer` (type). Existing import `from '../initial-consequence-step'` resolves to `../initial-consequence-step/index.tsx` — no consumer changes. `CampaignPlayer` is exported so future consumers don't need deep imports into the module.

5. **Tailwind class mapping**: Inline `style={{}}` → Tailwind utilities. CSS custom properties (`var(--color-malus)`) map to Tailwind arbitrary values `text-[var(--color-malus)]` or theme tokens if already configured. Font families via `font-[var(--font-body)]`.

6. **`getFilteredOptions` returns a single union-element array**: Signature `(unitType: string) => ConsequenceOption[]` where `ConsequenceOption = { type: string; label: string; ruleText: string }` (common shape of both `INJURY_OPTIONS` and `DESTRUCTION_OPTIONS` elements). The branching is based on `unitType === 'Personnages'` — extract this value as a `const CHARACTER_UNIT_TYPE = 'Personnages'` constant in `helpers.ts` to eliminate the magic string.

7. **`buildConsequenceEntry` returns `ConsequenceEntry | null`**: Takes `{ type, unitId, stat?, player? }` where `player` is an already-resolved `CampaignPlayer | null` (not a playerId). Returns the correctly shaped entry or `null` if inputs are incomplete. When returning `null`, logs a `console.warn` with the reason (missing stat, missing player, or unhandled type) to aid debugging — mirrors the existing `console.warn` in the source `handleConfirm` else-branch. **Note on `delta: -1`**: this is a domain constant — every permanent injury applies exactly -1 to the affected stat (per campaign rules). It is hardcoded in the current source (line 111) and stays hardcoded in the factory. `ConsequenceForm` owns the full confirm flow: `const entry = buildConsequenceEntry(...); if (entry) { onAdd(entry); form.actions.resetForm(); }`. The parent orchestrator passes `onAdd` down and does not call `buildConsequenceEntry` directly.

8. **Player resolution stays in the hook, not the factory**: The `.find()` on `campaignPlayers` to resolve `selectedPlayerId` → `CampaignPlayer` is the hook's responsibility. `useConsequenceForm` receives `campaignPlayers` as a parameter and exposes a `resolvedPlayer: CampaignPlayer | null` in its derived state. `buildConsequenceEntry` receives the resolved player — keeping it a pure function with no list dependency.

## Implementation Plan

### Tasks

- [x] **Task 1: Create directory structure + move file**
  - File: `tsconfig.json` (read-only check)
  - Action: Verify `moduleResolution` is `"bundler"` or `"node16"` — fail fast if `"node"` (classic)
  - File: `src/components/initial-consequence-step.tsx` → `src/components/initial-consequence-step/initial-consequence-step.tsx`
  - Action: `mkdir` + `git mv` to preserve history
  - File: `src/components/initial-consequence-step/index.tsx` (new)
  - Action: Create barrel with `export { InitialConsequenceStep }` + `export type { InitialConsequenceStepProps, InitialConsequenceItem, CampaignPlayer }` from `'./initial-consequence-step'`
  - File: `src/components/__tests__/initial-consequence-step.test.tsx` → `src/components/initial-consequence-step/__tests__/initial-consequence-step.test.tsx`
  - Action: `git mv` test file into the directory module's `__tests__/` (consistent with `post-match-wizard/` pattern). Update import path from `'../initial-consequence-step'` to `'../initial-consequence-step'` (barrel — should resolve unchanged) or `'..'` if needed.
  - Gate: `tsc --noEmit` passes + all 19 tests pass
  - Commit: create a commit at this gate (safe rollback point)

- [x] **Task 2: Extract pure helpers into `helpers.ts`**
  - File: `src/components/initial-consequence-step/helpers.ts` (new)
  - Action: Move `getChipLabel()` as-is. Extract `getFilteredOptions(unitType: string): ConsequenceOption[]` with `CHARACTER_UNIT_TYPE = 'Personnages'` constant + `CHARACTER_ALLOWED` / `UNIT_ALLOWED` filter lists (imports `INJURY_OPTIONS` from `../injury-bonus-step`, `DESTRUCTION_OPTIONS` from `../unit-destruction-step`). Export `ConsequenceOption` type. Extract `buildConsequenceEntry({ type, unitId, stat, player }): ConsequenceEntry | null` with the 6-branch logic from `handleConfirm` — on null return, `console.warn` with the specific reason (missing stat / missing player / unhandled type). Export `CampaignPlayer` type.
  - File: `src/components/initial-consequence-step/initial-consequence-step.tsx`
  - Action: Replace inlined functions/constants with imports from `./helpers`
  - Gate: all 19 tests pass
  - Commit: create a commit at this gate

- [x] **Task 3: Add helper unit tests**
  - File: `src/components/initial-consequence-step/__tests__/initial-consequence-step-helpers.test.ts` (new)
  - Action: Add unit tests for extracted helpers immediately after extraction:
    - `getFilteredOptions`: 2 cases (Personnages → 3 character options, non-Personnages → 3 unit options)
    - `buildConsequenceEntry`: 6 valid type cases + 3 null cases (`permanent_injury` sans stat, `haine` sans player, `rancune` sans player)
    - `getChipLabel`: 7 branches (6 types + `permanent_injury` with unknown stat where `PERMANENT_INJURY_SUBTABLE.find()` returns `undefined`)
  - Notes: Tests written now catch bugs in the extraction before building on top of it. TDD principle — verify helpers before depending on them. For `getChipLabel` with unknown stat: the expected fallback is `entry.stat` itself (raw string) — see source line 43 where `sub` is `undefined` and `entry.stat` is used as `statDesc`.
  - Gate: all new + existing 19 tests pass
  - Commit: create a commit at this gate

- [x] **Task 4: Extract `useConsequenceForm` hook**
  - File: `src/components/initial-consequence-step/use-consequence-form.ts` (new)
  - Action: Create `useConsequenceForm(unitType: string, campaignPlayers: CampaignPlayer[])` hook. Encapsulate 4 `useState` + cross-reset logic (`selectType`), derived values (`needsStat`, `needsPlayer`, `isConfirmEnabled`, `filteredOptions`, `resolvedPlayer`), and actions (`openForm`, `resetForm`, `selectType`, `selectStat`, `selectPlayer`). `resolvedPlayer` does the `.find()` on `campaignPlayers` — factory receives resolved player, not the list. Export a named `ConsequenceFormApi` interface describing `{ state, derived, actions }` — sub-components use this interface as prop type instead of `ReturnType<typeof ...>`.
  - File: `src/components/initial-consequence-step/initial-consequence-step.tsx`
  - Action: Remove all 4 `useState` + `handleTypeSelect` + `resetForm` + derived vars. Import and call `useConsequenceForm(unitType, campaignPlayers)`, destructure `{ state, derived, actions }`.
  - Gate: all 19 + helper tests pass
  - Commit: create a commit at this gate

- [x] **Task 5: Migrate inline styles to Tailwind**
  - Files: `src/components/initial-consequence-step/initial-consequence-step.tsx` (still monolithic JSX at this point)
  - Action: Replace every `style={{}}` with Tailwind utility classes. Use arbitrary values for CSS vars (`text-[var(--color-malus)]`, `bg-[var(--color-malus-bg)]`, `font-[family-name:var(--font-body)]`). Use `cn()` from `@/lib/utils` for conditional classes. Standard Tailwind for flex, padding, gap, rounded, etc.
  - Notes: Key mappings — `borderRadius: '8px'` → `rounded-lg`, `gap: '0.75rem'` → `gap-3`, `padding: '1rem'` → `p-4`, `fontSize: '0.78rem'` → `text-xs`, `fontSize: '0.875rem'` → `text-sm`, `borderRadius: '9999px'` → `rounded-full`. Done BEFORE sub-component extraction so each sub-component is born with Tailwind classes — avoids touching each file twice.
  - Gate: **Visual verification checklist** (tests do NOT check styles — manual check required):
    1. Outer container: malus-bg background, rounded corners, malus border, correct padding
    2. Consequence chips: pill shape (rounded-full), malus border/text, × button aligned
    3. Radio list: labels vertically stacked, selected highlight background, accent color on radio inputs
    4. Stat subtable: left border malus, indented, radio labels aligned
    5. Player picker select: full width, correct border/radius
    6. Confirm button: malus background when enabled, grey (#9aa0a6) when disabled, correct opacity
    7. Cancel button: transparent background, separator border
    8. Add button (dashed): dashed malus border, self-aligned left
    9. All text: font-body family applied, correct sizes (xs for labels, sm for body)
  - Gate continued: All 19 + helper tests pass.
  - Commit: create a commit at this gate

- [x] **Task 6: Extract sub-components + finalize**
  - File: `src/components/initial-consequence-step/consequence-chips.tsx` (new)
  - Action: Create `ConsequenceChips` component. Props: `{ consequences: InitialConsequenceItem[]; onRemove: (localId: number) => void }`. Renders chip list with remove buttons (already Tailwind from Task 5). Imports `getChipLabel` from `./helpers`.
  - File: `src/components/initial-consequence-step/consequence-form.tsx` (new)
  - Action: Create `ConsequenceForm` component. Props: `{ form: ConsequenceFormApi; campaignPlayers: CampaignPlayer[]; unitId: string; onAdd: (entry: ConsequenceEntry) => void }`. Receives the hook return via the named `ConsequenceFormApi` interface. `campaignPlayers` is passed separately from the hook because the form needs the full list to render the `<select>` player picker (the hook only exposes the resolved single player). Renders radio list, conditional stat subtable, conditional player picker, confirm/cancel buttons. On confirm: calls `buildConsequenceEntry()` with hook-derived values → if non-null calls `onAdd(entry)` then `form.actions.resetForm()`. This keeps the full confirm→add→reset flow in one place.
  - File: `src/components/initial-consequence-step/initial-consequence-step.tsx`
  - Action: Replace inline JSX with `<ConsequenceChips>` + `<ConsequenceForm>` (or add button when `!isAdding`). Update barrel `index.tsx` if any exports moved. Component becomes a slim ~40-line orchestrator.
  - Gate: `tsc --noEmit` passes, all 19 + helper tests pass, `grep -r 'style={{' src/components/initial-consequence-step/` returns 0 matches, no file exceeds 130 lines (hard cap).
  - Commit: create a commit at this gate

### Acceptance Criteria

- [x] **AC-1:** Given existing imports `from '../initial-consequence-step'` in `phase-xp.tsx` and `types.ts`, when the directory module replaces the single file, then all imports resolve without changes to consumer files and `tsc --noEmit` passes.

- [x] **AC-2:** Given the test file `__tests__/initial-consequence-step.test.tsx` with tests IC-001 through IC-019, when tests are run after refactor, then all 19 tests pass with zero assertion or import changes.

- [x] **AC-3:** Given `getFilteredOptions('Personnages')`, when called, then returns exactly 3 character options (`permanent_injury`, `grave_injury`, `haine`). Given `getFilteredOptions('Infanterie')`, when called, then returns exactly 3 unit options (`pertes_catastrophiques`, `moral_brise`, `rancune`).

- [x] **AC-4:** `buildConsequenceEntry` produces correct shapes for all 6 types:
  - Given `{ type: 'permanent_injury', unitId: 'u1', stat: 'cc', player: null }` → returns `{ unitId: 'u1', type: 'permanent_injury', stat: 'cc', delta: -1 }` (`delta: -1` is a domain constant — every permanent injury reduces the stat by 1)
  - Given `{ type: 'grave_injury', unitId: 'u1', stat: null, player: null }` → returns `{ unitId: 'u1', type: 'grave_injury', stat: 'pv', delta: -1 }`
  - Given `{ type: 'haine', unitId: 'u1', stat: null, player: { playerId: 'p1', playerDisplayName: 'Alice' } }` → returns `{ unitId: 'u1', type: 'haine', opponentPlayerName: 'Alice' }`
  - Given `{ type: 'rancune', unitId: 'u1', stat: null, player: { playerId: 'p2', playerDisplayName: 'Bob' } }` → returns `{ unitId: 'u1', type: 'rancune', opponentPlayerName: 'Bob' }`
  - Given `{ type: 'pertes_catastrophiques', unitId: 'u1', stat: null, player: null }` → returns `{ unitId: 'u1', type: 'pertes_catastrophiques' }`
  - Given `{ type: 'moral_brise', unitId: 'u1', stat: null, player: null }` → returns `{ unitId: 'u1', type: 'moral_brise' }`
  - Given incomplete inputs (`permanent_injury` sans stat, `haine` sans player, `rancune` sans player) → returns `null`

- [x] **AC-5:** Given any `.tsx` file in `src/components/initial-consequence-step/`, when searched for `style={{`, then zero matches found.

- [x] **AC-6:** Given all files in the directory module, when line counts are measured, then no single file exceeds 130 lines (hard cap, down from 417).

- [x] **AC-7:** Given the new helper test file `initial-consequence-step/__tests__/initial-consequence-step-helpers.test.ts`, when run, then all tests pass covering: `getFilteredOptions` (2 cases), `buildConsequenceEntry` (6 valid + 3 null — null cases must verify `console.warn` is called with a descriptive reason), `getChipLabel` (7 branches including `permanent_injury` with unknown stat → fallback returns raw `entry.stat` value).

- [x] **AC-8:** Each task ends with a dedicated commit. The git history has 6 sequential commits (one per task) to provide clean rollback points.

## Additional Context

### Dependencies

None — pure refactor, no new packages. Tailwind v4 already configured.

### Testing Strategy

- **Existing 19 tests**: Must pass as-is. They test via `data-testid` and `fireEvent` — they are implementation-agnostic as long as the DOM structure and testids are preserved. Tests are relocated to `initial-consequence-step/__tests__/` in Task 1.
- **New unit tests for helpers** (Task 3 — immediately after extraction in Task 2):
  - `getFilteredOptions`: 2 cases (Personnages vs non-Personnages)
  - `buildConsequenceEntry`: 6 valid types + 3 null cases (`permanent_injury` sans stat, `haine` sans player, `rancune` sans player). Each null case must assert `console.warn` was called with a descriptive message.
  - `getChipLabel`: 7 branches (6 types, but `permanent_injury` has a sub-case where `PERMANENT_INJURY_SUBTABLE.find()` returns `undefined` for an invalid stat — expected fallback: raw `entry.stat` string used as label)
- **Hook not tested separately**: The hook is fully exercised through the existing 19 component tests. No need for `renderHook` tests.

### Notes

- The `CampaignPlayer` type is currently defined locally. Keep it in `helpers.ts` and re-export via barrel `index.tsx`. Don't promote to a shared location unless another component needs it.
- `PERMANENT_INJURY_SUBTABLE` import from `injury-bonus-step` stays — it's used in `getChipLabel` and in the stat subtable JSX.
- Task ordering: 1 (structure) → 2 (helpers) → 3 (helper tests) → 4 (hook) → 5 (Tailwind) → 6 (sub-components + cleanup). Tailwind before sub-components avoids touching each file twice. Helper tests immediately after extraction catches bugs before building on top. Each task ends with a passing test run AND a dedicated commit (6 commits total — clean rollback points).

## Review Notes

- Adversarial review completed (Opus agent)
- Findings: 13 total, 13 fixed, 0 skipped
- Resolution approach: auto-fix all (including pre-existing bugs)
- Notable fix: F1 (Critical) — `grave_injury` was missing `stat: 'pv', delta: -1` in `buildConsequenceEntry`, causing Zod validation failure server-side. Pre-existing bug in original code, now fixed.
- F10 — Added `InitialConsequenceType` union type to replace stringly-typed chain
- AC-4 updated: `grave_injury` now correctly produces `{ unitId, type: 'grave_injury', stat: 'pv', delta: -1 }`
