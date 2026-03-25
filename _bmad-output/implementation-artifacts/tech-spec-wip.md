---
title: 'Refactor — Extract server functions into shared modules'
slug: 'refactor-extract-server-fns'
created: '2026-03-25'
status: 'in-progress'
stepsCompleted: [1]
tech_stack: ['TanStack Start', 'createServerFn', 'Zod', 'Drizzle']
files_to_modify: ['src/routes/armies/$armyId.tsx', 'src/routes/admin/index.tsx']
code_patterns: ['createServerFn with dynamic import', 'armyOwnerMiddleware / adminMiddleware', 'ServerResult<T> return type', 'prop-injection for server fns into UnitEditPanel']
test_patterns: []
---

# Tech-Spec: Refactor — Extract server functions into shared modules

**Created:** 2026-03-25

## Overview

### Problem Statement

The route files `armies/$armyId.tsx` (935 lines, 12 server fns) and `admin/index.tsx` (16 server fns) are monoliths mixing server logic with UI components. The "unit belongs to army" ownership guard is duplicated 13+ times across `$armyId.tsx` with minor variations (error code, message). The `ArmyView` component is trapped inside the route file, making it hard to test and maintain independently.

### Solution

Create a `src/server-fns/` barrel organized by domain, factorize repeated ownership guards into reusable helpers, and extract `ArmyView` into `src/components/army-view.tsx`. Preserve the existing prop-injection pattern for `UnitEditPanel` (server fns passed as typed props, not imported directly by the component).

### Scope

**In Scope:**
- Extract all 12 server fns from `armies/$armyId.tsx` into `src/server-fns/` (domain-based files)
- Extract all 16 server fns from `admin/index.tsx` into `src/server-fns/`
- Factorize ownership guards: `assertUnitBelongsToArmy`, `assertModifierBelongsToArmy`, `assertGainBelongsToArmy`, `assertSubProfileBelongsToArmy`
- Extract `ArmyView` component into `src/components/army-view.tsx`
- Preserve prop-injection pattern for `UnitEditPanel`
- Keep `VALID_STATS`, `groupUnitsByType` and other helper code co-located with their consumers

**Out of Scope:**
- Server fns in other routes (login, settings, invite, post-match, index) — small files, not worth extracting now
- Refactoring the `AdminPage` component itself
- Functional changes or new features
- Changing the middleware architecture

## Context for Development

### Codebase Patterns

- **Server fns use dynamic imports** for DB queries: `const { fn } = await import('../../db/queries')` — this pattern must be preserved (tree-shaking / code-splitting boundary).
- **`armyOwnerMiddleware`** already validates caller owns the army via `armyId` in input. The unit-level guards are a secondary authorization check (unit belongs to army).
- **`UnitEditPanel`** receives 10 server fns as typed props (lines 121–131 of `unit-edit-panel.tsx`). It defines its own callable types locally — does NOT import server fn types. This prop-injection pattern prevents server-only code from leaking to the client bundle.
- **`ServerResult<T>`** union type in `src/lib/types.ts` — used by admin fns explicitly, armyId fns use inline `{ success: true/false }` without the type annotation.
- **Error codes are inconsistent** — some fns return `'BAD_REQUEST'`, others `'FORBIDDEN'` for the same ownership failure. This refactor should normalize them.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/routes/armies/$armyId.tsx` | 12 server fns (unit CRUD) + ArmyView component — primary extraction target |
| `src/routes/admin/index.tsx` | 16 server fns (player/army/match admin) — secondary extraction target |
| `src/lib/middleware.ts` | `authMiddleware`, `adminMiddleware`, `armyOwnerMiddleware` definitions |
| `src/lib/types.ts` | `ServerResult<T>` type definition |
| `src/components/unit-edit-panel.tsx` | Consumer of 10 server fns via prop injection — interface must be preserved |
| `src/lib/validators.ts` | Zod schemas used by admin server fns |

### Technical Decisions

- **Barrel structure**: `src/server-fns/index.ts` re-exports from domain files. Domain files: `unit-mutations.ts` (unit CRUD from armyId), `army-queries.ts` (army loading), `admin.ts` (all admin fns).
- **Guard helpers** go in `src/server-fns/guards.ts` — pure async functions that throw or return error results.
- **`VALID_STATS` constant** moves to `src/server-fns/unit-mutations.ts` (co-located with its only consumer).
- **`groupUnitsByType` helper** moves to `src/components/army-view.tsx` (co-located with its only consumer).

## Implementation Plan

### Tasks

_To be filled in Step 3_

### Acceptance Criteria

_To be filled in Step 3_

## Additional Context

### Dependencies

No new dependencies. Pure structural refactor using existing packages.

### Testing Strategy

_To be filled in Step 3_

### Notes

- `deleteMatchWithXpRollback` is called from both `index.tsx` (player) and `admin/index.tsx` (admin) with different middlewares — these stay as separate server fns but could share the DB query import path.
- `getAllArmies` is similarly used in `armies/index.tsx` and `admin/index.tsx` — DB query is already shared, server fns stay separate (different middleware).
