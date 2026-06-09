# Epic List

## Epic 1: Territory Foundation & Faction Recognition

A player opening the "Territoires" tab for the first time sees a personalized dashboard — the app recognizes their faction from their existing army data, displays their current CO balance (zero or populated), and offers a path to setup. This epic establishes all technical foundations for the module: DB migration (7 new tables + backfill `armies.faction` FK to the new `factions` table), the canonical faction config TypeScript module covering all 15 campaign factions, the `/territories` route with explicit `validateSearch` Zod schema, a minimal `CoBanner` sticky component, and the empty-state view with a "Configurer mes territoires" CTA placeholder. The OWB import script is updated to detect and assign the correct faction for every incoming army. After this epic, the territory module is technically alive: the route loads, the dashboard renders, the player's faction is known server-side and client-side, and all subsequent epics can build upon a stable foundation.

**FRs covered:** FR1, FR2, FR3, FR29 (shell), FR32 (shell)

## Epic 2: Tile Management

A player can add, name, view, and remove tiles from their territory, selecting terrain type from the 8 canonical options (port, plaines, plaine agricole, lisière forestière, montagnes, forêt, plaine fluviale, marais). River plain tiles expose an adjacency toggle (+20 CO bonus flag). The 2-column grid renders all owned tiles with terrain-colored strips for fast visual scanning, displays base income per terrain, and shows empty slot-dot indicators (no colony built yet). Tile addition uses a bottom Sheet with terrain selection; removal uses an AlertDialog confirmation. No CO mutations happen at this stage — tiles are free (claimed via matches in the tactical layer, not purchased). After this epic, a player can populate their grid with their owned tiles and see the shape of their empire, even though colonies and buildings don't exist yet.

**FRs covered:** FR4, FR5, FR6, FR7, FR8

## Epic 3: Colony Management (Faction-Aware)

A player can found colonies on their tiles — standard villages and cities for most factions, or faction-specific alternative structures for factions that don't use classical colonies (Chaos Portals for Daemons of Chaos, Tyrant Hall for Ogres, etc.). Colonies can be upgraded (village → city, Portal → Major Portal) with CO cost and structural effects (more slots, more income, more army points). The app enforces faction colonization constraints through filtering (invalid options are absent, never greyed out): a Dwarf player only sees colonization options on mountain tiles, a Wood Elf player only on forest tiles, a Chaos Daemon player never sees "Build village" at all. Warriors of Chaos and Marauders players founding a village must assign it to a specific god, and the system enforces the diversity rule (a second village dedicated to the same god requires villages for all other gods first). Unit/character slots per god are tracked (2 per village, 3 per city). This epic **introduces the `withCoTransaction` shared utility** — the first CO-mutating flow of the module — establishing the atomicity pattern (DB transaction → balance check → entity mutation → `co_transactions` insert → `player_territories.co_balance` update) that all subsequent epics will reuse.

**FRs covered:** FR9, FR10, FR11, FR12, FR13, FR14, FR15, FR38, FR39, FR40

## Epic 4: Building Construction & Faction Buildings

A player can construct buildings on their colonies, filling available slots (1 for village, 3 for city, faction-specific for special structures). The construction Sheet shows only buildings valid for the player's faction and compatible with the tile/colony type — a Bretonnian in a city sees the Manoir Seigneurial, a Dwarf sees upgraded forge options, a Chaos Daemon sees only military buildings, wizard tower, and menagerie. CO deduction happens atomically through `withCoTransaction`. Special construction constraints are enforced: one upgraded military building per colony, mines only on mountain tiles, sawmills only on forest tiles. Automatic free building bonuses are applied when the trigger condition is met: founding a village on an agricultural plain includes a free farm, founding a village on a swamp includes a free menagerie, founding a Dwarf village in a mountain includes a free mine. Players can view the rules/effects of each building before confirming construction. After this epic, the tactical economy (colony → slot → building → effect) is fully playable.

**FRs covered:** FR16, FR17, FR18, FR19, FR20, FR21

## Epic 5: CO Economy — Weekly Income & Manual Entries

A player can trigger weekly income generation in a single tap from the `CoBanner`. The server calculates total income by aggregating all tile base incomes, building revenues, faction-specific bonuses (Chaos Portal output, Dwarf mine upgrades, Dark Elf slave markets, etc.), credits the result to the balance atomically, and displays a line-by-line `IncomeBreakdown` (tile → amount, building → amount, total, week number). Income generation is idempotent per campaign week: the player cannot double-credit themselves for the same week, but can catch up on missed weeks by triggering multiple times. The campaign week is driven by a VPS cron job (Sundays 00:01) calling the new `/api/cron/increment-week` endpoint protected by `CRON_SECRET`. Players can also add manual entries — expenses (unit purchases, narrative costs) or income (campaign bonuses, GM rewards) — with a label and amount, immediately reflected in the balance via `withCoTransaction`. The CoBanner exposes the estimated weekly income ("+125 CO/semaine") as a preview. After this epic, the CO loop is complete: players earn, spend, and track their economy entirely in-app.

**FRs covered:** FR22, FR23, FR24, FR25, FR26, FR27, FR28, FR30

## Epic 6: Transaction History, UNDO & Discord Export

A player can review every CO movement of their territory in a chronological transaction history, accessed via the "Hist." toggle in the `CoBanner` (no page navigation — the grid is replaced by the transaction list via `?view=history` search param). Each `TransactionEntry` row shows the type icon, label, amount signed and colored (green for income, red for expense), and date. If the player makes a mistake — wrong building, wrong income amount — they can cancel the most recent transaction via the UNDO mechanism: a single `cancelTransactionFn` reads the latest transaction type and applies the appropriate reversal (delete building + re-credit, delete colony + re-credit, downgrade city → village, debit income + decrement `last_income_week`, etc.), running in a serializable-isolation DB transaction to prevent race conditions. Multiple consecutive cancellations work LIFO-style. Reversal entries are logged (append-only ledger) — never deleted. Finally, players can export their complete territory overview as markdown (formatted tile list with colonies and buildings, CO balance, estimated income) suitable for pasting into Discord. After this epic, players have full audit, correction, and sharing capabilities.

**FRs covered:** FR31, FR33, FR41

## Epic 7: Mid-Campaign Initial Setup Wizard

A player joining the territory module mid-campaign (after several weeks of tactical play) can bootstrap their existing state — tiles they already own, colonies already built, buildings already constructed, and the CO balance they've been tracking on paper — through a guided multi-step wizard. The wizard uses the same `Dialog`-based pattern as the existing `post-match-wizard` (reducer + phases): Phase 1 captures the current CO balance, Phase 2 is a loop for adding existing tiles with terrain type and name, Phase 3 lets the player declare which tiles have colonies and what buildings are already constructed on them, Phase 4 presents a complete summary of tiles/colonies/buildings/balance for review before final confirmation. The wizard is interruptible and resumable (NFR11) — progress persists if the player closes the app mid-setup. Once confirmed, the dashboard populates and the wizard disappears. The wizard calls the existing server functions from Epics 2-5 (tile, colony, building, manual CO entry) — this is pure UX composition over established endpoints, with the addition of a dedicated `setupTerritoryFn` that marks `player_territories.setup_completed_at`. After this epic, every active campaign player can onboard into the module regardless of their starting state.

**FRs covered:** FR34, FR35, FR36, FR37

---
