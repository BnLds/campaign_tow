# Story 3.1 — TDD Test Report (RED Phase)

**Story:** Army Timeline View
**Status:** RED phase complete — all new tests fail as expected
**Date:** 2026-03-16

---

## Test Files Created

| File | Type | Tests |
|---|---|---|
| `tests/3-1-schema.test.ts` | Structural (file-content assertions) | 17 |
| `tests/3-1-queries.test.ts` | Structural (file-content assertions) | 25 |
| `tests/3-1-routes.test.ts` | Structural (file-content assertions) | 42 |
| `tests/3-1-timeline-entry.test.tsx` | React component rendering (jsdom) | 17 |
| **Total** | | **101** |

---

## RED Phase Confirmation

Test run command: `TMPDIR=/tmp/claude-1000 npx vitest run tests/3-1-schema.test.ts tests/3-1-queries.test.ts tests/3-1-routes.test.ts tests/3-1-timeline-entry.test.tsx`

### Results Summary

```
tests/3-1-schema.test.ts          (17 tests | 17 failed)
tests/3-1-routes.test.ts          (42 tests | 40 failed, 2 passed*)
tests/3-1-queries.test.ts         (25 tests | 23 failed, 2 passed*)
tests/3-1-timeline-entry.test.tsx (FAIL — import resolution error: component file doesn't exist)
```

**(*) 2 tests passing in routes + 2 in queries = 4 regression-guard tests** that verify existing functionality is intact:
- `[3.1-CMP-013]` — WelcomeModal import preserved in index.tsx
- `[3.1-CMP-014]` — markWelcomeSeenFn preserved in index.tsx
- `[3.1-QRY-022]` — getAllArmies still exported from queries.ts
- `[3.1-QRY-023]` — getAllArmies returns playerDisplayName

These 4 passing tests are intentional — they confirm no regression in existing features and are not "new" implementation tests.

### Failure Reasons (correct for RED phase)

- **Schema tests (3-1-schema.test.ts):** `matches` and `matchParticipants` tables not yet defined in `src/db/schema.ts`
- **Queries tests (3-1-queries.test.ts):** `getTimelineForArmy`, `getPlayerArmy`, `TimelineEntryData` type, and `alias` import not yet in `src/db/queries.ts`
- **Routes tests (3-1-routes.test.ts):**
  - `src/routes/armies/index.tsx` does not exist (ENOENT errors)
  - Campaign view (`src/routes/index.tsx`) missing: `loadCampaignTimelineFn`, timeline rendering, empty states, guest message, `Link` to army detail
  - Army detail view (`src/routes/armies/$armyId.tsx`) missing: `getTimelineForArmy` call, `Historique` section, `TimelineEntry` rendering
- **Component tests (3-1-timeline-entry.test.tsx):** `src/components/timeline-entry.tsx` does not exist — Vite import resolution fails before any test runs

---

## AC Coverage

| AC | Tests Covering It |
|---|---|
| **AC1** — Campaign view shows own timeline (reverse chronological) | 3.1-SCH-001–014, 3.1-QRY-001–011, 3.1-QRY-018–021, 3.1-QRY-024–025, 3.1-CMP-001–016 |
| **AC2** — Campaign view header links to army detail | 3.1-QRY-012–017, 3.1-CMP-007, 3.1-CMP-008, 3.1-CMP-009 |
| **AC3** — TimelineEntry shows match details and evolution indicator | 3.1-SCH-001–014, 3.1-QRY-001–011, 3.1-COMP-001–017 |
| **AC4** — Opponent army timeline accessible | 3.1-SCH-001–017, 3.1-QRY-001–011, 3.1-ARY-001–007, 3.1-LST-001–019 |
| **AC5** — Empty state for army with no matches | 3.1-CMP-010, 3.1-CMP-011, 3.1-ARY-006 |
| **AC6** — TimelineEntry without evolutions | 3.1-SCH-013, 3.1-COMP-010–012, 3.1-COMP-013–014, 3.1-ARY-001–007 |
| **AC7** — Armies list with gold highlight for own army | 3.1-QRY-022–023, 3.1-LST-001–019 |
| **AC8** — Guest user experience | 3.1-CMP-003, 3.1-CMP-012–014, 3.1-ARY-007, 3.1-LST-005–006, 3.1-LST-015, 3.1-LST-017–019 |

---

## Test Design Decisions

### Pattern: Structural file-content assertions

Tests for schema, queries, and routes use the `readFileSync` + regex pattern established in `tests/2-4-unit-deltas-queries.test.ts` and `tests/2-4-unit-deltas-server.test.ts`. These tests:
- Verify function exports exist with correct names
- Verify correct patterns (dynamic imports inside `.handler()`, middleware wiring, etc.)
- Are runnable without a live database
- Fail precisely because the implementation files don't contain the expected patterns yet

### Pattern: React component rendering (jsdom)

Tests for `TimelineEntry` use the `@vitest-environment jsdom` directive + `@testing-library/react`, matching `tests/2-3-unit-card.test.tsx`. These tests:
- Verify rendered text content (opponent name, faction, French date)
- Verify `data-testid` attributes (`timeline-entry`, `result-badge`)
- Verify conditional rendering (evolution indicator, result badge, null result)
- Currently fail at import resolution because the component file doesn't exist

### Key assertions that are coupled (per MEMORY.md rule)

```typescript
// result badge text AND testid — single getByTestId assertion couples both
const badge = screen.getByTestId('result-badge')
expect(badge.textContent).toBe('V')  // coupled: badge exists AND shows 'V'

// FK with cascade — single contains assertion
expect(schema).toContain(".references(() => matches.id, { onDelete: 'cascade' })")
```

---

## Implementation Guide for Story 3.1

Tests are ordered by dependency:
1. **Start with schema** (`3-1-schema.test.ts`) — add `matches` + `matchParticipants` tables to `src/db/schema.ts`
2. **Then queries** (`3-1-queries.test.ts`) — add `getTimelineForArmy`, `getPlayerArmy`, `TimelineEntryData` type
3. **Then component** (`3-1-timeline-entry.test.tsx`) — create `src/components/timeline-entry.tsx`
4. **Then routes** (`3-1-routes.test.ts`) — update Campaign view, army detail view, create armies list route

Run tests after each step to verify progress from RED to GREEN.
