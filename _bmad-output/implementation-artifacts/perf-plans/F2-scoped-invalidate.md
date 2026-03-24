# Plan F2 — Scoped `router.invalidate()`

**Priority:** P1 | **Effort:** XS | **Dependencies:** none

## Objective

Replace all unscoped `router.invalidate()` calls with targeted invalidation so that mutations only reload the loaders that are actually affected — not the entire loader tree (including the expensive root `beforeLoad`).

## Current State

6 locations call `router.invalidate()` with no arguments:

| # | File | Line | Context |
|---|------|------|---------|
| 1 | `src/routes/index.tsx` | 105 | `handleDismiss` (welcome modal seen) |
| 2 | `src/routes/index.tsx` | 121 | `handleResultSubmit` (match result entered) |
| 3 | `src/routes/index.tsx` | 182 | `ArmyImportForm` `onSuccess` callback (army imported from campaign view) |
| 4 | `src/routes/armies/index.tsx` | 79 | `ArmyImportForm` `onSuccess` callback (army imported from armies list) |
| 5 | `src/routes/armies/$armyId.tsx` | 338 | `handleMutationSuccess` (unit edit: stat/gain/xp/mount) |
| 6 | `src/components/create-match-fab.tsx` | 208 | `handleConfirm` (match created) |

Each triggers: root `beforeLoad` (session + army fetch) + current route loader + any parent loaders.

## Changes Required

### 1. `src/routes/index.tsx` — `handleDismiss` (line 105)

The welcome modal dismiss only marks `hasSeenWelcome = true` in the DB. The session object in root context includes `hasSeenWelcome`, so root needs to reload BUT the campaign timeline doesn't need to.

**Replace:**
```typescript
await router.invalidate()
```
**With:**
```typescript
await router.invalidate({ filter: (d) => d.routeId === '__root__' })
```

**Note:** If the root `beforeLoad` is later migrated to TanStack Query cache (F1), this can be further refined to just `queryClient.invalidateQueries({ queryKey: ['session'] })`.

### 2. `src/routes/index.tsx` — `handleResultSubmit` (line 121)

Submitting a match result affects the campaign timeline (pending matches list changes) and potentially the root header (win/loss record). Both should reload.

**Replace:**
```typescript
await router.invalidate()
```
**With:**
```typescript
await router.invalidate({ filter: (d) => d.routeId === '__root__' || d.routeId === '/' })
```

### 3. `src/routes/armies/$armyId.tsx` — `handleMutationSuccess` (line 338)

Unit edits (stat modifiers, gains, XP, mount toggle) only affect the current army view. Root context (session, army name/faction, record) is not impacted by unit-level edits.

**Replace:**
```typescript
await router.invalidate()
```
**With:**
```typescript
await router.invalidate({ filter: (d) => d.routeId === '/armies/$armyId' })
```

### 4. `src/components/create-match-fab.tsx` — `handleConfirm` (line 208)

Creating a match affects the campaign timeline (new pending match appears) and the root record (match count could change). The armies list is not affected.

**Replace:**
```typescript
router.invalidate()
```
**With:**
```typescript
router.invalidate({ filter: (d) => d.routeId === '__root__' || d.routeId === '/' })
```

**Note:** This call is not `await`ed currently — keep that behavior (fire-and-forget after dialog closes).

### 5. `src/routes/index.tsx` — `ArmyImportForm` onSuccess (line 182)

Army import from campaign view. After importing, root context (session, army info) and campaign timeline both need to reload.

**Replace:**
```typescript
<ArmyImportForm onSuccess={() => router.invalidate()} />
```
**With:**
```typescript
<ArmyImportForm onSuccess={() => router.invalidate({ filter: (d) => d.routeId === '__root__' || d.routeId === '/' })} />
```

### 6. `src/routes/armies/index.tsx` — `ArmyImportForm` onSuccess (line 79)

Army import from armies list. After importing, root context and armies list both need to reload.

**Replace:**
```typescript
<ArmyImportForm onSuccess={() => router.invalidate()} />
```
**With:**
```typescript
<ArmyImportForm onSuccess={() => router.invalidate({ filter: (d) => d.routeId === '__root__' || d.routeId === '/armies/' })} />
```

## Important: Verify `router.invalidate` filter API

Before implementing, confirm the exact TanStack Router API for scoped invalidation:

```bash
npx @tanstack/cli search-docs "invalidate filter" --library start --framework react
```

The `filter` callback receives route match descriptors. If the API differs (e.g., uses `routeId` option instead of `filter`), adapt accordingly. The key constraint is: **only reload the loaders listed above, not all loaders**.

## Acceptance Criteria

- [ ] All 6 `router.invalidate()` calls are scoped to only the relevant routes
- [ ] Welcome modal dismiss reloads root only (not timeline)
- [ ] Match result submit reloads root + campaign timeline
- [ ] Army import from campaign view reloads root + campaign timeline
- [ ] Army import from armies list reloads root + armies list
- [ ] Unit edit reloads army detail only (not root)
- [ ] Match creation reloads root + campaign timeline
- [ ] No `router.invalidate()` without arguments remains in the codebase (verify with grep)

## Testing

- `pnpm typecheck` — no TS errors
- Manual: edit a unit stat → network tab shows only the army detail loader fires (not root session/army)
- Manual: submit a match result → timeline reloads, root header updates
- Manual: dismiss welcome modal → no timeline refetch
- `grep -rn 'router\.invalidate()' src/` — should return 0 results (all 6 calls now have arguments)
