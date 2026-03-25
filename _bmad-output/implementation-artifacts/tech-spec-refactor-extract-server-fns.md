---
title: 'Refactor — Extract server functions into shared modules'
slug: 'refactor-extract-server-fns'
created: '2026-03-25'
status: 'implementation-complete'
stepsCompleted: [1, 2, 3, 4, 5]
tech_stack: ['TanStack Start (createServerFn)', 'Zod v4', 'Drizzle ORM', 'React', 'Vitest']
files_to_modify: ['src/routes/armies/$armyId.tsx', 'src/routes/admin/index.tsx', 'src/server-fns/guards.ts (new)', 'src/server-fns/unit-mutations.ts (new)', 'src/server-fns/unit-queries.ts (new)', 'src/server-fns/admin-players.ts (new)', 'src/server-fns/admin-armies.ts (new)', 'src/server-fns/admin-matches.ts (new)', 'src/server-fns/index.ts (new)', 'src/components/army-view.tsx (new)', 'src/lib/army-utils.ts (new)', 'tests/2-4-unit-deltas-server.test.ts', 'tests/2-4-unit-edit-panel-component.test.ts', 'tests/3-1-routes.test.ts', 'tests/unit-graveyard.test.ts', 'tests/unit-nickname-server.test.ts', 'tests/bugfix-mount-flag.test.ts', 'tests/integration/admin.test.ts', 'tests/integration/admin-list-delete.test.ts', 'tests/integration/army-import.test.ts', 'tests/server-fns/create-match.test.ts']
code_patterns: ['createServerFn with dynamic import for DB queries', 'armyOwnerMiddleware / adminMiddleware / authMiddleware chain', 'ServerResult<T> return type', 'prop-injection for server fns into UnitEditPanel (11 typed props)', 'structural contract tests using readFileSync + regex assertions on source paths']
test_patterns: ['structural contract: readFileSync(resolve(root, "src/...")) + toContain/toMatch', 'no direct server fn imports in tests', 'unit tests on guards.ts (new)', 'smoke test post-refacto', 'client bundle verification']
---

# Tech-Spec: Refactor — Extract server functions into shared modules

**Created:** 2026-03-25

## Overview

### Problem Statement

The route files `armies/$armyId.tsx` (934 lines, 13 server fns) and `admin/index.tsx` (15 server fns) are monoliths mixing server logic with UI components. The "unit belongs to army" ownership guard is duplicated 12 times across `$armyId.tsx` with minor variations (error code, message). The `ArmyView` component is trapped inside the route file, making it hard to test and maintain independently.

### Solution

Create a `src/server-fns/` barrel organized by domain and authorization level, factorize repeated ownership guards into reusable return-based helpers (`GuardResult<T>`), extract `ArmyView` into `src/components/army-view.tsx`, and move pure helpers (`groupUnitsByType`, `TYPE_ORDER`) to `src/lib/army-utils.ts`. Preserve the existing prop-injection pattern for `UnitEditPanel`.

### Scope

**In Scope:**
- Extract all 13 server fns from `armies/$armyId.tsx` into `src/server-fns/` (2 files: queries + mutations)
- Extract all 15 server fns from `admin/index.tsx` into `src/server-fns/` (3 files: players, armies, matches)
- Create `src/server-fns/guards.ts` with `GuardResult<T>` return pattern
- Normalize error codes: `'FORBIDDEN'` for ownership failures, `'NOT_FOUND'` for missing entities
- Extract `ArmyView` component into `src/components/army-view.tsx`
- Extract `groupUnitsByType` + `TYPE_ORDER` into `src/lib/army-utils.ts`
- Preserve prop-injection pattern for `UnitEditPanel`
- Unit tests on `guards.ts`
- Update all structural contract tests to point to new file paths
- Smoke test post-refacto for server fn URL stability

**Out of Scope:**
- Server fns in other routes (login, settings, invite, post-match, index)
- Refactoring the `AdminPage` component itself or `UnitEditPanel` types
- Functional changes or new features
- Changing the middleware architecture
- Adding `POST_MATCH_IN_PROGRESS` to `ErrorCode` union (separate cleanup)

## Context for Development

### Codebase Patterns

- **Server fns use dynamic imports** for DB queries: `const { fn } = await import('../../db/queries')` — this pattern must be preserved (tree-shaking / code-splitting boundary). Import paths will change from `../../db/queries` to `../db/queries` after moving to `src/server-fns/`.
- **`armyOwnerMiddleware`** already validates caller owns the army via `armyId` in input. The unit-level guards are a secondary authorization check (unit belongs to army).
- **`UnitEditPanel`** receives 11 server fns as typed props (lines 121–131 of `unit-edit-panel.tsx`): `addStatModifierFn`, `removeStatModifierFn`, `addUnitGainFn`, `removeUnitGainFn`, `updateXpFn`, `updatePointsFn`, `updateNicknameFn`, `fetchUnitDeltasFn`, `toggleMountFn`, `sendToGraveyardFn`, `deleteUnitFn`. It defines its own callable types locally — does NOT import server fn types. This prop-injection pattern prevents server-only code from leaking to the client bundle. **Do not modify `UnitEditPanel` in this refactor.**
- **`ServerResult<T>`** union type in `src/lib/types.ts` with `ErrorCode` union: `'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'BAD_REQUEST' | 'VALIDATION_ERROR' | 'SERVER_ERROR' | 'CONFLICT'`. Used by admin fns explicitly; armyId fns use inline `{ success: true/false as const }` without the type annotation. After extraction, all fns should use `ServerResult<T>`. **Exception:** `sendToGraveyardFn` and `deleteUnitFn` return `'POST_MATCH_IN_PROGRESS'` which is NOT in `ErrorCode` — these two fns must keep an inline return type (see Task 3 notes) until `POST_MATCH_IN_PROGRESS` is added to `ErrorCode` in a separate cleanup.
- **Error codes are inconsistent** — some fns return `'BAD_REQUEST'`, others `'FORBIDDEN'` for the same ownership failure. This refactor normalizes to: `'FORBIDDEN'` for ownership, `'NOT_FOUND'` for missing entities.
- **`createServerFn` registration** — fns register at module import time. After extraction, each route file MUST ensure its fns are imported (directly or transitively). For `$armyId.tsx`, `loadArmyFn` is imported directly, and the 11 mutation fns + `fetchUnitDeltasFn` + `restoreUnitFn` are imported transitively via `army-view.tsx`. **Verify in Task 14** that transitive import is sufficient for server-side registration — if not, add explicit re-exports from the route file.
- **Server fn URL hashing** — TanStack Start generates fn IDs from file path + variable name. Moving files changes IDs. No cross-version concern for this app (single deployment), but worth a smoke test.
- **Structural contract tests** — ~10 test files use `readFileSync(resolve(root, 'src/routes/armies/$armyId.tsx'))` to read source as strings and assert patterns with `toContain`/`toMatch`. After extraction, these paths must be updated to the new `src/server-fns/` or `src/components/` locations. No test imports server fns directly.
- **DB queries barrel** — `src/db/queries/index.ts` re-exports from `players.ts`, `armies.ts`, `units.ts`, `matches.ts`, `evolutions.ts`. All server fns use dynamic `import('../../db/queries')`.
- **Validators** — Admin fns import schemas from `src/lib/validators.ts`; armyId fns define Zod schemas inline. After extraction, inline schemas stay with their server fns.
- **`createServerFn` client/server split** — TanStack Start strips handler code from client bundles, replacing it with an RPC stub. Importing server fns from `src/components/army-view.tsx` is safe — the client bundle will only contain the RPC wrapper, not DB imports. Verify this in Task 14.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/routes/armies/$armyId.tsx` | 13 server fns + ArmyView + groupUnitsByType — primary extraction target |
| `src/routes/admin/index.tsx` | 15 server fns + AdminPage — secondary extraction target |
| `src/lib/middleware.ts` | `authMiddleware`, `adminMiddleware`, `armyOwnerMiddleware` |
| `src/lib/types.ts` | `ServerResult<T>`, `ErrorCode` |
| `src/lib/validators.ts` | Zod schemas for admin server fns |
| `src/lib/tier.ts` | `calculateTier`, `TierLevel` — used by `updateXpFn` and `loadArmyFn` |
| `src/components/unit-edit-panel.tsx` | Consumer of 11 server fns via prop injection (DO NOT MODIFY) |
| `src/components/unit-card.tsx` | Used by ArmyView |
| `src/components/add-units-sheet.tsx` | Used by ArmyView |
| `src/db/queries/index.ts` | Barrel: players, armies, units, matches, evolutions |

### Technical Decisions

- **5-file barrel structure** in `src/server-fns/`:
  | File | Content | Middleware |
  |---|---|---|
  | `unit-mutations.ts` | 11 unit mutations + `VALID_STATS` | `armyOwnerMiddleware` |
  | `unit-queries.ts` | `loadArmyFn`, `fetchUnitDeltasFn` | `authMiddleware` / `armyOwnerMiddleware` |
  | `admin-players.ts` | createPlayer, listPlayers, deletePlayer, invite fns | `adminMiddleware` |
  | `admin-armies.ts` | importArmy, listArmies, assignArmy, addUnit, updateSubProfile, getArmyUnits | `adminMiddleware` |
  | `admin-matches.ts` | createMatch, deleteMatchAdmin, listMatches | `adminMiddleware` |
- **`src/server-fns/guards.ts`** — return-based guards using `GuardResult<T>`:
  ```ts
  type GuardResult<T> = { ok: true; data: T } | { ok: false; result: ServerResult<never> }
  ```
  Guards return the fetched entity on success (avoids re-fetching). Handlers check `if (!guard.ok) return guard.result`.
- **`src/server-fns/index.ts`** — comprehensive re-exports of all 28 server fns (13 unit domain + 15 admin domain) + `GuardResult` type. Routes can import from barrel or directly from domain files.
- **`src/lib/army-utils.ts`** — `groupUnitsByType` + `TYPE_ORDER`.
- **`src/components/army-view.tsx`** — extracted `ArmyView`, imports server fns from `../server-fns/` and passes them to `UnitEditPanel` via props.
- **All extracted server fns must be exported** (named exports). Export names MUST match the original variable names exactly to avoid breaking AdminPage and ArmyView references.
- **Dynamic import paths** change from `../../db/queries` to `../db/queries` in `src/server-fns/`.

## Implementation Plan

### Parallelization Note

Tasks 2-3 (unit domain) and Tasks 4-5-6 (admin domain) can be executed **in parallel** — they have no interdependencies. Task 1 (guards) must complete before Task 3 (unit-mutations) since mutations import guards. Tasks 4-5-6 have no dependency on guards. Task 7 (barrel) depends on ALL domain files (Tasks 1-6). Tasks 8-9-10-11 depend on their respective domain tasks completing first. Task 12 depends on Tasks 10-11. Task 13 depends on Task 1. Task 14 depends on all other tasks.

```
Task 1 (guards) ──→ Task 3 (unit-mutations) ──┐
                                               ├→ Task 9 (army-view) ──→ Task 10 ($armyId slim) ──┐
Task 2 (unit-queries) ────────────────────────→┘                                                   │
                                                                                                   ├→ Task 12 (tests) → Task 14 (verify)
Task 4 (admin-players) ──┐                                                                        │
Task 5 (admin-armies) ───┼→ Task 11 (admin slim) ─────────────────────────────────────────────────┘
Task 6 (admin-matches) ──┘

Task 1-6 (all domain files) ──→ Task 7 (barrel)
Task 8 (army-utils) ──→ Task 9 (army-view)
Task 13 (guard tests) ── depends on Task 1 only
```

### Commit Strategy

Commit after each completed phase to enable safe rollback:

1. **Commit A** — after Tasks 1-6 + 7 + 8: all new `src/server-fns/` files + `src/lib/army-utils.ts` created. No existing file modified yet — zero risk of breakage.
2. **Commit B** — after Tasks 9-10-11: extraction complete (`army-view.tsx` created, route files slimmed). App should be functional at this point.
3. **Commit C** — after Tasks 12-13: all tests updated + new guard tests. `pnpm test` must pass.
4. **Commit D** — after Task 14 verification passes: final squash-ready state.

If Task 12 (test updates) fails, `git reset --soft HEAD~1` reverts to Commit A where all new files exist but old files are untouched.

### Tasks

Tasks are ordered by dependency (lowest level first). Each task is a discrete, completable unit.

- [ ] **Task 1: Create `src/server-fns/guards.ts`**
  - File: `src/server-fns/guards.ts` (new)
  - Action: Create the shared ownership guard module with the following exports:
    - `GuardResult<T>` type (exported)
    - `assertUnitBelongsToArmy(unitId: string, armyId: string): Promise<GuardResult<UnitById>>` — where `UnitById` is the return type of `getUnitById` (Drizzle inferred: `{ id, armyId, name, nickname, type, xp, status }`). Calls `getUnitById` via dynamic import, returns `{ ok: false, result: { success: false, error: { code: 'NOT_FOUND', message: 'Unité introuvable' } } }` if unit missing, `{ ok: false, result: { success: false, error: { code: 'FORBIDDEN', message: "Cette unité n'appartient pas à cette armée" } } }` if `unit.armyId !== armyId`, else `{ ok: true, data: unit }`. Use `Awaited<ReturnType<typeof getUnitById>>` to derive the type without hardcoding.
    - `assertModifierBelongsToArmy(modifierId: string, armyId: string): Promise<GuardResult<{ modifier: ModifierById; unit: UnitById }>>` — where `ModifierById` is `Awaited<ReturnType<typeof getStatModifierById>>` (Drizzle inferred: `{ id, unitId }`). Calls `getStatModifierById`, then `assertUnitBelongsToArmy(modifier.unitId, armyId)`. Returns modifier NOT_FOUND if missing, delegates to unit guard otherwise. Returns both modifier and unit on success.
    - `assertGainBelongsToArmy(gainId: string, armyId: string): Promise<GuardResult<{ gain: GainById; unit: UnitById }>>` — where `GainById` is `Awaited<ReturnType<typeof getUnitGainById>>` (Drizzle inferred: `{ id, unitId }`). Same pattern with `getUnitGainById`.
    - `assertSubProfileBelongsToArmy(subProfileId: string, armyId: string): Promise<GuardResult<{ subProfile: SubProfileById; unit: UnitById }>>` — where `SubProfileById` is `Awaited<ReturnType<typeof getSubProfileById>>` (Drizzle inferred: `{ id, unitId, isMount }`). Same pattern with `getSubProfileById`.
  - Notes: Use dynamic `import('../db/queries')` for all DB access. Import `ServerResult` from `../lib/types`. Each guard returns the fetched entity on success so the caller avoids a second DB query.

- [ ] **Task 2: Create `src/server-fns/unit-queries.ts`**
  - File: `src/server-fns/unit-queries.ts` (new)
  - Action: Move `loadArmyFn` and `fetchUnitDeltasFn` from `src/routes/armies/$armyId.tsx`.
    - `loadArmyFn`: uses `authMiddleware`, calls `getArmyWithUnits`, `getUnitDeltas`, `getGraveyardUnits`. Also imports `composeUnitView` from `../lib/delta-composer` and `calculateTier` from `../lib/tier`. Export the return type as `LoadArmyResult` for the route loader.
    - `fetchUnitDeltasFn`: uses `armyOwnerMiddleware`, calls `getUnitById`, `getStatModifiers`, `getUnitGains`.
  - Notes: Update dynamic import path to `../db/queries`. Import middlewares from `../lib/middleware`. Export both fns as named exports.

- [ ] **Task 3: Create `src/server-fns/unit-mutations.ts`** (depends on Task 1)
  - File: `src/server-fns/unit-mutations.ts` (new)
  - Action: Move the 11 mutation server fns from `src/routes/armies/$armyId.tsx`:
    - `addStatModifierFn`, `removeStatModifierFn`, `addUnitGainFn`, `removeUnitGainFn`, `toggleMountFn`, `updateXpFn`, `updatePointsFn`, `updateNicknameFn`, `sendToGraveyardFn`, `deleteUnitFn`, `restoreUnitFn`
    - Move `VALID_STATS` constant here (used only by `addStatModifierFn`).
    - Replace all inline ownership guards with calls to `assertUnitBelongsToArmy`, `assertModifierBelongsToArmy`, `assertGainBelongsToArmy`, `assertSubProfileBelongsToArmy` from `./guards`.
    - Add `ServerResult<T>` return type annotations to all handlers (currently missing on armyId fns), **except** `sendToGraveyardFn` and `deleteUnitFn` — see note below.
    - Normalize error codes: all ownership failures → `'FORBIDDEN'`, all missing entities → `'NOT_FOUND'`.
  - Notes: Each handler that previously did `const unit = await getUnitById(...)` + ownership check now does `const guard = await assertUnitBelongsToArmy(...)` + `if (!guard.ok) return guard.result` + uses `guard.data` as the unit. For `sendToGraveyardFn`/`deleteUnitFn`, the `hasInProgressPostMatch` check stays inline (not a guard — it's business logic, not ownership). **TypeScript blocker:** these two fns return `{ code: 'POST_MATCH_IN_PROGRESS' }` which is NOT in the `ErrorCode` union. Do NOT annotate them with `ServerResult<T>` — leave their return type inferred until `POST_MATCH_IN_PROGRESS` is added to `ErrorCode` (separate cleanup). For `updateNicknameFn`, keep the `nickname === '' ? null : nickname` normalization. For `updateXpFn`, keep the `calculateTier` call.

- [ ] **Task 4: Create `src/server-fns/admin-players.ts`** (no guard dependency)
  - File: `src/server-fns/admin-players.ts` (new)
  - Action: Move from `src/routes/admin/index.tsx`:
    - `createPlayerFn`, `listPlayersFn`, `deletePlayerFn`, `getInviteLinkFn`, `regenerateInviteTokenFn`, `generateAllMissingTokensFn`
  - Notes: All use `adminMiddleware`. Import schemas from `../lib/validators` where applicable. Import `ServerResult` from `../lib/types`. Update dynamic import path to `../db/queries`. Export names MUST match original variable names exactly.

- [ ] **Task 5: Create `src/server-fns/admin-armies.ts`** (no guard dependency)
  - File: `src/server-fns/admin-armies.ts` (new)
  - Action: Move from `src/routes/admin/index.tsx`:
    - `importArmyFn`, `listArmiesFn`, `assignArmyFn`, `addUnitFn`, `updateSubProfileFn`, `getArmyUnitsFn`
  - Notes: `importArmyFn` also imports `parseOwbExport` from `../lib/owb-parser`. All use `adminMiddleware`. Export names MUST match original variable names exactly.

- [ ] **Task 6: Create `src/server-fns/admin-matches.ts`** (no guard dependency)
  - File: `src/server-fns/admin-matches.ts` (new)
  - Action: Move from `src/routes/admin/index.tsx`:
    - `createMatchFn`, `deleteMatchAdminFn`, `listMatchesFn`
  - Notes: `createMatchFn` has complex validation logic (result coherence, army-player assignment) — move it verbatim, no refactoring. Export names MUST match original variable names exactly.

- [ ] **Task 7: Create `src/server-fns/index.ts` barrel** (depends on Tasks 1, 2, 3, 4, 5, 6)
  - File: `src/server-fns/index.ts` (new)
  - Action: Create barrel file with comprehensive re-exports of all 28 server fns:
    ```ts
    // Unit domain
    export { loadArmyFn, fetchUnitDeltasFn } from './unit-queries'
    export { addStatModifierFn, removeStatModifierFn, addUnitGainFn, removeUnitGainFn, toggleMountFn, updateXpFn, updatePointsFn, updateNicknameFn, sendToGraveyardFn, deleteUnitFn, restoreUnitFn } from './unit-mutations'
    // Admin domain
    export { createPlayerFn, listPlayersFn, deletePlayerFn, getInviteLinkFn, regenerateInviteTokenFn, generateAllMissingTokensFn } from './admin-players'
    export { importArmyFn, listArmiesFn, assignArmyFn, addUnitFn, updateSubProfileFn, getArmyUnitsFn } from './admin-armies'
    export { createMatchFn, deleteMatchAdminFn, listMatchesFn } from './admin-matches'
    // Guards type (for consumers that need GuardResult)
    export type { GuardResult } from './guards'
    ```
  - Notes: Barrel provides discoverability. Routes can also import directly from domain files.

- [ ] **Task 8: Create `src/lib/army-utils.ts`**
  - File: `src/lib/army-utils.ts` (new)
  - Action: Extract from `src/routes/armies/$armyId.tsx`:
    - `TYPE_ORDER` constant (exported)
    - `groupUnitsByType` function with its full type signature (exported)
  - Notes: Import `ComposedUnitView` type from `./delta-composer` and `TierLevel` from `./tier` for the function signature. Export both as named exports.

- [ ] **Task 9: Create `src/components/army-view.tsx`** (depends on Tasks 2, 3, 8)
  - File: `src/components/army-view.tsx` (new)
  - Action: Extract the `ArmyView` function component from `src/routes/armies/$armyId.tsx`.
    - Move all imports it uses: `useState`, `useEffect`, `Link`, `useRouter` from TanStack, `useHydrated`, `UnitCard`, `AddUnitsSheet`, `UnitEditPanel`, `AlertDialog` components, `Button`.
    - Import server fns from `../server-fns/unit-mutations` (the 11 fns passed to UnitEditPanel + `restoreUnitFn` used directly in graveyard JSX).
    - Import `fetchUnitDeltasFn` from `../server-fns/unit-queries` (passed to UnitEditPanel).
    - Import `groupUnitsByType` from `../lib/army-utils`.
    - Import types: `ComposedUnitView` from `../lib/delta-composer`, `TierLevel` from `../lib/tier`.
    - Define and export props interface: `ArmyViewProps` accepting the loader data shape (`army`, `unitCards`, `graveyardUnits`, `isOwner`, `isAdmin`).
    - Preserve the `handleMutationSuccess` pattern with `router.invalidate({ filter: (d) => d.routeId === '/armies/$armyId' })`.
  - Notes: The component imports server fns directly — this is safe because `createServerFn` handles client/server code splitting automatically. `restoreUnitFn` is called directly in the graveyard section JSX (not via UnitEditPanel).

- [ ] **Task 10: Slim down `src/routes/armies/$armyId.tsx`** (depends on Tasks 2, 9)
  - File: `src/routes/armies/$armyId.tsx`
  - Action: Replace the entire file content with:
    - Import `loadArmyFn` from `../../server-fns/unit-queries`
    - Import `ArmyView` from `../../components/army-view`
    - Import `createFileRoute`, `notFound`, `Link` from TanStack
    - Keep only the `Route` definition: `createFileRoute`, `staleTime: 30_000`, `loader` (calling `loadArmyFn`), `notFoundComponent` (inline JSX), `component: ArmyView`.
    - Remove ALL server fn definitions, `VALID_STATS`, `TYPE_ORDER`, `groupUnitsByType`, and the `ArmyView` function body.
  - Notes: Target < 50 lines. The `notFoundComponent` inline JSX stays in the route file (route-specific concern).

- [ ] **Task 11: Slim down `src/routes/admin/index.tsx`** (depends on Tasks 4, 5, 6)
  - File: `src/routes/admin/index.tsx`
  - Action: Replace all server fn definitions with imports:
    - `import { createPlayerFn, listPlayersFn, deletePlayerFn, getInviteLinkFn, regenerateInviteTokenFn, generateAllMissingTokensFn } from '../../server-fns/admin-players'`
    - `import { importArmyFn, listArmiesFn, assignArmyFn, addUnitFn, updateSubProfileFn, getArmyUnitsFn } from '../../server-fns/admin-armies'`
    - `import { createMatchFn, deleteMatchAdminFn, listMatchesFn } from '../../server-fns/admin-matches'`
    - Keep the `Route` definition (`createFileRoute`, `beforeLoad` with admin redirect, `component: AdminPage`).
    - Keep the `AdminPage` component (out of scope to extract).
    - Remove all `createServerFn` blocks and their associated imports (`z`, `adminMiddleware`, `ServerResult`, `createServerFn`, validator schemas) — these are now handled by the server-fns modules.
    - Keep imports still needed by AdminPage component (UI components, hooks, etc.).
  - Notes: The AdminPage component references server fns by the same variable names — since export names match, no JSX changes are needed. Verify no import is missing by running typecheck.

- [ ] **Task 12: Update structural contract tests** (depends on Tasks 10, 11)
  - Files: `tests/2-4-unit-deltas-server.test.ts`, `tests/2-4-unit-edit-panel-component.test.ts`, `tests/3-1-routes.test.ts`, `tests/unit-graveyard.test.ts`, `tests/unit-nickname-server.test.ts`, `tests/bugfix-mount-flag.test.ts`, `tests/integration/admin.test.ts`, `tests/integration/admin-list-delete.test.ts`, `tests/integration/army-import.test.ts`, `tests/server-fns/create-match.test.ts`
  - Action: For each test file:
    1. Find all `readFileSync(resolve(root, 'src/routes/armies/$armyId.tsx'))` calls → update path to the appropriate new file (`src/server-fns/unit-mutations.ts`, `src/server-fns/unit-queries.ts`, `src/components/army-view.tsx`, or `src/lib/army-utils.ts`) depending on what the assertion checks.
    2. Find all `readFileSync(resolve(root, 'src/routes/admin/index.tsx'))` calls → update path to the appropriate `src/server-fns/admin-*.ts` file.
    3. **CRITICAL: If a single test reads one source file and asserts patterns that are NOW split across multiple files, SPLIT the test into separate `readFileSync` calls targeting each correct file.** Each assertion must be coupled to the file that actually contains the pattern.
    4. Update assertion strings if needed (e.g., import paths in the source changed from `../../db/queries` to `../db/queries`, or from `../../lib/middleware` to `../lib/middleware`).
  - Notes: Do NOT change what is being asserted — only WHERE the assertion looks. Trace each assertion to determine which new file contains the pattern it checks. This is the most fragile task — read each test file carefully.

- [ ] **Task 13: Create unit tests for `guards.ts`** (depends on Task 1)
  - File: `tests/server-fns/guards.test.ts` (new)
  - Action: Write unit tests covering:
    - `assertUnitBelongsToArmy`:
      - Given a valid unitId belonging to armyId, when called, then returns `{ ok: true, data: unit }`
      - Given a unitId that does not exist, when called, then returns `{ ok: false, result: { success: false, error: { code: 'NOT_FOUND' } } }`
      - Given a unitId belonging to a different army, when called, then returns `{ ok: false, result: { success: false, error: { code: 'FORBIDDEN' } } }`
    - `assertModifierBelongsToArmy`:
      - Given a valid modifierId whose unit belongs to armyId, when called, then returns `{ ok: true, data: { modifier, unit } }`
      - Given a modifierId that does not exist, when called, then returns NOT_FOUND
      - Given a modifierId whose unit belongs to a different army, when called, then returns FORBIDDEN
      - Given a modifierId whose unit no longer exists (orphan modifier), when called, then returns NOT_FOUND for the unit
    - `assertGainBelongsToArmy`: same 4 cases (including orphan gain)
    - `assertSubProfileBelongsToArmy`: same 4 cases (including orphan subProfile)
  - Notes: Use `vi.mock` to mock the dynamic `import('../db/queries')`. Each test provides mock return values for `getUnitById`, `getStatModifierById`, `getUnitGainById`, `getSubProfileById`. Total: 16 test cases (4 per guard × 4 guards).

- [ ] **Task 14: Verify — typecheck + test suite + smoke + bundle check** (depends on all)
  - Action:
    1. Run `pnpm typecheck` — must pass with zero errors.
    2. Run `pnpm test` — all existing tests + new guard tests must pass.
    3. Run `pnpm build` and inspect the client bundle output — verify that `src/components/army-view.tsx` does NOT pull in DB query code (Pool, pg, drizzle internals) into the client bundle. Check `.output/` for server-only imports leaking.
    4. Run `pnpm dev` and manually verify:
       - Navigate to an army page → unit cards render with correct stats, tiers, and deltas
       - Open UnitEditPanel → add a stat modifier, verify it appears in deltas
       - Navigate to admin → create a player, import an army, create a match — verify each form submits without error
       - Graveyard: send a unit to graveyard, restore it — verify it reappears in the active list
  - Notes: If typecheck fails, fix import paths. If tests fail, fix readFileSync paths or assertion strings. If bundle contains server code, investigate `createServerFn` boundary. Functional behavior must be identical pre/post refactor. No E2E tests.

### Acceptance Criteria

- [ ] **AC1:** Given the `src/server-fns/` directory, when listing its files, then it contains exactly: `guards.ts`, `unit-mutations.ts`, `unit-queries.ts`, `admin-players.ts`, `admin-armies.ts`, `admin-matches.ts`, `index.ts`.

- [ ] **AC2:** Given `src/routes/armies/$armyId.tsx`, when reading its content, then it contains NO `createServerFn` calls, NO `VALID_STATS`, NO `groupUnitsByType`, and NO `function ArmyView`. It imports `loadArmyFn` from server-fns and `ArmyView` from components. File is less than 50 lines.

- [ ] **AC3:** Given `src/routes/admin/index.tsx`, when reading its content, then it contains NO `createServerFn` calls. It imports all 15 server fns from `../../server-fns/admin-*.ts` files. Import names match the original variable names exactly.

- [ ] **AC4:** Given `src/server-fns/guards.ts`, when a handler calls `assertUnitBelongsToArmy(unitId, armyId)` with a unit belonging to a different army, then it returns `{ ok: false, result: { success: false, error: { code: 'FORBIDDEN', message: "Cette unité n'appartient pas à cette armée" } } }`.

- [ ] **AC5:** Given `src/server-fns/guards.ts`, when a handler calls `assertUnitBelongsToArmy(unitId, armyId)` with a non-existent unitId, then it returns `{ ok: false, result: { success: false, error: { code: 'NOT_FOUND', message: 'Unité introuvable' } } }`.

- [ ] **AC6:** Given `src/server-fns/unit-mutations.ts`, when reading any mutation handler, then ownership checks use `assertUnitBelongsToArmy` (or modifier/gain/subProfile variant) from `./guards` — no inline `getUnitById` + manual `armyId` comparison.

- [ ] **AC7:** Given `src/components/army-view.tsx`, when the component renders, then it passes exactly 11 server fns to `UnitEditPanel` via props (same prop names as before): `addStatModifierFn`, `removeStatModifierFn`, `addUnitGainFn`, `removeUnitGainFn`, `updateXpFn`, `updatePointsFn`, `updateNicknameFn`, `fetchUnitDeltasFn`, `toggleMountFn`, `sendToGraveyardFn`, `deleteUnitFn`.

- [ ] **AC8:** Given `src/lib/army-utils.ts`, when calling `groupUnitsByType(unitCards)`, then it returns groups ordered by `TYPE_ORDER` (`Personnages`, `Unités de base`, `Unités spéciales`, `Unités rares`) then remaining types alphabetically.

- [ ] **AC9:** Given all structural contract tests, when running `pnpm test`, then all tests pass with updated `readFileSync` paths pointing to the new file locations.

- [ ] **AC10:** Given `pnpm typecheck`, when run after the refactor, then it exits with zero errors.

- [ ] **AC11:** Given the application running with `pnpm dev`, when navigating to an army page and using the edit panel, then all unit mutations (add/remove modifier, add/remove gain, update XP, update points, update nickname, toggle mount, send to graveyard, delete, restore) work identically to before the refactor.

- [ ] **AC12:** Given `tests/server-fns/guards.test.ts`, when running the guard unit tests, then all 16 test cases pass (4 per guard × 4 guards, including orphan entity edge case).

- [ ] **AC13:** Given a structural contract test that previously read one source file where the asserted patterns now span multiple files after refactoring, when the test is updated, then it uses separate `readFileSync` calls targeting each correct new file — no assertion checks a file that doesn't contain the pattern.

- [ ] **AC14:** Given `pnpm build`, when inspecting the client bundle output, then `src/components/army-view.tsx` does NOT pull DB query code (pg Pool, drizzle internals) into the client bundle.

- [ ] **AC15:** Given `src/server-fns/admin-*.ts` files, when reading their export names, then every exported server fn name matches exactly the original local variable name in `admin/index.tsx` (e.g., `createPlayerFn`, not `createPlayer` or `adminCreatePlayerFn`).

## Additional Context

### Dependencies

No new dependencies. Pure structural refactor using existing packages.

### Testing Strategy

- **Unit tests on `guards.ts`** (Task 13): 16 test cases with vi.mock on DB queries. Test each guard with: valid entity + correct army, missing entity, entity on wrong army, orphan entity (parent deleted).
- **Structural contract tests** (Task 12): update `readFileSync` paths in ~10 test files. Split tests when assertions span multiple new files. Assertions themselves don't change — only the file being read.
- **TypeScript verification**: `pnpm typecheck` catches broken imports, missing exports, type mismatches.
- **Bundle verification** (Task 14): `pnpm build` + inspect `.output/` to confirm client/server split is intact.
- **Smoke test** (Task 14): manual verification that army view and admin page work end-to-end after refactor.
- **No E2E tests** — regression coverage relies on structural contract tests + typecheck + manual smoke test.

### Notes

- `deleteMatchWithXpRollback` is called from both `index.tsx` (player) and `admin/index.tsx` (admin) with different middlewares — these stay as separate server fns but share the DB query import path.
- `getAllArmies` is similarly used in `armies/index.tsx` and `admin/index.tsx` — DB query is already shared, server fns stay separate (different middleware).
- **`src/routes/index.tsx` is NOT affected** by this refactor — it imports only from `db/queries`, `lib/`, and its own components. No imports from `$armyId.tsx` or `admin/index.tsx`. Verified.
- `POST_MATCH_IN_PROGRESS` error code used by `sendToGraveyardFn`/`deleteUnitFn` is not in `ErrorCode` union — out of scope, noted for future cleanup. **Workaround:** these two fns keep inferred return types (no `ServerResult<T>` annotation) until `ErrorCode` is extended.
- **`addUnitFn` naming:** exists only in `admin-armies.ts` (admin context). No unit-domain fn shares this name. If a future user-facing `addUnit` fn is needed, it should be named distinctly (e.g., `addUnitToArmyFn`).
- `restoreUnitFn` is the 13th fn in $armyId.tsx — called directly in ArmyView graveyard JSX, NOT passed to UnitEditPanel. It moves to `unit-mutations.ts` and is imported by `army-view.tsx`.
- Party mode insights (round 1): 5-file split, GuardResult pattern, army-utils.ts extraction, import registration warning, smoke test.
- Party mode insights (round 2): parallelization note, bundle verification, export name matching AC, test split AC (AC13), orphan entity edge case in guards, `$armyId.tsx` < 50 lines AC, comprehensive barrel (not "selective").
- Risk: structural contract tests are the most fragile part — a single wrong path update breaks the test without clear error. Recommend reading each test file carefully and tracing which assertions map to which new file.
- **Future consideration:** structural contract tests (`readFileSync` + regex) break on every file move. Consider migrating the most critical ones to import-based assertions (e.g., verify exported types/values directly) in a follow-up cleanup — not in this refactor.
