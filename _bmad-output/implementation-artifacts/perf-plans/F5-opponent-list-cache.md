# Plan F5 — Opponent List Cache via useQuery

**Priority:** P3 | **Effort:** S | **Dependencies:** F3 (QueryClient defaults)

## Objective

Migrate the opponent list fetch in the FAB dialog from a manual `useEffect` + `useState` pattern to `useQuery`, so the list is cached and served instantly on subsequent dialog opens.

## Current State

**File:** `src/components/create-match-fab.tsx:142-163`

```typescript
const [opponents, setOpponents] = useState<OpponentItem[]>([])
const [isLoading, setIsLoading] = useState(false)
const [loadError, setLoadError] = useState<string | null>(null)

useEffect(() => {
  if (!open) { setIsSubmitting(false); return }
  setDate(new Date().toISOString().split('T')[0])
  setIsLoading(true)
  setLoadError(null)
  setSelectedOpponent(null)
  setSubmitError(null)

  loadOpponentsFn()
    .then((data) => { setOpponents(data); setIsLoading(false) })
    .catch(() => { setLoadError('...'); setIsLoading(false) })
}, [open])
```

Every dialog open triggers a fresh server call with a loading spinner.

## Changes Required

### 1. Create query options for opponents

**File:** `src/components/create-match-fab.tsx` (top of file, or in a new `src/lib/match-queries.ts` if preferred)

```typescript
import { queryOptions, useQuery } from '@tanstack/react-query'
import { STALE_TIME_SESSION } from '../lib/query-constants'

const opponentsQueryOptions = () =>
  queryOptions({
    queryKey: ['opponents'],
    queryFn: () => loadOpponentsFn(),
    staleTime: STALE_TIME_SESSION, // 5 min — shared constant from query-constants.ts
  })
```

### 2. Replace useState/useEffect with useQuery

**File:** `src/components/create-match-fab.tsx`

Remove:
- `const [opponents, setOpponents] = useState<OpponentItem[]>([])` (line ~133)
- `const [isLoading, setIsLoading] = useState(false)` (line ~134)
- `const [loadError, setLoadError] = useState<string | null>(null)` (line ~135)
- The `useEffect` block (lines 142-163) that fetches opponents

Replace with:
```typescript
const {
  data: opponents = [],
  isLoading,
  error: loadError,
  refetch: retryOpponents,
} = useQuery({
  ...opponentsQueryOptions(),
  enabled: open, // only fetch when dialog is open
})
```

### 3. Update dialog open/close state reset

The `useEffect` currently resets `selectedOpponent`, `submitError`, and `date` when the dialog opens. Keep this logic but remove the fetch part:

```typescript
useEffect(() => {
  if (!open) {
    setIsSubmitting(false)
    return
  }
  setDate(new Date().toISOString().split('T')[0])
  setSelectedOpponent(null)
  setSubmitError(null)
}, [open])
```

### 4. Update retry handler

**Replace** the `handleRetry` function (lines 184-196):

```typescript
const handleRetry = () => {
  retryOpponents()
}
```

### 5. Update error display

The current code uses `loadError` as a `string | null`. With `useQuery`, `error` is an `Error | null`. Update the template:

```typescript
// Before:
{loadError && <p style={...}>{loadError}</p>}

// After:
{loadError && <p style={...}>Impossible de charger la liste des adversaires.</p>}
```

### 6. Invalidate opponent cache after match creation

In `handleConfirm`, after successful match creation, invalidate the opponents cache so a newly created match is reflected:

```typescript
import { useQueryClient } from '@tanstack/react-query'

// Inside the component:
const queryClient = useQueryClient()

// In handleConfirm, after createMatchFn succeeds:
queryClient.invalidateQueries({ queryKey: ['opponents'] })
```

## Files Modified

| File | Change |
|------|--------|
| `src/components/create-match-fab.tsx` | Replace manual fetch with `useQuery`, add query options |

## Acceptance Criteria

- [ ] First dialog open fetches opponents from server (same as before)
- [ ] Closing and reopening dialog within 5 min shows opponents instantly (no spinner)
- [ ] Retry button works when fetch fails
- [ ] After creating a match, opponent cache is invalidated
- [ ] `selectedOpponent`, `submitError`, and `date` reset on each dialog open
- [ ] `pnpm typecheck` passes
- [ ] No visible regression in dialog behavior

## Testing

- Manual: open FAB dialog → opponents load → close → reopen → opponents appear instantly (no spinner)
- Manual: wait 5+ min → reopen → opponents refetch
- Manual: disconnect network → open dialog → error shown → reconnect → retry works
- Network tab: second dialog open within 5 min shows no `/opponents` request

## Note: Dialog Mount/Unmount Lifecycle

The dialog uses Radix/shadcn `<Dialog open={open}>`: the `DialogContent` is mounted/unmounted on open/close, but the `CreateMatchFab` component itself stays mounted at the layout level. Since the `useQuery` call lives in `CreateMatchFab` (not inside `DialogContent`), the query observer persists across dialog open/close cycles and the cache works as expected. No special handling needed.
