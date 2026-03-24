# Performance Quick Wins Analysis — Campaign TOW

**Date:** 2026-03-23
**Analyst:** Mary (BMAD Business Analyst)
**Scope:** Navigation latency — frontend loaders, caching, and data fetching

---

## Executive Summary

The app suffers from pervasive navigation latency caused by a combination of: (1) an expensive root loader that fires on **every** navigation, (2) zero client-side caching, (3) broad `router.invalidate()` calls after mutations, and (4) no prefetching. All findings from the initial exploration are **confirmed** with additional issues discovered.

---

## Confirmed Findings

### F1 — Root `beforeLoad` waterfall on every navigation

**File:** `src/routes/__root.tsx:65-93`

The root `beforeLoad` executes two sequential server calls on **every single navigation** (tab switch, back button, link click):

```typescript
// Line 71 — first await
const session = await getSessionFn()
// Line 85 — second await (depends on session.playerId)
const info = await getPlayerArmyInfoFn({ data: { playerId: session.playerId } })
```

The second call depends on the first (needs `playerId`), so they cannot be parallelized. However, the real problem is that this runs unconditionally on every route transition. Session and army info change rarely — they should be cached and revalidated selectively.

**Impact:** ~100-300ms added to every navigation (2 sequential server round-trips).

---

### F2 — `router.invalidate()` reloads ALL loaders (including root)

**Files:**
- `src/routes/index.tsx:105` — `handleDismiss` (welcome modal)
- `src/routes/index.tsx:121` — `handleResultSubmit` (match result)
- `src/routes/armies/$armyId.tsx:338` — `handleMutationSuccess` (unit edit)
- `src/components/create-match-fab.tsx:208` — `handleConfirm` (match creation)

All four mutation handlers call `router.invalidate()` with no arguments, which invalidates **every** active loader — including the root `beforeLoad` (F1). This means any mutation triggers 2+ unnecessary server calls just for the root loader, on top of the actual route loader refresh.

```typescript
// armies/$armyId.tsx:337-339
const handleMutationSuccess = async () => {
  await router.invalidate()
}
```

**Impact:** Every mutation triggers a full waterfall: root session + root army + current route loader. Doubles or triples perceived latency after any user action.

---

### F3 — QueryClient has no default caching configuration

**File:** `src/integrations/tanstack-query/root-provider.tsx:15`

```typescript
const queryClient = new QueryClient()
```

No `defaultOptions` are set. This means:
- `staleTime: 0` — data is immediately stale after fetch
- `refetchOnWindowFocus: true` — switching back to the browser tab triggers refetch of all active queries
- `gcTime: 5 * 60 * 1000` (default) — the only reasonable default

**Note:** The app currently does **not use TanStack Query for data fetching** — all data goes through TanStack Router loaders via `createServerFn`. The QueryClient exists but is effectively unused for route data. This means TanStack Query's caching layer provides zero benefit today.

**Impact:** No client-side cache exists for any data. Every navigation is a cold fetch.

---

### F4 — No prefetching on TabBar links

**File:** `src/components/tab-bar.tsx:59,84,109`

```typescript
<Link to="/" ... >          // Line 59
<Link to="/armies" ... >    // Line 84
<Link to="/territories" ... > // Line 109
```

None of the `<Link>` components use `preload="intent"` (TanStack Router supports this). When a user taps a tab, the loader starts only after the tap — no preloading on hover or touch start.

**Impact:** Adds the full loader duration to every tab switch. On mobile (touch), this is the entire perceived latency of navigation.

---

### F5 — Opponent list fetched fresh on every dialog open

**File:** `src/components/create-match-fab.tsx:142-163`

```typescript
useEffect(() => {
  if (!open) { /* reset */ return }
  setIsLoading(true)
  loadOpponentsFn()
    .then((data) => { setOpponents(data); setIsLoading(false) })
    .catch(() => { ... })
}, [open])
```

Every time the FAB dialog opens, `loadOpponentsFn()` is called. The opponent list rarely changes mid-session (players don't join/leave during a game evening). There is no caching or staleness check.

**Impact:** ~50-150ms delay on every FAB open, with a visible loading spinner. Feels sluggish for a list that hasn't changed.

---

### F6 — Post-match loader: sequential queries that could be parallelized

**File:** `src/routes/match/$matchId/post-match.tsx:34-163`

The `loadPostMatchDataFn` handler executes ~8 database operations, several of which are independent but run sequentially:

```typescript
// Lines 39-40 — sequential
const army = await getPlayerArmy(context.session.playerId)
const participant = await getMatchParticipantForEvolutionByPlayer(data.matchId, ...)

// Lines 49-61 — raw drizzle query for opponent name (independent of units fetch)
const oppRows = await db.select(...).from(oppParticipant)...

// Lines 74-76 — sequential
const unitsRaw = await getUnitsForArmy(army.id)
const existingEntries = await getMatchXpEntries(participant.id)

// Lines 81-83 — depends on unitsRaw
const { statModifiers, unitGains } = await getUnitDeltas(unitIds)
```

Parallelizable groups:
- `getPlayerArmy` + `getMatchParticipantForEvolutionByPlayer` (independent)
- After both resolve: opponent name query + `getUnitsForArmy` + `getMatchXpEntries` (independent of each other)

**Impact:** ~200-500ms of unnecessary sequential wait. This is the slowest route in the app.

---

## Additional Findings (not in initial exploration)

### F7 — Dynamic imports in every server function call

**Files:** All route files

Every `createServerFn` handler uses dynamic `await import(...)`:

```typescript
// __root.tsx:25
const { getSession } = await import('../lib/auth')

// index.tsx:69
const { getPlayerArmy, getTimelineForArmy, getPendingMatches } = await import('../db/queries')
```

While this is correct for client/server bundle splitting, each `import()` call has a small overhead on the server side (~1-5ms per call). In the post-match loader, there are 5+ dynamic imports.

**Impact:** Minor (~5-25ms total), but adds up in hot paths. Low priority.

---

### F8 — No `shouldReload` / `reloadDeps` on route loaders

**Files:** `src/routes/index.tsx:78-82`, `src/routes/armies/index.tsx:44-48`, `src/routes/armies/$armyId.tsx:263-266`

All route loaders are plain functions with no staleness control:

```typescript
// index.tsx:78-82
export const Route = createFileRoute('/')({
  loader: async () => {
    return loadCampaignTimelineFn()
  },
  component: CampaignView,
})
```

TanStack Router supports `shouldReload` (or `reloadDeps`) to control when a loader re-executes. Without these, the loader runs on every navigation to the route, even if the data hasn't changed.

**Impact:** Compounds with F1 — navigating away and back to a tab triggers both root + route loaders unnecessarily.

---

## Priority Matrix

| Priority | Problem | Impact (User) | Effort | File(s) | Proposed Fix |
|----------|---------|---------------|--------|---------|--------------|
| **P1** | F1 — Root `beforeLoad` waterfall on every navigation | Every nav blocked 100-300ms by 2 sequential server calls | **S** | `src/routes/__root.tsx:65-93` | Cache session + army in TanStack Query with `staleTime: 5min`. Root `beforeLoad` reads from cache (sync hit) and triggers background revalidation. Only `router.invalidate({ routeId: '__root__' })` after auth mutations. |
| **P1** | F2 — Unscoped `router.invalidate()` | Mutations feel 2-3x slower than necessary | **XS** | `src/routes/index.tsx:105,121`, `src/routes/armies/$armyId.tsx:338`, `src/components/create-match-fab.tsx:208` | Replace `router.invalidate()` with scoped invalidation: `router.invalidate({ routeId: '/' })` or the specific route. Avoid re-triggering root loader after non-auth mutations. |
| **P1** | F3 — QueryClient has no defaults | Zero caching, refetch on window focus | **XS** | `src/integrations/tanstack-query/root-provider.tsx:15` | Set `defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } }`. This prepares for P1/F1 migration to TanStack Query. |
| **P2** | F4 — No prefetching on TabBar | Tab switch feels slow (full loader latency) | **XS** | `src/components/tab-bar.tsx:59,84,109` | Add `preload="intent"` to all three `<Link>` components. Loader starts on hover/touch, data is ready before navigation completes. |
| **P2** | F8 — No `shouldReload` on route loaders | Returning to a tab re-fetches even if data is fresh | **S** | `src/routes/index.tsx:78`, `src/routes/armies/index.tsx:44`, `src/routes/armies/$armyId.tsx:263` | Add `staleTime` or `shouldReload` to route definitions. For the campaign timeline, use `reloadDeps` keyed on a version counter bumped only by mutations. |
| **P3** | F5 — Opponent list not cached | FAB dialog shows spinner every open | **S** | `src/components/create-match-fab.tsx:142-163` | Migrate opponent fetch to `useQuery` with `staleTime: 5min`. The dialog reads from cache instantly and revalidates in background. |
| **P3** | F6 — Post-match sequential queries | Slowest route, 200-500ms unnecessary wait | **M** | `src/routes/match/$matchId/post-match.tsx:34-163` | Restructure with `Promise.all` for independent queries: `[army, participant] = await Promise.all(...)`, then `[oppName, units, entries] = await Promise.all(...)`. |
| **P4** | F7 — Dynamic imports in every server call | Minor overhead ~5-25ms | **S** | All server function files | Consolidate dynamic imports to top of handler or use conditional static imports. Low ROI — address only if other optimizations are insufficient. |

---

## Recommended Implementation Order

1. **F3 (XS)** — Set QueryClient defaults. Prerequisite for other caching work.
2. **F2 (XS)** — Scope all `router.invalidate()` calls. Immediate win, minimal risk.
3. **F4 (XS)** — Add `preload="intent"` to TabBar. One-line change per link.
4. **F1 (S)** — Migrate root session/army to TanStack Query cache. Biggest impact, requires careful testing.
5. **F8 (S)** — Add staleness control to route loaders.
6. **F5 (S)** — Cache opponent list with useQuery.
7. **F6 (M)** — Parallelize post-match queries.
8. **F7 (S)** — Optional: consolidate dynamic imports.

Steps 1-3 can be done in a single commit (~30 min). Step 4 is the architectural change that delivers the most improvement but requires the most testing.

---

## Notes

- The app does not currently leverage TanStack Query for any data fetching — all data flows through TanStack Router loaders via `createServerFn`. The QueryClientProvider exists (scaffold boilerplate) but is dormant. The P1 fix for F1 would be the first real use of TanStack Query in the app.
- `router.invalidate()` in TanStack Start is the equivalent of "refetch everything". It's the correct escape hatch when you don't know what changed, but it should be the exception, not the default.
- The `preload="intent"` fix (F4) is the highest ROI change: one prop per link, zero risk, immediately perceptible improvement on mobile.
