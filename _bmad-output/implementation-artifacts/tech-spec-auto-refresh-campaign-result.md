---
title: 'Auto-refresh campaign page on match result update'
slug: 'auto-refresh-campaign-result'
created: '2026-03-24'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['tanstack-router', 'react']
files_to_modify: ['src/routes/index.tsx']
code_patterns: ['TanStack Router loader + Route.useLoaderData()', 'router.invalidate({ filter }) for cache busting', 'useEffect + useRef guards for side effects']
test_patterns: ['vitest + @testing-library/react in src/components/__tests__/', 'server fn integration tests in src/routes/__tests__/']
---

# Tech-Spec: Auto-refresh campaign page on match result update

**Created:** 2026-03-24

## Overview

### Problem Statement

When player A submits a match result (victory/defeat/draw), the database is updated for both participants in the same transaction (via `invertResult`). However, player B's campaign page (`/`) does not refresh automatically. Since both players are typically at the same physical table with the app open simultaneously, player B must manually refresh to see the updated result. The `staleTime: 30_000` on the route loader further delays staleness detection.

### Solution

Add a polling mechanism to the `CampaignView` component using `setInterval` + `router.invalidate()` (~15s interval). Pause polling when the browser tab is not visible to avoid unnecessary requests. Reduce `staleTime` from 30s to 10s so that polling invalidation triggers an actual re-fetch.

### Scope

**In Scope:**
- Polling on the campaign route (`/`) to auto-refresh timeline data
- Visibility-aware polling (pause when tab is hidden)
- Adjust `staleTime` to allow polling to trigger fresh fetches

**Out of Scope:**
- Real-time push (SSE/WebSocket)
- Action chip behavior changes
- Polling on other routes (armies, territories)

## Context for Development

### Codebase Patterns

- Campaign data is loaded via TanStack Router loader calling `loadCampaignTimelineFn` (server function, GET)
- Data is consumed via `Route.useLoaderData()` in `CampaignView` (line 182)
- Route definition at line 155: `staleTime: 30_000` — controls when the loader considers data stale
- Existing invalidation pattern: `router.invalidate({ filter: (d) => d.routeId === '__root__' || d.routeId === '/' })` (e.g. line 245)
- Side effects use `useEffect` + `useRef` guards (e.g. `initialMatchCreatedRef` line 204)
- `useRouter()` already available in CampaignView (line 165)

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/routes/index.tsx:155-161` | Route definition — loader, staleTime |
| `src/routes/index.tsx:163-554` | CampaignView component |
| `src/routes/index.tsx:238-246` | handleResultSubmit — existing invalidation pattern |

### Technical Decisions

- Polling via `setInterval` + `router.invalidate` — preserves existing loader pattern, no refactor needed
- ~15s interval — acceptable latency for same-table tabletop play
- Visibility API (`document.visibilitychange`) to pause polling when tab is hidden — avoids wasting requests
- Reduce `staleTime` from 30s to 10s — ensures polling invalidation triggers actual re-fetch while still deduplicating rapid navigations
- Polling must invalidate both `__root__` and `/` routes — the root loader provides the army record (W/D/L) displayed in the header, which must also update when a result changes. This matches the existing pattern in `handleResultSubmit` (line 229).
- Wrap `router.invalidate` in a try/catch — network errors during polling must not break the interval

## Implementation Plan

### Tasks

- [x] Task 1: Reduce route staleTime
  - File: `src/routes/index.tsx`
  - Action: Change `staleTime: 30_000` to `staleTime: 10_000` on the Route definition (line 156)
  - Notes: 10s deduplicates rapid navigation while allowing the 15s polling to trigger re-fetches

- [x] Task 2: Add visibility-aware polling useEffect
  - File: `src/routes/index.tsx`
  - Action: Add a `useEffect` in `CampaignView` that:
    1. Sets up a `setInterval` (15_000ms) calling `router.invalidate({ filter: (d) => d.routeId === '__root__' || d.routeId === '/' })` wrapped in try/catch (silent catch — network errors must not break polling)
    2. Listens to `document.visibilitychange` — clears interval when hidden, restarts when visible (with immediate invalidation on becoming visible)
    3. Cleans up both interval and event listener on unmount
  - Notes: Place after the existing `useEffect` blocks (after line ~220). No `useRef` guard needed — this is a standard interval effect, not a one-shot. Only poll for non-guest users who have an army (skip if `isGuest` or `army === null`). Invalidate both `__root__` (header army record) and `/` (timeline) — same pattern as `handleResultSubmit`.

### Acceptance Criteria

- [x] AC 1: Given player B has the campaign page open and player A submits a match result, when ~15 seconds elapse, then player B's campaign page shows the updated result without manual refresh.
- [x] AC 2: Given the browser tab is hidden (user switched to another app/tab), when the polling interval fires, then no server request is made.
- [x] AC 3: Given the browser tab becomes visible again after being hidden, when visibility changes to visible, then an immediate invalidation is triggered and data refreshes.
- [x] AC 4: Given a guest user views the campaign page, when the polling interval fires, then no polling occurs (no unnecessary server requests for guests).
- [x] AC 5: Given a logged-in user without an army views the campaign page, when the polling interval fires, then no polling occurs.
- [x] AC 6: Given the user navigates away from the campaign page, when the component unmounts, then the interval and visibility listener are cleaned up (no memory leak).
- [x] AC 7: Given a network error occurs during a polling invalidation, when the next interval fires, then polling continues normally (error is silently caught).

## Additional Context

### Dependencies

None — uses only existing browser APIs (`document.visibilitychange`, `setInterval`) and TanStack Router (`router.invalidate`).

### Testing Strategy

- **Manual testing:** Open the app in two browser sessions (two different players). Have player A submit a match result. Verify player B's campaign page updates within ~15 seconds.
- **Unit test (optional):** The polling logic is a simple `useEffect` with standard browser APIs — low risk, manual verification is sufficient for this scope.

## Review Notes

- Adversarial review completed
- Findings: 10 total, 3 fixed (F1, F2, F10), 7 skipped (noise/uncertain)
- Resolution approach: auto-fix
- F1 fix: `army` remplacé par `armyId` (primitive) dans les deps pour éviter le restart à chaque poll
- F2 fix: guard mort `if (intervalId !== null)` retiré de `startPolling`
- F10 fix: commentaire ajouté sur le couplage staleTime/intervalle

### Notes

- `updateMatchResults` and `updateMatchResultOnLatest` already update both participants in a single DB transaction — no backend changes needed.
- The polling also benefits other scenarios: match creation by the other player, post-match evolutions completed by the other player — all become visible within 15s.
- Future consideration: if polling creates measurable server load with many concurrent users, consider switching to SSE or increasing the interval. For the current 2-player campaign context, 15s polling is negligible.
