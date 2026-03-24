# Plan F1 — Root Session & Army Cache via TanStack Query

**Priority:** P1 | **Effort:** S | **Dependencies:** F3 (QueryClient defaults must be set first)

## Objective

Migrate the root `beforeLoad` session + army fetch from blocking sequential server calls to TanStack Query cached queries. The root loader reads from cache synchronously when data is fresh, and triggers background revalidation when stale. This eliminates 100-300ms of blocking latency on every navigation.

## Current State

**File:** `src/routes/__root.tsx:65-93`

```typescript
beforeLoad: async ({ location }) => {
  if (location.pathname === '/login') return { session: null, army: null, record: null }
  const session = await getSessionFn()                    // ~50-150ms
  if (!session) throw redirect({ to: '/login' })
  if (session.isGuest) return { session, army: null, record: null }
  const info = await getPlayerArmyInfoFn({ ... })         // ~50-150ms
  return { session, army: info.army, record: info.record }
}
```

This runs on **every** navigation. Two sequential `await` calls block rendering.

## Architecture Decision

Use TanStack Query's `queryClient.ensureQueryData()` in `beforeLoad`. This:
- Returns cached data instantly if `staleTime` has not elapsed
- Fetches from server and caches if no data exists or data is stale
- Does NOT block navigation when data is in cache and fresh

For auth, we need a slightly aggressive approach: session data should be cached but with a moderate `staleTime` (e.g., 5 minutes). Auth-changing actions (login, logout) explicitly invalidate the cache.

## Changes Required

### 1. Create session query helpers

**New file:** `src/lib/session-queries.ts`

```typescript
import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { SessionData } from './auth'

// Server functions (moved from __root.tsx)
export const getSessionFn = createServerFn({ method: 'GET' }).handler(async () => {
  const { getSession } = await import('./auth')
  return getSession()
})

export const getPlayerArmyInfoFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ playerId: z.string() }))
  .handler(async ({ data: { playerId } }) => {
    const { getPlayerArmy, getArmyRecord } = await import('../db/queries')
    const army = await getPlayerArmy(playerId)
    if (!army) return { army: null, record: null }
    const record = await getArmyRecord(army.id)
    return {
      army: { id: army.id, name: army.name, faction: army.faction },
      record,
    }
  })

// Shared cache duration — import from query-constants.ts in production code
import { STALE_TIME_SESSION } from './query-constants'

// Query options — reusable across root loader and any component
export const sessionQueryOptions = () =>
  queryOptions({
    queryKey: ['session'],
    queryFn: () => getSessionFn(),
    staleTime: STALE_TIME_SESSION,
  })

export const armyInfoQueryOptions = (playerId: string) =>
  queryOptions({
    queryKey: ['army-info', playerId],
    queryFn: () => getPlayerArmyInfoFn({ data: { playerId } }),
    staleTime: STALE_TIME_SESSION,
  })
```

### 2. Refactor root `beforeLoad` to use cached queries

**File:** `src/routes/__root.tsx`

Remove the `getSessionFn` and `getPlayerArmyInfoFn` definitions (moved to `session-queries.ts`).

Import the new query options:
```typescript
import { sessionQueryOptions, armyInfoQueryOptions } from '../lib/session-queries'
```

Replace the `beforeLoad` body:

```typescript
beforeLoad: async ({ location, context: { queryClient } }) => {
  if (location.pathname === '/login') {
    return { session: null as SessionData | null, army: null, record: null }
  }

  // ensureQueryData: returns cache if fresh, fetches if stale/missing
  const session = await queryClient.ensureQueryData(sessionQueryOptions())

  if (!session) {
    throw redirect({ to: '/login' })
  }

  if (session.isGuest) {
    return { session: session as SessionData | null, army: null, record: null }
  }

  const info = await queryClient.ensureQueryData(armyInfoQueryOptions(session.playerId))

  return {
    session: session as SessionData | null,
    army: info.army,
    record: info.record,
  }
},
```

**Key behavior:** On first load (cold cache), `ensureQueryData` fetches from the server — latency is identical to the current implementation (the two calls remain sequential because `armyInfoQueryOptions` depends on `session.playerId`). The gain is on **subsequent navigations** within 5 minutes: cached values are returned instantly with no server round-trip, eliminating 100-300ms of blocking latency.

### 3. Invalidate session cache on auth actions

**File:** `src/routes/__root.tsx` — `handleLogout`

After `await logoutFn()`, add:
```typescript
queryClient.removeQueries({ queryKey: ['session'] })
queryClient.removeQueries({ queryKey: ['army-info'] })
```

Access `queryClient` via `useRouteContext` or import `getContext` from root-provider.

**File:** `src/routes/login.tsx` (or wherever login completes)

After successful login, invalidate:
```typescript
queryClient.invalidateQueries({ queryKey: ['session'] })
```

### 4. Update F2 invalidations to use query cache

After this change, mutation handlers that previously needed `router.invalidate({ filter: root })` can instead use:

```typescript
// For mutations that affect the root header (e.g., match result changes record)
queryClient.invalidateQueries({ queryKey: ['army-info'] })
```

This is more precise than `router.invalidate` and only refetches the specific query.

### 5. Remove `logoutFn` from `__root.tsx` server functions if desired

`logoutFn` can stay in `__root.tsx` since it's only used there. But `getSessionFn` and `getPlayerArmyInfoFn` **must** move to `session-queries.ts` so they're importable by query options.

## Files Modified

| File | Change |
|------|--------|
| `src/lib/query-constants.ts` | **NEW** — shared cache duration constants (`STALE_TIME_SESSION = 5 * 60 * 1000`) |
| `src/lib/session-queries.ts` | **NEW** — session/army query options + server fns |
| `src/routes/__root.tsx` | Refactor `beforeLoad` to use `ensureQueryData`, remove moved server fns, update logout to clear cache |
| `src/routes/login.tsx` | Invalidate session cache after login success |

## Acceptance Criteria

- [ ] Root `beforeLoad` uses `queryClient.ensureQueryData()` for session and army info
- [ ] First navigation fetches from server (no regression)
- [ ] Subsequent navigations within 5 min read from cache (no server call — verify in network tab)
- [ ] Logout clears session + army-info cache
- [ ] Login invalidates session cache
- [ ] `pnpm typecheck` passes
- [ ] All existing E2E tests pass (`pnpm exec playwright test`)

## Testing

- `pnpm typecheck`
- Manual: login → navigate between tabs → network tab shows NO session/army requests after first load
- Manual: wait 5+ minutes → navigate → session refetch occurs
- Manual: logout → login as different user → correct session displayed
- E2E: `pnpm exec playwright test` — full suite
