# Epic 4: Building Construction & Faction Buildings

A player can construct buildings on their colonies, filling available slots. The construction Sheet shows only buildings valid for the player's faction and compatible with the tile/colony type. CO deduction happens atomically through `withCoTransaction`. Constraints are enforced (one upgraded military per colony, terrain restrictions, no duplicates in cities). Automatic free buildings are applied when colonies are founded on specific terrains. Players can view building rules/effects before construction.

## Story 4.1: DB Migration — `buildings` Table + Integrity Constraints

As a developer,
I want the `buildings` table to exist with correct columns, enums, FKs, and integrity constraints (including the double-FK rule that `colony_id`, when set, must belong to the same tile as `tile_id`),
So that buildings can be stored consistently and silent data corruption is impossible.

**Acceptance Criteria:**

**Given** the migration baseline after Epic 3
**When** the Drizzle migration for Story 4.1 runs
**Then** a new `buildings` table exists with columns: `id` (text PK, UUID), `tile_id` (text, FK to `tiles.id`, NOT NULL), `colony_id` (text, FK to `colonies.id`, NULLABLE), `type` (text with CHECK constraint matching the full `BuildingId` enum from `building-catalog.ts`), `variant` (text, nullable, CHECK `IN ('base', 'upgraded')` — used only for military buildings), `level` (integer, nullable — used only for Wizard Tower 1/2/3 and Comptoir Mercenaires 1/2/3), `is_free` (boolean, NOT NULL, default `false`), `created_at` (timestamp, default now)
**And** both FKs use `ON DELETE CASCADE` — removing a tile cascades to its buildings; removing a colony cascades to its colony-bound buildings
**And** indexes exist on `(tile_id)` and `(colony_id)` for fast lookups during dashboard/income queries

**Given** the double-FK integrity rule (when `colony_id` is set, the colony must belong to the same tile as `tile_id`)
**When** the migration and codebase are inspected
**Then** the constraint is enforced at the DB level via a CHECK constraint using a sub-select if Drizzle/PostgreSQL supports it in this codebase
**And** if a DB-level CHECK is not feasible, every `buildBuildingFn` handler (Story 4.2) contains an explicit application-level guard: `assert(colony.tileId === data.tileId)` before the insert, with a unit test asserting the guard rejects a malformed payload
**And** the enforcement approach (DB vs. app) is documented in a code comment in the migration file and in `src/db/queries/territory.ts`

**Given** the Drizzle schema file
**When** inspected after the migration
**Then** a `buildings` pgTable declaration matches the DB structure
**And** relations are wired: `buildings → tile`, `buildings → colony` (nullable)
**And** no other tables (`campaign_settings`, etc.) are created by this migration — only `buildings`

---

## Story 4.2: Building Catalog + `buildBuildingFn` Server Function

As a player,
I want a server function that validates every building construction attempt against faction rules, terrain rules, colony rules, slot availability, quota of upgraded military buildings, no-duplicate rule in cities, and my CO balance — then atomically inserts the building and deducts the cost,
So that the building construction flow is secure, consistent, and reuses the battle-tested `withCoTransaction` pattern.

**Acceptance Criteria:**

**Given** the architecture rule that faction rules are data-driven
**When** Story 4.2 is complete
**Then** a new pure module `src/lib/building-catalog.ts` exports `BUILDING_CATALOG: Record<BuildingId, BuildingDef>` covering every building from `docs/territory_rule.md` and `docs/faction_rule.md`
**And** each `BuildingDef` contains: `id`, `displayName` (French), `description` (French, short — used in `BuildingOption`), `detailedRules` (French, long — used in rules Sheet), `baseCost` (CO), `revenue` (CO per week, 0 if non-income), `slotConsumption` (integer — how many slots it occupies), `terrainRestrictions` (array of `TerrainType`, empty = all), `colonyTypeRestrictions` (array: `village`, `city`, both, or `none` for terrain-only buildings like mine/sawmill), `isFactionBuilding` (boolean), `isMilitary` (boolean), `hasVariants` (boolean — true for military base/upgraded), `hasLevels` (boolean — true for Wizard Tower and Comptoir), `variants` (nullable record of `{ base: { cost, slotConsumption, ... }, upgraded: { cost, slotConsumption, ... } }`)
**And** the module is pure — no DB imports, no side effects
**And** `FACTION_CONFIGS[factionId].availableBuildings` references `BuildingId` values from this catalog — any reference to an undefined building throws a compile-time TypeScript error

**Given** the building catalog
**When** I run `pnpm vitest src/lib/__tests__/building-catalog.test.ts`
**Then** a test asserts every entry has non-empty `displayName` and `description`
**And** a test asserts the sum of costs for Wizard Tower levels matches 80 + 160 + 300 = 540 CO
**And** a test asserts that faction-specific buildings (Manoir Seigneurial, Ancienne Crypte, Autel de la Dame, etc.) exist in the catalog and are marked `isFactionBuilding = true`
**And** a test asserts scierie has `terrainRestrictions = ['foret']`, mine has `['montagnes']`

**Given** `src/lib/validators/territory.ts`
**When** Story 4.2 is complete
**Then** it exports `buildBuildingSchema` requiring `tileId` (UUID), `colonyId` (UUID or null — null when building directly on terrain like mine/sawmill), `buildingType` (BuildingId enum), and optional `variant` ('base' | 'upgraded') for military buildings

**Given** `src/server-fns/territory-mutations.ts`
**When** Story 4.2 is complete
**Then** it exports `buildBuildingFn` using `authMiddleware`, returning `ServerResult<{ buildingId }>`
**And** the handler enforces inside a single `db.transaction()` the following validation sequence (each step rejects with the appropriate `code` and French `message` on failure):
  1. Fetch tile, verify ownership via `session.playerId` → `FORBIDDEN`
  2. If `colonyId` provided, fetch colony, verify `colony.tile_id === tileId` (app-level guard for double-FK integrity) → `BAD_REQUEST`
  3. Resolve player faction, look up `BUILDING_CATALOG[buildingType]` and `FACTION_CONFIGS[factionId]`, verify `buildingType` is in `availableBuildings` → `FORBIDDEN`
  4. Verify `terrainRestrictions` (if any) include the tile's terrain → `FORBIDDEN`
  5. Verify `colonyTypeRestrictions`: if catalog says "requires village+"→ colony must exist with matching type; if "terrain-only" (mine/sawmill) → `colonyId` must be null and tile terrain must match → `BAD_REQUEST` or `FORBIDDEN`
  6. Compute current slot usage for the colony (sum of `slotConsumption` over existing non-free buildings on this colony) and verify `slotsUsed + newSlotConsumption <= colonySlotCapacity` → `BAD_REQUEST` "Emplacements insuffisants"
  7. Enforce "one upgraded military per colony": if `BUILDING_CATALOG[buildingType].isMilitary && variant === 'upgraded'`, verify no existing building in this colony has `isMilitary && variant === 'upgraded'` → `BAD_REQUEST` "Un seul bâtiment militaire amélioré par colonie"
  8. Enforce no-duplicate rule in cities: if the colony is a city, verify no existing building of the same `type` is already on it → `BAD_REQUEST` "Pas de doublon de bâtiments dans une ville"
  9. Compute the effective cost (base catalog cost OR `variant.cost` for military variants), verify balance → `BAD_REQUEST` "Solde insuffisant (besoin : X CO)"
  10. Insert the building row with `is_free = false`
  11. Call `withCoTransaction(tx, playerTerritoryId, 'building_construction', -cost, label, { type: 'building', id: newBuildingId })`

**Given** integration tests against a real test PostgreSQL DB
**When** `pnpm vitest` runs
**Then** `it.each` tests cover at least: a Bretonnian building a Manoir Seigneurial in a city (happy path), a Dwarf building a mine directly on a mountain tile with `colonyId = null` (terrain-only happy path), a Wood Elf attempting a sawmill on a plains tile (terrain rejection), a player attempting an upgraded Caserne when one already exists (quota rejection), a Bretonnian attempting a duplicate building in a city (rejection), a player with `co_balance = 10` attempting any construction (insufficient balance)
**And** a test asserts the double-FK integrity guard rejects a payload where `colonyId` points to a colony belonging to a different tile — expect `BAD_REQUEST`
**And** all `co_transactions` rows inserted by these tests have `type='building_construction'` and negative `amount`

---

## Story 4.3: `BuildingSlot` + `BuildingOption` Components + Construction Sheet + Rules Display

As a player,
I want to see empty/occupied slots on my colonies and tap a "+" to open a bottom Sheet with a faction-filtered list of buildings (cost + description + rules access) so I can build from the expanded tile view,
So that I construct buildings with full visibility of my options and their effects.

**Acceptance Criteria:**

**Given** the `TileCard` expanded view from Epic 3 (colony section rendered)
**When** Story 4.3 is complete
**Then** a new `BuildingSlot` component (`src/components/territory/BuildingSlot.tsx`) renders one slot at a time
**And** the colony section lays out slots using the count from `getColonySlotCapacity(colony, factionConfig)` (pure helper, reuses work from Story 3.4)
**And** each occupied slot renders the building's `displayName` (Cinzel), a compact revenue/effect badge (e.g., "+20 CO" for farm, "1 unité spéciale infanterie" for Caserne base), and a muted indicator for military variant (`base` vs `upgraded`)
**And** each free slot (empty, available) renders a dashed border card with a centered "+" icon and label "Construire" and role `button`, tap target ≥ 44px
**And** when all slots are occupied, no "+" slot is rendered — only the building list (UX-DR26)
**And** free buildings (`is_free = true` from Story 4.4) render with a small "Gratuit" badge and are displayed above/alongside the slot-consuming buildings — they do NOT count against slot capacity

**Given** the player taps a "+" empty slot on a village or city colony
**When** the tap fires
**Then** the route navigates with `?tile=<tileId>&building=<slotPosition>` (or an equivalent state update — to be decided in implementation, but NOT stored in React state alone so it's deep-linkable)
**And** a shadcn bottom `Sheet` opens with a title "Construire un bâtiment"
**And** the Sheet content is a scrollable list of `BuildingOption` rows (`src/components/territory/BuildingOption.tsx`)
**And** the list is filtered by calling a new pure helper `getAvailableBuildings(factionConfig, catalog, tile, colony, existingBuildings)` that returns only buildings passing faction, terrain, colony type, quota, no-duplicate, and slot-capacity rules — matching exactly the server-side validation in Story 4.2 (client filters for UX; server re-validates for security)
**And** each `BuildingOption` renders: `displayName` (Cinzel), `description` (short French), a CO cost badge, a "Faction" label if `isFactionBuilding`, and a "Voir les règles" ghost button
**And** `BuildingOption`s where cost > current balance render with muted text and are not tappable — helper text "Solde insuffisant" visible inline (UX-DR20)

**Given** the player taps an affordable `BuildingOption`
**When** the tap fires
**Then** an `AlertDialog` opens: "Construire {displayName} pour {cost} CO ?" with "Solde après : X CO", primary "Confirmer", secondary "Annuler"
**And** for military buildings with variants, the Sheet shows TWO separate `BuildingOption` rows — one for `base` and one for `upgraded` — each with its own cost and description
**And** on "Confirmer", `buildBuildingFn` is invoked with the correct payload (including `variant` for military)
**And** the CoBanner shows localized loading during the mutation
**And** on success, the query is invalidated, the Sheet closes, the expanded `TileCard` re-renders with the new building in its slot, CoBanner balance updates, toast "Bâtiment construit"
**And** on server error, red toast displays the error message and the Sheet remains open

**Given** a rules-display flow
**When** the player taps "Voir les règles" on a `BuildingOption` (or taps an occupied `BuildingSlot` to inspect)
**Then** a secondary shadcn `Sheet` (or nested `Dialog`) opens displaying `detailedRules` from the catalog — full French text, scrollable, with the building's `displayName` as title and `baseCost` / `revenue` as a compact summary
**And** closing this rules Sheet returns to the construction Sheet (or the expanded TileCard)

**Given** a Playwright e2e test
**When** the test runs (with a seeded Bretonnian player with a village and 300 CO)
**Then** it expands a tile, taps "+", selects a building, confirms, and asserts the new building appears in the slot
**And** a screen-reader audit via test asserts that slot dots have a hidden label "X bâtiments sur Y emplacements" (UX-DR36)

---

## Story 4.4: Automatic Free Buildings on Colony Founding (FR21)

As a player whose faction or terrain grants automatic free buildings on village founding,
I want those free buildings to be created the instant I found the village, marked as free (no slot consumption, no CO cost),
So that the rules are applied transparently and I never need to manually "claim" my free buildings.

**Acceptance Criteria:**

**Given** `FACTION_CONFIGS` and the building catalog from Stories 1.2 and 4.2
**When** Story 4.4 is complete
**Then** `FACTION_CONFIGS` is verified to include an `automaticBuildings` field (already in the interface per architecture) populated with the free-building rules from `docs/territory_rule.md` and `docs/faction_rule.md`:
  - Any faction founding a village on `plaine_agricole` → free `ferme`
  - Any faction founding a village on `marais` → free `menagerie` (base level)
  - `dwarfen-mountain-holds` founding a village on `montagnes` → free `mine` (if any Dwarf village rule applies per `docs/faction_rule.md`)
  - Any other faction-specific automatic buildings declared in the source docs
**And** the shape matches the `FactionConfig.automaticBuildings: Array<{ terrain, building, colonyType }>` interface from the architecture doc

**Given** `buildColonyFn` from Story 3.3 (and Story 3.4 for city upgrades)
**When** Story 4.4 is complete
**Then** after inserting the new village colony and before calling `withCoTransaction` for the colony cost, the handler queries `FACTION_CONFIGS[factionId].automaticBuildings` AND a global rule set (e.g., `GLOBAL_AUTOMATIC_BUILDINGS` from the building catalog — for terrain-based rules that apply to all factions like ferme/ménagerie)
**And** for each matching rule (same terrain + same colony type), it inserts a new `buildings` row with `type = rule.building`, `tile_id = newColony.tileId`, `colony_id = newColony.id`, `is_free = true`, `variant` and `level` set to base/null as appropriate
**And** no `co_transactions` row is created for these free buildings — they are zero-cost events, not CO mutations
**And** the entire operation (village insert + free buildings insert + colony CO debit) remains atomic inside the single `db.transaction()`

**Given** slot capacity calculation in `BuildingSlot` / `getColonySlotCapacity` helpers
**When** free buildings exist on a colony
**Then** they are excluded from slot consumption — the player sees the free building displayed but the slot count does NOT decrease because of it
**And** the query to compute slot usage filters `WHERE is_free = false`
**And** a unit test for the slot-usage helper asserts that a village with one free farm and zero other buildings has slot usage = 0, not 1

**Given** integration tests
**When** they run
**Then** a Bretonnian founding a village on `plaine_agricole` results in a `colonies` row AND a free `ferme` `buildings` row in the same transaction (`is_free = true`), with 1 slot still available
**And** a player of any village-capable faction founding on `marais` results in a free `menagerie` with appropriate level
**And** a Dwarf founding a mountain village (if allowed by Dwarf rules) results in a free mine
**And** a Bretonnian founding a village on `plaines` (no automatic rule) results in no free buildings — only the colony row
**And** a test asserts that FR21 free buildings do NOT generate `co_transactions` rows

**Given** the dashboard query `loadTerritoryDashboardFn`
**When** it returns colonies and buildings
**Then** the response includes free buildings in the `buildings` list with `isFree: true` flagged for the client
**And** the `BuildingSlot` rendering from Story 4.3 uses this flag to show the "Gratuit" badge

---

## Story 4.5: Multi-Level Buildings — Wizard Tower + Comptoir Mercenaires

As a player,
I want to construct multi-level buildings (Wizard Tower 1/2/3, Comptoir Mercenaires 1/2/3) with sequential prerequisites for the Wizard Tower and flexible-cost construction for the Comptoir,
So that I can invest in my colonies' magical and mercenary capacity exactly per the rules.

**Acceptance Criteria:**

**Given** the building catalog from Story 4.2
**When** Story 4.5 is complete
**Then** `BUILDING_CATALOG` contains entries for Wizard Tower levels 1/2/3 (IDs: `tour_sorcier`, `grande_tour`, `tour_arcanes`) with costs 80/160/300 CO and slot consumption = 1 each
**And** `BUILDING_CATALOG` contains Comptoir Mercenaires levels 1/2/3 (IDs: `comptoir`, `comptoir_renforce`, `grand_comptoir`) with cumulative costs 50 / 100 / 200 CO respectively (matching `docs/territory_rule.md`) and slot consumption = 1 for the Comptoir lineage (a single Comptoir slot occupies 1 slot regardless of level)
**And** both families have `hasLevels = true`; their `BuildingDef` includes a `requiresPreviousLevel` flag for Wizard Tower (true) and false for Comptoir (direct-purchase allowed)

**Given** `buildBuildingFn` from Story 4.2
**When** Story 4.5 is complete
**Then** the handler is extended to enforce Wizard Tower sequencing:
  - Constructing `tour_sorcier` requires no prerequisite
  - Constructing `grande_tour` requires an existing `tour_sorcier` on the same colony → if missing, return `BAD_REQUEST` "Construisez d'abord la Tour du Sorcier"
  - Constructing `tour_arcanes` requires an existing `grande_tour` → else `BAD_REQUEST`
**And** constructing a higher-level Wizard Tower REPLACES the previous level (the previous level is deleted in the same transaction — the slot is reused, not duplicated)
**And** the handler is extended to accept Comptoir direct-level construction: a player may pass `buildingType='grand_comptoir'` with no existing Comptoir, and the server computes the effective cost as the cumulative sum (200 CO for direct `grand_comptoir`) — matching the `docs/territory_rule.md` rule "le joueur peut le construire directement au niveau souhaité"
**And** if a Comptoir already exists on the colony, constructing a higher level REPLACES it (deletes previous + inserts new) and charges only the DELTA cost
**And** a new handler `upgradeBuildingFn` is NOT introduced — the single `buildBuildingFn` handles both fresh construction and level replacement via type inspection

**Given** no temporal constraints apply (per Ben's guidance, players track week-level rules themselves)
**When** a player upgrades a Comptoir
**Then** the server does NOT check `campaign_week` or any temporal restriction — the upgrade is always permitted as long as balance and sequencing rules pass

**Given** the `BuildingSlot` and `BuildingOption` UI from Story 4.3
**When** a colony already has a Wizard Tower level N
**Then** the construction Sheet filters the available Wizard Tower options to show only level N+1 (if it exists in catalog) — levels already built or out-of-sequence are absent (UX-DR19)
**And** when a colony already has a Comptoir at level N, the Sheet shows only levels N+1 and N+2 (the next legal steps) with their delta costs displayed explicitly (e.g., "Comptoir Renforcé (+50 CO)")
**And** the `BuildingSlot` occupied state renders the current level's `displayName` (e.g., "Grande Tour du Sorcier" or "Comptoir Renforcé")

**Given** integration tests
**When** they run
**Then** a test seeds a player with a village and 540 CO, constructs `tour_sorcier` (80 CO), then `grande_tour` (160 CO, deletes `tour_sorcier`), then `tour_arcanes` (300 CO, deletes `grande_tour`), asserts final state: 1 building of type `tour_arcanes`, `co_balance = 0`, 3 `co_transactions` of type `building_construction`
**And** a test seeds a player attempting `grande_tour` without an existing `tour_sorcier`, asserts `BAD_REQUEST`
**And** a test seeds a player with 200 CO attempting direct `grand_comptoir` construction, asserts success with `amount = -200` in the `co_transactions` row
**And** a test seeds a player with an existing `comptoir` (50 CO already spent) upgrading to `grand_comptoir` (delta +150 CO), asserts the previous comptoir row is deleted and only the new row exists with the correct delta cost in the transaction log

---
