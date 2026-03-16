---
title: 'UnitCard Compact Table Layout'
slug: 'unitcard-compact-table'
created: '2026-03-16'
status: 'implementation-complete'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['react', 'typescript', 'tailwind-v4-css-tokens', 'inline-react-styles']
files_to_modify: ['src/components/unit-card.tsx', 'src/lib/delta-composer.ts', '_bmad-output/planning-artifacts/ux-design-specification/component-strategy.md']
code_patterns: ['inline-styles-throughout', 'sub-components-for-sections', 'STAT_KEYS-const-array', 'ComposedSubProfile-has-label-isMount-stats']
test_patterns: ['no-existing-unit-card-tests']
---

# Tech-Spec: UnitCard Compact Table Layout

**Created:** 2026-03-16

## Overview

### Problem Statement

The current UnitCard component repeats the stat header row (M, CC, CT, F, E, PV, I, A, Cd) for each sub-profile and displays profile labels as separate uppercase banners above each stat block. This wastes significant vertical space on mobile, especially for units with 2-3 profiles (e.g., mounted characters).

### Solution

Refactor UnitCard into a single compact `<table>` with a "Profil" column on the left (fixed width, horizontal scroll on overflow) and all profiles stacked as rows under a single header. Mount profiles sorted last with blue left border on the Profil cell only, plus a "Monture" annotation below the table when mounts are present.

### Scope

**In Scope:**
- Refactor `UnitCard` JSX: replace per-sub-profile blocks with a single unified `<table>`
- Add "Profil" column (fixed width, left-aligned) with horizontal scroll for long names
- Stat header row displayed once at top
- All profiles stacked as `<tr>` rows
- Mount profiles sorted to bottom of table
- Mount identification: `border-left: 2px solid var(--color-info)` on Profil cell only
- "Monture" annotation below table (blue var(--color-info), 0.7rem) — only if mount profiles exist
- Card header (unit name, tier pill, action) unchanged
- Delta chips row unchanged
- Stat cell coloring (bonus/malus) preserved
- Update `component-strategy.md` UX spec
- Update `MEMORY.md`

**Out of Scope:**
- Test creation or modification
- Changes to `tier.ts`
- DB migrations, API changes, new dependencies

**Behavioral change note:** Mount sorting at render time is NEW behavior. The current code renders sub-profiles in DB `sortOrder` without re-sorting. This refactor explicitly sorts non-mount first, mount last. If the DB already orders mounts last via `sortOrder`, the explicit sort is redundant but harmless (stable sort preserves original order for equal values).

## Context for Development

### Codebase Patterns

- Current UnitCard uses inline React styles throughout (no Tailwind classes)
- `SubProfileSection` component renders header + stats per sub-profile — will be replaced
- `StatCell` component handles bonus/malus coloring — reusable as-is
- `DeltaChips` component is independent — no changes needed
- `tierBorderStyle` function returns inline styles — no changes needed
- CSS tokens defined in `src/styles/globals.css` via CSS custom properties

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/components/unit-card.tsx` | Target component to refactor |
| `src/lib/delta-composer.ts` | Types: `ComposedUnitView`, `ComposedSubProfile`, `StatEntry` |
| `src/lib/tier.ts` | `getTierLabel`, `getTierColor` helpers |
| `_bmad-output/planning-artifacts/sprint-change-proposal-2026-03-16-unitcard-compact.md` | Source requirement |
| `_bmad-output/planning-artifacts/ux-design-specification/component-strategy.md` | UX spec to update |

### Technical Decisions

- **Table vs CSS Grid:** Use semantic `<table>` with `<thead>`/`<tbody>` — natural fit for tabular stat data, better accessibility (screen readers announce column headers)
- **Table layout:** `table-layout: fixed` — ensures uniform stat column widths across all UnitCards, prevents "jitter" from varying stat values
- **Profil column:** Fixed width `5rem` (scales with user font-size for accessibility), left-aligned. Cells use `whiteSpace: 'nowrap'`, `overflow: 'hidden'`, `textOverflow: 'ellipsis'` to handle long names within the fixed width
- **Scroll strategy:** `overflow-x: auto` on a `<div>` wrapper around the `<table>` (not on the table itself — tables don't handle overflow directly). Entire table scrolls together (no sticky Profil column — not worth the complexity for 2-3 row tables)
- **Styling approach:** Inline React styles consistent with existing component patterns. Dynamic values (bonus/malus colors) via inline styles
- **Mount sorting:** `[...subProfiles].sort((a, b) => Number(a.isMount) - Number(b.isMount))` — immutable sort, non-mount first, mount last. Uses spread+sort for broad compat (avoids ES2023 `toSorted()` requirement)
- **StatCell integration:** `StatCell` keeps returning a `<div>` (preserves reusability outside tables). Each stat cell is wrapped in a `<td>` that provides table structure, and `StatCell` renders its styled content inside. Pattern: `<td style={...}><StatCell ... /></td>`

## Implementation Plan

### Tasks

- [x] Task 1: Remove `SubProfileSection` and `SubProfileSectionProps`, replace with unified table layout
  - File: `src/components/unit-card.tsx`
  - Action: Delete `SubProfileSection` component (lines 49-131) and its `SubProfileSectionProps` interface. Replace the `composedView.subProfiles.map()` call in the main `UnitCard` component with a new `<div style={{ overflowX: 'auto' }}>` wrapper containing a single `<table>`.
  - Notes: Keep `StatCell` returning `<div>` — wrap in `<td>` in the table. This preserves StatCell reusability.

- [x] Task 2: Build the `<table>` with `<thead>` header row
  - File: `src/components/unit-card.tsx`
  - Action: Create `<table>` with `table-layout: fixed`, `width: 100%`, `border-collapse: collapse`. Add `<thead>` with a single `<tr>` containing: one `<th>` "Profil" (width ~5rem, left-aligned, font: var(--font-body), fontSize 0.7rem, fontWeight 600, color var(--color-text-secondary)) + nine `<th>` for each STAT_KEY (centered, same font styling as current header cells).
  - Notes: Background: `var(--color-stats-bg)`. Each `<th>` gets `borderBottom: '1px solid var(--color-border)'` (cell-level, not row-level — matches current per-cell border pattern). `<th>` padding: `0.2rem 0` (matching current header cell padding). Stat `<td>` wrapping `<StatCell>` must have `padding: 0` to avoid double-padding with StatCell's internal `0.25rem 0`.

- [x] Task 3: Render sub-profile rows in `<tbody>` with mount sorting
  - File: `src/components/unit-card.tsx`
  - Action: Sort subProfiles immutably: `[...composedView.subProfiles].sort((a, b) => Number(a.isMount) - Number(b.isMount))`. Map each to a `<tr>` containing: one `<td>` with profile label (left-aligned, fontSize 0.75rem, fontFamily var(--font-body), padding 0.25rem 0.375rem, fallback label "Profil" if empty) + nine `<td>` each wrapping a `<StatCell>` component.
  - Notes: Stat `<td>` cells: centered, `border-left: 1px solid var(--color-border)`, background `var(--color-stats-bg)`. Wrap `<StatCell>` in `<td>`. Profil `<td>` cells use `whiteSpace: 'nowrap'`, `overflow: 'hidden'`, `textOverflow: 'ellipsis'`. Fallback: `(sp.label || '').trim() || 'Profil'` (null-safe). Use array index as React key (`key={idx}`) — labels are not unique per unit so `sp.label` would cause duplicate key collisions. Index is safe here: the list is rebuilt each render and sort order is deterministic.

- [x] Task 4: Add mount identification — blue left border on Profil cell
  - File: `src/components/unit-card.tsx`
  - Action: On the Profil `<td>` for mount rows (`sp.isMount === true`), add `borderLeft: '2px solid var(--color-info)'`. Non-mount Profil cells get no special border.
  - Notes: Only the Profil cell gets the blue border, not the entire row.

- [x] Task 5: Add "Monture" annotation below table
  - File: `src/components/unit-card.tsx`
  - Action: After the table wrapper `<div>`, conditionally render a "Monture" legend if any subProfile has `isMount: true`. Style: `fontSize: 0.7rem`, `color: var(--color-info)`, `padding: 0.25rem 0.5rem`, `fontFamily: var(--font-body)`. Include a small blue square indicator (inline `<span>` with `display: inline-block`, `width: 8px`, `height: 8px`, `background: var(--color-info)`, `marginRight: 0.375rem`) to visually match the border.
  - Notes: Compute `hasMount` once: `composedView.subProfiles.some(sp => sp.isMount)`.

- [x] Task 6: Remove dead `UnitCardProps` from `delta-composer.ts`
  - File: `src/lib/delta-composer.ts`
  - Action: Delete the `UnitCardProps` export (lines 48-52). The actual `UnitCardProps` used by the component is defined locally in `unit-card.tsx` and includes the `action` prop. The one in `delta-composer.ts` is a stale duplicate without `action`.
  - Notes: Search codebase for imports of `UnitCardProps` from `delta-composer` to confirm no consumers exist before deleting.

- [x] Task 7: Update `component-strategy.md`
  - File: `_bmad-output/planning-artifacts/ux-design-specification/component-strategy.md`
  - Action: Verify UnitCard description already matches the compact table layout (updated by sprint change proposal). If already correct, no change needed.
  - Notes: Current description already reads: "Tableau compact : colonne "Profil" à gauche + 9 col stats..." — should be up to date.

- [x] Task 8: Update `MEMORY.md`
  - File: `/home/ben/.claude/projects/-home-ben-dev-campaign-tow/memory/MEMORY.md`
  - Action: Verify UnitCard description in "Carte d'unité" section matches new layout. Update if needed to reflect: single table, header displayed once, `table-layout: fixed`, scroll wrapper, mount border on Profil cell only.
  - Notes: Memory section should already be partially updated from sprint change proposal.

- [x] Task 9: Quality gates — typecheck + lint + build
  - Action: Run `pnpm typecheck && pnpm lint && pnpm build` to verify no regressions.
  - Notes: No test run needed (tests out of scope). Visual verification on mobile viewport recommended after build.

### Acceptance Criteria

- [x] AC 1: Given a unit with a single sub-profile, when the UnitCard renders, then a single `<table>` is displayed with one header row (Profil + 9 stat columns) and one data row containing the profile label and stat values.

- [x] AC 2: Given a unit with multiple non-mount sub-profiles, when the UnitCard renders, then all profiles appear as rows in the same table under a single shared header row. The stat header (M, CC, CT, F, E, PV, I, A, Cd) is displayed only once.

- [x] AC 3: Given a unit with both mount and non-mount sub-profiles, when the UnitCard renders, then non-mount profiles appear first and mount profiles appear last in the table rows.

- [x] AC 4: Given a mount sub-profile row, when the UnitCard renders, then the Profil cell (only) has a `border-left: 2px solid var(--color-info)`. Other cells in the row have no blue border.

- [x] AC 5: Given a unit with at least one mount sub-profile, when the UnitCard renders, then a "Monture" annotation with a blue indicator appears below the table. Given a unit with no mount sub-profiles, then no annotation is shown.

- [x] AC 6: Given a sub-profile with modified stats (bonus or malus), when the UnitCard renders, then bonus stats display green (var(--color-bonus)) with green background and malus stats display red (var(--color-malus)) with red background, identical to current behavior.

- [x] AC 7: Given a UnitCard on a narrow mobile viewport where the table exceeds available width, when the user scrolls horizontally, then the entire table (Profil column + stat columns) scrolls together within the card.

- [x] AC 8: Given a sub-profile with an empty label, when the UnitCard renders, then the Profil cell displays "Profil" as fallback text.

- [x] AC 9: Given a unit with tier > 0, when the UnitCard renders, then the card header (unit name, tier pill, action button) and tier border/glow are unchanged from current behavior.

- [x] AC 10: Given a unit with stat deltas or gains, when the UnitCard renders, then delta chips are displayed below the table, unchanged from current behavior.

## Additional Context

### Dependencies

None — purely visual refactor of existing component. No new packages, no DB changes, no API changes.

### Testing Strategy

Out of scope per user decision. Quality gates:
- `pnpm typecheck` — verify no type errors from JSX restructuring
- `pnpm lint` — verify no lint violations
- `pnpm build` — verify production build succeeds
- Manual visual check on mobile viewport (~375px width) recommended

### Notes

- Source requirement: Sprint Change Proposal `unitcard-compact-table` (2026-03-16)
- ~15 players use phones during games — mobile compactness is the primary driver
- `StatCell` keeps returning `<div>` — wrapped in `<td>` for table integration. Decision: preserve reusability over table-semantic purity.
- `table-layout: fixed` requires explicit width on Profil `<th>` (`5rem`). Stat columns auto-distribute remaining space equally (implicit with `table-layout: fixed` when no width set).
- `UnitCardProps` in `delta-composer.ts` is dead code (duplicate without `action` prop) — cleaned up in Task 6.
