---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
workflowStatus: complete
completedDate: '2026-04-10'
inputDocuments:
  - '.ignore/planning-artifacts/prd.md'
  - 'docs/faction_rule.md'
  - 'docs/territory_rule.md'
  - 'docs/match_rule.md'
  - 'docs/xp_rules.md'
workflowType: 'prd'
classification:
  projectType: web_app
  domain: general
  complexity: medium
  projectContext: brownfield
---

# Product Requirements Document - campaign_tow (Territory Module)

**Author:** Ben
**Date:** 2026-04-10

## Executive Summary

Campaign TOW is a responsive web app tracking a ~15-player Warhammer: The Old World campaign. The existing system handles the tactical layer — army management, post-match XP flows, unit cards with campaign deltas, and a scrollable narrative timeline. This PRD defines the **strategic layer**: territory management, colony development, building construction, and the Crown (CO) economy that connects matches to army growth.

Today, players track territories, buildings, and gold through Discord messages and paper notes. Every week requires manual recalculation of income across multiple tile types, faction-specific bonuses, and building outputs. Errors are common, history is lost, and no one has a clear picture of their economic state.

The territory module gives each player a dashboard of their empire — tiles owned, colonies built, buildings constructed, and current CO balance — with income calculation triggered once per week. The app knows each player's faction and enforces faction-specific colonization rules: a Dwarf player sees mountain options, a Bretonnian gets the Manorial Estate, Chaos Daemons build portals instead of villages. Players no longer need to cross-reference faction rules — the app surfaces only what's available to them.

An initial setup flow (similar to the existing XP bootstrap) lets players input their current territory state mid-campaign: existing tiles, colonies, buildings, and CO balance.

**Project Classification:** Web App (SPA responsive, mobile-first — extending existing app). General domain (tabletop wargaming campaign management). Medium complexity (faction-specific rules for ~15 factions, tile/building/economy interactions, weekly income calculation). Brownfield project.

### What Makes This Special

The same principle that made the timeline valuable — **making visible and automatic what was scattered and manual** — applied to the strategic layer. The tactical loop (matches → XP → unit upgrades) already works. This completes the strategic loop: matches → tiles → CO income → buildings → army growth. The app replaces weekly Discord recalculations with a single source of truth where faction rules are built in, not memorized.

## Success Criteria

### User Success

- A player triggers weekly income generation and sees their CO balance updated automatically — no manual calculation needed
- When constructing a building, a player sees only the options available to their faction and tile type — no need to cross-reference faction rules
- A player completing initial territory setup (tiles, colonies, buildings, CO balance) can do so in a single session without external help
- Accessing current CO balance, tile list, and building inventory takes no more than 2 taps from the territory view

### Business Success

| Objective | Target | Horizon |
|---|---|---|
| Territory module adoption | ≥ 70% of active players manage territories in-app | Ongoing |
| Discord replacement | CO/territory discussions disappear from Discord | Ongoing |
| Data accuracy | Players trust the app's CO balance over their own notes | Ongoing |

**What success is NOT:**
- Perfect territory data from day one — the setup flow handles mid-campaign bootstrap
- 100% adoption — a player who doesn't engage in the strategic layer can ignore it

### Technical Success

- Weekly income calculation produces correct totals matching manual verification for all faction-specific rules
- Faction-specific colonization constraints enforced without false positives or false negatives
- Territory module integrates seamlessly with existing app navigation (tab "Territoires")

### Measurable Outcomes

- % players with at least one territory registered → target: ≥ 70%
- % weekly income generations done in-app vs manually → target: ≥ 80%
- Zero CO calculation errors reported after first month of use

## User Journeys

### Journey 1 — Thomas: Weekly Territory Management

Thomas plays Bretonnia. After winning a match against Julien, he claimed a new agricultural plain. On the bus home, he opens Campaign TOW and navigates to the Territories tab.

He taps "Add tile", selects "Agricultural Plain" from the terrain list. The app shows him that this tile generates 20 CO base income, and since it's an agricultural plain, a free farm is included when he builds a village. He sees Bretonnia-specific options: this terrain type allows city construction for his faction.

Later in the week, Thomas decides to build a village on his new plain (150 CO). He taps the tile, sees "Build village" available. He confirms — 150 CO deducted from his balance. The app shows his village now has 1 building slot, and the free farm is already placed.

He then wants to build the Manoir Seigneurial — a Bretonnian faction building. He taps the village, sees available buildings. The Manoir Seigneurial (60 CO) appears because the app knows he's Bretonnian and it's a city-eligible location. He builds it — 60 CO deducted.

On Monday, Thomas triggers his weekly income generation for the past week. The app calculates: base tile incomes + farm output + other building revenues. His CO balance updates. He checks the transaction history to verify — every line item is there.

**Capabilities:** tile addition with terrain type, faction-aware building options, colony construction with CO deduction, weekly income generation (manual trigger with week tracking), CO transaction history.

---

### Journey 2 — Thomas: Mid-Campaign Territory Setup

Thomas has been playing for 6 weeks before the territory module launches. He owns 4 tiles, has 2 villages (one with a barracks, one with a farm), and his current CO balance is 340.

He opens the Territories tab for the first time and sees the setup flow — similar to the XP bootstrap he already used. Step by step:

1. He enters his current CO balance: 340
2. He adds his 4 tiles, selecting terrain type for each
3. For tiles with villages, he marks them and adds the buildings already constructed
4. He reviews the summary — tiles, colonies, buildings, balance — and confirms

His territory dashboard is now live. From next week, he manages everything in-app.

**Capabilities:** initial setup flow (CO balance, tiles, colonies, buildings in sequence), review and confirm step, immediate dashboard after setup.

---

### Journey 3 — Thomas: Manual CO Entry

Thomas bought a new unit of knights at the game table — 120 CO spent. This isn't a building, so there's no automated flow. He opens his territory dashboard, taps "Add expense", types "Chevaliers du Royaume x5" with amount 120 CO, confirms. His balance drops by 120.

Next week, the campaign organizer announces a bonus of 50 CO for all players who participated in a narrative event. Thomas taps "Add income", types "Bonus événement narratif" with amount 50 CO, confirms.

Both entries appear in his transaction history alongside automated income and building costs.

**Capabilities:** manual expense entry (label + amount), manual income entry (label + amount), entries visible in transaction history alongside automated transactions.

---

### Journey 4 — Marc: Chaos Daemons Faction Constraints

Marc plays Chaos Daemons. He gains a new tile — a forest. He navigates to Territories, adds the tile. When he tries to build a village, the app doesn't offer the option. Instead, he sees "Create Chaos Portal" — because Chaos Daemons cannot build villages or cities. The portal generates 40 CO and increases his army size by 50 points.

Marc wants to upgrade to a Major Portal (300 CO). The app shows the upgrade option on his existing portal. He confirms — 300 CO deducted. The portal now generates 80 CO and provides 3 building slots. He can build military buildings, a wizard tower, or a menagerie — but nothing else, per Chaos Daemon rules.

**Capabilities:** faction-specific colonization rules enforced (no villages for Daemons), faction-specific structures (Chaos Portals), upgrade paths for faction structures, building slot limits enforced, building type restrictions per faction.

---

### Journey Requirements Summary

| Capability | Journeys |
|---|---|
| Add/remove tiles with terrain type selection | 1, 2, 4 |
| Faction-aware colonization options (village/city/portal) | 1, 4 |
| Faction-specific building availability | 1, 4 |
| Building construction with CO deduction | 1, 4 |
| Building slot limit enforcement | 1, 4 |
| Weekly income generation (manual trigger, week tracking) | 1 |
| CO balance dashboard (balance, tiles, buildings) | 1, 2, 3 |
| CO transaction history (all entry types) | 1, 3 |
| Initial territory setup flow (bootstrap mid-campaign) | 2 |
| Manual CO expense/income entries (label + amount) | 3 |
| Faction detection from existing player/army data | 1, 4 |
| Colony upgrade paths (village → city, portal → major portal) | 1, 4 |

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Experience MVP — the minimum that lets every player see and manage their empire in-app, replacing Discord/paper entirely. Same philosophy as the tactical layer MVP: the app must feel useful from first use.

**Key constraint:** All ~15 factions must be supported at MVP. A player whose faction isn't implemented can't use the module — partial faction support breaks adoption. Faction rules are data-driven (lookup tables, not per-faction code), so marginal cost per faction is low once the structure exists.

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:** All 4 journeys (weekly management, initial setup, manual entries, faction constraints)

**Must-Have Capabilities:**
- Faction data standardization — all factions defined with colonization rules, available buildings, special structures
- OWB import script updated to detect and assign faction
- Initial territory setup flow (bootstrap tiles, colonies, buildings, CO balance)
- Tile management (add/remove, terrain type, base income)
- River plain adjacency toggle
- Colony management (village/city) with faction-specific constraints
- Faction-specific structures (Chaos Portals, Ogre Tyrant Hall, etc.)
- Building construction with CO deduction, slot limits, faction availability
- Building rules displayed (informational)
- Weekly CO income generation (manual trigger, once per week, week tracking)
- Manual CO entries (label + amount, expense or income)
- CO transaction history (chronological, all entry types)
- CO balance dashboard (balance, estimated weekly income, tile accordion)

### Phase 2 — Growth (Post-MVP)

- Automatic weekly income generation (cron, Sunday)
- CO transaction history with advanced filtering and export
- Territory statistics and progression over time
- Building upgrade paths visualization

### Phase 3 — Vision (Future)

- 2D campaign map with tile adjacency and spatial rules
- Full spatial rule enforcement (river plain chains, adjacency bonuses)
- Territory conquest integration with match results (win → claim tile flow)

### Risk Mitigation

**Technical — Faction data volume:** ~15 factions with unique rules. Mitigation: data-driven architecture (faction config as structured data, not per-faction code). One generic engine, faction-specific parameters.

**Technical — Faction standardization:** Faction names must be standardized across existing army data and OWB import. Mitigation: create canonical faction list, update import script, backfill existing armies.

**Adoption:** Players already use the tactical layer. Territory module is additive — no migration risk. Mitigation: same UX patterns (setup flow, tab navigation) for familiar experience.

**Data accuracy:** Initial CO balances entered manually may contain errors. Mitigation: transaction history provides audit trail, manual entries allow corrections.

## Web App Requirements — Territory Module

### Project-Type Overview

The territory module extends the existing Campaign TOW SPA (responsive, mobile-first). It lives entirely within the existing "Territoires" (📖) tab. No new routes or navigation patterns — the module integrates into the established tab-based architecture.

### UI Layout — Territory Tab

- **Header area:** Current CO balance (prominent) + estimated weekly income preview (e.g. "+80 CO")
- **Tile list:** Collapsible accordion — one section per owned tile
- **Tile section (expanded):** Terrain type, base income, colony status (village/city/portal), list of constructed buildings, "Add building" action button
- **Tile section (collapsed):** Terrain type + name/label, income summary

### Responsive Design

- Mobile-first — same pattern as existing app (primary usage on phone at game table or on the go)
- Breakpoints: mobile (< 768px) priority, desktop secondary
- Tap zones ≥ 44px, no hover-only interactions
- Accordion tiles must be thumb-friendly on mobile

### Browser Matrix

Unchanged from existing app — Chrome/Chromium (mobile + desktop), Safari iOS, Firefox (desktop), Samsung Internet best-effort.

### Implementation Considerations

- Server-side income calculation — aggregates all tile base incomes, building revenues, and faction-specific bonuses (Chaos portals, Dwarf mine upgrades, Dark Elf slave markets, etc.)
- Faction detection from existing player → army → faction data model
- CO balance as server-authoritative source of truth (not client-computed)
- Transaction log append-only — income generations, building costs, manual entries all stored as immutable entries

## Functional Requirements

### Faction Data & Detection

- **FR1:** The system maintains a canonical list of all campaign factions with their colonization rules, available buildings, and special structures
- **FR2:** The system detects a player's faction from their army data
- **FR3:** The OWB import script identifies and assigns the correct faction when importing an army

### Tile Management

- **FR4:** A player can add a tile to their territory by selecting a terrain type
- **FR5:** A player can remove a tile from their territory
- **FR6:** The system displays the base income associated with each terrain type
- **FR7:** A player can toggle a river plain adjacency flag on river plain tiles (indicating adjacency to another river plain for +20 CO bonus)
- **FR8:** A player can view all their tiles in a collapsible accordion list

### Colony Management

- **FR9:** A player can build a village on a tile where their faction allows village construction
- **FR10:** A player can upgrade a village to a city on a tile where their faction allows city construction
- **FR11:** The system enforces faction-specific colonization constraints (e.g., Dwarfs only in mountains, Wood Elves only in forests, Chaos Daemons cannot build villages)
- **FR12:** A player whose faction uses alternative structures (Chaos Portals, Ogre Tyrant Hall) can build those instead of standard colonies
- **FR13:** A player can upgrade faction-specific structures (e.g., Chaos Portal → Major Portal)
- **FR14:** The system deducts the correct CO cost when building or upgrading a colony
- **FR15:** The system tracks building slots available per colony (1 for village, 3 for city, faction-specific for special structures)

### Building Construction

- **FR16:** A player can construct a building on a colony that has available building slots
- **FR17:** The system shows only buildings available to the player's faction and compatible with the tile/colony type
- **FR18:** The system enforces building construction constraints (slot limits, one upgraded military building per colony, terrain restrictions for mines/sawmills)
- **FR19:** The system deducts the correct CO cost when constructing a building
- **FR20:** A player can view the rules/effects of each building (informational display)
- **FR21:** The system applies automatic bonuses from colony/tile construction (free farm on agricultural plain village, free menagerie on swamp village, free mine on Dwarf mountain village, etc.)

### CO Economy — Income Generation

- **FR22:** A player can trigger weekly income generation once per week
- **FR23:** The system tracks which week the income generation applies to (preventing duplicate generation for the same week)
- **FR24:** The system calculates total weekly income by summing all tile base incomes, building revenues, and faction-specific bonuses
- **FR25:** The system credits the calculated income to the player's CO balance

### CO Economy — Manual Entries

- **FR26:** A player can add a manual expense entry with a label and CO amount
- **FR27:** A player can add a manual income entry with a label and CO amount
- **FR28:** Manual entries are immediately reflected in the player's CO balance

### CO Economy — Balance & History

- **FR29:** A player can view their current CO balance at all times from the territory tab
- **FR30:** A player can view their estimated weekly income (sum of all revenue sources)
- **FR31:** A player can view a chronological transaction history showing all CO movements (income generations, building costs, colony costs, manual entries)

### Territory Dashboard & Export

- **FR32:** A player can view their complete territory overview (CO balance, estimated income, all tiles with colonies and buildings)
- **FR33:** A player can export their territory overview as markdown text (suitable for sharing on Discord)

### Initial Territory Setup

- **FR34:** A player can enter their current CO balance during initial setup
- **FR35:** A player can add existing tiles with their terrain types during initial setup
- **FR36:** A player can declare existing colonies and buildings on their tiles during initial setup
- **FR37:** A player can review and confirm their complete territory state before finalizing setup

### Chaos Faction — God Consecration

- **FR38:** A Warriors of Chaos or Marauders player must assign a god/cult when founding a village
- **FR39:** The system enforces the rule that a second village dedicated to the same god requires having villages for all other gods first
- **FR40:** The system tracks unit/character slots per god (2 per village, 3 per city)

### Error Correction

- **FR41:** A player can cancel the most recent transaction from the transaction history, restoring the previous CO balance and state. Multiple consecutive cancellations are supported (LIFO — last in, first out).

## Non-Functional Requirements

### Performance

- **NFR1:** Territory dashboard load < 2 seconds on 4G mobile
- **NFR2:** Weekly income calculation (server-side) completes in < 2 seconds
- **NFR3:** Building construction / colony operations (CO deduction + state update) < 500ms
- **NFR4:** Accordion expand/collapse < 100ms (client-side)
- **NFR5:** Transaction history loads < 1 second for up to 200 entries

### Security

- **NFR6:** A player can only modify their own territory data — server-side authorization enforced (consistent with existing army authorization model)
- **NFR7:** CO balance mutations are server-authoritative — no client-side balance manipulation possible
- **NFR8:** UNDO operations validate that the transaction being reversed is indeed the player's most recent transaction (prevent race conditions)

### Reliability

- **NFR9:** Weekly income generation is idempotent — triggering it multiple times for the same week produces the same result (no double-crediting)
- **NFR10:** Transaction history is append-only and serves as audit trail — cancelled transactions are logged as reversal entries, not deleted
- **NFR11:** Initial setup flow can be interrupted and resumed without data loss

### Integration

- **NFR12:** OWB import script correctly identifies faction for all ~15 campaign factions
- **NFR13:** Faction data (colonization rules, buildings, special structures) is maintained as structured configuration, not hardcoded logic — enabling rule updates without code changes
