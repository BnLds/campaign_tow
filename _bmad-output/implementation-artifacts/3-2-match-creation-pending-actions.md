# Story 3.2: Match Creation & Pending Actions

Status: review

## Story

As a player,
I want to create a match by selecting an opponent and see pending matches requiring my input,
So that the campaign history stays up to date and I know what actions need my attention.

## Acceptance Criteria

**AC1 — FAB visible on all authenticated views:**
Given I am logged in (not guest),
When I view any page (Campaign, Armies list, Army detail, References),
Then a circular navy FAB (`#334155`, "+" icon) is visible at the bottom-right of the screen (`bottom: 62px`, `right: 16px`), with `aria-label="Creer une partie"`. The FAB is NOT visible for guest users.

**AC2 — FAB opens match creation dialog:**
Given I am logged in and tap the CreateMatchFab,
When the match creation dialog opens,
Then I see a list of all other campaign players (excluding myself) to select as opponent, each showing their army name and faction. If a player has no army, they are not listed. (FR17)

**AC3 — Optional date field defaults to today:**
Given the match creation form is open,
When I select an opponent,
Then I can optionally enter a match date. If left blank, the date defaults to today.

**AC4 — Match creation writes correct DB records:**
Given I select an opponent and confirm,
When the match is created,
Then a `matches` record (with `createdByPlayerId` = my player ID, `date` = selected or today) and two `match_participants` records (one per army, both with `result: null` and `evolutionsEnteredAt: null`) are created in a single transaction.

**AC5 — ActionChip strip shows pending matches on Campaign view (two cases):**
Given a match exists involving my army,
When I view the Campaign view,
Then an ActionChip appears in the action strip (horizontal scrollable area above the timeline) for each match where I have a pending action. There are two distinct cases:
- **Case 1 — Result not entered** (`result IS NULL`): chip label "Resultat a entrer -- vs {opponentArmyName} . {formattedDate}" (FR18)
- **Case 2 — Evolutions not done** (`result IS NOT NULL` AND `evolutionsEnteredAt IS NULL`): chip label "Rapport de bataille -- vs {opponentArmyName} . {formattedDate}"
Both cases apply regardless of who created the match. A match only has ONE chip at a time (case 1 takes priority over case 2).

**AC6 — ActionChip disappears when all actions are completed:**
Given a match exists involving my army,
When both my result is entered (`result IS NOT NULL`) AND my evolutions are entered (`evolutionsEnteredAt IS NOT NULL`),
Then the ActionChip for that match disappears from the action strip.

**AC7 — Match appears in both players' timelines immediately:**
Given a match is created,
When either player views their Campaign view timeline,
Then the new match appears as a TimelineEntry (with result null / no badge, since result is not entered at creation time). The timeline always shows ALL matches (pending and completed).

**AC8 — Cannot create match with own army:**
Given I tap the FAB,
When the opponent list loads,
Then my own army is excluded from the selectable opponents. The server also rejects any attempt to create a match where both participants reference the same army.

**AC9 — Guest users cannot create matches:**
Given I am logged in as a guest,
When I view any page,
Then the FAB is not visible and no match creation endpoint is accessible.

**AC10 — Player without army cannot create matches:**
Given I am logged in (not guest) but have no army assigned,
When I view any page,
Then the FAB is visible but tapping it shows a helpful message ("Vous devez avoir une armee pour creer une partie") instead of the opponent list. The server function also rejects match creation for players without armies.

**AC11 — Dialog loading and error states:**
Given I tap the FAB and the opponent list is loading,
When the server call is in progress,
Then the dialog shows a loading indicator. If the fetch fails, an error message is displayed in French with a retry option.

**AC12 — Match creation button shows loading state:**
Given I have selected an opponent and tapped "Creer la partie",
When the server call is in progress,
Then the confirm button shows a loading state (disabled + spinner or "Creation en cours...") to prevent double-submission.

## Context & Background

This story introduces two new UI components (`CreateMatchFab` and `ActionChip`) and the match creation server function. Stories 3.1 and 3.1b have already established:

- **DB tables:** `matches` and `match_participants` exist with the correct schema (story 3.1)
- **Query functions:** `createMatchWithParticipants` already exists in `src/db/queries.ts` (created for test seeding in story 3.1, but usable for real match creation with minor adaptation)
- **Timeline rendering:** `TimelineEntry` component + `getTimelineForArmy` query (story 3.1)
- **Layout:** `__root.tsx` has flex column layout with TabBar at bottom (story 3.1b)
- **Campaign view:** `src/routes/index.tsx` with timeline, header, guest handling (story 3.1)

### What this story creates (NEW)

| Artifact | Location |
|---|---|
| `CreateMatchFab` component | `src/components/create-match-fab.tsx` |
| `ActionChip` component | `src/components/action-chip.tsx` |
| Match creation dialog | Inside `CreateMatchFab` (self-contained) |
| `loadOpponentsFn` server function | `src/components/create-match-fab.tsx` (co-located with component, since FAB is rendered from `__root.tsx` which is a route file) |
| `createMatchFn` server function | `src/components/create-match-fab.tsx` (co-located with `loadOpponentsFn` for cohesion) |
| `getPendingMatches` query | `src/db/queries.ts` |
| `PendingMatchData` type | `src/db/queries.ts` (exported) |
| Action strip in Campaign view | `src/routes/index.tsx` |

### What already exists (DO NOT recreate)

| Artifact | Location | Status |
|---|---|---|
| `matches` table | `src/db/schema.ts` | Exists (story 3.1) |
| `match_participants` table | `src/db/schema.ts` | Exists (story 3.1) |
| `createMatchWithParticipants` query | `src/db/queries.ts` | Exists (story 3.1) |
| `TimelineEntry` component | `src/components/timeline-entry.tsx` | Exists (story 3.1) |
| `getTimelineForArmy` query | `src/db/queries.ts` | Exists (story 3.1) |
| `getPlayerArmy` query | `src/db/queries.ts` | Exists (story 3.1) |
| `getAllArmies` query | `src/db/queries.ts` | Exists (story 3.1) |
| `TabBar` component | `src/components/tab-bar.tsx` | Exists (story 3.1b) |
| Layout with TabBar | `src/routes/__root.tsx` | Exists (story 3.1b) |

### Scope boundaries

**IN scope:**
- CreateMatchFab component (circular navy button, all authenticated non-guest views)
- Match creation dialog (opponent selection + optional date)
- `createMatchFn` server function with validation (no self-match, requires army, not guest)
- ActionChip component (styled chip for pending actions)
- Action strip on Campaign view (horizontal scrollable ActionChip list)
- `getPendingMatches` query (matches where player's `evolutionsEnteredAt` is null)
- New match appearing in both players' timelines
- Loading/error states for dialog and match creation
- Unit tests

**OUT of scope:**
- Match result entry (story 3.3)
- Post-match flow / XP entry (epic 4)
- Match editing or deletion (future story)
- Invite/confirmation workflow (no opponent confirmation step per UX spec)
- E2E tests (focus on unit + structural tests)

## Tasks / Subtasks

- [x] Task 1 — Create `CreateMatchFab` component (`src/components/create-match-fab.tsx`) (AC: 1, 9, 10)
  - [x] 1.1 — Define component props: `session: { playerId: string; isGuest: boolean }` and `armyId: string | null`. Render a circular button: 56x56px, `border-radius: 50%`, background `#334155` (navy), color white, font-size 24px, content "+", `box-shadow: 0 6px 16px rgba(0,0,0,0.18)`. Position: `position: absolute`, `right: 16px`, `bottom: 62px` (above TabBar), `z-index: 2`.
  - [x] 1.2 — Add `aria-label="Creer une partie"` for accessibility. Add `data-testid="create-match-fab"`.
  - [x] 1.3 — On click: if `armyId` is null, show a toast or inline message ("Vous devez avoir une armee pour creer une partie") and do NOT open the dialog. If `armyId` exists, open the Shadcn `Dialog` for match creation form (see Task 3).
  - [x] 1.4 — Manage open/close state internally (`useState`).

- [x] Task 2 — Add `CreateMatchFab` to app layout in `__root.tsx` (AC: 1, 9)
  - [x] 2.1 — Import `CreateMatchFab` in `__root.tsx`. Render it conditionally: only when `session` exists AND `session.isGuest === false`. Place it inside the flex layout wrapper, after the scrollable content div and before TabBar. The parent wrapper already has flex column layout; add `position: relative` to the outermost `<div>` to anchor the absolute-positioned FAB.
  - [x] 2.2 — Pass props: `session={{ playerId: session.playerId, isGuest: session.isGuest }}` and `armyId={army?.id ?? null}`. Both values are already available from the root route context (loaded in `beforeLoad`).
  - [x] 2.3 — Verify FAB renders on Campaign, Armies list, Army detail, and References views. Verify it does NOT render on login page or for guests.

- [x] Task 3 — Implement match creation dialog inside `CreateMatchFab` (AC: 2, 3, 8, 11, 12)
  - [x] 3.1 — Use Shadcn `Dialog` component. Dialog title: "Nouvelle partie" (Cinzel 600). Dialog content: opponent selector + date input + confirm button.
  - [x] 3.2 — Opponent selector: define `loadOpponentsFn` as `createServerFn({ method: 'GET' })` with `authMiddleware` at the top of `create-match-fab.tsx`. In handler: dynamically import `getAllArmies` and `getPlayerArmy` from `../db/queries`, call `getAllArmies()`, filter out the current player's army (using `context.session.playerId` to find their army via `getPlayerArmy`). Returns array of `{ armyId, armyName, faction, playerDisplayName }`.
  - [x] 3.3 — Fetch opponents lazily when dialog opens (not on mount). Use `useState` for opponents list + loading + error states. Call `loadOpponentsFn()` in an effect or callback triggered by dialog open. Display loading spinner while fetching. Display French error message + "Reessayer" button on failure.
  - [x] 3.4 — Display opponents as a list of selectable items (radio buttons or tappable cards). Each shows army name (Cinzel 600), faction + player display name below (Inter, `--color-text-secondary`). Selected opponent gets a visual highlight (blue border `#2a5ab8`).
  - [x] 3.5 — Date input: use a native `<input type="date">` with default value set to today (`new Date().toISOString().split('T')[0]`). Label: "Date de la partie".
  - [x] 3.6 — Confirm button: "Creer la partie" — primary style (navy `#334155`, white text, `border-radius: 12px`, `min-height: 44px`). Disabled until an opponent is selected. Shows "Creation en cours..." and disabled state while `createMatchFn` is in-flight (prevents double submission).
  - [x] 3.7 — Define `createMatchFn` as `createServerFn({ method: 'POST' })` with `authMiddleware` at the top of `create-match-fab.tsx` (co-located with `loadOpponentsFn`). Input: `.inputValidator(z.object({ opponentArmyId: z.string(), date: z.string().optional() }))`.
  - [x] 3.8 — On confirm, call `createMatchFn` with `{ opponentArmyId, date }`. On success, close dialog, reset form state, and call `router.invalidate()` to refresh both the Campaign timeline and pending matches. On error, display error message in French inside the dialog (do NOT close).

- [x] Task 4 — Implement `createMatchFn` handler (AC: 4, 8, 9, 10)
  - [x] 4.1 — In `createMatchFn` handler (inside `create-match-fab.tsx`): dynamically import `getPlayerArmy`, `createMatchWithParticipants` from `../db/queries`. Also dynamically import `getArmyById` or use a direct query to validate opponent army exists.
  - [x] 4.2 — Validate that session is not guest (`throw new Error('UNAUTHORIZED')`). Validate that the player has an army (call `getPlayerArmy`). Validate that `opponentArmyId` is different from the player's army ID (prevent self-match). Validate the opponent army exists (query the DB — do NOT trust client-side filtering alone).
  - [x] 4.3 — Parse date: if provided, parse as `new Date(data.date + 'T00:00:00Z')` and validate it's a valid date (check `isNaN(d.getTime())`). If not provided, use `new Date(new Date().toISOString().split('T')[0] + 'T00:00:00Z')` (today at midnight UTC).
  - [x] 4.4 — Call `createMatchWithParticipants({ army1Id: playerArmyId, result1: null, army2Id: opponentArmyId, result2: null, matchDate, evolutionsEntered: false, createdByPlayerId: session.playerId })`.
  - [x] 4.5 — Return `{ matchId }` on success. Throw descriptive French error messages for validation failures: "Vous devez avoir une armee pour creer une partie", "Vous ne pouvez pas jouer contre votre propre armee", "L'armee adverse n'existe pas", "Date invalide".

- [x] Task 5 — Add `getPendingMatches` query in `src/db/queries.ts` (AC: 5, 6)
  - [x] 5.1 — Define `getPendingMatches(armyId: string)` that returns all matches where the given army is a participant AND the player has a pending action: `result IS NULL` OR `evolutionsEnteredAt IS NULL`. Use the same self-join pattern as `getTimelineForArmy` (with `alias()` from `drizzle-orm/pg-core`) to get opponent info. Order by match date descending.
  - [x] 5.2 — Export `PendingMatchData` type with fields: `matchId` (string), `date` (string, ISO format), `opponentArmyName` (string), `opponentFaction` (string), `myResult` (string | null — the player's current result value), `myEvolutionsEnteredAt` (string | null — ISO timestamp or null). Use `.toISOString()` for date serialization (same pattern as `TimelineEntryData`).
  - [x] 5.3 — No `isCreatedByMe` flag needed — ActionChip label is determined by action type, not by who created the match.

- [x] Task 6 — Create `ActionChip` component (`src/components/action-chip.tsx`) (AC: 5)
  - [x] 6.1 — Define props: `label` (string), `href` (string, optional), `onClick` (optional callback). Style per UX mockup: `background: #eef4ff`, `border: 1px solid #d7e1ef`, `border-radius: 999px`, `padding: 8px 12px`, `font-size: 11px`, `font-weight: 700`, `color: #334155`, `box-shadow: 0 4px 10px rgba(0,0,0,0.05)`, `white-space: nowrap`.
  - [x] 6.2 — Append a chevron character after the label (matching mockup `::after` content ">", `margin-left: 6px`, `font-weight: 900`, `opacity: 0.72`).
  - [x] 6.3 — Render as `<a>` if `href` is provided, otherwise `<button>` with `role="button"`. Add `data-testid="action-chip"`.
  - [x] 6.4 — Interactive: `cursor: pointer`, subtle hover effect (slightly brighter background).

- [x] Task 7 — Add action strip to Campaign view (`src/routes/index.tsx`) (AC: 5, 6, 7)
  - [x] 7.1 — Update `loadCampaignTimelineFn` to also dynamically import and call `getPendingMatches(army.id)` and include `pendingMatches` in the return object. For guests and no-army cases, return `pendingMatches: []`. Type the return as including `pendingMatches: PendingMatchData[]`.
  - [x] 7.2 — Render the action strip above the timeline (between the "Historique" heading and timeline entries): a horizontal scrollable flex container (`display: flex`, `gap: 8px`, `overflow-x: auto`, `padding: 4px 0`, `margin-bottom: 12px`, `align-items: center`). Hide scrollbar with `scrollbarWidth: 'none'` and `WebkitOverflowScrolling: 'touch'`. Only render if `pendingMatches.length > 0`.
  - [x] 7.3 — For each pending match, render an `ActionChip` with label based on action type: if `myResult` is null -> "Resultat a entrer -- vs {opponentArmyName} . {date}"; if `myResult` is set but `myEvolutionsEnteredAt` is null -> "Rapport de bataille -- vs {opponentArmyName} . {date}". Date formatted in French short format using `Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })` (e.g., "5 mars").
  - [x] 7.4 — ActionChip for "Resultat a entrer" has no navigation target in 3-2 scope (stub `onClick` or `href="#"`). Add `// TODO: story 3.3 -- link to match result entry`. ActionChip for "Rapport de bataille" has no target either (epic 4). Add `// TODO: epic 4 -- link to post-match evolutions`.
  - [x] 7.5 — After successful match creation (Task 3.8), `router.invalidate()` is called from `CreateMatchFab`, which triggers re-fetching of `loadCampaignTimelineFn` — no additional wiring needed in `index.tsx`.

- [x] Task 8 — Write unit tests (AC: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12)
  - [x] 8.1 — Test `CreateMatchFab`: renders circular button with "+" and correct aria-label (`data-testid="create-match-fab"`)
  - [x] 8.2 — Test `CreateMatchFab`: opens dialog on click (when `armyId` is provided)
  - [x] 8.3 — Test `ActionChip`: renders label with chevron, correct styling (blue background `#eef4ff`, pill shape)
  - [x] 8.4 — Test `ActionChip`: renders as `<a>` when href provided, `<button>` otherwise
  - [x] 8.5 — Test `getPendingMatches`: returns matches where `result IS NULL` (case 1)
  - [x] 8.6 — Test `getPendingMatches`: returns matches where `result IS NOT NULL` but `evolutionsEnteredAt IS NULL` (case 2)
  - [x] 8.7 — Test `getPendingMatches`: does NOT return matches where both result and evolutionsEnteredAt are set
  - [x] 8.8 — Test `getPendingMatches`: includes opponent army name and faction via join
  - [x] 8.9 — Test `getPendingMatches`: returns empty array when army has no pending matches
  - [x] 8.10 — Test `getPendingMatches`: uses self-join with `ne()` exclusion (same structural pattern as `getTimelineForArmy`)
  - [x] 8.11 — Test `createMatchFn` validation: rejects guest users
  - [x] 8.12 — Test `createMatchFn` validation: rejects player without army
  - [x] 8.13 — Test `createMatchFn` validation: rejects self-match (same army on both sides)
  - [x] 8.14 — Test `createMatchFn` validation: rejects nonexistent opponent army
  - [x] 8.15 — Test `createMatchFn` validation: rejects invalid date string
  - [x] 8.16 — Test `createMatchFn` success: creates match + 2 participants with null result and null evolutionsEnteredAt
  - [x] 8.17 — Test `createMatchFn` success: defaults date to today when not provided
  - [x] 8.18 — Test `createMatchFn` success: date is normalized to midnight UTC
  - [x] 8.19 — Test Campaign view: action strip rendered when pending matches exist
  - [x] 8.20 — Test Campaign view: action strip not rendered when no pending matches
  - [x] 8.21 — Test Campaign view: ActionChip label uses "Resultat a entrer" when result is null, "Rapport de bataille" when result set but evolutions null
  - [x] 8.22 — Test Campaign view: `loadCampaignTimelineFn` returns `pendingMatches` alongside existing `timeline` data
  - [x] 8.23 — Test `loadOpponentsFn`: excludes current player's army from returned list
  - [x] 8.24 — Test `loadOpponentsFn`: only returns armies with assigned players (no orphan armies)
  - [x] 8.25 — Test opponent list: excludes current player's army from selectable opponents

- [x] Task 9 — Quality gates (all ACs)
  - [x] 9.1 — `pnpm typecheck` — zero errors (in story 3-2 files; pre-existing story 3-3 TDD test file errors are out of scope)
  - [x] 9.2 — `pnpm lint` — zero errors on all story 3-2 files
  - [x] 9.3 — `pnpm build` — succeeds
  - [x] 9.4 — All existing tests still pass (no regressions)

## Dev Notes

### CRITICAL — Server Function Location Decision (RESOLVED)

The FAB component lives in `src/components/create-match-fab.tsx` but is rendered from `__root.tsx` (a route file). The two server functions (`loadOpponentsFn` and `createMatchFn`) should be **defined at the top of `create-match-fab.tsx`**.

**Rationale:** TanStack Start allows `createServerFn` in any file (it's RPC-based, not route-coupled). The architecture guideline "co-located in route files" is a recommendation for loader-type server functions. For component-initiated mutations and lazy fetches, co-locating with the calling component is cleaner and avoids prop-drilling or callback chains between `__root.tsx` and `CreateMatchFab`. This matches the pattern already established by admin server functions in `admin/index.tsx` where multiple server functions coexist with the component that calls them.

Since `__root.tsx` already passes `session` and `army` via route context, the component has all the data it needs. The server functions use `authMiddleware` for server-side session validation independently of client props.

### CRITICAL — CreateMatchFab Positioning

The FAB must be positioned above the TabBar. From the UX mockup and MEMORY.md:
- `position: absolute` within the layout wrapper (which needs `position: relative`)
- `right: 16px`, `bottom: 62px` (TabBar height is 58px + 4px gap)
- `z-index: 2` (above scrollable content, below Dialogs which are z-index 50)

The FAB is placed in `__root.tsx` layout, NOT inside individual route components. This ensures it's visible on all views. Conditional rendering based on session (not guest).

**Note:** The outermost `<div>` in `RootLayout` currently uses `display: flex; flexDirection: column; height: 100dvh` but does NOT have `position: relative`. This MUST be added for the absolute-positioned FAB to anchor correctly. Without it, the FAB will position relative to the nearest positioned ancestor (likely the viewport), which may cause incorrect placement.

### CRITICAL — Match Creation Flow (No Result at Creation)

Per the UX spec (user-journey-flows.md): "No result entry at match creation -- entered at post-match start when context is clearest." Both `match_participants` records are created with `result: null`. Result entry is story 3.3.

### CRITICAL — Reuse Existing createMatchWithParticipants

The `createMatchWithParticipants` function in `src/db/queries.ts` already handles transactional insertion of match + 2 participants. For story 3.2, call it with:
```typescript
createMatchWithParticipants({
  army1Id: playerArmyId,
  result1: null,
  army2Id: opponentArmyId,
  result2: null,
  matchDate: normalizedDate,
  evolutionsEntered: false,
  createdByPlayerId: session.playerId,
})
```
No need for a wrapper function — call it directly with the right defaults.

### CRITICAL — getPendingMatches Query Strategy

Similar to `getTimelineForArmy`, this query uses a self-join on `match_participants` to get opponent info. Use `alias()` from `drizzle-orm/pg-core` (NOT `drizzle-orm` — wrong import path causes confusing type errors, per story 3.1 pre-mortem finding).

```sql
SELECT m.id, m.date, mp.result, mp.evolutions_entered_at,
       opp_army.name AS opponent_name, opp_army.faction AS opponent_faction
FROM match_participants mp
JOIN matches m ON mp.match_id = m.id
JOIN match_participants opp ON opp.match_id = m.id AND opp.army_id != mp.army_id
JOIN armies opp_army ON opp.army_id = opp_army.id
WHERE mp.army_id = $armyId
  AND (mp.result IS NULL OR mp.evolutions_entered_at IS NULL)
ORDER BY m.date DESC
```

**Important differences from `getTimelineForArmy`:**
1. WHERE clause adds the pending filter: `mp.result IS NULL OR mp.evolutions_entered_at IS NULL`
2. Must return `mp.result` and `mp.evolutions_entered_at` so the client can determine chip type
3. Date serialization: use `.toISOString()` (same pattern as `TimelineEntryData.date`)

### CRITICAL — ActionChip Label Differentiation (Two Action Types)

ActionChips represent pending actions. The label is determined by ACTION TYPE, not by who created the match:
1. **Result not entered** (`result IS NULL`): "Resultat a entrer -- vs {opponent} . {date}"
2. **Evolutions not done** (`result IS NOT NULL` AND `evolutionsEnteredAt IS NULL`): "Rapport de bataille -- vs {opponent} . {date}"

Case 1 takes priority — a match only shows ONE chip. After the player enters their result (story 3-3), the chip transitions from case 1 to case 2. After evolutions are entered (epic 4), the chip disappears entirely.

### CRITICAL — Opponent List Fetching

The opponent selector in the dialog should NOT list:
- The current player's own army
- Players without armies (they can't participate in matches)

Use `getAllArmies()` filtered server-side. The `getAllArmies()` function already returns armies with `playerId` and `playerDisplayName`. Filter: `army.playerId !== session.playerId` (exclude own) and implicitly `playerId IS NOT NULL` (armies must have an owner to participate). Return only the needed fields (armyId, armyName, faction, playerDisplayName).

### CRITICAL — Date Handling

Match dates should be normalized to midnight UTC to avoid timezone issues:
```typescript
const matchDate = data.date
  ? new Date(data.date + 'T00:00:00Z')
  : new Date(new Date().toISOString().split('T')[0] + 'T00:00:00Z')

// Validate the date is not NaN
if (isNaN(matchDate.getTime())) {
  throw new Error('Date invalide')
}
```

### CRITICAL — Opponent Army Existence Validation

The server function MUST validate that the opponent army exists in the DB, not just trust client-side filtering. A simple query is needed. Options:
1. Add a `getArmyById(armyId: string)` function to `src/db/queries.ts` if it doesn't exist
2. Use the existing `getAllArmies()` and filter (wasteful but functional)
3. Query directly in the handler (violates the "named functions in queries.ts" rule)

**Recommended:** Add `getArmyById` to `src/db/queries.ts` — it's a fundamental query that will be reused. Check if `getArmyWithUnits` can be repurposed (it exists from story 2.3 but loads units too — heavier than needed). A lightweight `getArmyById` returning `{ id, name, faction, playerId } | null` is preferable.

### Architecture Compliance

- **Server functions:** `loadOpponentsFn` and `createMatchFn` in `create-match-fab.tsx` (pragmatic — component-initiated, not route-loader)
- **DB access via `src/db/queries.ts` named functions** — `getPendingMatches`, `getArmyById` (new) in queries.ts
- **Dynamic imports inside `.handler()`** for all DB/auth/lib calls
- **Error messages in French**
- **`data-testid` attributes** on all new components for testing
- **Follow naming conventions:** `kebab-case` files, `camelCase` code, `PascalCase` types/components
- **Guest users** see no FAB and cannot access match creation endpoints
- **Date serialization:** `string` (ISO format) for all dates crossing server-client boundary (per story 3.1 FIX 6)

### Pre-mortem Analysis — Failure Scenarios

**Failure scenario 1 — FAB positioning breaks on non-Campaign views:**
The FAB uses `position: absolute` inside the flex layout wrapper. If the wrapper `<div>` in `__root.tsx` does NOT have `position: relative`, the FAB anchors to the viewport instead. Currently, the wrapper has `display: flex; flexDirection: column; height: 100dvh` but NO `position: relative`. Mitigation: Task 2.1 explicitly adds `position: relative` to the outermost wrapper div.

**Failure scenario 2 — Dialog opens behind FAB on mobile:**
Shadcn Dialog renders via portal (z-index 50), FAB is z-index 2. The portal renders outside the flex layout entirely, so z-index stacking should not conflict. However, if the Dialog overlay does not cover the FAB, users might accidentally tap the FAB through the overlay. Mitigation: verify Shadcn Dialog overlay has `pointer-events: auto` and covers full viewport.

**Failure scenario 3 — Router invalidation on non-Campaign views:**
When a match is created from the Army detail or References view, `router.invalidate()` will attempt to re-run ALL active route loaders. The Campaign view's `loadCampaignTimelineFn` will re-fetch, but the user won't see the update until they navigate to the Campaign tab. This is correct behavior — no bug, just a UX expectation to set. The match will appear in both timelines when either player next views their Campaign page.

**Failure scenario 4 — Double match creation (race condition):**
If the user taps "Creer la partie" twice quickly before the first call returns, two matches could be created. Mitigation: Task 3.6 requires the confirm button to disable immediately on click and show a loading state. The `useState` flag for "submitting" must be set synchronously before the async call.

**Failure scenario 5 — Opponent list stale after another player creates a match:**
The opponent list is fetched once when the dialog opens. If another player deletes their army between fetch and submission, `createMatchFn` will reject with "L'armee adverse n'existe pas." The error is displayed in the dialog — the user can close and retry. No additional mitigation needed.

**Failure scenario 6 — getPendingMatches returns stale data after match creation:**
After `createMatchFn` succeeds, `router.invalidate()` triggers `loadCampaignTimelineFn` to re-run, which now calls both `getTimelineForArmy` and `getPendingMatches`. The new match should immediately appear in both results. Risk: if `router.invalidate()` is called before the DB transaction commits (unlikely with `await`), data could be stale. Mitigation: the server function awaits `createMatchWithParticipants` before returning, so `router.invalidate()` fires after commit.

**Failure scenario 7 — `position: relative` on root wrapper breaks existing layout:**
Adding `position: relative` to the flex layout wrapper could theoretically affect how absolutely-positioned children of nested components render. In practice, the flex layout is the top-level container — existing route components render inside `<Outlet />` which is inside the scrollable div. The only absolute-positioned element is the FAB itself. Mitigation: verify visually that WelcomeModal (fixed positioning, Shadcn portal) and TabBar (flex child, not absolute) are unaffected.

### References

- Epic 3: [Source: epics/epic-3-campaign-timeline-match-management.md]
- UX component strategy: [Source: ux-design-specification/component-strategy.md]
- UX user journey (J_invite — Match Creation): [Source: ux-design-specification/user-journey-flows.md]
- UX mockup ActionChip styles: [Source: ux-mockup.html — `.action-chip` class]
- Architecture patterns: [Source: architecture/implementation-patterns-consistency-rules.md]
- Existing `createMatchWithParticipants`: [Source: src/db/queries.ts — line 530]
- Existing `__root.tsx` layout: [Source: src/routes/__root.tsx — RootLayout function]
- Palette: [Source: MEMORY.md — Palette section]

## File List

- `src/components/create-match-fab.tsx` — NEW: CreateMatchFab component + loadOpponentsFn + createMatchFn server functions
- `src/components/action-chip.tsx` — NEW: ActionChip component (pill-shaped pending action chip)
- `src/db/queries.ts` — MODIFIED: Added `getPendingMatches`, `PendingMatchData` type; `getArmyById` was already present
- `src/routes/__root.tsx` — MODIFIED: Added CreateMatchFab import, conditional rendering, `position: relative` on root wrapper
- `src/routes/index.tsx` — MODIFIED: Added pendingMatches to loadCampaignTimelineFn, action strip rendering, ActionChip import + PendingMatchData type import

## Dev Agent Record

### Implementation Plan

Story 3-2 implementation was largely complete from the TDD stub phase. The following was verified and completed:

1. **CreateMatchFab** (`src/components/create-match-fab.tsx`): Full implementation with `loadOpponentsFn` (GET, filters own army + null-playerId armies) and `createMatchFn` (POST, validates guest/no-army/self-match/invalid-opponent/invalid-date, creates match transactionally via existing `createMatchWithParticipants`). Dialog uses Shadcn Dialog with lazy opponent loading, date input defaulting to today, loading/error states, and double-submission prevention via `isSubmitting` state.

2. **ActionChip** (`src/components/action-chip.tsx`): Simple pill component rendering as `<a>` or `<button>` based on `href` prop, with chevron suffix and UX mockup-compliant styling.

3. **DB queries** (`src/db/queries.ts`): `getPendingMatches` uses the same `alias()` self-join pattern as `getTimelineForArmy`, filters by `result IS NULL OR evolutionsEnteredAt IS NULL`. `PendingMatchData` type exported. `getArmyById` was already present from earlier story work.

4. **Root layout** (`src/routes/__root.tsx`): `CreateMatchFab` added with conditional rendering for non-guest sessions only. `position: relative` added to outermost wrapper div to anchor the absolute-positioned FAB.

5. **Campaign view** (`src/routes/index.tsx`): `loadCampaignTimelineFn` updated to call `getPendingMatches` and return `pendingMatches: []` for guests/no-army. Action strip renders above "Historique" heading only when `pendingMatches.length > 0`. Labels differentiate "Resultat a entrer" (result null) vs "Rapport de bataille" (result set, evolutions null).

### Completion Notes

- 154/154 story 3-2 tests pass across 4 test files
- TypeScript errors reported by typecheck are exclusively from story 3-3 TDD test files (pre-existing, not introduced by this story)
- Lint clean on all story 3-2 files
- Build succeeds (4.46s)
- No regressions: all previously passing tests continue to pass

## Change Log

- 2026-03-16 — Story 3-2 implementation complete. All 154 tests passing (4 test files). Build succeeds. (Claude Sonnet 4.6)
- 2026-03-16 — Advanced elicitation applied (Pre-mortem Analysis + Critique & Refine + Cross-Functional War Room). Added AC10 (player without army), AC11 (loading/error states), AC12 (double-submission prevention). Resolved server function location ambiguity (decided: `create-match-fab.tsx`). Added `position: relative` requirement to root wrapper. Added `getArmyById` query requirement for server-side opponent validation. Added date validation (NaN check). Tightened date serialization to ISO string pattern (per story 3.1 FIX 6). Added 7 pre-mortem failure scenarios. Restructured Tasks 3-4 to separate dialog UX from server function handler. Added 5 new tests (8.10, 8.15, 8.18, 8.22-8.24). Exported `PendingMatchData` type. Clarified self-join alias import path warning. (Claude Opus 4.6)
- 2026-03-16 — Story spec created (Claude Opus 4.6)
