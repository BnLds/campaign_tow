# Story 3.1b: App Shell — TabBar, Layout & Navigation Components

Status: review

## Story

As a player,
I want the app to have proper tab-based navigation and polished view layouts,
So that I can switch between Campaign, Armies, and References views naturally and the app feels cohesive with the validated UX design.

## Acceptance Criteria

**AC1 — TabBar with 3 fixed tabs visible at bottom:**
Given I am logged in,
When the app loads,
Then a TabBar with 3 fixed tabs (Campagne / Armees / References) is visible at the bottom of the screen, with the active tab highlighted (background `#dfe8f4`, navy indicator bar at top, active text color `#334155`). Each tab shows an emoji icon and label.

**AC2 — Tab navigation routes correctly:**
Given I am on any view,
When I tap a tab,
Then I navigate to the corresponding route: Campagne -> `/`, Armees -> `/armies`, References -> `/territories`.

**AC3 — ArmyListItem component with avatar, record, and gold variant:**
Given I am on the Armies list view,
When the page loads,
Then each army is rendered using the ArmyListItem component with:
- Avatar circle showing the first letter of the army name (Cinzel font)
- Army name (Cinzel 600), faction, player display name
- Win/draw/loss record on the right side
- Variant "current" (gold border `#ead69b`, background gradient from `#fff9ec` to `#fff6eb`, gold box-shadow) for own army
- Own army pinned at top of the list
- Chevron indicator on the right

**AC4 — Campaign view header shows army info with record:**
Given I am on the Campaign view,
When the page loads,
Then the header shows: army name (Cinzel 700), faction, and win/draw/loss record (e.g. "3V . 1D . 4 parties").

**AC5 — Guest user sees TabBar:**
Given I am logged in as a guest,
When I view the app,
Then the TabBar is still visible and functional (all three tabs accessible).

**AC6 — Territories placeholder route exists:**
Given I tap the Territoires tab,
When the route loads,
Then I see a placeholder page with title "References" (Cinzel 700) and a message indicating content coming soon. The TabBar shows the Territoires tab as active.

**AC7 — Layout structure: header + scrollable content + fixed TabBar:**
Given I am on any authenticated view,
When I look at the page structure,
Then the layout is: AppHeader at top (existing, preserved as-is) -> main content area (flex-grow, overflow-y scroll, padding-bottom to clear TabBar) -> TabBar fixed at bottom. The content area scrolls independently.

**AC8 — Army detail view has back navigation and contextual header:**
Given I navigate to an army detail view from the Armies list,
When the page loads,
Then the Armies tab remains active in the TabBar (since army detail is under /armies/), and a back link/button is available to return to the armies list.

**AC9 — Admin route hides TabBar or shows no active tab:**
Given I am on the `/admin` route,
When the page loads,
Then the TabBar is visible but no tab is highlighted as active, since admin is not a primary navigation destination.

**AC10 — Record display handles zero-match armies gracefully:**
Given an army has no completed matches,
When the Campaign view header or ArmyListItem renders the record,
Then it shows "Aucune partie" in muted italic text instead of "0V . 0D . 0 parties".

## Context & Background

Story 3.1 implemented the timeline, matches DB tables, TimelineEntry component, and basic route pages for Campaign, Armies list, and Army detail. However, it explicitly deferred the TabBar component and polished navigation. The current app has no bottom navigation bar — users navigate via direct links only.

This story bridges the gap between the working data layer (story 3.1) and the validated UX mockup (v4.0). It introduces:

1. **TabBar component** — 3 fixed tabs at bottom of screen, styled per UX mockup
2. **ArmyListItem component** — proper list item with avatar, record, gold variant
3. **Territories placeholder route** — `/territories` with placeholder content
4. **Layout refactor** — `__root.tsx` gains the TabBar in the layout, content area scrolls
5. **Campaign view header enhancement** — adds win/draw/loss record
6. **Army detail contextual navigation** — back button, correct tab highlight

### What story 3.1 already created (DO NOT recreate)

| Artifact | Location | Status |
|---|---|---|
| `matches` table | `src/db/schema.ts` | Exists |
| `match_participants` table | `src/db/schema.ts` | Exists |
| `TimelineEntry` component | `src/components/timeline-entry.tsx` | Exists |
| Campaign view with timeline | `src/routes/index.tsx` | Exists |
| Armies list route | `src/routes/armies/index.tsx` | Exists |
| Army detail route | `src/routes/armies/$armyId.tsx` | Exists |
| `getTimelineForArmy` query | `src/db/queries.ts` | Exists |
| `getPlayerArmy` query | `src/db/queries.ts` | Exists |
| `getAllArmies` query | `src/db/queries.ts` | Exists |

### What this story creates (NEW)

| Artifact | Location |
|---|---|
| `TabBar` component | `src/components/tab-bar.tsx` |
| `ArmyListItem` component | `src/components/army-list-item.tsx` |
| References route | `src/routes/territories.tsx` |
| Layout update | `src/routes/__root.tsx` — add TabBar to RootLayout |
| Armies list refactor | `src/routes/armies/index.tsx` — use ArmyListItem |
| Campaign header update | `src/routes/index.tsx` — add win/draw/loss record |
| Win/draw/loss query | `src/db/queries.ts` — add record computation |

### Scope boundaries

**IN scope:**
- TabBar component with 3 fixed tabs, route-based active state
- ArmyListItem component with avatar, record, gold variant, chevron
- Territories placeholder route
- Layout refactor in `__root.tsx` (header + scroll content + TabBar)
- Campaign view header: add win/draw/loss record
- Army detail: back navigation link
- Guest user: TabBar visible and functional
- Content area padding-bottom to clear TabBar + FAB positioning prep (`bottom: 62px`)

**OUT of scope:**
- CreateMatchFab (story 3.2)
- ActionChip / action strip (story 3.2)
- Match creation (story 3.2)
- Reference table content (epic 5)
- E2E tests (focus on unit + structural tests)

## Tasks / Subtasks

- [x] Task 1 — Create `TabBar` component (`src/components/tab-bar.tsx`) (AC: 1, 2, 5, 9)
  - [x] 1.1 — Define TabBar component with 3 fixed tabs: Campagne (emoji scroll), Armees (emoji shield), References (emoji book). Each tab has an icon + label.
  - [x] 1.2 — Accept a `currentPath` prop (string). Determine active tab by matching: `/` or paths not under `/armies` or `/territories` -> Campagne; `/armies` or `/armies/*` -> Armees; `/territories` -> Territoires. No tab active for `/admin` or `/login`.
  - [x] 1.3 — Active tab styling: background `#dfe8f4`, text color `#334155` (navy), inset box-shadow `inset 0 0 0 1px #c7d3e4`, navy indicator bar at top (pseudo-element or top-border trick: width 24px, height 3px, `border-radius: 999px`, centered above tab). Inactive: color `#9a8d7f`.
  - [x] 1.4 — TabBar container: flex-shrink 0 in the flex column layout, height 58px, background `rgba(236,228,216,0.96)`, border-top `1px solid #d2c3af`, `backdrop-filter: blur(12px)`, z-index 3, grid with 3 equal columns. Shadow: `box-shadow: 0 -6px 20px rgba(0,0,0,.04)` (from mockup).
  - [x] 1.5 — Each tab is a `<Link>` element using TanStack Router, navigating to `/`, `/armies`, `/territories` respectively. Style with `textDecoration: 'none'` and `color: inherit` to avoid default link styles.
  - [x] 1.6 — Tab text: font-size 9px, font-weight 800, letter-spacing 0.04em, uppercase (font-family Inter via `--font-body`). Icon: font-size 16px. Tab layout: flex column, centered, gap 2px, border-radius 12px, padding 4px 6px.
  - [x] 1.7 — Add `data-testid="tab-bar"` on container, `data-testid="tab-campagne"`, `data-testid="tab-armees"`, `data-testid="tab-references"` on each tab link.
  - [x] 1.8 — Indicator bar implementation: since inline styles cannot create pseudo-elements, use a conditional `<span>` element (width 24px, height 3px, border-radius 999px, background `#334155`, positioned absolutely at top -5px, centered via left 50% + translateX(-50%)) rendered only on the active tab.

- [x] Task 2 — Create `ArmyListItem` component (`src/components/army-list-item.tsx`) (AC: 3, 10)
  - [x] 2.1 — Define props: `id` (string), `name` (string), `faction` (string), `playerDisplayName` (string | null), `record` (`{ wins: number, draws: number, losses: number }` | null), `isOwn` (boolean).
  - [x] 2.2 — Render avatar circle: 42x42px, border-radius 50%, background `#e8ddd0` (or `#f4e3b2` with gold text `#8a6a10` for own army), Cinzel font 15px weight 800, showing first letter of army name. Use `display: grid; place-items: center` for centering.
  - [x] 2.3 — Render army name (Cinzel 600, 13px, with `white-space: nowrap; overflow: hidden; text-overflow: ellipsis` for long names), faction + player display name below (Inter, 10px, `--color-text-secondary`). Faction and player separated by ` . ` (centered dot separator, matching mockup pattern).
  - [x] 2.4 — Render win/draw/loss record on the right side: format as colored text (wins in green `#2d7a3a`, losses in red `#b82c2c`), e.g. "3V . 1D" (font-size 11px, weight 800). Show "Aucune partie" in muted italic (`--color-text-muted`, font-size 10px) if record is null or all zeros (wins + draws + losses === 0).
  - [x] 2.5 — Render chevron `>` (use the `>` character, matching mockup's `.list-chevron`) on the far right (color `#a69683`, font-size 16px, flex-shrink 0, self-centered vertically).
  - [x] 2.6 — Gold variant (`isOwn: true`): border-color `#ead69b`, background gradient `linear-gradient(180deg, #fff9ec, #fff6eb)`, box-shadow `0 8px 22px rgba(212,168,67,0.16)`. Normal variant: border `1px solid #e0d5c8`, background `rgba(255,251,245,0.92)`.
  - [x] 2.7 — Component wraps content in a `<Link to="/armies/$armyId" params={{ armyId: id }}>` for navigation. Style link: `textDecoration: 'none'`, `color: 'inherit'`, `display: 'flex'`. Use flexbox layout matching the UX mockup: outer flex row (align-items center, justify-content space-between, gap 12px, padding 14px, border-radius 16px), inner `.list-main` (flex row, gap 12px, flex 1, min-width 0) + `.list-meta` (flex row, gap 8px, align-items center, flex-shrink 0).
  - [x] 2.8 — Add `data-testid="army-list-item"` on root, `data-testid="army-avatar"` on avatar.
  - [x] 2.9 — Margin between items: `margin-bottom: 7px` (matching mockup `.list-item` spacing of `0 4px 7px`; the horizontal margins are handled by the parent container).

- [x] Task 3 — Create Territories placeholder route (`src/routes/territories.tsx`) (AC: 6)
  - [x] 3.1 — Create route file at `src/routes/territories.tsx` using `createFileRoute('/territories')`.
  - [x] 3.2 — Render a page with title "References" (Cinzel 700, 1.5rem) and placeholder text "Contenu a venir — tables de reference de campagne" (Inter, `--color-text-secondary`, italic).
  - [x] 3.3 — Include `data-app-hydrated` pattern (useHydrated + useEffect).
  - [x] 3.4 — Use same layout padding as other views: `padding: 1rem`, `max-width: 720px`, `margin: 0 auto`.
  - [x] 3.5 — No loader needed (static placeholder). Use empty component route.

- [x] Task 4 — Refactor `__root.tsx` layout to include TabBar (AC: 1, 5, 7, 9)
  - [x] 4.1 — Import `TabBar` component in `__root.tsx`.
  - [x] 4.2 — Update `RootLayout` to use a flex column layout wrapper: `display: flex`, `flexDirection: column`, `height: 100dvh` (with `100vh` fallback for older browsers). AppHeader becomes `flex-shrink: 0`.
  - [x] 4.3 — Wrap `<Outlet />` in a scrollable container div: `flex: 1`, `overflow-y: auto`, `padding-bottom: 68px` (to clear TabBar height 58px + 10px breathing room), `min-height: 0` (critical for flex children to allow shrinking below content height).
  - [x] 4.4 — Add `<TabBar currentPath={...} />` after the scrollable container, as the last flex child (flex-shrink: 0). Use `useLocation()` from `@tanstack/react-router` to get current pathname.
  - [x] 4.5 — TabBar should NOT render on the `/login` route. Conditionally render based on `session` being non-null (already available in RootLayout via `useRouteContext`).
  - [x] 4.6 — Ensure body/html have no default margin/overflow that conflicts with the flex layout. Add `html, body { margin: 0; overflow: hidden; height: 100%; }` in `globals.css` if not already present. NOTE: `overflow: hidden` on body prevents double-scrollbar — the scroll happens inside the content div.
  - [x] 4.7 — WelcomeModal safety: the modal in Campaign view uses fixed/absolute positioning relative to the viewport. Verify it still renders above the TabBar (z-index of dialog > z-index 3 of TabBar). Shadcn Dialog uses z-index 50 by default — should be safe, but verify visually.

- [x] Task 5 — Add win/draw/loss record query and update Campaign view header (AC: 4, 10)
  - [x] 5.1 — Add a `getArmyRecord(armyId: string)` function in `src/db/queries.ts` that counts victories, defeats, and draws from `match_participants` where `armyId` matches and `result` is not null. Return `{ wins: number, draws: number, losses: number }`. Use Drizzle's `sql` template for the COUNT FILTER pattern. Cast counts to `Number()` since Drizzle returns `string | null` for raw sql aggregates.
  - [x] 5.2 — Update `loadCampaignTimelineFn` in `src/routes/index.tsx` to also call `getArmyRecord(army.id)` and include `record` in the return. For guests and no-army cases, return `record: null`.
  - [x] 5.3 — Update the Campaign view header to display the record below the faction, formatted as "Orques & Gobelins . 3V . 1D . 4 parties" in a single `screen-sub` line (matching the UX mockup: Inter, 11px, `--color-text-secondary`). Total parties = wins + draws + losses. If record is null or all zeros, show only the faction with no record stats.
  - [x] 5.4 — Format helper: create a `formatRecord` utility (inline or extracted) that returns the formatted string. Wins use green `#2d7a3a` only if > 0, losses use red `#b82c2c` only if > 0. The "4 parties" part is always in muted color.

- [x] Task 6 — Refactor Armies list to use ArmyListItem with record data (AC: 3, 10)
  - [x] 6.1 — Add a `getAllArmyRecords()` batch query in `src/db/queries.ts` that returns records for all armies in one query (GROUP BY army_id). This avoids N+1 queries for the armies list. Return type: `Map<string, { wins: number, draws: number, losses: number }>`.
  - [x] 6.2 — Update `loadArmiesListFn` in `src/routes/armies/index.tsx` to call `getAllArmyRecords()` once and merge records into army data. Armies with no matches get `record: null`.
  - [x] 6.3 — Sort armies server-side in the loader: own army first (pinned), then remaining armies sorted by name alphabetically (using `localeCompare`).
  - [x] 6.4 — Replace inline army list rendering with `<ArmyListItem>` components. Remove the old inline Link + styled div pattern.
  - [x] 6.5 — Preserve existing empty state ("Aucune armee dans la campagne") and `data-app-hydrated` pattern.
  - [x] 6.6 — Remove the `h1` title "Armees" — the mockup for the Armies list view uses the AppHeader with just "Armees" as `screen-title`, not an in-content heading. Update the AppHeader or keep it simple: if AppHeader is not route-aware yet, keep the h1 for now and note it as a future refinement.

- [x] Task 7 — Army detail back navigation (AC: 8)
  - [x] 7.1 — In `src/routes/armies/$armyId.tsx`, add a back link at the top of the army header. Use a styled `<Link to="/armies">` with a left-arrow character (`<` or `\u2039`) matching the UX mockup's `header-ghost-btn` style: 30x30px, border-radius 999px, border 1px solid #d9cfbf, background #fff9f2, color var(--color-brand), font-weight 800, centered via `display: grid; place-items: center`.
  - [x] 7.2 — Place the back button in a flex row with the army name/faction, matching the mockup layout: `display: flex; align-items: center; gap: 10px`.
  - [x] 7.3 — Ensure the army detail view still has the correct tab active in TabBar (Armees tab, since path starts with `/armies/`). This is handled automatically by Task 1.2 path matching logic.

- [x] Task 8 — Write unit tests (AC: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
  - [x] 8.1 — Test TabBar: renders 3 tabs with correct labels and icons
  - [x] 8.2 — Test TabBar: active state matches current path (/ -> Campagne, /armies -> Armees, /armies/xyz -> Armees, /territories -> Territoires)
  - [x] 8.3 — Test TabBar: no tab active for `/admin` path
  - [x] 8.4 — Test TabBar: each tab links to the correct route
  - [x] 8.5 — Test ArmyListItem: renders avatar with first letter of army name
  - [x] 8.6 — Test ArmyListItem: renders army name, faction, player display name
  - [x] 8.7 — Test ArmyListItem: gold variant styles applied when `isOwn: true`
  - [x] 8.8 — Test ArmyListItem: normal variant styles when `isOwn: false`
  - [x] 8.9 — Test ArmyListItem: renders win/draw/loss record with correct colors
  - [x] 8.10 — Test ArmyListItem: renders "Aucune partie" when record is null or all zeros
  - [x] 8.11 — Test ArmyListItem: links to `/armies/$armyId`
  - [x] 8.12 — Test ArmyListItem: long army name is truncated (ellipsis)
  - [x] 8.13 — Test `getArmyRecord`: returns correct counts for victories, defeats, draws
  - [x] 8.14 — Test `getArmyRecord`: returns all zeros when army has no completed matches
  - [x] 8.15 — Test `getArmyRecord`: does not count null results (pending matches)
  - [x] 8.16 — Test `getAllArmyRecords`: returns records grouped by army ID
  - [x] 8.17 — Test References route: renders title "References" and placeholder text
  - [x] 8.18 — Test Campaign view header: displays win/draw/loss record formatted correctly
  - [x] 8.19 — Test Campaign view header: shows only faction when record is all zeros
  - [x] 8.20 — Test Armies list: renders ArmyListItem components with record data
  - [x] 8.21 — Test Armies list: own army appears first in list
  - [x] 8.22 — Test Army detail: back link exists and navigates to `/armies`
  - [x] 8.23 — Test Army detail: back link matches ghost button styling

- [x] Task 9 — Quality gates
  - [x] 9.1 — `pnpm typecheck` — zero errors
  - [x] 9.2 — `pnpm lint` — zero errors
  - [x] 9.3 — `pnpm build` — succeeds
  - [x] 9.4 — All existing tests still pass (no regressions)
  - [x] 9.5 — Visual smoke test: verify all 5 views (Campaign, Armies list, Army detail, References, Login) render correctly after layout refactor

## Dev Notes

### CRITICAL — TabBar Positioning Strategy

The UX mockup uses `position: absolute; bottom: 0` within the phone container. In the real app, use the flex layout approach:

**Recommended — Flex layout (Option A):**
```
<div style="display:flex; flex-direction:column; height:100dvh">
  <AppHeader />           <!-- flex-shrink: 0 -->
  <main style="flex:1; overflow-y:auto; padding-bottom:68px; min-height:0">
    <Outlet />
  </main>
  <TabBar />              <!-- flex-shrink: 0 -->
</div>
```

The `min-height: 0` on the content div is essential — without it, flex children default to `min-height: auto` which prevents them from shrinking below their content height, causing the layout to overflow instead of scrolling.

Do NOT use `position: fixed` — it causes issues with mobile browser chrome (dynamic viewport) and complicates z-index stacking with modals.

### CRITICAL — TabBar Active State Logic

Active state is determined purely by the current route path:
- `/` -> Campagne
- `/armies` or `/armies/*` -> Armees
- `/territories` -> Territoires
- `/admin` -> no tab active (admin is separate)
- `/login` -> TabBar not rendered at all

Use `useLocation()` from `@tanstack/react-router` to get the current pathname. Pattern matching:
```typescript
const isArmees = pathname === '/armies' || pathname.startsWith('/armies/')
const isTerritoires = pathname === '/territories'
const isCampagne = !isArmees && !isTerritoires && pathname !== '/login' && pathname !== '/admin'
```

### CRITICAL — Indicator Bar Without Pseudo-elements

Since this project uses inline styles (no CSS modules or styled-components), pseudo-elements (`::before`) are not available. The active tab's indicator bar must be implemented as a real DOM element:
```tsx
{isActive && (
  <span style={{
    position: 'absolute',
    top: -5,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 24,
    height: 3,
    borderRadius: 999,
    background: '#334155',
  }} />
)}
```
Each tab container needs `position: relative` to anchor this element.

### CRITICAL — Win/Draw/Loss Record Query

The record must count from `match_participants` where `result` is not null. Query:
```sql
SELECT
  COUNT(*) FILTER (WHERE result = 'victory') as wins,
  COUNT(*) FILTER (WHERE result = 'draw') as draws,
  COUNT(*) FILTER (WHERE result = 'defeat') as losses
FROM match_participants
WHERE army_id = $armyId AND result IS NOT NULL
```

Drizzle implementation using `sql` template:
```typescript
import { sql } from 'drizzle-orm'

export async function getArmyRecord(armyId: string) {
  const rows = await db
    .select({
      wins: sql<string>`count(*) filter (where ${matchParticipants.result} = 'victory')`,
      draws: sql<string>`count(*) filter (where ${matchParticipants.result} = 'draw')`,
      losses: sql<string>`count(*) filter (where ${matchParticipants.result} = 'defeat')`,
    })
    .from(matchParticipants)
    .where(eq(matchParticipants.armyId, armyId))
  return {
    wins: Number(rows[0]?.wins ?? 0),
    draws: Number(rows[0]?.draws ?? 0),
    losses: Number(rows[0]?.losses ?? 0),
  }
}
```

**Important:** Drizzle returns `string | null` for raw SQL aggregates, not `number`. Always wrap with `Number()`.

### CRITICAL — Batch Record Query for Armies List (N+1 Prevention)

The armies list must NOT call `getArmyRecord` in a loop. Use a single grouped query:
```typescript
export async function getAllArmyRecords() {
  const rows = await db
    .select({
      armyId: matchParticipants.armyId,
      wins: sql<string>`count(*) filter (where ${matchParticipants.result} = 'victory')`,
      draws: sql<string>`count(*) filter (where ${matchParticipants.result} = 'draw')`,
      losses: sql<string>`count(*) filter (where ${matchParticipants.result} = 'defeat')`,
    })
    .from(matchParticipants)
    .groupBy(matchParticipants.armyId)
  const map = new Map<string, { wins: number; draws: number; losses: number }>()
  for (const row of rows) {
    map.set(row.armyId, {
      wins: Number(row.wins ?? 0),
      draws: Number(row.draws ?? 0),
      losses: Number(row.losses ?? 0),
    })
  }
  return map
}
```

### ArmyListItem — Sorting Logic

Own army must be pinned at top of the list. Sort server-side in the loader:
```typescript
const sorted = [...armies].sort((a, b) => {
  if (a.isOwn && !b.isOwn) return -1
  if (!a.isOwn && b.isOwn) return 1
  return a.name.localeCompare(b.name)
})
```

### ArmyListItem — Record Display Format

The UX mockup shows the record as "3V . 1D" with wins in green and losses in red. The format should:
- Show wins if > 0 (green `#2d7a3a`)
- Show losses if > 0 (red `#b82c2c`)
- Separate with ` . ` (middle dot)
- If all zeros or null: show "Aucune partie" in muted italic

The Campaign header format is different: "Orques & Gobelins . 3V . 1D . 4 parties" in a single line. The faction comes first as a `screen-sub` element.

### References Route — File Path

Must be at `src/routes/territories.tsx` (NOT `src/routes/territories/index.tsx`). This matches the architecture patterns file which lists `territories.tsx` at the routes level. TanStack Router will generate the route for `/territories`.

### RISK — Root Layout Refactor Breaks Existing Views

Adding a flex column layout to `__root.tsx` changes how all views render. Potential issues:

1. **Double scrollbar** — If body still has `overflow: auto` and the content div also scrolls, users get nested scrollbars. Mitigation: set `overflow: hidden` on body.
2. **Admin route layout** — The admin view at `/admin/index.tsx` has its own layout. Verify it works within the flex column. TabBar will render (no active tab) — confirm admin does not need TabBar hidden.
3. **WelcomeModal z-index** — Campaign view's WelcomeModal (Shadcn Dialog, z-index 50) must render above TabBar (z-index 3). Should work, but verify.
4. **Login page** — TabBar must NOT render on `/login`. Session-based conditional already handles this.
5. **Content padding-bottom vs scroll** — The `padding-bottom: 68px` on the scroll container ensures the last content item is not hidden behind the TabBar. If a view adds its own bottom padding, the combined padding may be excessive — check each view.
6. **iOS Safari bounce scroll** — The `-webkit-overflow-scrolling: touch` property may be needed on the scroll container. Modern iOS Safari handles this by default, but worth testing.

### Architecture Compliance

- Components: `kebab-case` files, `PascalCase` exports
- TabBar and ArmyListItem are new components in `src/components/`
- Server functions co-located in route files
- `getArmyRecord` and `getAllArmyRecords` added to `src/db/queries.ts` (named function pattern)
- `data-app-hydrated` pattern on new References route
- No new DB tables — uses existing `match_participants` data
- Guest users: TabBar visible, all tabs functional, no write UI
- Font tokens: use `var(--font-display)` / `var(--font-body)` — never hardcode font names
- Color tokens: use `var(--color-*)` from globals.css where tokens exist. TabBar-specific colors (e.g., `rgba(236,228,216,0.96)`) are mockup-specific and may be inline since no token exists yet.

### Cinzel font-weight 800 — Missing @font-face

The UX mockup uses `font-weight: 800` for avatar letters, tab labels, and various UI elements. However, `globals.css` only declares Cinzel at weights 600 and 700. Two options:
1. **Use 700 instead of 800** for Cinzel — the browser will synthesize bold, which may look acceptable
2. **Add Cinzel 800 @font-face** — requires downloading the woff2 file

Recommendation: use `font-weight: 700` for Cinzel elements (avatar, army name) and `font-weight: 800` only for Inter elements (tab labels, record text) since Inter goes up to 800 in the loaded weights. Actually, Inter is only loaded at 400, 500, 700 — so 800 will also be synthesized. Consider loading Inter 800 or using 700.

**Decision for implementation:** Use the closest available weight. Cinzel: max 700. Inter: max 700. Accept browser synthesis for 800. If visual quality is insufficient, add font files in a follow-up.

### References

- Epic 3: [Source: epics/epic-3-campaign-timeline-match-management.md]
- UX mockup (source of truth): [Source: ux-mockup.html v4.0]
- Story 3.1 (predecessor): [Source: implementation-artifacts/3-1-army-timeline-view.md]
- Architecture patterns: [Source: architecture/implementation-patterns-consistency-rules.md]
- Palette tokens: [Source: src/styles/globals.css]
