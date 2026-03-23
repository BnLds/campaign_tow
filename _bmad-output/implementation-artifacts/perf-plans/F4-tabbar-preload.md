# Plan F4 — TabBar Prefetching

**Priority:** P2 | **Effort:** XS | **Dependencies:** none

## Objective

Add `preload="intent"` to all TabBar `<Link>` components so that route loaders start on hover/touch-start, making navigation feel instant.

## Current State

**File:** `src/components/tab-bar.tsx`

Three `<Link>` components (lines 59, 84, 109) without `preload` prop:

```typescript
<Link to="/" ...>           // Campagne
<Link to="/armies" ...>     // Armees
<Link to="/references" ...> // References
```

Currently, the loader only starts **after** the user taps/clicks. On mobile, this adds the full loader duration to perceived navigation time.

## Changes Required

### 1. Add `preload="intent"` to all three Links

**File:** `src/components/tab-bar.tsx`

**Line 59** — Campagne tab:
```typescript
<Link to="/" preload="intent" ...>
```

**Line 84** — Armees tab:
```typescript
<Link to="/armies" preload="intent" ...>
```

**Line 109** — References tab:
```typescript
<Link to="/references" preload="intent" ...>
```

`preload="intent"` triggers the route loader when the user hovers (desktop) or touches (mobile `touchstart`). By the time the click/tap fires, data is already loaded or nearly loaded.

## Acceptance Criteria

- [ ] All 3 `<Link>` in TabBar have `preload="intent"`
- [ ] No other changes to the file
- [ ] Navigation between tabs feels noticeably faster (loader runs during hover/touch)

## Testing

- `pnpm typecheck` — no TS errors
- Desktop: hover over a tab → network tab shows the loader request fires before click
- Mobile (or devtools touch simulation): touch a tab → navigation is near-instant
