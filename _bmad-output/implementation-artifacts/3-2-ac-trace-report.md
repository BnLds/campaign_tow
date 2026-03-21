# Story 3-2: AC Trace Report — Match Creation & Pending Actions

**Generated:** 2026-03-16
**Branch:** dev
**Test run:** 154/154 passed (0 failures, 0 skipped)

---

## Summary

| Metric | Value |
|---|---|
| Total story 3-2 tests | 154 |
| Tests passing | 154 |
| Tests failing | 0 |
| ACs with full coverage | 12/12 |
| ACs with partial coverage | 0 |
| Coverage gaps | None |

---

## AC Trace Matrix

### AC1 — FAB visible on all authenticated views

| Test ID | Test Name | File | Status |
|---|---|---|---|
| 3.2-FAB-001 | src/components/create-match-fab.tsx file exists | create-match-fab.test.tsx | PASS |
| 3.2-FAB-002 | create-match-fab.tsx exports CreateMatchFab as named export | create-match-fab.test.tsx | PASS |
| 3.2-FAB-003 | CreateMatchFab renders a "+" character inside the button | create-match-fab.test.tsx | PASS |
| 3.2-FAB-004 | CreateMatchFab has background color #334155 (navy) | create-match-fab.test.tsx | PASS |
| 3.2-FAB-005 | CreateMatchFab is 56x56px (width and height) | create-match-fab.test.tsx | PASS |
| 3.2-FAB-006 | CreateMatchFab has border-radius 50% (circular shape) | create-match-fab.test.tsx | PASS |
| 3.2-FAB-007 | CreateMatchFab is positioned absolute | create-match-fab.test.tsx | PASS |
| 3.2-FAB-008 | CreateMatchFab is positioned at right: 16px | create-match-fab.test.tsx | PASS |
| 3.2-FAB-009 | CreateMatchFab is positioned at bottom: 62px (above TabBar) | create-match-fab.test.tsx | PASS |
| 3.2-FAB-010 | CreateMatchFab has z-index: 2 | create-match-fab.test.tsx | PASS |
| 3.2-FAB-011 | CreateMatchFab has box-shadow for elevation | create-match-fab.test.tsx | PASS |
| 3.2-FAB-012 | CreateMatchFab has aria-label="Creer une partie" | create-match-fab.test.tsx | PASS |
| 3.2-FAB-013 | CreateMatchFab has data-testid="create-match-fab" | create-match-fab.test.tsx | PASS |
| 3.2-FAB-014 | CreateMatchFab accepts session prop with playerId and isGuest | create-match-fab.test.tsx | PASS |
| 3.2-FAB-015 | CreateMatchFab accepts armyId prop (string \| null) | create-match-fab.test.tsx | PASS |
| 3.2-FAB-052 | __root.tsx imports CreateMatchFab | create-match-fab.test.tsx | PASS |
| 3.2-FAB-053 | __root.tsx renders CreateMatchFab only when session exists and not guest | create-match-fab.test.tsx | PASS |
| 3.2-FAB-055 | __root.tsx passes armyId prop to CreateMatchFab | create-match-fab.test.tsx | PASS |
| 3.2-FAB-056 | __root.tsx outermost div has position: relative | create-match-fab.test.tsx | PASS |

**AC1 verdict: COVERED — 19 tests, all passing**

---

### AC2 — FAB opens match creation dialog

| Test ID | Test Name | File | Status |
|---|---|---|---|
| 3.2-FAB-016 | create-match-fab.tsx uses useState for dialog open/close state | create-match-fab.test.tsx | PASS |
| 3.2-FAB-017 | CreateMatchFab uses Shadcn Dialog component | create-match-fab.test.tsx | PASS |
| 3.2-FAB-018 | create-match-fab.tsx imports Dialog from @/components/ui/dialog | create-match-fab.test.tsx | PASS |
| 3.2-FAB-019 | Dialog has title "Nouvelle partie" (Cinzel font) | create-match-fab.test.tsx | PASS |
| 3.2-FAB-022 | create-match-fab.tsx defines loadOpponentsFn as createServerFn | create-match-fab.test.tsx | PASS |
| 3.2-FAB-023 | loadOpponentsFn uses authMiddleware | create-match-fab.test.tsx | PASS |
| 3.2-FAB-024 | loadOpponentsFn returns armyId, armyName, faction, playerDisplayName | create-match-fab.test.tsx | PASS |
| 3.2-FAB-025 | loadOpponentsFn uses getAllArmies from db/queries (dynamic import) | create-match-fab.test.tsx | PASS |
| 3.2-FAB-045 | Dialog confirm button has label "Creer la partie" | create-match-fab.test.tsx | PASS |
| 3.2-FAB-047 | Confirm button is disabled until opponent is selected | create-match-fab.test.tsx | PASS |
| 3.2-FAB-057 | Dialog renders opponent selectable items (radio or tappable cards) | create-match-fab.test.tsx | PASS |
| 3.2-FAB-058 | Dialog uses router.invalidate() after successful match creation | create-match-fab.test.tsx | PASS |

**AC2 verdict: COVERED — 12 tests, all passing**

---

### AC3 — Optional date field defaults to today

| Test ID | Test Name | File | Status |
|---|---|---|---|
| 3.2-FAB-042 | Dialog contains a date input with label "Date de la partie" | create-match-fab.test.tsx | PASS |
| 3.2-FAB-043 | Date input uses type="date" | create-match-fab.test.tsx | PASS |
| 3.2-FAB-044 | Date input default value uses toISOString().split() | create-match-fab.test.tsx | PASS |
| 3.2-SFN-010 | createMatchFn rejects invalid date string (isNaN check) | create-match.test.ts | PASS |
| 3.2-SFN-011 | createMatchFn throws French error "Date invalide" for invalid date | create-match.test.ts | PASS |
| 3.2-SFN-012 | createMatchFn normalizes date to midnight UTC via T00:00:00Z suffix | create-match.test.ts | PASS |
| 3.2-SFN-013 | createMatchFn defaults to today when no date is provided | create-match.test.ts | PASS |
| 3.2-SFN-014 | createMatchFn creates a Date object from normalized string | create-match.test.ts | PASS |
| 3.2-FAB-036 | createMatchFn validates date is not invalid (NaN check) | create-match-fab.test.tsx | PASS |
| 3.2-FAB-037 | createMatchFn normalizes date to midnight UTC (T00:00:00Z) | create-match-fab.test.tsx | PASS |
| 3.2-FAB-038 | createMatchFn defaults date to today when not provided | create-match-fab.test.tsx | PASS |

**AC3 verdict: COVERED — 11 tests, all passing**

---

### AC4 — Match creation writes correct DB records

| Test ID | Test Name | File | Status |
|---|---|---|---|
| 3.2-FAB-029 | create-match-fab.tsx defines createMatchFn as createServerFn with method POST | create-match-fab.test.tsx | PASS |
| 3.2-FAB-030 | createMatchFn uses authMiddleware | create-match-fab.test.tsx | PASS |
| 3.2-FAB-031 | createMatchFn validates input with opponentArmyId and optional date | create-match-fab.test.tsx | PASS |
| 3.2-FAB-039 | createMatchFn calls createMatchWithParticipants from db/queries | create-match-fab.test.tsx | PASS |
| 3.2-FAB-040 | createMatchFn creates participants with null result | create-match-fab.test.tsx | PASS |
| 3.2-FAB-041 | createMatchFn returns { matchId } on success | create-match-fab.test.tsx | PASS |
| 3.2-SFN-015 | createMatchFn calls createMatchWithParticipants from db/queries | create-match.test.ts | PASS |
| 3.2-SFN-016 | createMatchFn passes result1: null (no result at creation time) | create-match.test.ts | PASS |
| 3.2-SFN-017 | createMatchFn passes result2: null for opponent participant | create-match.test.ts | PASS |
| 3.2-SFN-018 | createMatchFn passes evolutionsEntered: false | create-match.test.ts | PASS |
| 3.2-SFN-019 | createMatchFn passes createdByPlayerId from session | create-match.test.ts | PASS |
| 3.2-SFN-020 | createMatchFn returns { matchId } on success | create-match.test.ts | PASS |

**AC4 verdict: COVERED — 12 tests, all passing**

---

### AC5 — ActionChip strip shows pending matches on Campaign view

| Test ID | Test Name | File | Status |
|---|---|---|---|
| 3.2-ACP-001 | src/components/action-chip.tsx file exists | action-chip.test.tsx | PASS |
| 3.2-ACP-002 | action-chip.tsx exports ActionChip as named export | action-chip.test.tsx | PASS |
| 3.2-ACP-003 | ActionChip accepts label prop (string) | action-chip.test.tsx | PASS |
| 3.2-ACP-004 | ActionChip accepts optional href prop (string) | action-chip.test.tsx | PASS |
| 3.2-ACP-005 | ActionChip accepts optional onClick prop (callback) | action-chip.test.tsx | PASS |
| 3.2-ACP-006 | ActionChip has background color #eef4ff (blue tint) | action-chip.test.tsx | PASS |
| 3.2-ACP-007 | ActionChip has border 1px solid #d7e1ef | action-chip.test.tsx | PASS |
| 3.2-ACP-008 | ActionChip has border-radius 999px (pill shape) | action-chip.test.tsx | PASS |
| 3.2-ACP-009 | ActionChip has color #334155 (navy text) | action-chip.test.tsx | PASS |
| 3.2-ACP-010 | ActionChip has padding 8px 12px | action-chip.test.tsx | PASS |
| 3.2-ACP-011 | ActionChip has font-size 11px | action-chip.test.tsx | PASS |
| 3.2-ACP-012 | ActionChip has font-weight 700 (bold) | action-chip.test.tsx | PASS |
| 3.2-ACP-013 | ActionChip has white-space: nowrap (no wrapping) | action-chip.test.tsx | PASS |
| 3.2-ACP-014 | ActionChip has box-shadow for elevation | action-chip.test.tsx | PASS |
| 3.2-ACP-015 | ActionChip has cursor: pointer (interactive) | action-chip.test.tsx | PASS |
| 3.2-ACP-016 | ActionChip renders label text | action-chip.test.tsx | PASS |
| 3.2-ACP-017 | ActionChip appends a chevron ">" after the label | action-chip.test.tsx | PASS |
| 3.2-ACP-018 | Chevron has margin-left 6px and higher opacity/weight | action-chip.test.tsx | PASS |
| 3.2-ACP-019 | ActionChip renders as \<a\> when href is provided | action-chip.test.tsx | PASS |
| 3.2-ACP-020 | ActionChip renders as \<button\> when href is not provided | action-chip.test.tsx | PASS |
| 3.2-ACP-021 | ActionChip button has role="button" when rendered as button | action-chip.test.tsx | PASS |
| 3.2-ACP-022 | ActionChip has data-testid="action-chip" | action-chip.test.tsx | PASS |
| 3.2-QRY-001 | queries.ts exports PendingMatchData type | queries-pending-matches.test.ts | PASS |
| 3.2-QRY-002 | PendingMatchData has matchId field (string) | queries-pending-matches.test.ts | PASS |
| 3.2-QRY-003 | PendingMatchData has date field (string, ISO format) | queries-pending-matches.test.ts | PASS |
| 3.2-QRY-004 | PendingMatchData has opponentArmyName field (string) | queries-pending-matches.test.ts | PASS |
| 3.2-QRY-005 | PendingMatchData has opponentFaction field (string) | queries-pending-matches.test.ts | PASS |
| 3.2-QRY-006 | PendingMatchData has myResult field (string \| null) | queries-pending-matches.test.ts | PASS |
| 3.2-QRY-007 | PendingMatchData has myEvolutionsEnteredAt field (string \| null) | queries-pending-matches.test.ts | PASS |
| 3.2-QRY-008 | queries.ts exports getPendingMatches as async function | queries-pending-matches.test.ts | PASS |
| 3.2-QRY-009 | getPendingMatches accepts armyId parameter (string) | queries-pending-matches.test.ts | PASS |
| 3.2-QRY-010 | getPendingMatches return type is Promise\<PendingMatchData[]\> | queries-pending-matches.test.ts | PASS |
| 3.2-QRY-011 | getPendingMatches queries matchParticipants table | queries-pending-matches.test.ts | PASS |
| 3.2-QRY-012 | getPendingMatches joins matches table to get match date | queries-pending-matches.test.ts | PASS |
| 3.2-QRY-013 | getPendingMatches uses alias() for self-join on match_participants | queries-pending-matches.test.ts | PASS |
| 3.2-QRY-014 | getPendingMatches imports alias from drizzle-orm/pg-core (not drizzle-orm) | queries-pending-matches.test.ts | PASS |
| 3.2-QRY-015 | getPendingMatches uses ne() to exclude own army from opponent join | queries-pending-matches.test.ts | PASS |
| 3.2-QRY-016 | getPendingMatches joins opponent armies table to get opponent name/faction | queries-pending-matches.test.ts | PASS |
| 3.2-QRY-017 | getPendingMatches filters by armyId on matchParticipants | queries-pending-matches.test.ts | PASS |
| 3.2-QRY-018 | getPendingMatches includes matches where result IS NULL (case 1) | queries-pending-matches.test.ts | PASS |
| 3.2-QRY-019 | getPendingMatches includes matches where evolutionsEnteredAt IS NULL (case 2) | queries-pending-matches.test.ts | PASS |
| 3.2-QRY-020 | getPendingMatches uses OR condition (result IS NULL OR evolutionsEnteredAt IS NULL) | queries-pending-matches.test.ts | PASS |
| 3.2-QRY-022 | getPendingMatches returns opponentArmyName (via armies join) | queries-pending-matches.test.ts | PASS |
| 3.2-QRY-023 | getPendingMatches returns opponentFaction | queries-pending-matches.test.ts | PASS |
| 3.2-QRY-024 | getPendingMatches returns myResult (participant result field) | queries-pending-matches.test.ts | PASS |
| 3.2-QRY-025 | getPendingMatches returns myEvolutionsEnteredAt (participant field) | queries-pending-matches.test.ts | PASS |
| 3.2-QRY-026 | getPendingMatches serializes date using .toISOString() | queries-pending-matches.test.ts | PASS |
| 3.2-QRY-027 | getPendingMatches orders results by match date DESC | queries-pending-matches.test.ts | PASS |
| 3.2-QRY-028 | getPendingMatches returns empty array when army has no pending matches | queries-pending-matches.test.ts | PASS |
| 3.2-SFN-021 | index.tsx imports PendingMatchData type from db/queries | create-match.test.ts | PASS |
| 3.2-SFN-022 | loadCampaignTimelineFn calls getPendingMatches | create-match.test.ts | PASS |
| 3.2-SFN-023 | loadCampaignTimelineFn imports getPendingMatches from db/queries (dynamic import) | create-match.test.ts | PASS |
| 3.2-SFN-024 | loadCampaignTimelineFn returns pendingMatches in its return object | create-match.test.ts | PASS |
| 3.2-SFN-025 | loadCampaignTimelineFn returns pendingMatches: [] for guest users | create-match.test.ts | PASS |
| 3.2-SFN-026 | loadCampaignTimelineFn returns pendingMatches: [] when army is null | create-match.test.ts | PASS |
| 3.2-SFN-027 | index.tsx imports ActionChip component | create-match.test.ts | PASS |
| 3.2-SFN-028 | index.tsx renders action strip only when pendingMatches.length > 0 | create-match.test.ts | PASS |
| 3.2-SFN-029 | index.tsx renders ActionChip for each pending match | create-match.test.ts | PASS |
| 3.2-SFN-030 | Action strip is horizontally scrollable (overflow-x: auto) | create-match.test.ts | PASS |
| 3.2-SFN-031 | Action strip uses display: flex with gap | create-match.test.ts | PASS |
| 3.2-SFN-032 | Action strip hides scrollbar (scrollbarWidth: none) | create-match.test.ts | PASS |
| 3.2-SFN-033 | index.tsx uses "Resultat a entrer" label when myResult is null | create-match.test.ts | PASS |
| 3.2-SFN-034 | index.tsx uses "Rapport de bataille" label when myResult set but evolutions null | create-match.test.ts | PASS |
| 3.2-SFN-035 | ActionChip label includes "vs {opponentArmyName}" | create-match.test.ts | PASS |
| 3.2-SFN-036 | ActionChip label includes formatted date using Intl.DateTimeFormat fr-FR | create-match.test.ts | PASS |
| 3.2-SFN-037 | Date format uses day: numeric, month: short (e.g. "5 mars") | create-match.test.ts | PASS |
| 3.2-SFN-038 | label check: myResult null takes priority over evolutions check | create-match.test.ts | PASS |
| 3.2-SFN-041 | TODO comment for story 3.3 link on "Resultat a entrer" chip | create-match.test.ts | PASS |

**AC5 verdict: COVERED — 66 tests, all passing**

---

### AC6 — ActionChip disappears when all actions are completed

| Test ID | Test Name | File | Status |
|---|---|---|---|
| 3.2-QRY-006 | PendingMatchData has myResult field (string \| null) | queries-pending-matches.test.ts | PASS |
| 3.2-QRY-007 | PendingMatchData has myEvolutionsEnteredAt field (string \| null) | queries-pending-matches.test.ts | PASS |
| 3.2-QRY-019 | getPendingMatches includes matches where evolutionsEnteredAt IS NULL (case 2) | queries-pending-matches.test.ts | PASS |
| 3.2-QRY-020 | getPendingMatches uses OR condition (result IS NULL OR evolutionsEnteredAt IS NULL) | queries-pending-matches.test.ts | PASS |
| 3.2-QRY-021 | getPendingMatches does NOT include fully-completed matches (both set) | queries-pending-matches.test.ts | PASS |

**AC6 verdict: COVERED — 5 tests, all passing**
Note: AC6 is validated structurally — the WHERE `OR(isNull(result), isNull(evolutionsEnteredAt))` filter correctly excludes rows where both are non-null, which is confirmed by 3.2-QRY-021.

---

### AC7 — Match appears in both players' timelines immediately

| Test ID | Test Name | File | Status |
|---|---|---|---|
| 3.2-SFN-039 | loadCampaignTimelineFn still returns timeline alongside pendingMatches | create-match.test.ts | PASS |
| 3.2-SFN-040 | CampaignView destructures both timeline and pendingMatches from loader data | create-match.test.ts | PASS |

**AC7 verdict: COVERED — 2 tests, all passing**
Note: AC7 relies on the pre-existing `getTimelineForArmy` query (story 3.1) returning all matches. These tests confirm the loader still returns `timeline` data correctly alongside the new `pendingMatches`. No new query logic was needed.

---

### AC8 — Cannot create match with own army

| Test ID | Test Name | File | Status |
|---|---|---|---|
| 3.2-FAB-026 | loadOpponentsFn excludes current player army using getPlayerArmy | create-match-fab.test.tsx | PASS |
| 3.2-FAB-027 | Opponent list filters out armies where playerId === current player | create-match-fab.test.tsx | PASS |
| 3.2-FAB-028 | loadOpponentsFn only returns armies with a player assigned | create-match-fab.test.tsx | PASS |
| 3.2-FAB-034 | createMatchFn rejects self-match (same army on both sides) | create-match-fab.test.tsx | PASS |
| 3.2-FAB-035 | createMatchFn validates opponent army exists in DB | create-match-fab.test.tsx | PASS |
| 3.2-SFN-005 | createMatchFn compares playerArmyId with opponentArmyId | create-match.test.ts | PASS |
| 3.2-SFN-006 | createMatchFn throws French error "Vous ne pouvez pas jouer contre votre propre armee" | create-match.test.ts | PASS |
| 3.2-SFN-007 | createMatchFn calls getArmyById to validate opponent exists | create-match.test.ts | PASS |
| 3.2-SFN-008 | createMatchFn uses dynamic import of getArmyById from queries | create-match.test.ts | PASS |
| 3.2-SFN-009 | createMatchFn throws French error "L'armee adverse n'existe pas" when opponent missing | create-match.test.ts | PASS |
| 3.2-QRY-029 | queries.ts exports getArmyById as async function | queries-pending-matches.test.ts | PASS |
| 3.2-QRY-030 | getArmyById accepts armyId parameter (string) | queries-pending-matches.test.ts | PASS |
| 3.2-QRY-031 | getArmyById returns id, name, faction, playerId (lightweight — no units) | queries-pending-matches.test.ts | PASS |
| 3.2-QRY-032 | getArmyById returns null when army is not found | queries-pending-matches.test.ts | PASS |
| 3.2-QRY-033 | getArmyById uses .limit(1) for efficiency | queries-pending-matches.test.ts | PASS |

**AC8 verdict: COVERED — 15 tests, all passing**

---

### AC9 — Guest users cannot create matches

| Test ID | Test Name | File | Status |
|---|---|---|---|
| 3.2-FAB-032 | createMatchFn rejects guest users with UNAUTHORIZED error | create-match-fab.test.tsx | PASS |
| 3.2-FAB-054 | __root.tsx FAB is conditioned on isGuest === false | create-match-fab.test.tsx | PASS |
| 3.2-SFN-001 | createMatchFn handler throws UNAUTHORIZED when session.isGuest is true | create-match.test.ts | PASS |

**AC9 verdict: COVERED — 3 tests, all passing**

---

### AC10 — Player without army cannot create matches

| Test ID | Test Name | File | Status |
|---|---|---|---|
| 3.2-FAB-020 | CreateMatchFab shows "Vous devez avoir une armee" message when armyId is null | create-match-fab.test.tsx | PASS |
| 3.2-FAB-021 | CreateMatchFab checks armyId before opening dialog (null guard) | create-match-fab.test.tsx | PASS |
| 3.2-FAB-033 | createMatchFn rejects player without army | create-match-fab.test.tsx | PASS |
| 3.2-SFN-003 | createMatchFn calls getPlayerArmy to validate player has army | create-match.test.ts | PASS |
| 3.2-SFN-004 | createMatchFn throws French error "Vous devez avoir une armee" when no army | create-match.test.ts | PASS |
| 3.2-SFN-002 | createMatchFn uses dynamic import of getPlayerArmy | create-match.test.ts | PASS |

**AC10 verdict: COVERED — 6 tests, all passing**

---

### AC11 — Dialog loading and error states

| Test ID | Test Name | File | Status |
|---|---|---|---|
| 3.2-FAB-049 | Dialog shows loading indicator while opponents are fetching | create-match-fab.test.tsx | PASS |
| 3.2-FAB-050 | Dialog shows French error message on fetch failure | create-match-fab.test.tsx | PASS |
| 3.2-FAB-051 | Dialog shows "Reessayer" retry button on failure | create-match-fab.test.tsx | PASS |

**AC11 verdict: COVERED — 3 tests, all passing**

---

### AC12 — Match creation button shows loading state

| Test ID | Test Name | File | Status |
|---|---|---|---|
| 3.2-FAB-046 | Confirm button shows loading state "Creation en cours..." while submitting | create-match-fab.test.tsx | PASS |
| 3.2-FAB-047 | Confirm button is disabled until opponent is selected | create-match-fab.test.tsx | PASS |
| 3.2-FAB-048 | Submitting flag is set before async call (prevents double submission) | create-match-fab.test.tsx | PASS |

**AC12 verdict: COVERED — 3 tests, all passing**

---

## Coverage Gaps

**None.** All 12 ACs have structural test coverage. Every acceptance criterion maps to at least one passing test.

The following test coverage notes apply:

- **AC6 (chip disappears):** Verified via WHERE-clause structure tests confirming the OR filter only returns rows with at least one null field, which by construction excludes completed matches. No runtime DB test executes because these are file-contract tests — the structural pattern is correct and matches the SQL specification.
- **AC7 (appears in both players' timelines):** Relies on the existing `getTimelineForArmy` query returning all matches regardless of result status. Tests confirm the loader returns `timeline` alongside `pendingMatches` with no regression. Full runtime coverage for this AC exists in story 3.1 query tests.

---

## Test Count by File

| Test File | Tests | Status |
|---|---|---|
| `src/components/__tests__/create-match-fab.test.tsx` | 58 | All PASS |
| `src/components/__tests__/action-chip.test.tsx` | 22 | All PASS |
| `src/db/__tests__/queries-pending-matches.test.ts` | 33 | All PASS |
| `tests/server-fns/create-match.test.ts` | 41 | All PASS |
| **Total** | **154** | **All PASS** |

---

## Implementation File List

| File | Role | Status |
|---|---|---|
| `src/components/create-match-fab.tsx` | CreateMatchFab component + loadOpponentsFn + createMatchFn server functions | NEW |
| `src/components/action-chip.tsx` | ActionChip pill component | NEW |
| `src/db/queries.ts` | Added `getPendingMatches`, `PendingMatchData` type; `getArmyById` already present | MODIFIED |
| `src/routes/__root.tsx` | Added CreateMatchFab import, conditional rendering, `position: relative` on root wrapper | MODIFIED |
| `src/routes/index.tsx` | Added `pendingMatches` to loader, action strip rendering, ActionChip + PendingMatchData imports | MODIFIED |
