# Story 3.1: Army Timeline View

Status: review

## Story

As a player,
I want to view the scrollable timeline of my army and any opponent's army,
So that I can read the full campaign history at a glance.

## Acceptance Criteria

**AC1 — Campaign view shows own timeline (reverse chronological):**
Given I am logged in and navigate to the Campaign view,
When the page loads,
Then I see my army's timeline starting with the most recent match at the top, followed by older matches in reverse chronological order (FR15).

**AC2 — Campaign view header links to army detail:**
Given the Campaign view is displayed,
When I look at the header area,
Then I see my army name, faction, and a link/button navigating to `/armies/$armyId` (my army's detail view with unit cards).

**AC3 — TimelineEntry shows match details and evolution indicator:**
Given my timeline contains matches with evolutions entered,
When I scroll down,
Then each TimelineEntry shows: the match opponent name and faction, result badge (V green / D red / E neutral), formatted date in French locale ("12 mars 2026"), and an "Evolutions saisies" indicator. *(Detailed XP/tier/injury breakdown deferred to epic 4.)*

**AC4 — Opponent army timeline accessible:**
Given I navigate to the Armies list (`/armies`) and select another player's army,
When the army detail view loads,
Then I see that army's timeline in a "Historique" section below the unit cards, with the same `TimelineEntry` structure (FR16).

**AC5 — Empty state for army with no matches:**
Given my army has no matches yet,
When I view my timeline,
Then an appropriate empty state is displayed ("Aucune partie jouee pour le moment").

**AC6 — TimelineEntry without evolutions:**
Given a match exists but evolutions have not yet been entered for my army (`evolutionsEnteredAt` is null),
When I view the timeline,
Then the TimelineEntry is displayed without any evolution indicator (clean absence — no placeholder text).

**AC7 — Armies list displays all armies with gold highlight for own army:**
Given I navigate to the Armies list (`/armies`),
When the page loads,
Then I see all armies listed with name, faction, and player display name, and my own army (if any) is highlighted with gold styling (`border-color: #ead69b`, background `#fff9ec`).

**AC8 — Guest user experience:**
Given I am logged in as a guest,
When I visit the Campaign view, the Armies list, or any army detail,
Then I see read-only content (no personal timeline on Campaign view, no gold highlight on Armies list, but full timeline on army detail views).

## Context & Background

This is the first story of Epic 3 (Campaign Timeline & Match Management). Epics 1 and 2 have established:

- **Epic 1:** Authentication, sessions, admin tools, guest access. Tables: `players`, `sessions`.
- **Epic 2:** Army import, unit entry, unit card display, direct edit of deltas. Tables: `armies`, `units`, `sub_profiles`, `stat_modifiers`, `unit_gains`.

Story 3.1 introduces the **timeline view** — the Campaign view's main content area showing the chronological history of matches for an army. This is the "Moment 3" experience from the UX spec: after 3-4 matches, scrolling the timeline and seeing the full army history is the differentiating "aha" moment.

### What this story creates

**New DB tables:**
- `matches` — id, date, createdByPlayerId
- `match_participants` — id, matchId, armyId, result, evolutionsEnteredAt

**New query functions:** for fetching timeline data (matches with participants and evolution summaries).

**New components:**
- `TimelineEntry` — a card displaying a completed or pending match in the timeline
- Updates to the Campaign view (`src/routes/index.tsx`) to display the player's timeline
- Updates to the army view (`src/routes/armies/$armyId.tsx`) to display an army's timeline

**New route:** `/armies` index route listing all armies (needed for AC4 — Armies tab navigation).

### Key existing infrastructure

| Artifact | Location | Status |
|---|---|---|
| `players` table | `src/db/schema.ts` | Exists (epic 1) |
| `armies` table | `src/db/schema.ts` | Exists (epic 2) |
| `units` table | `src/db/schema.ts` | Exists (epic 2) |
| `stat_modifiers` table | `src/db/schema.ts` | Exists (story 2.3) |
| `unit_gains` table | `src/db/schema.ts` | Exists (story 2.3) |
| `authMiddleware` | `src/lib/middleware.ts` | Exists (epic 1) |
| `getAllArmies()` | `src/db/queries.ts` | Exists (story 2.1) |
| `getArmyWithUnits()` | `src/db/queries.ts` | Exists (story 2.3) |
| Campaign view route | `src/routes/index.tsx` | Exists (placeholder) |
| Army detail route | `src/routes/armies/$armyId.tsx` | Exists (story 2.3) |
| `UnitCard` component | `src/components/unit-card.tsx` | Exists (story 2.3) |

### Scope boundaries

**IN scope:**
- `matches` and `match_participants` table definitions in schema + migration
- Query functions for timeline data (matches for an army, with participant info and evolution summary)
- `TimelineEntry` component
- Campaign view (index route) — display logged-in player's army timeline with header
- Army detail view — add timeline section below unit cards
- Armies list route (`/armies/index.tsx`) — list all armies for navigation to opponent timelines
- Empty state when no matches exist
- TimelineEntry rendering without evolutions when `evolutionsEnteredAt` is null
- Armies list gold highlight for own army
- Guest user read-only behavior across all three views

**OUT of scope:**
- Match creation (story 3.2)
- ActionChip / pending action strip (story 3.2)
- Match result entry (story 3.3)
- Post-match flow / XP entry (epic 4)
- TabBar component (deferred — navigation works via direct links for now)
- CreateMatchFab (story 3.2)
- E2E tests (optional — focus on unit + structural tests)

## Review Follow-ups (AI)

- [x] FIX 1 (CRITICAL) — Self-join missing exclusion condition: added `and(eq(...), ne(oppParticipant.armyId, matchParticipants.armyId))` to the `oppParticipant` join; imported `and`, `ne` from `drizzle-orm`
- [x] FIX 2 (HIGH) — Unique constraint on matchParticipants(matchId, armyId): added `uniqueIndex('mp_match_army_unique').on(table.matchId, table.armyId)` in table config
- [x] FIX 3 (HIGH) — result column free text: changed to `pgEnum('match_result', ['victory', 'defeat', 'draw'])` (Option A); regenerated migration `drizzle/0007_skinny_living_tribunal.sql`
- [x] FIX 4 (HIGH) — Unsafe `as` cast for result type: added `toValidResult()` runtime validation helper in both `src/routes/index.tsx` and `src/routes/armies/$armyId.tsx`
- [x] FIX 5 (MEDIUM) — Invalid Date guard in TimelineEntry: `formatDate` now checks `isNaN(d.getTime())` and falls back to raw string
- [x] FIX 6 (MEDIUM) — Date serialization fragile (instanceof Date): `TimelineEntryData.date` changed to `string`; `.toISOString()` called in query mapping; route files pass `entry.date` directly
- [x] FIX 7 (MEDIUM) — loadArmiesListFn exposes raw playerId: `isOwn` computed server-side; `playerId` removed from returned object; client uses `army.isOwn`
- [x] FIX 8 (MEDIUM) — Missing indexes on matchParticipants and matches: added `idx_mp_army_id`, `idx_mp_match_id` on matchParticipants, `idx_matches_date` on matches
- [x] FIX 9 (MEDIUM) — Accessibility aria-label on result badge: added `ariaLabel` field to `RESULT_CONFIG` and `aria-label={resultConfig.ariaLabel}` on badge `<span>`
- [x] FIX 10 (MEDIUM) — Test for self-join exclusion: added `[3.1-QRY-026]` to `tests/3-1-queries.test.ts` asserting `ne(oppParticipant.armyId` is present

## Tasks / Subtasks

- [x] Task 1 — Add `matches` and `match_participants` tables to DB schema (AC: 1, 3, 4, 6)
  - [x] 1.1 — Define `matches` table in `src/db/schema.ts`: `id` (text PK, UUID default), `date` (timestamp, not null), `createdByPlayerId` (text, FK to `players.id` with `onDelete: 'set null'`), `createdAt` (timestamp, defaultNow)
  - [x] 1.2 — Define `match_participants` table in `src/db/schema.ts`: `id` (text PK, UUID default), `matchId` (text, FK to `matches.id` with `onDelete: 'cascade'`, not null), `armyId` (text, FK to `armies.id` with `onDelete: 'cascade'`, not null), `result` (text, nullable — values: 'victory', 'defeat', 'draw', or null for pending), `evolutionsEnteredAt` (timestamp, nullable), `createdAt` (timestamp, defaultNow)
  - [x] 1.3 — Add Drizzle relation definitions for `matches` and `matchParticipants` (one-to-many: match -> participants; many-to-one: participant -> army) to support relational queries in future stories
  - [x] 1.4 — Run `pnpm db:generate` to create the migration file
  - [x] 1.5 — Add `matches` and `matchParticipants` schema exports to the import list in `src/db/queries.ts`

- [x] Task 2 — Add query functions for timeline data in `src/db/queries.ts` (AC: 1, 3, 4, 5, 6)
  - [x] 2.1 — `getTimelineForArmy(armyId: string)`: returns matches for the given army in reverse chronological order. Each match includes: match id, date, result (from the army's `match_participants` row), opponent army name + faction + player displayName (from the other participant's army via self-join), and `hasEvolutions` boolean (`evolutionsEnteredAt` is not null). Uses aliased `matchParticipants` table for the self-join (see Dev Notes — Timeline Query Strategy). Returns `TimelineEntry[]` typed array.
  - [x] 2.2 — `getPlayerArmy(playerId: string)`: returns the army belonging to the given player (for the Campaign view). Uses `armies` table with `playerId` filter + LEFT JOIN on `players` for display name. Returns `{ id, name, faction, playerId, playerDisplayName } | null`.
  - [x] 2.3 — Verify `getAllArmies()` returns sufficient data for armies list (it already returns id, name, faction, playerId, playerDisplayName — confirmed sufficient, no changes needed)
  - [x] 2.4 — Export a `TimelineEntryData` type from queries or a shared types file for the timeline return shape

- [x] Task 3 — Create `TimelineEntry` component (AC: 3, 6)
  - [x] 3.1 — Create `src/components/timeline-entry.tsx` with props: `matchId` (string), `opponent` (`{ name: string, faction: string, playerName?: string }`), `result` (`'victory' | 'defeat' | 'draw' | null`), `date` (string — ISO 8601), `hasEvolutions` (boolean)
  - [x] 3.2 — Display the result as a colored badge: "V" (green `#2d7a3a` / bg `#edf8ef`), "D" (red `#b82c2c` / bg `#fdf0f0`), "E" (neutral `#9ca3af`), or no badge if result is null (pending match)
  - [x] 3.3 — Display opponent army name (Cinzel 600) and faction below (Inter, secondary color)
  - [x] 3.4 — Display formatted date using `Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })`
  - [x] 3.5 — When `hasEvolutions` is true, display a simple "Evolutions saisies" text indicator (detailed breakdown deferred to epic 4)
  - [x] 3.6 — When `hasEvolutions` is false, display nothing in the evolution area (clean absence per UX spec — no placeholder text)
  - [x] 3.7 — Use campaign palette tokens: card background `#fffbf5`, border `#e0d5c8`, text colors per palette. Card has `border-radius: 8px`, `padding: 0.75rem 1rem`.
  - [x] 3.8 — Component must be responsive (mobile-first), touch-friendly (min tap target 44px for any interactive area)
  - [x] 3.9 — Add `data-testid="timeline-entry"` on the root element and `data-testid="result-badge"` on the badge for testing

- [x] Task 4 — Update Campaign view (`src/routes/index.tsx`) to display player's timeline (AC: 1, 2, 5, 8)
  - [x] 4.1 — Add a server function `loadCampaignTimelineFn` (GET) using `authMiddleware` that: (a) if guest, returns `{ isGuest: true, army: null, timeline: [] }`; (b) else calls `getPlayerArmy(session.playerId)`, then `getTimelineForArmy(armyId)` if army exists
  - [x] 4.2 — Add a route loader that calls `loadCampaignTimelineFn` — preserve existing welcome modal logic (do not break story 1.3)
  - [x] 4.3 — Display a header section: army name (Cinzel 700, 1.5rem), faction (Inter, secondary), and a `<Link to={'/armies/$armyId'}>` button/text to army detail view
  - [x] 4.4 — Below the header, render the timeline as a vertical list of `TimelineEntry` components with `gap: 0.75rem`
  - [x] 4.5 — When the player has no army (`army: null`, not guest), display: "Aucune armee assignee — contactez l'administrateur"
  - [x] 4.6 — When the player has an army but no matches, display: "Aucune partie jouee pour le moment"
  - [x] 4.7 — Guest users see a message: "Connectez-vous pour voir votre timeline" with a link to the armies list (`/armies`) as alternative navigation

- [x] Task 5 — Add timeline section to army detail view (`src/routes/armies/$armyId.tsx`) (AC: 4, 5, 6, 8)
  - [x] 5.1 — Extend `loadArmyFn` handler to also call `getTimelineForArmy(armyId)` and include `timeline` in the return object alongside existing `army`, `unitCards`, `isOwner`
  - [x] 5.2 — Add a "Historique" section below the unit cards with section header styled like type group headers (Inter 600, uppercase, 0.875rem, `--color-section-label`)
  - [x] 5.3 — Render `TimelineEntry` components for each match in the timeline
  - [x] 5.4 — Display empty state when no matches exist: "Aucune partie jouee"
  - [x] 5.5 — Timeline is visible to all users (including guests) — read-only, no write UI elements

- [x] Task 6 — Create armies list route (`src/routes/armies/index.tsx`) (AC: 4, 7, 8)
  - [x] 6.1 — Create `src/routes/armies/index.tsx` route file with a server function `loadArmiesListFn` (GET) using `authMiddleware`
  - [x] 6.2 — Loader calls `getAllArmies()` to fetch all armies with player info; also passes `session.playerId` and `session.isGuest` to the component
  - [x] 6.3 — Display a page title "Armees" (Cinzel 700) and a list of all armies, each as a `<Link to={'/armies/$armyId'}>` card
  - [x] 6.4 — Highlight the current player's army (if any, and not guest) with gold variant styling: `border: 2px solid #ead69b`, `background: #fff9ec`
  - [x] 6.5 — Each item shows: army name (Cinzel 600), faction (Inter, secondary), player display name (Inter, secondary). Non-highlighted items: `border: 1px solid #e0d5c8`, `background: #fffbf5`
  - [x] 6.6 — Include `data-app-hydrated` pattern (`useHydrated()` + `useEffect` setting attribute)
  - [x] 6.7 — Guest users see the full list but without any gold highlight
  - [x] 6.8 — Empty state if no armies exist: "Aucune armee dans la campagne"

- [x] Task 7 — Write unit tests (AC: 1, 2, 3, 4, 5, 6, 7, 8)
  - [x] 7.1 — Test `getTimelineForArmy`: returns matches in reverse chronological order (insert 3 matches with different dates, verify order)
  - [x] 7.2 — Test `getTimelineForArmy`: returns empty array for army with no matches
  - [x] 7.3 — Test `getTimelineForArmy`: includes opponent info (army name, faction, player displayName) via self-join
  - [x] 7.4 — Test `getTimelineForArmy`: includes result from the requesting army's participant row (not the opponent's)
  - [x] 7.5 — Test `getTimelineForArmy`: `hasEvolutions` is true when `evolutionsEnteredAt` is non-null, false when null
  - [x] 7.6 — Test `getTimelineForArmy`: handles match where opponent army was deleted (cascade deletes participant — match should not appear or handle gracefully)
  - [x] 7.7 — Test `getPlayerArmy`: returns the army for the given player
  - [x] 7.8 — Test `getPlayerArmy`: returns null when player has no army
  - [x] 7.9 — Test `TimelineEntry` component: renders opponent name, faction, and formatted French date
  - [x] 7.10 — Test `TimelineEntry` component: result badge shows "V" (green) for victory, "D" (red) for defeat, "E" (neutral) for draw
  - [x] 7.11 — Test `TimelineEntry` component: "Evolutions saisies" indicator shown when `hasEvolutions` is true
  - [x] 7.12 — Test `TimelineEntry` component: no evolution indicator when `hasEvolutions` is false
  - [x] 7.13 — Test `TimelineEntry` component: no result badge rendered when result is null
  - [x] 7.14 — Test Campaign view loader: returns timeline data for player's army
  - [x] 7.15 — Test Campaign view: empty state when player has no army
  - [x] 7.16 — Test Campaign view: empty state when player has army but no matches
  - [x] 7.17 — Test Campaign view: header includes `<Link>` to `/armies/$armyId`
  - [x] 7.18 — Test Campaign view: guest sees "Connectez-vous" message, no army header
  - [x] 7.19 — Test armies list route: renders all armies with name, faction, player display name
  - [x] 7.20 — Test armies list route: current player's army has gold border style
  - [x] 7.21 — Test armies list route: guest sees all armies, none highlighted
  - [x] 7.22 — Test schema: `matches` table has expected columns (id, date, createdByPlayerId, createdAt)
  - [x] 7.23 — Test schema: `match_participants` table has expected columns and FK relationships (cascade on match delete, cascade on army delete)

- [x] Task 8 — Quality gates
  - [x] 8.1 — `pnpm typecheck` — zero errors
  - [x] 8.2 — `pnpm lint` — zero errors
  - [x] 8.3 — `pnpm build` — succeeds
  - [x] 8.4 — All existing tests still pass (no regressions)

## Dev Notes

### CRITICAL — matches and match_participants Schema Design

The epic specifies: `matches` (id, date, createdByPlayerId), `match_participants` (id, matchId, armyId, result, evolutionsEnteredAt).

**Design decisions:**
- `matches.date` is a `timestamp` — the date the match was played (not when the record was created). `createdAt` tracks record creation separately.
- `matches.createdByPlayerId` uses `onDelete: 'set null'` — if the creating player is deleted, the match record survives (campaign history should be preserved).
- `match_participants.result` is nullable text — null means the participant hasn't entered their result yet. Valid values: `'victory'`, `'defeat'`, `'draw'`.
- `match_participants.evolutionsEnteredAt` is nullable — null means evolutions haven't been entered yet. Set to a timestamp when the post-match flow is completed (epic 4).
- Each match has exactly 2 `match_participants` rows — one per army. This is enforced by the match creation logic (story 3.2), not by a DB constraint.

**Schema pattern:**
```typescript
export const matches = pgTable('matches', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  date: timestamp('date').notNull(),
  createdByPlayerId: text('created_by_player_id').references(() => players.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const matchParticipants = pgTable('match_participants', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  matchId: text('match_id').notNull().references(() => matches.id, { onDelete: 'cascade' }),
  armyId: text('army_id').notNull().references(() => armies.id, { onDelete: 'cascade' }),
  result: text('result'),  // 'victory' | 'defeat' | 'draw' | null
  evolutionsEnteredAt: timestamp('evolutions_entered_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
```

### CRITICAL — Timeline Query Strategy

The timeline query for an army needs to join across `match_participants` -> `matches` -> `match_participants` (opponent) -> `armies` -> `players` to get:
1. The match date and ID
2. The army's own result and evolution status
3. The opponent's army name, faction, and player displayName

**Approach:** A single query with self-join on `match_participants`:
```sql
SELECT m.id, m.date, mp.result, mp.evolutions_entered_at,
       opp_army.name as opponent_name, opp_army.faction as opponent_faction,
       opp_player.display_name as opponent_player
FROM match_participants mp
JOIN matches m ON mp.match_id = m.id
JOIN match_participants opp ON opp.match_id = m.id AND opp.army_id != mp.army_id
JOIN armies opp_army ON opp.army_id = opp_army.id
LEFT JOIN players opp_player ON opp_army.player_id = opp_player.id
WHERE mp.army_id = $armyId
ORDER BY m.date DESC
```

**Drizzle implementation:** Use `alias()` from `drizzle-orm/pg-core` to create `oppParticipant` alias for the self-join:
```typescript
import { alias } from 'drizzle-orm/pg-core'
const oppParticipant = alias(matchParticipants, 'opp')
```

**Edge case — opponent army deleted:** The `INNER JOIN` on `opp` means if the opponent's `match_participants` row was cascade-deleted (because their army was deleted), the match will silently disappear from the timeline. This is acceptable for MVP — the match record itself survives but is not displayed without a valid opponent. A future improvement could use LEFT JOIN and show "Armee supprimee" for missing opponents.

**Edge case — same army plays itself:** The self-join condition `opp.army_id != mp.army_id` would return zero opponent rows if someone created a match with the same army on both sides. This should be prevented at creation time (story 3.2) but the query naturally handles it by returning no results for such matches.

### CRITICAL — Evolution Summary (Story 3.1 vs Epic 4)

Story 3.1 creates the timeline view but the **post-match flow** (epic 4) is what actually writes evolution data. For story 3.1:
- `evolutionsEnteredAt` being non-null indicates evolutions were entered
- The detailed evolution summary (XP gained, tier-ups, injuries) cannot be derived until epic 4 defines how evolution data is stored with match references
- **Decision:** Story 3.1's `TimelineEntry` shows `hasEvolutions: boolean` only. When true, render "Evolutions saisies" as a small text indicator (Inter 400, `--color-text-secondary`). The `evolutionSummary` prop from the original spec is **removed** — it will be added back when epic 4 provides the data. This avoids dead code.
- **Future hook:** The `TimelineEntryData` type should be designed so that adding `evolutionSummary?: { xpGained: number, tierUps: number, injuries: number }` in epic 4 is a non-breaking additive change.

### CRITICAL — Campaign View Architecture

The Campaign view (`src/routes/index.tsx`) currently has:
- Welcome modal logic (story 1.3)
- Placeholder content

Story 3.1 transforms it into the primary campaign timeline view:
- **Header:** Player's army name + faction + link to army detail view
- **Timeline:** List of `TimelineEntry` components
- The welcome modal logic must be preserved alongside the new timeline content

**Player army lookup:** The Campaign view needs to find the logged-in player's army. Use `getPlayerArmy(playerId)` which queries `armies` where `playerId` matches. A player has at most one army (no multi-army support in MVP).

### CRITICAL — Armies List Route (New)

Story 3.1 requires AC4 (viewing opponent army timelines). The navigation path is: Armies tab -> select opponent army -> see their timeline.

This requires a new route at `/armies/index.tsx` (the armies list). This route:
- Lists all armies using `getAllArmies()`
- Highlights the current player's army with gold styling (UX spec `ArmyListItem` variant `current`)
- Links each army to `/armies/$armyId`
- Uses `authMiddleware` (read-only, guests can view)

**Note:** The `ArmyListItem` component from the UX spec could be implemented inline in this route for now (it's a simple composition of text + link + conditional styling). A separate component file can be extracted later if needed.

### Date Formatting

Match dates should be formatted in French locale: "12 mars 2026". Use `Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })` in the `TimelineEntry` component.

### Result Display

Results are stored as English strings ('victory', 'defeat', 'draw') but displayed as French abbreviations:
- `'victory'` -> "V" (green badge)
- `'defeat'` -> "D" (red badge)
- `'draw'` -> "E" (neutral badge, E for Egalite)
- `null` -> no badge (result not yet entered)

### Architecture Compliance

- **DB access via `src/db/queries.ts` named functions** — never import `db` or `drizzle-orm` in route files
- **Dynamic imports inside `.handler()`** for all DB/auth/lib calls
- **Error messages in French**
- **Follow naming conventions:** `kebab-case` files, `camelCase` code, `PascalCase` types/components
- **`data-app-hydrated` pattern** required on all new route components (armies list)
- **Server functions co-located in route files** — no separate server directory
- **Loaders return data directly and throw on error** — no `ServerResult` wrapper for loaders

### Guest User Behavior

- Campaign view: show a message like "Connectez-vous pour voir votre timeline" instead of a personal timeline. No army header.
- Armies list: visible to guests (read-only), no gold highlight
- Army detail timeline: visible to guests (read-only)
- No write UI elements for guests (no FAB, no edit buttons — but these are out of scope for this story anyway)

### CRITICAL — Route Conflict: `/armies` index vs `/armies/$armyId`

TanStack Router file-based routing: `src/routes/armies/index.tsx` matches `/armies` exactly, while `src/routes/armies/$armyId.tsx` matches `/armies/:armyId`. These are distinct routes and do NOT conflict. However, both need the parent layout at `src/routes/armies.tsx` (or `_layout.tsx`) if one exists. Check whether a `src/routes/armies.tsx` layout route exists — if it does, the index route will render inside it. If not, both routes render at the root layout level independently. The existing `$armyId.tsx` works today without a layout, so the index route should also work without one.

### RISK — Pre-mortem Findings (Elicitation)

**Failure scenario 1 — Campaign view loader breaks welcome modal:**
The Campaign view currently has no route loader. Adding `loadCampaignTimelineFn` as a loader could change the component's data flow. The welcome modal depends on `useRouteContext({ from: '__root__' })` for session data. Ensure the loader does NOT replace the root context — it adds loader data alongside. Use `Route.useLoaderData()` for timeline data and keep `useRouteContext` for session/modal.

**Failure scenario 2 — Self-join returns duplicates:**
If a match somehow has 3+ participants (data corruption), the self-join produces multiple rows per match. Mitigation: the query is correct for the 2-participant invariant. Add a `DISTINCT ON (m.id)` or equivalent if paranoia is warranted, but for MVP the creation logic (story 3.2) enforces exactly 2 participants.

**Failure scenario 3 — Drizzle alias import path:**
The `alias()` function in Drizzle is imported from `drizzle-orm/pg-core` (NOT `drizzle-orm`). Using the wrong import path causes a confusing type error. Confirm with: `import { alias } from 'drizzle-orm/pg-core'`.

**Failure scenario 4 — Date formatting on server vs client:**
`Intl.DateTimeFormat('fr-FR')` requires the `fr-FR` locale to be available. On the server (Node.js), this depends on the ICU data. Most modern Node builds include full ICU. If not, dates render in English. Mitigation: format dates on the client (in the component), not in the server function. The ISO 8601 string is passed from server to client, and the component formats it.

**Failure scenario 5 — Empty armies list route intercepts army detail:**
If the armies index route is misconfigured (e.g., placed at `src/routes/armies.tsx` instead of `src/routes/armies/index.tsx`), it could act as a layout and break `$armyId.tsx`. Ensure the file is at `src/routes/armies/index.tsx` specifically.

### References

- Epic 3: [Source: epics/epic-3-campaign-timeline-match-management.md]
- UX component strategy: [Source: ux-design-specification/component-strategy.md]
- UX core experience (Moment 3 — timeline): [Source: ux-design-specification/core-user-experience.md]
- Architecture patterns: [Source: architecture/implementation-patterns-consistency-rules.md]
- Existing schema: [Source: src/db/schema.ts] — 7 tables
- Existing queries: [Source: src/db/queries.ts]
- Campaign view: [Source: src/routes/index.tsx]
- Army detail view: [Source: src/routes/armies/$armyId.tsx]
- Palette: [Source: MEMORY.md — Palette section]

## Dev Agent Record

### Implementation Notes (2026-03-16 — Claude Sonnet 4.6)

- All Tasks 1–8 completed. Implementation was partially done by a previous agent run; resumed and fixed remaining issues.
- **Task 1 (Schema):** `matches` and `matchParticipants` tables fully defined in `src/db/schema.ts` with correct FK constraints (set null for createdByPlayerId, cascade for matchId and armyId). Drizzle relation definitions added. Migration file `drizzle/0006_worthless_true_believers.sql` generated.
- **Task 2 (Queries):** `getTimelineForArmy` uses `alias()` from `drizzle-orm/pg-core` for self-join on `match_participants`. Since `oppArmy` is an INNER JOIN, `opponentName`/`opponentFaction` are non-nullable strings — removed unnecessary `!` assertions and `.filter()` guard to satisfy `@typescript-eslint/no-unnecessary-condition` lint rule.
- **Task 3 (TimelineEntry):** Component at `src/components/timeline-entry.tsx` — result badge uses CSS class names (`victory`, `defeat`, `draw`) alongside inline styles so tests can detect styling via className or style.color.
- **Tasks 4–6 (Routes):** Campaign view, army detail view, and armies list route all implemented. Welcome modal logic preserved in index.tsx. Army detail timeline visible to all users (no `isOwner` guard).
- **Task 8 (Lint):** Fixed 3 lint errors in `queries.ts` (unnecessary assertions post-INNER JOIN) and 2 pre-existing lint errors in `unit-card.tsx` (unnecessary optional chain and always-falsy guard).

### File List

**Changed:**
- `src/db/schema.ts` — added `matches`, `matchParticipants` tables and Drizzle relations
- `src/db/queries.ts` — added `TimelineEntryData` type, `getTimelineForArmy`, `getPlayerArmy`; fixed unnecessary assertion lint errors
- `src/routes/index.tsx` — added `loadCampaignTimelineFn` loader, timeline rendering, guest/no-army states
- `src/routes/armies/$armyId.tsx` — extended `loadArmyFn` to include timeline; added Historique section
- `src/components/unit-card.tsx` — fixed 2 pre-existing lint errors (unnecessary optional chain and always-falsy guard)
- `drizzle/meta/_journal.json` — updated by `pnpm db:generate`
- `src/routeTree.gen.ts` — updated by TanStack Router for new `/armies/` route

**Created:**
- `src/components/timeline-entry.tsx` — TimelineEntry component
- `src/routes/armies/index.tsx` — Armies list route with gold highlight for own army
- `drizzle/0006_worthless_true_believers.sql` — migration for matches and match_participants tables
- `drizzle/meta/0006_snapshot.json` — Drizzle snapshot
- `tests/3-1-schema.test.ts` — schema contract tests (17 tests, all pass)
- `tests/3-1-queries.test.ts` — query contract tests (25 tests, all pass)
- `tests/3-1-routes.test.ts` — route contract tests (42 tests, all pass)
- `tests/3-1-timeline-entry.test.tsx` — component tests (17 tests, all pass)

## Change Log

- 2026-03-16 — Review follow-ups applied. All 10 fixes (H + M severity) done. 547/547 tests pass, typecheck clean, build succeeds. New migration: drizzle/0007_skinny_living_tribunal.sql. (Claude Sonnet 4.6)
- 2026-03-16 — Implementation complete. All 8 tasks done, 546/546 tests pass, typecheck clean, lint clean, build succeeds. (Claude Sonnet 4.6)
- 2026-03-16 — Advanced elicitation applied (Pre-mortem + Code Review Gauntlet + Critique & Refine). Added AC7 (armies list gold highlight), AC8 (guest UX). Tightened AC2-AC6 with concrete UI/text expectations. Removed premature `evolutionSummary` prop (deferred to epic 4). Added Drizzle alias implementation guidance. Added 5 pre-mortem risk mitigations. Added edge case tests (7.6 opponent deleted, 7.18 guest campaign view). Clarified route conflict safety. (Claude Opus 4.6)
- 2026-03-16 — Story spec created (Claude Opus 4.6)
