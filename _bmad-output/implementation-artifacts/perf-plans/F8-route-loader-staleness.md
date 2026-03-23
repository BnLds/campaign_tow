# Plan F8 — Route Loader Staleness Control

**Priority:** P2 | **Effort:** S | **Dependencies:** F1 (root cache must be in place so root doesn't re-trigger on every nav)

> **WARNING — Do not implement F8 without F1.** If route-level `staleTime` is added while the root `beforeLoad` still makes uncached server calls on every navigation, the result is worse than the current state: route loaders serve stale data, but navigation remains slow because the root waterfall still blocks. Implement F1 first.

## Objective

Add staleness control to route loaders so that navigating back to an already-loaded route serves cached data instead of re-fetching. Use TanStack Router's `staleTime` option on route definitions.

## Current State

All route loaders are plain async functions with no caching:

| Route | File | Line |
|-------|------|------|
| `/` (campaign) | `src/routes/index.tsx` | 78-82 |
| `/armies` (list) | `src/routes/armies/index.tsx` | 44-48 |
| `/armies/$armyId` | `src/routes/armies/$armyId.tsx` | 263-266 |

```typescript
// Typical pattern — no staleTime
export const Route = createFileRoute('/')({
  loader: async () => {
    return loadCampaignTimelineFn()
  },
  component: CampaignView,
})
```

Every navigation to these routes triggers a full server fetch, even if the user just navigated away 1 second ago.

## Changes Required

### 1. Campaign timeline — `src/routes/index.tsx`

**Line ~78:** Add `staleTime` to route definition:

```typescript
export const Route = createFileRoute('/')({
  staleTime: 30_000, // 30 seconds — timeline changes on mutations (scoped invalidate handles freshness)
  loader: async () => {
    return loadCampaignTimelineFn()
  },
  component: CampaignView,
})
```

**Rationale:** 30s is aggressive enough that tab-switching within a session is instant, but conservative enough that the timeline stays reasonably fresh. Mutations already call scoped `router.invalidate()` (F2), which bypasses staleTime.

### 2. Armies list — `src/routes/armies/index.tsx`

**Line ~44:** Add `staleTime`:

```typescript
export const Route = createFileRoute('/armies/')({
  staleTime: 60_000, // 1 minute — army list rarely changes mid-session
  loader: async () => {
    return loadArmiesListFn()
  },
  component: ArmiesListView,
})
```

### 3. Army detail — `src/routes/armies/$armyId.tsx`

**Line ~263:** Add `staleTime`:

```typescript
export const Route = createFileRoute('/armies/$armyId')({
  staleTime: 30_000, // 30 seconds — unit edits trigger scoped invalidate
  loader: async ({ params }) => {
    return loadArmyFn({ data: { armyId: params.armyId } })
  },
  notFoundComponent: () => ( ... ),
  component: ArmyView,
})
```

### 4. Verify `staleTime` API

Before implementing, confirm TanStack Router supports `staleTime` on route definitions:

```bash
npx @tanstack/cli search-docs "staleTime route" --library start --framework react
```

If the API uses a different mechanism (e.g., `shouldReload` function, or `loaderOptions.staleTime`), adapt accordingly. The goal is: **don't re-run the loader if it ran less than N seconds ago, unless explicitly invalidated**.

**Alternative if `staleTime` is not supported on routes:** Use `shouldReload` returning `false` when data is fresh, combined with a manual timestamp check.

## Files Modified

| File | Change |
|------|--------|
| `src/routes/index.tsx` | Add `staleTime: 30_000` to route definition |
| `src/routes/armies/index.tsx` | Add `staleTime: 60_000` to route definition |
| `src/routes/armies/$armyId.tsx` | Add `staleTime: 30_000` to route definition |

## Acceptance Criteria

- [ ] All 3 route definitions have a `staleTime` (or equivalent staleness mechanism)
- [ ] Navigating away from a tab and back within the stale window does NOT trigger a loader fetch
- [ ] Scoped `router.invalidate()` from F2 still forces a reload (bypasses staleTime)
- [ ] `pnpm typecheck` passes

## Testing

- Manual: go to Campagne → Armees → Campagne — second Campagne load should be instant (no network request)
- Manual: go to Armees → army detail → back to Armees — Armees list served from cache
- Manual: edit a unit (triggers scoped invalidate) → army detail reloads fresh data
- Network tab: verify no loader calls on repeated tab visits within staleTime window
