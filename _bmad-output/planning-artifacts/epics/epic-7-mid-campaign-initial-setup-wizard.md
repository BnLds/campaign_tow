# Epic 7 — Mid-Campaign Initial Setup Wizard

**Goal:** Let players who join the territory module mid-campaign (or who played their first weeks on paper) bootstrap their full territory snapshot — faction, tiles, colonies, buildings, current CO balance — in a single guided multi-step wizard. After this epic, a brand-new `player_territories` row can be created with a coherent state that matches the player's real campaign progress, without them having to click through the normal flow week by week.

**Scope:** FR34, FR35, FR36, FR37.
**NFRs:** NFR9 (atomic creation — either the full snapshot lands or nothing does).
**UX-DRs:** UX-DR19 (faction-first — invalid tile/building options never shown), UX-DR14 (AlertDialog on final submit).

## Story 7.1 — `TerritorySetupWizard` Multi-Step Form

**As** Thomas joining the territory module in campaign week 5 with an existing paper-tracked territory
**I want** a step-by-step wizard that lets me declare my faction, tiles, colonies, buildings, and current CO balance
**So that** I can bootstrap my digital territory in one session without having to replay 5 weeks of actions

**Acceptance Criteria:**

**Given** `src/components/territory/TerritorySetupWizard.tsx`
**When** Story 7.1 is complete
**Then** the wizard renders as a full-screen modal (shadcn `Dialog` with `max-w-2xl`) mounted on the `/territories` route when `?setup=1` is present in the URL
**And** the wizard has 5 steps with a progress indicator at the top ("Étape {n}/5") and back/next buttons at the bottom (back hidden on step 1, next replaced by "Terminer" on step 5):
  1. **Faction** — `Select` populated from the `factions` table (18 entries from `docs/factions.md`); pre-filled from the player's existing army faction if it exists in `armies`; read-only hint "Votre faction d'armée définit les règles de colonisation"
  2. **Tuiles initiales** — dynamic list of tile rows; each row has a `Select` for tile type (filtered by `TILE_CATALOG` to the options legal for the chosen faction via `canFactionAddTile(factionId, tileType)` — UX-DR19 hides illegal options); "Ajouter une tuile" button appends a row; delete icon removes
  3. **Colonies existantes** — for each tile added in step 2 that supports colonies, a collapsible panel shows the tile and lets the player declare `none | village | city` (DB enum values; UI labels are localised to "Aucune" / "Village" / "Ville"); for Chaos Warriors/Marauders, an inline `Select` for the god/cult appears when a colony is declared (khorne / tzeentch / nurgle / slaanesh)
  4. **Bâtiments** — for each colony declared in step 3, a list of pre-existing buildings the player can add via a multi-select from `BUILDING_CATALOG` (filtered by faction and by tile type via the same rules as Story 4.2); free buildings auto-added (farm on plaine agricole, menagerie on marais, mine on Dwarf mountain) are shown as pre-checked disabled chips
  5. **Solde CO de départ** — numeric input for the current CO balance (integer ≥ 0); helper text "Ce montant sera enregistré comme recette manuelle avec pour motif 'Setup campagne — Semaine {n}'"

**Given** the wizard uses TanStack Form for state management
**When** a player navigates between steps
**Then** the form validates the current step's fields before allowing "Suivant" (per-step zod schemas composed into the final submission schema)
**And** changes to the faction in step 1 CLEAR steps 2–4 with a confirmation AlertDialog "Changer de faction réinitialisera les tuiles, colonies et bâtiments. Continuer ?"
**And** the wizard is cancel-safe: closing via ESC or backdrop click shows an AlertDialog "Abandonner la configuration ?" — confirming returns the player to the empty `/territories` state (no `player_territories` row created)

**Given** the final "Terminer" button on step 5
**When** the player taps it
**Then** an AlertDialog summarises the snapshot ("{n} tuiles, {n} colonies, {n} bâtiments, solde {n} CO") with `[Modifier] [Confirmer]` (UX-DR14) before calling `initializeTerritoryFn` (Story 7.2)
**And** on success, the wizard closes, the URL updates to `/territories` (query params cleared via `navigate({ replace: true })`), and a toast shows "Territoire configuré — bienvenue !"

**Given** component tests with Vitest + Testing Library
**When** they run
**Then** a test renders the wizard with a Bretonnian faction, asserts only Bretonnian-legal tile types appear in step 2's select
**And** a test renders the wizard with Daemons of Chaos and asserts step 3's colony options are DISABLED with a tooltip "Les Démons ne peuvent pas bâtir de colonies" (the god/cult select is also hidden)
**And** a test changing faction mid-way asserts the confirmation AlertDialog appears and that confirming clears steps 2–4 state

## Story 7.2 — `initializeTerritoryFn` Atomic Snapshot Creation

**As** the server
**I want** a single server function that takes the full wizard output and creates `player_territories`, `tiles`, `colonies`, `buildings`, and the initial `co_transactions` row atomically
**So that** a partial snapshot never lands in the database — either the setup succeeds completely or nothing is persisted

**Acceptance Criteria:**

**Given** `src/server/territory-queries.ts` (or a new `territory-setup.ts` for clarity)
**When** Story 7.2 is complete
**Then** an `initializeTerritoryFn = createServerFn({ method: 'POST' }).validator(SetupPayloadSchema).middleware([authMiddleware]).handler(…)` is exported, where `SetupPayloadSchema` is a zod schema matching the wizard's final state:
```ts
{
  factionId: z.string(),
  initialBalance: z.number().int().min(0),
  tiles: z.array(z.object({ type: TileTypeEnum })),
  colonies: z.array(z.object({ tileIndex: z.number().int(), type: z.enum(['village', 'city']), chaosGod: ChaosGodEnum.optional() })),
  buildings: z.array(z.object({ tileIndex: z.number().int(), colonyIndex: z.number().int().optional(), buildingType: z.string() })),
}
```
**And** the handler runs entirely inside `db.transaction({ isolationLevel: 'serializable' })`
**And** it first checks that NO `player_territories` row exists for the caller — if one does, return `BAD_REQUEST` "Territoire déjà configuré" (Story 7.3 ensures the wizard cannot be opened in that case, but the server guards anyway)
**And** it validates the entire snapshot against the faction rules from `src/lib/faction-config.ts` BEFORE any insert: every tile type must be legal, every colony type must be legal for its tile, every building must pass `canBuildOn(tile, colony, buildingType, factionId)`, Chaos Warriors/Marauders colonies must have a `chaosGod` and respect the diversity rule from Story 3.6, Daemons of Chaos must have ZERO colonies — any violation returns `BAD_REQUEST` with a specific error code identifying the offending element
**And** inserts happen in dependency order: `player_territories` (with `co_balance = 0` initially, returning the new `playerTerritoryId`), `tiles`, `colonies`, `buildings`, then the initial `manual_income` transaction via `withCoTransaction(tx, { playerTerritoryId, type: 'manual_income', amount: initialBalance, label: 'Setup campagne — Semaine ' + currentWeek, metadata: { reason: 'initial-setup', week: currentWeek } })` — `withCoTransaction` updates the balance atomically to the declared amount
**And** free buildings (farm on plaine agricole, menagerie on marais, Dwarf mine on mountain) are auto-inserted by the handler with `is_free = true` so the player's wizard selections don't need to include them

**Given** integration tests against real PostgreSQL
**When** they run
**Then** a test posts a valid minimal Bretonnian snapshot (1 plaine tile, 1 village, 0 buildings, 200 CO) and asserts `player_territories` + `tiles` + `colonies` + 1 `co_transactions` row are all present, `co_balance = 200`, and the transaction has the expected "Setup campagne — Semaine {n}" reason
**And** a test posts a snapshot with an illegal building (forge on a Daemon portal-only setup) and asserts `BAD_REQUEST` and that NO rows were inserted (transaction rollback — verify `tiles` table is still empty for that player)
**And** a test posts a snapshot with auto-free buildings triggered (1 plaine agricole tile + village) and asserts a `buildings` row with `is_free = true` exists even though the wizard payload listed no building for that tile
**And** a test calls the function twice with the same payload and asserts the second call returns `BAD_REQUEST` "Territoire déjà configuré" and does not create duplicate rows

## Story 7.3 — Route Guard & Automatic Setup Redirect

**As** Thomas navigating to `/territories` for the first time
**I want** the app to detect that I have no territory yet and open the setup wizard automatically
**So that** I never stare at an empty screen wondering how to get started

**Acceptance Criteria:**

**Given** the `/territories` route file
**When** Story 7.3 is complete
**Then** the route's `loader` (or `beforeLoad`) calls a lightweight `hasTerritoryFn({ playerId })` server function that returns `{ exists: boolean }` without loading the full snapshot
**And** if `exists === false` AND the URL does not already contain `?setup=1`, the loader performs `throw redirect({ to: '/territories', search: { setup: 1 } })` so TanStack Router handles the navigation cleanly (no client-side flash)
**And** if `exists === true` AND the URL contains `?setup=1`, the loader strips the query param via `throw redirect({ to: '/territories', search: {} })` so players cannot re-open the wizard on an existing territory

**Given** the route's `validateSearch` zod schema
**When** Story 7.3 is complete
**Then** the schema is extended to accept `setup: z.literal(1).optional()` alongside the existing `tile` and `view` params defined in the route architecture

**Given** the wizard from Story 7.1
**When** `?setup=1` is present
**Then** the wizard mounts and opens immediately
**And** on successful submission (Story 7.2), the wizard calls `navigate({ to: '/territories', search: {}, replace: true })` to clear the setup param AND invalidates the `['territory', playerId]` query so the normal territory view renders with the freshly-created snapshot

**Given** E2E tests with Playwright
**When** they run
**Then** a test logs in as a player with no `player_territories` row, navigates to `/territories`, and asserts the wizard dialog is visible and the URL contains `?setup=1`
**And** a test completes the wizard end-to-end with a minimal Bretonnian snapshot and asserts the dialog closes, the URL clears, and the main territory view shows the created tile
**And** a test logs in as a player WITH an existing territory, navigates to `/territories?setup=1` manually, and asserts the query param is stripped (redirect to clean URL) and the wizard does not open
