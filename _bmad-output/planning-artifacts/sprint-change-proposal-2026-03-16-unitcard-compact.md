# Sprint Change Proposal — UnitCard Compact Table Layout

**Date:** 2026-03-16
**Triggered by:** UX feedback from Ben (product owner) — mobile compactness improvement
**Scope classification:** Minor — Direct implementation by dev team
**Approved:** Yes — 2026-03-16

---

## 1. Issue Summary

### Problem Statement

The current UnitCard component repeats the stat header row (M, CC, CT, F, E, PV, I, A, Cd) for each sub-profile, and displays profile labels as separate uppercase banners above each stat block. This wastes significant vertical space on mobile, especially for units with 2-3 profiles (e.g., mounted characters).

### Discovery Context

Ben provided a reference screenshot showing the desired format: a single compact table with a "Profil" column on the left and all profiles stacked as rows under a single header. The goal is to maximize readable information density on mobile viewports (~15 players using phones during games).

### Evidence

Reference image: OWB-style table layout with columns `Figurine | M | CC | CT | F | E | PV | I | A | Cd` and profiles stacked vertically.

---

## 2. Impact Analysis

### Epic Impact

| Epic | Status | Impact |
|---|---|---|
| Epic 2 (Army Setup & Unit Card) | done | Retroactive refinement of UnitCard component — no epic reopening needed |
| Epic 3 (Timeline & Matches) | in-progress | None |
| Epic 4 (Post-Match Flow) | backlog | UnitCard reuse — new layout applies automatically |
| Epic 5 (References) | backlog | None |

### Story Impact

- **Story 2.3 (Unit Card Display):** Acceptance criteria still met — "9-stat horizontal bar" preserved, restructured as table with Profil column.
- No current or future stories require modification.

### Artifact Conflicts

| Artifact | Conflict | Action |
|---|---|---|
| PRD | None — FR requirements still satisfied | No change needed |
| Architecture | None — purely visual change | No change needed |
| UX Spec (`component-strategy.md`) | UnitCard description outdated | Update description |
| Memory (`MEMORY.md`) | UnitCard description outdated | Update description |
| Tests (`src/components/__tests__/`) | DOM structure assertions | Adapt to new table layout |

### Technical Impact

- **Single component change:** `src/components/unit-card.tsx`
- **No DB migration, no API change, no new dependencies**
- **No logic change** in `delta-composer.ts` or `tier.ts`

---

## 3. Recommended Approach

**Selected path:** Direct Adjustment — modify existing component

**Rationale:**
- Change is isolated to one UI component (`UnitCard`)
- No architectural or data model implications
- Low effort, low risk
- Immediate UX improvement for mobile users

**Effort estimate:** Low
**Risk level:** Low
**Timeline impact:** None — can be done within current sprint

---

## 4. Detailed Change Proposals

### 4.1 — UnitCard Component (`src/components/unit-card.tsx`)

**Layout change: per-sub-profile blocks → single unified table**

Visual result:
```
┌──────────────┬───┬────┬────┬───┬───┬────┬───┬───┬────┐
│  Profil      │ M │ CC │ CT │ F │ E │ PV │ I │ A │ Cd │
├──────────────┼───┼────┼────┼───┼───┼────┼───┼───┼────┤
│ Ranger       │ 3 │  4 │  4 │ 3 │ 4 │  1 │ 2 │ 1 │  9 │
│ Ol' Deadeye  │ 3 │  4 │  4 │ 3 │ 4 │  1 │ 2 │ 2 │  9 │
┃ Destrier     │ 7 │  3 │  0 │ 3 │ 3 │  1 │ 3 │ 1 │  5 │
└──────────────┴───┴────┴────┴───┴───┴────┴───┴───┴────┘
  ┃ Monture
```

**Specific changes:**
1. Replace per-sub-profile header+stats blocks with a single `<table>` or CSS grid
2. Add "Profil" column (left-aligned) containing profile labels
3. Stat header row (M, CC, CT, F, E, PV, I, A, Cd) displayed once at top
4. All profiles stacked as table rows
5. Mount profiles (`isMount: true`) sorted to bottom of table
6. Mount profiles identified by `border-left: 2px solid #2a5ab8` (info blue from palette)
7. Annotation below table: "Monture" legend in blue `#2a5ab8`, `fontSize: 0.7rem` — only shown if mount profiles exist
8. Card header (unit name, tier pill, action button) unchanged above table
9. Delta chips row unchanged below table
10. Stat cell coloring (bonus green / malus red) unchanged

### 4.2 — UX Spec (`component-strategy.md`)

**OLD:**
```
| `UnitCard` | Stats 9 col en barre horizontale, sous-profils, delta chips, cadre palier XP (border + glow) |
```

**NEW:**
```
| `UnitCard` | Tableau compact : colonne "Profil" à gauche + 9 col stats. Tous les profils empilés en lignes. Montures en dernier avec bordure gauche bleue (#2a5ab8) + annotation légende sous le tableau. Delta chips en bas. Cadre palier XP (border + glow). |
```

### 4.3 — Memory (`MEMORY.md`)

Update UnitCard description:
- Tableau compact : colonne "Profil" (alignée gauche) + 9 col stats
- Tous les profils empilés en lignes dans un seul tableau, en-tête affiché une seule fois
- Montures toujours en dernier, identifiées par bordure gauche bleue (#2a5ab8) + annotation "Monture" sous le tableau

### 4.4 — Tests (`src/components/__tests__/`)

Adapt UnitCard test assertions to match new DOM structure (table layout instead of per-sub-profile flex blocks).

---

## 5. Implementation Handoff

**Change scope:** Minor — direct implementation by dev team

**Recommended implementation vehicle:** Quick Tech Spec → `quick-dev` workflow

**Implementation sequence:**
1. Refactor `UnitCard` JSX: unified table layout with Profil column
2. Sort sub-profiles: non-mount first, mount last
3. Add mount border-left + annotation below table
4. Update tests to match new DOM structure
5. Update `component-strategy.md` UX spec
6. Update `MEMORY.md`
7. Quality gates: typecheck, lint, build, visual check on mobile viewport

**Success criteria:**
- All unit profiles displayed in a single compact table per card
- "Profil" column left-aligned with profile names
- Stat header displayed only once per card
- Mount profiles sorted last with blue left border + "Monture" annotation
- Stat coloring (bonus/malus) preserved
- Tier border/glow on card preserved
- Delta chips display preserved
- No regressions on existing tests

---

*Generated by Correct Course workflow — 2026-03-16*
