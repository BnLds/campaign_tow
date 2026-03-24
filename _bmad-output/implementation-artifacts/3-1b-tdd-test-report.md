# Story 3.1b — TDD Test Report (Red Phase)

**Story:** App Shell — TabBar, Layout & Navigation Components
**Date:** 2026-03-16
**Status:** RED — 115/118 tests failing (expected)

## Summary

| Metric | Value |
|---|---|
| Test files created | 4 |
| Total tests | 118 |
| Failing (red) | 115 |
| Passing (3 pre-existing assertions) | 3 |
| Red phase confirmed | YES |

## Test Files Created

### 1. `src/components/__tests__/tab-bar.test.tsx` — 32 tests
All 32 tests fail (ENOENT: `src/components/tab-bar.tsx` does not exist yet).

Covers: AC1, AC2, AC5, AC7, AC9 — Tasks 1.1–1.8, 4.4, 8.1–8.4

Test groups:
- File exists + named export
- 3 fixed tabs with correct labels (Campagne, Armees, References)
- Emoji icons present (📜 🛡 📖)
- Each tab links to correct route (/, /armies, /territories)
- Active state styling (currentPath prop, isCampagne/isArmees/isTerritoires logic)
- Color tokens: #dfe8f4 (active bg), #334155 (active text), #9a8d7f (inactive)
- /admin excluded from Campagne; /login excluded from isCampagne
- Indicator bar as real DOM `<span>` (24px wide, 3px tall)
- Container: data-testid="tab-bar", height 58px, backdropFilter blur
- Tab data-testids: tab-campagne, tab-armees, tab-references
- Root layout integration: TabBar imported and rendered in __root.tsx, useLocation present

### 2. `src/components/__tests__/army-list-item.test.tsx` — 36 tests
All 36 tests fail (ENOENT: `src/components/army-list-item.tsx` does not exist yet).

Covers: AC3, AC10 — Tasks 2.1–2.9, 6.1, 6.3, 6.4, 8.5–8.12

Test groups:
- File exists + named export
- Props: id, name, faction, playerDisplayName, record (wins/draws/losses | null), isOwn
- Avatar: first letter (charAt(0)), Cinzel font, 42x42px circle, data-testid="army-avatar"
- Army info: name, faction, playerDisplayName rendered; ellipsis truncation for long names
- Gold variant (isOwn=true): border #ead69b, background #fff9ec, box-shadow rgba(212,168,67,...)
- Normal variant (isOwn=false): border #e0d5c8
- Record display: wins green #2d7a3a, losses red #b82c2c
- "Aucune partie" for null or all-zero record, muted italic style
- Chevron indicator
- Navigation Link to /armies/$armyId with armyId params
- data-testid="army-list-item" on root element
- Armies list route: imports ArmyListItem, renders it, calls getAllArmyRecords, passes record, sorts own army first

### 3. `src/db/__tests__/queries-record.test.ts` — 29 tests
28/29 tests fail. 1 passes (pre-existing "Aucune partie" string in index.tsx).

Covers: AC4, AC10 — Tasks 5.1–5.4, 6.1, 8.13–8.17

Test groups (getArmyRecord — Task 5.1):
- Exported as async function
- Accepts armyId parameter
- Returns wins, draws, losses counts
- Queries matchParticipants table
- Uses COUNT FILTER pattern via Drizzle sql template (victory, draw, defeat)
- Filters by armyId
- Wraps counts with Number() (Drizzle returns string|null for raw SQL)
- Returns { wins, draws, losses } shape
- Imports sql from drizzle-orm

Test groups (getAllArmyRecords — Task 6.1):
- Exported as async function
- No parameters (batch, no armyId filter)
- Groups by armyId (groupBy)
- Returns Map<string, {...}>
- Map.set(armyId, ...) pattern
- Map value contains wins, draws, losses
- COUNT FILTER for victory (N+1 prevention)
- Number() wrapping
- Return type Map<string, {...}>

Test groups (Campaign view integration — Tasks 5.2–5.4):
- routes/index.tsx calls getArmyRecord in loadCampaignTimelineFn
- record included in loader return value
- record: null for guest users
- "Aucune partie" for zero/null record (AC10) ← 1 pre-existing PASS
- "parties" text in record format (e.g. "4 parties")
- Green #2d7a3a for wins, red #b82c2c for losses

### 4. `src/routes/__tests__/territories.test.tsx` — 21 tests
19/21 tests fail. 2 pass (pre-existing assertions in existing files: "Aucune partie" in index.tsx and similar).

Covers: AC6, AC7, AC8 — Tasks 3.1–3.5, 4.2, 4.3, 7.1–7.2, 8.17

Test groups:
- File exists at src/routes/territories.tsx (not references/index.tsx)
- createFileRoute('/territories') + exported Route
- Title "References" with Cinzel font
- Placeholder text "Contenu" / "venir" + italic style
- data-app-hydrated pattern (useHydrated + data-app-hydrated attribute)
- Layout: 1rem padding, 720px max-width, margin auto
- No async loader (static route)
- Root layout: flexDirection column, 100dvh, overflowY auto, paddingBottom 68px, minHeight 0
- Army detail back link to /armies with ghost button style (999px borderRadius, left-arrow character)

## AC Coverage Map

| AC | Tests covering it | Test IDs |
|---|---|---|
| AC1 — TabBar with 3 fixed tabs | tab-bar.test.tsx | TAB-001..029 |
| AC2 — Tab navigation routes | tab-bar.test.tsx | TAB-009..012 |
| AC3 — ArmyListItem component | army-list-item.test.tsx | ALI-001..036 |
| AC4 — Campaign view header with record | queries-record.test.ts | QRY-023..029 |
| AC5 — Guest user sees TabBar | tab-bar.test.tsx | TAB-001..032 |
| AC6 — References placeholder route | references.test.tsx | REF-001..013 |
| AC7 — Layout structure | references.test.tsx | REF-014..018 |
| AC8 — Army detail back navigation | references.test.tsx | REF-019..021 |
| AC9 — Admin no active tab | tab-bar.test.tsx | TAB-020..021 |
| AC10 — "Aucune partie" graceful handling | army-list-item.test.tsx, queries-record.test.ts | ALI-022..026, QRY-026 |

## Test Strategy

All tests use the **structural file-content assertion** pattern established in the project (no runtime rendering — `readFileSync` + `expect(code).toMatch()`). This approach is consistent with all existing story tests (3-1-queries.test.ts, 3-1-routes.test.ts, 2-4-unit-edit-panel-component.test.ts).

This pattern is appropriate because:
- New component files do not exist yet (TDD red phase)
- No test DB is needed for structural tests
- Tests compile and run — they just fail on missing files or missing patterns
- Implementation will make all tests pass by writing the correct code patterns

## Red Phase Confirmation

```
Test Files  4 failed (4)
     Tests  115 failed | 3 passed (118)
```

The 3 passing tests check content already present in `src/routes/index.tsx` from story 3.1 ("Aucune partie" string). This is acceptable — they test that story 3.1b enhancements remain compatible with existing story 3.1 content.

Vitest note: Tests require running outside sandbox (`npx vitest run`) because the TanStack Start vitest config writes SSR artifacts to `/tmp/claude/` during collection. This is a known sandbox restriction — `pnpm test` works normally in the dev environment.
