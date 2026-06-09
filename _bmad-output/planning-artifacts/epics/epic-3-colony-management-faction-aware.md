# Epic 3: Colony Management (Faction-Aware)

A player can found colonies on their tiles — standard villages and cities for most factions, or faction-specific alternative structures (Chaos Portals, Tyrant Hall). Colonies can be upgraded with CO cost. Faction colonization constraints are enforced through filtering (invalid options are absent, never greyed). Warriors of Chaos and Marauders must assign a god/cult when founding a village, with diversity rules enforced. This epic introduces the `withCoTransaction` shared utility — the atomicity pattern all future CO-mutating epics will reuse.

## Story 3.1: DB Migration — `colonies` + `co_transactions` Tables

As a developer,
I want the `colonies` and `co_transactions` tables to exist with correct columns, enums, FKs, and indexes,
So that colony state can be stored 0:1 per tile and every CO mutation can be logged as an append-only ledger entry.

**Acceptance Criteria:**

**Given** the migration baseline after Epic 2
**When** the Drizzle migration for Story 3.1 runs
**Then** a new `colonies` table exists with columns: `id` (text PK, UUID), `tile_id` (text, FK to `tiles.id`, UNIQUE — enforces 0:1), `type` (text with CHECK constraint matching values `village`, `city`, `chaos_portal`, `major_chaos_portal`, `tyrant_hall`, and any other alt-structure identifier needed by `FACTION_CONFIGS`), `dedicated_god` (text, nullable, CHECK `IN ('khorne','tzeentch','nurgle','slaanesh')`), `created_at`, `updated_at`
**And** the FK to `tiles` uses `ON DELETE CASCADE` (removing a tile cascades to its colony)
**And** the UNIQUE on `tile_id` is enforced by DB constraint — the application cannot create two colonies on the same tile

**Given** the same migration
**When** the `co_transactions` table is created
**Then** it has columns: `id` (text PK, UUID), `player_territory_id` (text, FK to `player_territories.id`, NOT NULL), `type` (text with CHECK constraint matching the 7 canonical values from the architecture doc: `income_generation`, `colony_construction`, `colony_upgrade`, `building_construction`, `manual_expense`, `manual_income`, `reversal`), `amount` (integer, NOT NULL — signed; positive = credit, negative = debit), `label` (text, NOT NULL), `related_entity_type` (text, nullable), `related_entity_id` (text, nullable), `week_number` (integer, nullable), `reversed_transaction_id` (text, nullable, FK to `co_transactions.id`), `created_at` (timestamp, default now)
**And** the FK to `player_territories` uses `ON DELETE CASCADE`
**And** a composite index exists on `(player_territory_id, created_at DESC)` to accelerate dashboard and history queries
**And** the table is append-only by convention — no application code ever deletes rows; the architecture rule is enforced by code review and a comment in the schema file

**Given** both tables exist
**When** I inspect `src/db/schema.ts`
**Then** Drizzle pgTable declarations match the DB, enums are declared as TypeScript union types or `text + check`, and relations are wired (`colonies → tile`, `co_transactions → player_territory`)

---

## Story 3.2: `withCoTransaction` Shared Utility + Foundation Tests

As a developer,
I want a single `withCoTransaction` utility that every CO-mutating operation will call inside its `db.transaction()`, handling both the `co_transactions` insert and the atomic `co_balance` update,
So that all future CO flows in Epics 3-5 use a single battle-tested pattern with zero risk of divergent balance calculations.

**Acceptance Criteria:**

**Given** the `colonies` and `co_transactions` tables from Story 3.1
**When** Story 3.2 is complete
**Then** `src/db/queries/territory.ts` exports an async function `withCoTransaction(tx, playerTerritoryId, type, amount, label, relatedEntity?, weekNumber?): Promise<string>` matching exactly the signature in `implementation-patterns-consistency-rules.md`
**And** the function's first parameter is a `DrizzleTransaction` type (imported from the Drizzle types used in the codebase) — NEVER the global `db` export
**And** the function inserts a new `co_transactions` row with the provided fields and returns the new `id`
**And** the function atomically updates `player_territories.co_balance` using `sql\`co_balance + ${amount}\`` (positive credit, negative debit)
**And** the function does NOT open its own transaction — it is always called from within a caller's `db.transaction()`
**And** a JSDoc comment above the function reinforces: "Always call inside an existing `db.transaction()`. Never pass the global `db`. Never update `co_balance` elsewhere."

**Given** unit/integration tests for the utility (using a real test PostgreSQL DB per the architecture testing strategy)
**When** `pnpm vitest` runs
**Then** a test creates a player territory with `co_balance = 100`, calls `withCoTransaction(tx, ..., 'manual_income', 50, 'test credit')` inside a transaction, and asserts the new balance is 150 and a new `co_transactions` row exists with the correct values
**And** a test calls the utility with a negative amount and asserts the balance decreases correctly
**And** a test asserts that calling the utility outside a transaction (passing the global `db`) is discouraged by type — the parameter type must prevent accidental misuse at compile time

**Given** the `co_transactions.type` enum
**When** the utility is called with each of the 7 canonical type values
**Then** all 7 values are accepted without error
**And** the TypeScript type of the `type` parameter is a union of the 7 literal strings — no loose `string`

---

## Story 3.3: Build Standard Village — Faction-Aware, CO-Atomic

As a player whose faction allows village construction,
I want to tap "Construire un village" on an expanded tile and, after confirming the 150 CO cost, see the village created atomically with 1 empty slot and my CO balance updated,
So that I can grow my empire with full confidence that the rules and economy are enforced.

**Acceptance Criteria:**

**Given** the `colonies` table, `withCoTransaction` utility, and `FACTION_CONFIGS` from Epic 1
**When** Story 3.3 is complete
**Then** `src/lib/validators/territory.ts` exports `buildVillageSchema` requiring `tileId` (UUID) — and optionally `dedicatedGod` (god enum) for factions that require consecration (Story 3.6 will populate, but the schema field exists now as optional)
**And** `src/server-fns/territory-mutations.ts` exports `buildColonyFn` (one handler supporting village type in this story — city, alt structures, and god consecration added in later stories)
**And** the handler uses `authMiddleware` and enforces the following inside a single `db.transaction()`:
  1. Resolve the player's faction via `session.playerId` → `armies.faction` (or equivalent query)
  2. Verify `FACTION_CONFIGS[factionId].colonization.canBuildVillage === true`, else return `{ success: false, error: { code: 'FORBIDDEN', message: 'Votre faction ne peut pas construire de village' } }`
  3. Fetch the tile, verify ownership (`tile.player_territory_id` belongs to `session.playerId`), else `FORBIDDEN`
  4. Verify no existing colony on this tile (`colonies` query via `tile_id`), else `{ code: 'BAD_REQUEST', message: 'Cette tuile a déjà une colonie' }`
  5. Verify `FACTION_CONFIGS[factionId].colonization` allows this specific `terrain_type` (consulting `terrainRestrictions` or a dedicated `allowedVillageTerrains` field in the config), else `FORBIDDEN`
  6. Verify `player_territories.co_balance >= 150`, else `{ code: 'BAD_REQUEST', message: 'Solde insuffisant (besoin : 150 CO)' }`
  7. Insert the new `colonies` row with `type='village'` and `dedicated_god=null`
  8. Call `withCoTransaction(tx, playerTerritoryId, 'colony_construction', -150, 'Construction village', { type: 'colony', id: newColonyId })`
**And** the handler returns `{ success: true, data: { colonyId } }` on success

**Given** the expanded `TileCard` from Story 2.5 (placeholder "Pas de colonie" section)
**When** Story 3.3 is complete
**Then** the expanded tile's colony section shows a primary button "Construire un village (150 CO)" ONLY when ALL conditions hold: no colony exists, faction allows village, terrain allows village per faction config
**And** the button is **completely absent** (not greyed) when any condition fails — per UX-DR19 "prevent, don't punish"
**And** the button is `disabled` with muted helper text "Solde insuffisant (besoin : 150 CO)" when the only missing condition is balance

**Given** the player taps the button
**When** the tap fires
**Then** an `AlertDialog` opens with title "Construire un village ?", body text showing "Coût : 150 CO — Solde après : {balance - 150} CO", a primary "Confirmer" button, and a secondary "Annuler" button
**And** on "Confirmer", `buildColonyFn` is invoked
**And** during the mutation, the `CoBanner` shows a localized loading indicator on the balance number (TanStack Query `isFetching`) — never a full-page loading state (UX-DR21)
**And** on success, the query `['territory', playerId]` is invalidated, the expanded tile re-renders with a "Colonie : Village" header and 1 empty slot-dot, the CoBanner balance decreases by 150, and a success toast shows "Village construit"
**And** on server error, a red toast displays the `ServerResult` error message and the tile state is unchanged

**Given** integration tests against a real test PostgreSQL DB
**When** `pnpm vitest` runs
**Then** a test seeds a Bretonnian player with 200 CO on a `plaine_agricole` tile, calls `buildColonyFn`, and asserts: colony row exists (type='village'), `co_balance = 50`, a `co_transactions` row of type `colony_construction` exists with `amount = -150` and `related_entity_id = colonyId`
**And** a test seeds a Dwarf player trying to build a village on a `plaines` tile (not mountain) and asserts `FORBIDDEN`
**And** a test seeds a Bretonnian with `co_balance = 100` and asserts `BAD_REQUEST` insufficient balance
**And** a test seeds a tile that already has a village and asserts `BAD_REQUEST` colony exists
**And** an e2e Playwright test (happy path only) builds a village and verifies the UI state updates

---

## Story 3.4: Upgrade Village to City — 500 CO, Slot Expansion

As a player whose faction allows city construction,
I want to tap "Améliorer en ville" on a village colony and, after confirming the 500 CO cost, see the village upgraded to a city with 3 slots and my CO balance updated,
So that I can invest further in my colonies and unlock additional building capacity.

**Acceptance Criteria:**

**Given** the `buildColonyFn` handler from Story 3.3 and the `FACTION_CONFIGS` city rules
**When** Story 3.4 is complete
**Then** `src/lib/validators/territory.ts` exports `upgradeColonySchema` requiring `colonyId` (UUID)
**And** `src/server-fns/territory-mutations.ts` exports `upgradeColonyFn` (one handler initially supporting village → city — alt-structure upgrades come in Story 3.5)
**And** the handler uses `authMiddleware` and enforces inside a single `db.transaction()`:
  1. Fetch the colony + its tile, verify ownership
  2. Verify `colony.type === 'village'`, else `BAD_REQUEST` "Seul un village peut être amélioré en ville"
  3. Verify `FACTION_CONFIGS[factionId].colonization.canBuildCity === true`, else `FORBIDDEN`
  4. Verify the tile `terrain_type` is in the faction's city-eligible list (e.g., Bretonniens = `plaine_agricole`, Comtes Vampires = `marais`), else `FORBIDDEN`
  5. Verify `player_territories.co_balance >= 500`, else `BAD_REQUEST` "Solde insuffisant (besoin : 500 CO)"
  6. Update the colony `type` from `village` to `city`
  7. Call `withCoTransaction(tx, playerTerritoryId, 'colony_upgrade', -500, 'Amélioration en ville', { type: 'colony', id: colony.id })`
**And** the handler returns `{ success: true, data: { colonyId } }` on success

**Given** the expanded `TileCard` for a tile with a village colony
**When** Story 3.4 is complete
**Then** the colony section shows a secondary button "Améliorer en ville (500 CO)" ONLY when ALL conditions hold: faction allows city AND terrain allows city per faction config
**And** the button is **completely absent** when faction or terrain conditions fail
**And** the button is `disabled` with muted helper text "Solde insuffisant (besoin : 500 CO)" when the only missing condition is balance

**Given** the player taps "Améliorer en ville"
**When** the tap fires
**Then** an `AlertDialog` opens with title "Améliorer ce village en ville ?", body "Coût : 500 CO — Solde après : {balance - 500} CO", primary "Confirmer" and secondary "Annuler"
**And** on "Confirmer", `upgradeColonyFn` is invoked with `colonyId`
**And** on success, the query is invalidated, the tile re-renders with "Colonie : Ville" header and 3 empty slot-dots (was 1 for village), CoBanner balance updates, toast "Village amélioré en ville"
**And** slot dots count is computed from a pure helper (e.g., `getColonySlotCapacity(colonyType, factionId)`) in `src/lib/territory-income.ts` or a new `src/lib/territory-slots.ts` — no DB column stores the slot count

**Given** integration tests
**When** they run
**Then** a Bretonnian with `co_balance = 500` on a `plaine_agricole` village upgrades successfully: `colonies.type = 'city'`, `co_balance = 0`, new `co_transactions` of type `colony_upgrade` amount -500
**And** a Dwarf on a mountain village attempting to upgrade to city is rejected `FORBIDDEN` (Dwarves do not have city colonization per rules — or per whatever canonical rule exists in `faction_rule.md`)
**And** a Bretonnian with `co_balance = 400` is rejected `BAD_REQUEST` insufficient
**And** attempting to upgrade a `chaos_portal` colony via this handler is rejected `BAD_REQUEST` "only a village can be upgraded to a city"

---

## Story 3.5: Alternative Faction Structures — Auto-Creation on Tile Add + Upgrade Flow

As a player of a faction that uses alternative structures instead of villages (Chaos Daemons, Ogres, etc.),
I want my alternative structure to be created automatically the moment I add a tile, and to be upgradable to its advanced form (e.g., Portal → Major Portal) via a dedicated button,
So that the "Construire un village" option never appears for me, and I use my faction's unique economy exactly as the rules require.

**Acceptance Criteria:**

**Given** the `FACTION_CONFIGS` module defines `alternativeStructure` for specific factions (Daemons of Chaos = Chaos Portal, Ogre Kingdoms = Tyrant Hall, etc. — per `docs/faction_rule.md`)
**When** Story 3.5 is complete
**Then** `addTileFn` from Story 2.2 is retrofitted to run inside a `db.transaction()` and, after inserting the new tile, check whether the player's faction has an `alternativeStructure`
**And** if yes, it automatically inserts a new `colonies` row with `type` set to the faction's base alt structure identifier (e.g., `chaos_portal`, `tyrant_hall`), linked to the new tile, with no CO cost (the base alt structure is free, per faction rules)
**And** no `co_transactions` row is created for this auto-creation (zero-cost event — not a CO mutation)
**And** all existing Story 2.2 tests still pass; new tests verify that a Chaos Daemon player calling `addTileFn` results in both a new `tiles` row AND a new `colonies` row with `type='chaos_portal'` in the same transaction

**Given** a player whose faction has an `alternativeStructure`
**When** they view an expanded `TileCard` with an alt-structure colony
**Then** the colony section shows "Structure : Portail du Chaos" (or the appropriate display label) with the base revenue, base army-points contribution, and 1 empty slot-dot (or whatever the base alt-structure config says)
**And** the "Construire un village" button is **completely absent** (faction does not allow village — already enforced by Story 3.3, confirmed here)
**And** if the alt structure has an upgrade defined in config (`upgradeCost` non-null, e.g., Chaos Portal → Major Portal at 300 CO), a secondary button "Transformer en {upgradeName} ({cost} CO)" is visible

**Given** `upgradeColonyFn` from Story 3.4
**When** Story 3.5 is complete
**Then** the handler is extended to support alt-structure upgrades in addition to village → city
**And** the handler branches on `colony.type`: village → city (existing logic), or alt-base → alt-upgraded (new logic reading `FACTION_CONFIGS[factionId].colonization.alternativeStructure.upgradeCost` and `.upgradeSlots`)
**And** the new branch verifies balance, updates `colonies.type` to the upgraded identifier, and calls `withCoTransaction(tx, ..., 'colony_upgrade', -cost, label, ...)`
**And** slot capacity helpers (`getColonySlotCapacity`) are extended to handle alt-structure types

**Given** a Chaos Daemon player taps "Transformer en Portail Majeur (300 CO)"
**When** the AlertDialog is confirmed
**Then** `upgradeColonyFn` runs atomically, the colony becomes `major_chaos_portal`, the balance decreases by 300, slot dots expand from 1 to 3 (per rules), and the revenue badge updates to +80 CO
**And** toast "Portail Majeur construit" displays
**And** attempting to upgrade a major portal further (no further upgrade in config) — the upgrade button is absent

**Given** integration tests
**When** they run
**Then** a test seeds a Chaos Daemon player, calls `addTileFn`, asserts both a tile row and a `chaos_portal` colony row exist
**And** a test seeds a Chaos Daemon with a `chaos_portal` colony and `co_balance = 300`, calls `upgradeColonyFn`, asserts colony becomes `major_chaos_portal`, balance = 0, `co_transactions` row of type `colony_upgrade` exists
**And** a test seeds an Ogre Kingdoms player, verifies auto-creation of the `tyrant_hall` colony on tile add (regardless of whether Ogres are playing at MVP — the test coverage must include every faction with `alternativeStructure` in the config)

---

## Story 3.6: Chaos God Consecration on Village Founding (Warriors of Chaos & Marauders)

As a Warriors of Chaos or Marauders player,
I want to be prompted to choose which Chaos god (Khorne, Tzeentch, Nurgle, Slaanesh) my new village is dedicated to, with the diversity rule enforced (I cannot dedicate a second village to the same god until I have villages for all other gods),
So that my faction's rules are respected automatically without me checking the rulebook.

**Acceptance Criteria:**

**Given** the `FACTION_CONFIGS` module
**When** Story 3.6 is complete
**Then** the Warriors of Chaos (`warriors-of-chaos`) and Renegade Crowns or Marauder-equivalent faction config (per `docs/faction_rule.md` — confirm canonical id with Ben during implementation) includes a `godConsecration` field matching the `FactionConfig` interface from the architecture doc, with `gods: ['khorne', 'tzeentch', 'nurgle', 'slaanesh']`, `unitsPerVillage: 2`, `unitsPerCity: 3`
**And** `buildVillageSchema` (Story 3.3) is updated: `dedicatedGod` is now REQUIRED when the faction has `godConsecration`, and FORBIDDEN (must be null/absent) when it does not

**Given** `buildColonyFn` from Story 3.3
**When** Story 3.6 is complete
**Then** the handler, after resolving the faction, checks whether `godConsecration` exists
**And** if yes:
  1. Validate `dedicatedGod` is a valid god enum value, else `BAD_REQUEST` "God de dédicace manquant ou invalide"
  2. Query existing colonies with `type='village'` belonging to the player, grouped by `dedicated_god`
  3. Apply the diversity rule: if the player already has ≥1 village dedicated to the chosen `dedicatedGod`, AND at least one other god has zero villages, return `FORBIDDEN` with message "Dédiez d'abord un village à chaque autre dieu avant un second {god}"
  4. If the rule passes, insert the colony with `dedicated_god` populated
**And** if the faction has no `godConsecration`, `dedicatedGod` in the payload is rejected with `BAD_REQUEST` "Dédicace non autorisée pour votre faction"

**Given** a Warriors of Chaos player taps "Construire un village" on a valid tile
**When** Story 3.6 is complete
**Then** the AlertDialog from Story 3.3 is extended with a `Select` input labeled "Dieu de dédicace" with 4 options in French: "Khorne", "Tzeentch", "Nurgle", "Slaanesh"
**And** the "Confirmer" button is disabled until a god is selected
**And** gods for which the diversity rule would prevent selection are **visible but disabled** with a muted helper tooltip "Dédiez d'abord un village aux autres dieux" — this is an exception to UX-DR19 "hide don't grey" because the player needs to understand *why* the choice is limited in this Chaos-specific ritual context
**And** on confirm, `buildColonyFn` is called with `{ tileId, dedicatedGod }`

**Given** a village colony with a dedicated god
**When** the expanded `TileCard` renders
**Then** the colony header shows "Village — Dédié à Khorne" (or the selected god) with the corresponding icon or color hint if available in the design system
**And** a helper computes the unit/character slots per god (`getGodSlots(colonyType)`: 2 for village, 3 for city) via a pure function — FR40 data is derivable, not stored in a new column

**Given** integration tests
**When** they run
**Then** a test seeds a Warriors of Chaos player with no villages, calls `buildColonyFn` with `dedicatedGod='khorne'`, asserts success and `colonies.dedicated_god = 'khorne'`
**And** a test seeds the same player with one existing Khorne village, calls `buildColonyFn` with `dedicatedGod='khorne'` again (diversity rule violation), asserts `FORBIDDEN`
**And** a test seeds the player with one village per god EXCEPT Slaanesh, calls `buildColonyFn` with `dedicatedGod='khorne'` (second Khorne while Slaanesh missing), asserts `FORBIDDEN`
**And** a test seeds the player with one village per god, calls `buildColonyFn` with `dedicatedGod='nurgle'` (second Nurgle after diversity complete), asserts success
**And** a test seeds a Bretonnian (no `godConsecration`), calls `buildColonyFn` with `dedicatedGod='khorne'` in the payload, asserts `BAD_REQUEST`
**And** a test seeds a Warriors of Chaos player, omits `dedicatedGod`, asserts `BAD_REQUEST` "dédicace manquante"

---
