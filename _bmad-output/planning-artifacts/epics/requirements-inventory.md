# Requirements Inventory

## Functional Requirements

**Faction Data & Detection**

- **FR1:** The system maintains a canonical list of all campaign factions with their colonization rules, available buildings, and special structures.
- **FR2:** The system detects a player's faction from their army data.
- **FR3:** The OWB import script identifies and assigns the correct faction when importing an army.

**Tile Management**

- **FR4:** A player can add a tile to their territory by selecting a terrain type.
- **FR5:** A player can remove a tile from their territory.
- **FR6:** The system displays the base income associated with each terrain type.
- **FR7:** A player can toggle a river plain adjacency flag on river plain tiles (indicating adjacency to another river plain for +20 CO bonus).
- **FR8:** A player can view all their tiles in a collapsible accordion/grid list.

**Colony Management**

- **FR9:** A player can build a village on a tile where their faction allows village construction.
- **FR10:** A player can upgrade a village to a city on a tile where their faction allows city construction.
- **FR11:** The system enforces faction-specific colonization constraints (e.g., Dwarfs only in mountains, Wood Elves only in forests, Chaos Daemons cannot build villages).
- **FR12:** A player whose faction uses alternative structures (Chaos Portals, Ogre Tyrant Hall) can build those instead of standard colonies.
- **FR13:** A player can upgrade faction-specific structures (e.g., Chaos Portal → Major Portal).
- **FR14:** The system deducts the correct CO cost when building or upgrading a colony.
- **FR15:** The system tracks building slots available per colony (1 for village, 3 for city, faction-specific for special structures).

**Building Construction**

- **FR16:** A player can construct a building on a colony that has available building slots.
- **FR17:** The system shows only buildings available to the player's faction and compatible with the tile/colony type.
- **FR18:** The system enforces building construction constraints (slot limits, one upgraded military building per colony, terrain restrictions for mines/sawmills).
- **FR19:** The system deducts the correct CO cost when constructing a building.
- **FR20:** A player can view the rules/effects of each building (informational display).
- **FR21:** The system applies automatic bonuses from colony/tile construction (free farm on agricultural plain village, free menagerie on swamp village, free mine on Dwarf mountain village, etc.).

**CO Economy — Income Generation**

- **FR22:** A player can trigger weekly income generation once per week.
- **FR23:** The system tracks which week the income generation applies to (preventing duplicate generation for the same week).
- **FR24:** The system calculates total weekly income by summing all tile base incomes, building revenues, and faction-specific bonuses.
- **FR25:** The system credits the calculated income to the player's CO balance.

**CO Economy — Manual Entries**

- **FR26:** A player can add a manual expense entry with a label and CO amount.
- **FR27:** A player can add a manual income entry with a label and CO amount.
- **FR28:** Manual entries are immediately reflected in the player's CO balance.

**CO Economy — Balance & History**

- **FR29:** A player can view their current CO balance at all times from the territory tab.
- **FR30:** A player can view their estimated weekly income (sum of all revenue sources).
- **FR31:** A player can view a chronological transaction history showing all CO movements (income generations, building costs, colony costs, manual entries).

**Territory Dashboard & Export**

- **FR32:** A player can view their complete territory overview (CO balance, estimated income, all tiles with colonies and buildings).
- **FR33:** A player can export their territory overview as markdown text (suitable for sharing on Discord).

**Initial Territory Setup**

- **FR34:** A player can enter their current CO balance during initial setup.
- **FR35:** A player can add existing tiles with their terrain types during initial setup.
- **FR36:** A player can declare existing colonies and buildings on their tiles during initial setup.
- **FR37:** A player can review and confirm their complete territory state before finalizing setup.

**Chaos Faction — God Consecration**

- **FR38:** A Warriors of Chaos or Marauders player must assign a god/cult when founding a village.
- **FR39:** The system enforces the rule that a second village dedicated to the same god requires having villages for all other gods first.
- **FR40:** The system tracks unit/character slots per god (2 per village, 3 per city).

**Error Correction**

- **FR41:** A player can cancel the most recent transaction from the transaction history, restoring the previous CO balance and state. Multiple consecutive cancellations are supported (LIFO — last in, first out).

## NonFunctional Requirements

**Performance**

- **NFR1:** Territory dashboard load < 2 seconds on 4G mobile.
- **NFR2:** Weekly income calculation (server-side) completes in < 2 seconds.
- **NFR3:** Building construction / colony operations (CO deduction + state update) < 500ms.
- **NFR4:** Accordion expand/collapse < 100ms (client-side).
- **NFR5:** Transaction history loads < 1 second for up to 200 entries.

**Security**

- **NFR6:** A player can only modify their own territory data — server-side authorization enforced (consistent with existing army authorization model).
- **NFR7:** CO balance mutations are server-authoritative — no client-side balance manipulation possible.
- **NFR8:** UNDO operations validate that the transaction being reversed is indeed the player's most recent transaction (prevent race conditions).

**Reliability**

- **NFR9:** Weekly income generation is idempotent — triggering it multiple times for the same week produces the same result (no double-crediting).
- **NFR10:** Transaction history is append-only and serves as audit trail — cancelled transactions are logged as reversal entries, not deleted.
- **NFR11:** Initial setup flow can be interrupted and resumed without data loss.

**Integration**

- **NFR12:** OWB import script correctly identifies faction for all 18 campaign factions.
- **NFR13:** Faction data (colonization rules, buildings, special structures) is maintained as structured configuration, not hardcoded logic — enabling rule updates without code changes.

## Additional Requirements

**Starter Template:** None needed. The Territory Module extends the existing Campaign TOW codebase (TanStack Start + Drizzle + PostgreSQL + shadcn/ui + Tailwind v4). No new scaffolding — direct extension of the established stack per `starter-template-evaluation.md`.

**Database & Data Model (from Architecture):**

- 7 new DB tables to add via Drizzle migration: `factions`, `campaign_settings`, `player_territories`, `tiles`, `colonies`, `buildings`, `co_transactions`.
- Migration must backfill `armies.faction` column (free text → FK to `factions.id`), ensuring all existing armies map to canonical faction identifiers.
- `co_transactions` is append-only — reversal entries are inserted, never deletes.
- Transaction type enum values: `income_generation`, `colony_construction`, `colony_upgrade`, `building_construction`, `manual_expense`, `manual_income`, `reversal`.
- Buildings have both `tile_id` (required) and `colony_id` (nullable, e.g., mines/sawmills without colony). Integrity: when `colony_id` is set, colony must belong to same tile (DB CHECK preferred, app-level guard fallback).

**Faction Rule Engine (from Architecture):**

- Single TypeScript module `src/lib/faction-config.ts` exporting `FACTION_CONFIGS: Record<string, FactionConfig>`.
- Shared between server (validation) and client (UX filtering). Server MUST re-validate every mutation even if client already filters.
- All 18 factions must be defined before module launch — partial support breaks adoption.
- `FactionConfig` interface is fixed — any extension requires architectural discussion.

**CO Ledger Atomicity (from Architecture):**

- Every CO-mutating operation uses the shared `withCoTransaction(tx, ...)` utility inside a `db.transaction()`.
- Utility signature takes a `DrizzleTransaction` — never global `db`. Prevents nested transaction errors.
- Four atomic steps per CO mutation: balance check → entity mutation → `co_transactions` insert → `player_territories.co_balance` update.
- `co_balance` is NEVER updated directly outside `withCoTransaction`.

**Campaign Week Mechanism (from Architecture):**

- `campaign_settings` table holds `campaign_week` (integer, starts at 1).
- VPS cron job (Sundays 00:01): `curl POST /api/cron/increment-week` with `Authorization: Bearer $CRON_SECRET`.
- Server endpoint at `src/routes/api/cron/increment-week.ts` validates `CRON_SECRET` env var, increments week by 1.
- Income generation permitted when `player_territories.last_income_week < campaign_settings.campaign_week`. Player can catch up missed weeks by repeated triggers.

**UNDO Mechanism (from Architecture, supports FR41):**

- Single `cancelTransactionFn` handles all reversal types: `building_construction`, `colony_construction`, `colony_upgrade`, `income_generation`, `manual_expense`, `manual_income`.
- `reversal` transactions are not themselves cancellable.
- Cancel operation runs in a serializable-isolation `db.transaction()` to prevent race conditions between concurrent cancels.

**API & Server Functions (from Architecture):**

- Three server function files: `src/server-fns/territory-queries.ts`, `territory-mutations.ts`, `territory-economy.ts` (~15 functions total).
- All use `authMiddleware`. No new `territoryOwnerMiddleware` — ownership is implicit via `session.playerId` (1:1 with `player_territories`).
- All functions return `ServerResult<T>` pattern (consistent with existing codebase).
- Territory-specific error codes: `BAD_REQUEST` (insufficient balance, no slots, non-cancellable), `CONFLICT` (income already generated this week), `FORBIDDEN` (faction forbids action), `NOT_FOUND` (territory not initialized).

**Frontend Architecture (from Architecture):**

- Single route `src/routes/territories.tsx` with explicit Zod `validateSearch`: `{ tile?: string, view: 'grid'|'history' default 'grid', setup?: number }`.
- TanStack Query keys: `['territory', playerId]` (30s stale), `['territory-history', playerId]` (30s stale), `['campaign-week']` (5 min stale). Add constants to `src/lib/query-constants.ts`.
- After every CO mutation, invalidate both `['territory', playerId]` and `['territory-history', playerId]`.
- Technology priority rule: TanStack-first for state (search params > Query > Form > React state); Tailwind classes only (no inline CSS); shadcn/ui primitives first.

**Data Access Boundaries (from Architecture):**

- All DB access through `src/db/queries/territory.ts` — server functions never import Drizzle tables directly.
- Pure logic lives in `src/lib/territory-income.ts` (income calculation) and `src/lib/territory-export.ts` (markdown export) — no DB imports.
- Zod validators centralized in `src/lib/validators/territory.ts`.

**Testing Strategy (from Architecture):**

- Unit tests for pure logic: income calculation (truth tables via `it.each`), faction config validation (`describe.each` over 18 factions × terrains × buildings), automatic free buildings, UNDO reversal logic per type.
- Two integration tests against real PostgreSQL: `cancelTransactionFn` LIFO ordering, `generateWeeklyIncomeFn` idempotency at SQL level.
- Server function handlers not directly unit-testable — extract business logic to pure functions and test those.

**Integration Requirements:**

- OWB import script must detect and assign the correct faction for all 18 campaign factions (from free-text parsing to canonical faction ID).
- Migration must backfill `armies.faction` for existing armies without data loss.

## UX Design Requirements

**Layout & Visual Structure**

- **UX-DR1:** Implement 2-column grid layout (`grid-template-columns: 1fr 1fr`) for tile cards, contained within the existing `max-width: 720px` centered container.
- **UX-DR2:** Expanded tile spans full width (`grid-column: 1 / -1`) and pushes other tiles down, preserving in-place expand pattern.
- **UX-DR3:** Implement sticky `CoBanner` positioned below the existing AppHeader, using `--color-brand-dark` (#1e293b) background with white text. Must not stack unexpectedly with AppHeader sticky positioning.
- **UX-DR4:** Add terrain-type color strip at top of each `TileCard` for visual encoding (faster scanning before reading label).
- **UX-DR5:** Display slot-dot indicators on collapsed tiles showing building capacity (filled = occupied, empty = available).
- **UX-DR6:** Reference mockup `_bmad-output/planning-artifacts/ux-mockup-territory-B.html` for visual fidelity.

**Custom Components (must all be implemented at MVP)**

- **UX-DR7:** Build `CoBanner` — sticky banner with CO balance (large), estimated weekly income (secondary), "Générer le revenu" button, "Hist." toggle. States: normal | income-already-generated (disabled + ✓) | history-active (toggle ON, grid replaced by transaction list). `aria-live="polite"` on balance for dynamic updates.
- **UX-DR8:** Build `TileCard` — collapsed shows terrain strip, name (Cinzel), terrain type, revenue badge, colony indicator, slot dots. Expanded shows terrain info, colony section with upgrade button, building list with free slots, river-adjacency toggle (river plains only). Variants: standard, faction-specific (chaos portal, tyrant hall), empty-tile.
- **UX-DR9:** Build `BuildingSlot` — displays occupied (name, revenue/effect, version base/upgraded) or available ("+" button with "Construire" label) or no-slots (no button, just list).
- **UX-DR10:** Build `BuildingOption` — row in construction Sheet with building name (Cinzel), short description, CO cost badge, "Faction" label for faction buildings. States: affordable | too-expensive (muted, not tappable).
- **UX-DR11:** Build `TransactionEntry` — row in history with type icon (income/construction/manual), label, amount signed & colored (bonus green / malus red / neutral), date. Variants: income, expense, neutral.
- **UX-DR12:** Build `IncomeBreakdown` — temporary expansion or Sheet showing line-by-line income sources (tile → amount, building → amount), total, week number, displayed after income generation.
- **UX-DR13:** Build `TerritorySetupWizard` — multi-step wizard in `src/components/territory/territory-setup-wizard/` (reducer + phases pattern matching existing `post-match-wizard/`). Phases: `phase-balance` → `phase-tiles` → `phase-buildings` → `phase-summary`. Back/forward navigation. Must support interruption and resumption (NFR11).

**Interaction Patterns**

- **UX-DR14:** Every CO-deducting action (build colony, upgrade, build building, manual expense) goes through an `AlertDialog` confirmation showing amount and balance-after.
- **UX-DR15:** Building construction uses bottom `Sheet` (shadcn) with faction-filtered building list. Manual CO entries and tile addition also use bottom Sheets.
- **UX-DR16:** Setup wizard uses centered `Dialog` (not Sheet) with buttons-only dismissal (no accidental dismissal).
- **UX-DR17:** Tile expand triggered by `?tile=uuid` search param. On expand, `TileCard` must call `scrollIntoView({ behavior: 'smooth', block: 'start' })` via ref + useEffect to avoid off-screen expansion on mobile.
- **UX-DR18:** History toggle in CoBanner switches grid view ↔ transaction history view via `?view=grid|history` search param — no page navigation, no separate route.
- **UX-DR19:** Invalid faction options are completely hidden (absent from UI), never greyed out — "prevent, don't punish" principle.
- **UX-DR20:** Insufficient balance disables the confirm button with muted text "Solde insuffisant (besoin : X CO)".
- **UX-DR21:** Successful CO mutation shows localized loading (spinner/skeleton on balance amount via TanStack Query `isFetching`) — never full-page reload or global loading state.

**Feedback & States**

- **UX-DR22:** Server errors display as red toast (3s) at bottom.
- **UX-DR23:** Blocked actions (e.g., income already generated) display via existing `blockToast` pattern (navy toast, 3s) with message "Revenu déjà généré cette semaine".
- **UX-DR24:** Empty state (first visit, no territories): sober illustration + "Configurer mes territoires" primary CTA button that launches `TerritorySetupWizard`.
- **UX-DR25:** Empty tile: muted "Pas de colonie" + "Construire un village" button when faction allows.
- **UX-DR26:** All slots occupied: no "+" button, only building list.
- **UX-DR27:** Loading state: "Chargement…" centered text (existing app pattern).
- **UX-DR28:** Empty history: "Aucune transaction" centered, muted text.

**Forms & Inputs**

- **UX-DR29:** All forms use TanStack Form + Zod (Standard Schema, no adapter). Server-side Zod is source of truth; client-side provides immediate feedback.
- **UX-DR30:** Terrain type selection uses shadcn `Select` (8 terrain options). Building selection uses Sheet with `BuildingOption` rows (richer than Select for cost/description).
- **UX-DR31:** River plain adjacency uses shadcn `Switch` (boolean toggle).
- **UX-DR32:** CO amount inputs are `Input type="number"` with `min=1`, no decimals.

**Accessibility**

- **UX-DR33:** All tap/touch targets must be ≥ 44px.
- **UX-DR34:** Bonus/malus information is never color-only — always accompanied by a sign (+/−) or text label.
- **UX-DR35:** `aria-expanded` set correctly on tile grid items.
- **UX-DR36:** Slot-dot indicators must expose hidden text labels for screen readers (e.g., "2 bâtiments sur 3 emplacements").
- **UX-DR37:** Focus rings follow existing convention (`.nav-btn-brand:focus-visible`). Keyboard navigation operates on all buttons.
- **UX-DR38:** Maintain contrast ratios: primary text (#171310 on #f1eade) >7:1 (AAA), secondary text (#6b5f52 on #fffbf5) ~4.7:1 (AA).

**Responsive**

- **UX-DR39:** Mobile-first design targeting 375px. No custom breakpoints — the `max-width: 720px` container handles mobile → desktop.
- **UX-DR40:** 2-column grid stays 2 columns at all container widths. Edge case: grid may collapse to 1 column below 340px (marginal).

**E2E Testing Integration**

- **UX-DR41:** E2E hydration pattern (existing convention via `__reactFiber` keys) must be applied to `territories.tsx` route, consistent with all other routes in the app.

## FR Coverage Map

- **FR1:** Epic 1 — Canonical faction list (DB table + TypeScript config module)
- **FR2:** Epic 1 — Faction detection from existing army data
- **FR3:** Epic 1 — OWB import script faction assignment
- **FR4:** Epic 2 — Add tile with terrain type selection
- **FR5:** Epic 2 — Remove tile from territory
- **FR6:** Epic 2 — Display base income per terrain type
- **FR7:** Epic 2 — River plain adjacency toggle (+20 CO bonus flag)
- **FR8:** Epic 2 — Collapsible/grid tile list view
- **FR9:** Epic 3 — Build village on faction-allowed tile
- **FR10:** Epic 3 — Upgrade village to city
- **FR11:** Epic 3 — Faction-specific colonization constraints enforced
- **FR12:** Epic 3 — Alternative faction structures (Chaos Portals, Ogre Tyrant Hall)
- **FR13:** Epic 3 — Upgrade faction-specific structures (Portal → Major Portal)
- **FR14:** Epic 3 — CO deduction on colony construction/upgrade (introduces `withCoTransaction`)
- **FR15:** Epic 3 — Building slot tracking per colony type
- **FR16:** Epic 4 — Construct building on colony with available slots
- **FR17:** Epic 4 — Faction + tile-type filtered building availability
- **FR18:** Epic 4 — Building construction constraints (slot limits, upgraded military, terrain restrictions)
- **FR19:** Epic 4 — CO deduction on building construction
- **FR20:** Epic 4 — Informational display of building rules/effects
- **FR21:** Epic 4 — Automatic free building bonuses (farm, menagerie, mine)
- **FR22:** Epic 5 — Weekly income generation trigger
- **FR23:** Epic 5 — Week tracking for idempotent income generation
- **FR24:** Epic 5 — Income calculation aggregating tiles + buildings + faction bonuses
- **FR25:** Epic 5 — Credit calculated income to CO balance
- **FR26:** Epic 5 — Manual expense entry (label + amount)
- **FR27:** Epic 5 — Manual income entry (label + amount)
- **FR28:** Epic 5 — Manual entries reflected immediately in balance
- **FR29:** Epic 1 — View CO balance at all times (shell in Epic 1, populated by later epics)
- **FR30:** Epic 5 — View estimated weekly income (sum of all revenue sources)
- **FR31:** Epic 6 — Chronological transaction history view
- **FR32:** Epic 1 — Complete territory overview dashboard (shell in Epic 1)
- **FR33:** Epic 6 — Export territory overview as markdown (Discord sharing)
- **FR34:** Epic 7 — Enter current CO balance during initial setup
- **FR35:** Epic 7 — Add existing tiles with terrain types during setup
- **FR36:** Epic 7 — Declare existing colonies and buildings during setup
- **FR37:** Epic 7 — Review and confirm complete territory state before finalizing
- **FR38:** Epic 3 — Chaos god/cult assignment on village founding
- **FR39:** Epic 3 — God diversity rule enforcement (second village same god requires all others)
- **FR40:** Epic 3 — Unit/character slots tracking per god (2/village, 3/city)
- **FR41:** Epic 6 — LIFO transaction cancellation with state rollback
