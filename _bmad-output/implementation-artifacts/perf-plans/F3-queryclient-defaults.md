# Plan F3 — QueryClient Defaults

**Priority:** P1 | **Effort:** XS | **Dependencies:** none (implement first)

## Objective

Configure the TanStack Query `QueryClient` with sensible defaults to enable caching and prevent unnecessary refetches. This is a prerequisite for F1, F5, and F8.

## Current State

**File:** `src/integrations/tanstack-query/root-provider.tsx:15`

```typescript
const queryClient = new QueryClient()
```

No `defaultOptions` — defaults to `staleTime: 0`, `refetchOnWindowFocus: true`.

## Changes Required

### 1. Set default query options

**File:** `src/integrations/tanstack-query/root-provider.tsx`
**Line:** 15

Replace:
```typescript
const queryClient = new QueryClient()
```

With:
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
    },
  },
})
```

**Rationale:**
- `staleTime: 60_000` (1 min): data fetched within the last minute is served from cache without refetch. Routes that need fresher data can override per-query.
- `refetchOnWindowFocus` is kept at its default value (`true`). In a multiplayer campaign, an opponent may submit a match result while the user has the tab in the background. Combined with `staleTime: 60_000`, the refetch only fires if data is older than 1 minute — a good tradeoff between freshness and network economy.

## Acceptance Criteria

- [ ] `QueryClient` is created with `staleTime: 60_000` (keep `refetchOnWindowFocus` at default `true`)
- [ ] No other files are modified
- [ ] App starts without errors
- [ ] Existing behavior is preserved (no visible regressions — this is a foundation change, active caching comes in F1/F5)

## Testing

- `pnpm dev` — app loads normally
- `pnpm typecheck` — no TS errors
- Open two tabs, switch between them — refetch fires only if data is older than 1 minute
