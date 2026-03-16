---
title: 'UnitCard Compact Table Layout'
slug: 'unitcard-compact-table'
created: '2026-03-16'
status: 'in-progress'
stepsCompleted: [1, 2]
tech_stack: ['react', 'typescript', 'tailwind-v4-css-tokens', 'inline-react-styles']
files_to_modify: ['src/components/unit-card.tsx', '_bmad-output/planning-artifacts/ux-design-specification/component-strategy.md']
code_patterns: ['inline-styles-throughout', 'sub-components-for-sections', 'STAT_KEYS-const-array', 'ComposedSubProfile-has-label-isMount-stats', 'subProfiles-sorted-by-sortOrder-from-DB']
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
- Mount identification: `border-left: 2px solid #2a5ab8` on Profil cell only
- "Monture" annotation below table (blue #2a5ab8, 0.7rem) — only if mount profiles exist
- Card header (unit name, tier pill, action) unchanged
- Delta chips row unchanged
- Stat cell coloring (bonus/malus) preserved
- Update `component-strategy.md` UX spec
- Update `MEMORY.md`

**Out of Scope:**
- Test creation or modification
- Changes to `delta-composer.ts` or `tier.ts`
- DB migrations, API changes, new dependencies

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
- **Profil column:** Fixed width ~5rem (80px), left-aligned
- **Scroll strategy:** `overflow-x: auto` on a `<div>` wrapper around the `<table>` (not on the table itself — tables don't handle overflow directly). Entire table scrolls together (no sticky Profil column — not worth the complexity for 2-3 row tables)
- **Styling approach:** Inline React styles consistent with existing component patterns. Dynamic values (bonus/malus colors) via inline styles
- **Mount sorting:** `[...subProfiles].sort((a, b) => Number(a.isMount) - Number(b.isMount))` — immutable sort, non-mount first, mount last. Uses spread+sort for broad compat (avoids ES2023 `toSorted()` requirement)
- **StatCell reuse:** Existing `StatCell` component reused inside `<td>` elements — bonus/malus styling preserved as-is

## Implementation Plan

### Tasks

### Acceptance Criteria

## Additional Context

### Dependencies

None — purely visual refactor of existing component.

### Testing Strategy

Out of scope per user decision. Existing build + typecheck gates serve as regression check.

### Notes

- Source requirement: Sprint Change Proposal `unitcard-compact-table` (2026-03-16)
- ~15 players use phones during games — mobile compactness is the primary driver
