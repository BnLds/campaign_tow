# Epic 3: Campaign Timeline & Match Management

Players can navigate campaign history via a scrollable timeline, create matches, see pending actions, and record match results. Evolutions are visible on both players' timelines.

## Story 3.1: Army Timeline View

As a player,
I want to view the scrollable timeline of my army and any opponent's army,
So that I can read the full campaign history at a glance.

**Acceptance Criteria:**

**Given** I am logged in and navigate to the Campaign view,
**When** the page loads,
**Then** I see my army's timeline starting with the most recent match at the top, followed by older matches in reverse chronological order (FR15)

**Given** the Campaign view is displayed,
**When** I look at the header area,
**Then** I see a button linking to my army's detail view (unit cards)

**Given** my timeline contains matches with evolutions,
**When** I scroll down,
**Then** each TimelineEntry shows the match opponent, result (V/D/É), date, and a summary of evolutions (XP gained, tier-ups, injuries)

**Given** I navigate to the Armies tab and select another player's army,
**When** the army view loads,
**Then** I see that army's timeline with the same structure (FR16)

**Given** my army has no matches yet,
**When** I view my timeline,
**Then** an appropriate empty state is displayed

**Given** a match exists but evolutions have not yet been entered for my army,
**When** I view the timeline,
**Then** the TimelineEntry is displayed without an evolution summary (no XP, tier-ups, or injuries shown)

*Tables created by this story: `matches` (id, date, createdByPlayerId), `match_participants` (id, matchId, armyId, result, evolutionsEnteredAt)*

---

## Story 3.1b: App Shell — TabBar, Layout & Navigation Components

As a player,
I want the app to have proper tab-based navigation and polished view layouts,
So that I can switch between Campaign, Armies, and References views naturally and the app feels cohesive with the validated UX design.

**Acceptance Criteria:**

**Given** I am logged in,
**When** the app loads,
**Then** a TabBar with 3 fixed tabs (Campagne 📜 / Armées 🛡 / Références 📖) is visible at the bottom of the screen, with the active tab highlighted (#dfe8f4, navy indicator top)

**Given** I am on any view,
**When** I tap a tab,
**Then** I navigate to the corresponding route (/ → Campagne, /armies → Armées, /territories → Références)

**Given** I am on the Armies list view,
**When** the page loads,
**Then** each army is rendered using the ArmyListItem component with:
- Avatar initiale (first letter of army name)
- Army name (Cinzel font), faction, player display name
- Win/draw/loss record
- Variant "current" (gold border #ead69b, background #fff9ec) for own army
- Own army pinned at top of the list

**Given** I am on the Campaign view,
**When** the page loads,
**Then** the header shows: army name, faction, and win/draw/loss record

**Given** I am logged in as a guest,
**When** I view the app,
**Then** the TabBar is still visible and functional (Armées and Références tabs accessible)

*Implementation notes:*
- *Refactor `__root.tsx` layout: keep AppHeader at top (display name, logout, admin link) + scrollable content area + TabBar fixed at bottom*
- *The AppHeader is NOT replaced — it is preserved as-is in the top bar*
- *Layout structure: header (existing) → main content (flex-grow, scroll) → TabBar (fixed bottom)*
- *TabBar: state = current route only, no contextual logic*
- *ArmyListItem: thin composition of shadcn primitives*
- */territories route: create placeholder page (content filled in Epic 5)*
- *Ensure CreateMatchFab positioning works with TabBar (bottom: 62px) for story 3.2*

---

## Story 3.2: Match Creation & Pending Actions

As a player,
I want to create a match by selecting an opponent and see pending matches requiring my input,
So that the campaign history stays up to date and I know what actions need my attention.

**Acceptance Criteria:**

**Given** I am logged in and tap the CreateMatchFab,
**When** the match creation form opens,
**Then** I see a list of all other campaign players to select as opponent (FR17)

**Given** the match creation form is open,
**When** I select an opponent,
**Then** I can optionally enter a match date (defaults to today if left blank)

**Given** I select an opponent and confirm,
**When** the match is created,
**Then** a `matches` record and two `match_participants` records (one per army) are created, and the match appears as pending on both players' Campaign views

**Given** an opponent has created a match involving my army,
**When** I view the Campaign view,
**Then** an ActionChip appears in the action strip for each pending match requiring my input (FR18)

**Given** a match is created,
**When** either player views the Campaign view,
**Then** the pending match is shown in the action strip until evolutions are entered

---

## Story 3.3: Match Result Entry

As a player,
I want to record and update the result of a match,
So that the campaign record accurately reflects who won each game.

**Acceptance Criteria:**

**Given** a match exists involving my army,
**When** I select a result (Victoire / Défaite / Égalité) and submit,
**Then** my `match_participants.result` is updated accordingly (FR19)

**Given** both players of a match have entered a result,
**When** either player views the timeline,
**Then** the match result is displayed on the TimelineEntry for both armies (FR20)

**Given** the opponent has already entered a result,
**When** I enter my result,
**Then** my entry is saved independently (both players' results are stored separately, as each enters their own perspective)

**Given** I attempt to modify the result of a match I am not a participant in,
**When** the mutation is submitted,
**Then** the server rejects the request (FR7)

---
