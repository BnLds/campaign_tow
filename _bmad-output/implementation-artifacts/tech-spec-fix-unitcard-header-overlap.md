---
title: 'Integrate edit button into UnitCard header flex layout'
slug: 'fix-unitcard-header-overlap'
created: '2026-03-16'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['react', 'tanstack-start', 'inline-css', 'vitest', 'testing-library']
files_to_modify: ['src/components/unit-card.tsx', 'src/routes/armies/$armyId.tsx']
code_patterns: ['inline styles (no CSS modules)', 'data-testid attributes', 'prop-based composition']
test_patterns: ['vitest + testing-library in tests/ dir', 'test file: tests/2-3-unit-card.test.tsx']
---

# Tech-Spec: Integrate edit button into UnitCard header flex layout

**Created:** 2026-03-16

## Overview

### Problem Statement

On narrow mobile viewports (≤ 375px, e.g. iPhone SE), the unit name and tier pill in the UnitCard header overlap with the "✏ Modifier" edit button. The root cause is that the edit button is positioned absolutely (`position: absolute; top: 0.625rem; right: 0.75rem`) over the UnitCard **from the parent army route**, while the header flex row has no overflow handling or reserved space for the button.

### Solution

Move the edit button inside the UnitCard header flex row via a new `action` prop (ReactNode). The unit name gets `flex: 1; min-width: 0` with text-overflow ellipsis to handle long names gracefully. The absolute positioning wrapper in the army view is removed.

### Scope

**In Scope:**
- UnitCard header layout refactor (flex integration of action slot)
- Unit name truncation with ellipsis + `title` attribute for hover access
- Removal of absolute-positioned button wrapper in `$armyId.tsx`
- Passing the edit button via `action` prop
- Fix `overflow: hidden` on card root to prevent focus outline clipping

**Out of Scope:**
- Rest of UnitCard (stats bar, deltas, sub-profiles, XP tier frame)
- Edit modal logic/behavior
- Other views that use UnitCard without an action

## Context for Development

### Codebase Patterns

- Inline styles throughout (no CSS modules or Tailwind utility classes on components)
- `data-testid` attributes for test selectors
- UnitCard is a standalone component in `src/components/unit-card.tsx`
- The edit button is currently rendered in the army route (`$armyId.tsx`), not inside UnitCard, using absolute positioning over the card
- UnitCard props interface: `{ unit, composedView, tier }` — no action slot yet

### Files to Reference

| File | Purpose | Anchors |
| ---- | ------- | ------- |
| `src/components/unit-card.tsx` | UnitCard component — header flex layout | `interface UnitCardProps` (props), `export function UnitCard` (component), `{/* Header: unit name + tier pill */}` (header div) |
| `src/routes/armies/$armyId.tsx` | Army view — edit button wrapper | `{cards.map((card) =>` (rendering loop), `data-testid={`edit-unit-` (edit button) |
| `tests/2-3-unit-card.test.tsx` | Existing UnitCard tests | all |

### Technical Decisions

- **Prop `action?: React.ReactNode`** — keeps UnitCard generic; any view can pass any action element (or nothing). Optional prop = backward compatible.
- **Inline styles** — consistent with existing codebase pattern, no new CSS dependencies
- **Ellipsis truncation** — `overflow: hidden; text-overflow: ellipsis; white-space: nowrap` on name span, with `flex: 1; min-width: 0` to allow shrinking. A `title={unit.name}` attribute is added so the full name is accessible on hover.
- **`flexShrink: 0`** on tier pill and action wrapper — they keep their size, name absorbs the squeeze. No `marginLeft: 'auto'` needed since `flex: 1` on the name already pushes subsequent items right.
- **`overflow: hidden` → `overflow: clip`** on card root — `clip` still hides content overflow but does not create a scroll container, and browser focus outlines are not clipped by `overflow: clip` (they are by `overflow: hidden`).
- **Action prop is an opaque ReactNode** — the button JSX (with its `onClick` closure capturing parent state) is constructed in `$armyId.tsx` and passed as-is. UnitCard does not need to know about handlers or state — it just renders the node.

### Pre-implementation Check

**Before starting, the dev agent MUST:**
1. `grep -r '<UnitCard' src/` to confirm all call sites. Currently expected: only `src/routes/armies/$armyId.tsx`. If others exist, verify they still work with the optional prop.
2. `grep -r 'edit-unit-' e2e/` to check if E2E tests locate the edit button by `data-testid`. If so, verify selectors still work after the DOM restructuring (button moves from absolute sibling to inside UnitCard header).

## Implementation Plan

### Tasks

- [x] Task 1: Add `action` prop to UnitCard interface
  - File: `src/components/unit-card.tsx`
  - Anchor: `interface UnitCardProps`
  - Action: Add `action?: React.ReactNode` to the interface
  - Notes: Import `React` is already present. Optional prop = no breaking change.

- [x] Task 2: Update UnitCard header layout for flex shrink + ellipsis + action slot
  - File: `src/components/unit-card.tsx`
  - Anchor: `export function UnitCard` and `{/* Header: unit name + tier pill */}`
  - Action:
    1. Destructure `action` from props in the function signature
    2. On the card root div, change `overflow: 'hidden'` to `overflow: 'clip'`
    3. On the unit name `<span>`, add styles and title attribute:
       ```tsx
       <span
         title={unit.name}
         style={{
           fontFamily: 'var(--font-display)',
           fontWeight: 700,
           fontSize: '1rem',
           color: 'var(--color-text-primary)',
           flex: 1,
           minWidth: 0,
           overflow: 'hidden',
           textOverflow: 'ellipsis',
           whiteSpace: 'nowrap',
         }}
       >
         {unit.name}
       </span>
       ```
    4. On the tier pill `<span>`, add `flexShrink: 0`
    5. After the tier pill conditional, render the action slot:
       ```tsx
       {action && (
         <div style={{ flexShrink: 0 }}>{action}</div>
       )}
       ```
  - Notes: The name span becomes the flexible element that shrinks. Tier pill and action slot never shrink. No `marginLeft: 'auto'` — `flex: 1` on name already handles alignment.

- [x] Task 3: Remove absolute-positioned button wrapper in army view and pass action as prop
  - File: `src/routes/armies/$armyId.tsx`
  - Anchor: `{cards.map((card) =>` and `data-testid={`edit-unit-`
  - Action:
    1. Remove the `<div style={{ position: 'relative' }}>` wrapper around UnitCard
    2. Remove the absolutely-positioned `<button>` block
    3. Pass the edit button as the `action` prop on `<UnitCard>`:
       ```tsx
       <UnitCard
         unit={card.unit}
         composedView={card.composedView}
         tier={card.tier}
         action={isOwner ? (
           <button
             data-testid={`edit-unit-${card.unit.id}`}
             onClick={() => setEditingUnitId(editingUnitId === card.unit.id ? null : card.unit.id)}
             style={{
               background: 'none',
               border: 'none',
               cursor: 'pointer',
               color: 'var(--color-text-secondary)',
               fontSize: '0.75rem',
               padding: '0.25rem 0.5rem',
             }}
           >
             ✏ Modifier
           </button>
         ) : undefined}
       />
       ```
    4. The `UnitEditPanel` block below remains unchanged (still outside UnitCard, keyed on `editingUnitId`)
  - Notes: The button JSX with its `onClick` closure (capturing `setEditingUnitId` and `editingUnitId` from `$armyId.tsx` state) is passed as an opaque ReactNode. UnitCard does not manage this state — it just renders the node.

### Acceptance Criteria

- [x] AC1: Given a UnitCard with a long unit name (e.g. "Chef de Guerre Gobelin sur Araignée Géante") and a tier pill and an edit button, when rendered at 375px viewport width, then the name truncates with ellipsis and neither the tier pill nor the edit button overlap the name.
- [x] AC2: Given a UnitCard without an `action` prop, when rendered, then the DOM structure is identical to the current output (verified by existing unit tests passing unchanged).
- [x] AC3: Given a UnitCard with an `action` prop containing an edit button, when the button is clicked, then the edit panel opens (existing behavior preserved).
- [x] AC4: Given the existing test suite (`tests/2-3-unit-card.test.tsx`), when all tests are run, then all 13 `it()` blocks pass without modification (backward compatible).
- [x] AC5: Given the edit button inside UnitCard, when the button receives keyboard focus, then the focus outline is fully visible and not clipped by the card container.

## Additional Context

### Dependencies

None — pure layout refactor with no new packages.

### Testing Strategy

- **Existing tests:** All 13 `it()` blocks in `tests/2-3-unit-card.test.tsx` must pass unchanged (prop is optional).
- **E2E check:** Run `grep -r 'edit-unit-' e2e/` — if E2E tests reference the edit button `data-testid`, verify they still pass after the DOM restructuring.
- **Manual testing:** Open `/armies/<id>` on iPhone SE (375px) viewport in Chrome DevTools. Verify:
  - Long unit names truncate with "…" and show full name on hover (title attribute)
  - Tier pill is fully visible
  - "✏ Modifier" button is fully visible and clickable
  - Edit panel still opens on click
  - Tab to the edit button — focus outline is not clipped
  - Test on a non-owner view — card renders without action, no visual regression

### Notes

- The UX mockup (`_bmad-output/planning-artifacts/ux-mockup.html`) shows name + tier pill in one row — the fix preserves this layout while making it robust.
- If a future design wants the action on a second row on very narrow screens, that can be a separate media-query enhancement later.
- `whiteSpace: 'nowrap'` removed from the button — "Modifier" is short enough and removing it avoids rigidity for future i18n changes.

## Review Notes
- Adversarial review completed
- Findings: 4 total, 0 fixed, 4 skipped
- Resolution approach: skip
- F1 (Medium/real): `overflow: clip` browser compat — acceptable for target audience
- F2 (Low/real): `action && ...` guard safe at current call site
- F3 (Low/real): `title` shows on non-truncated names — minor UX paper cut
- F4 (Low/noise): `flexShrink: 0` on tier badge — by design
