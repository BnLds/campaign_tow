# Epic 2: Tile Management

A player can add, name, view, and remove tiles from their territory, selecting terrain type from the 8 canonical options. River plain tiles expose an adjacency toggle (+20 CO bonus flag). The 2-column grid renders all owned tiles with terrain-colored strips for fast visual scanning, displays base income per terrain, and shows empty slot-dot indicators. Tile addition uses a bottom Sheet launched from a special "+" placeholder `TileCard` at the end of the grid. Removal and river-adjacency toggle happen inside the expanded tile view. No CO mutations at this stage — tiles are free.

## Story 2.1: DB Migration — `tiles` Table

As a developer,
I want the `tiles` table to exist with the correct columns, FK, and index,
So that player tiles can be stored, queried efficiently, and linked to their owning territory.

**Acceptance Criteria:**

**Given** the migration baseline after Epic 1
**When** the Drizzle migration for Story 2.1 runs
**Then** a new `tiles` table exists with columns: `id` (text PK, UUID), `player_territory_id` (text, FK to `player_territories.id`, NOT NULL), `terrain_type` (text with CHECK constraint matching the 8 canonical values: `port`, `plaines`, `plaine_agricole`, `lisiere_forestiere`, `montagnes`, `foret`, `plaine_fluviale`, `marais`), `name` (text, nullable), `river_adjacent` (boolean, NOT NULL, default `false`), `created_at` (timestamp, default now), `updated_at` (timestamp, default now)
**And** the FK uses `ON DELETE CASCADE` (removing a territory cascades to its tiles)
**And** a B-tree index exists on `player_territory_id` for dashboard query performance
**And** a CHECK constraint (or application-level Zod enum) enforces that `river_adjacent = true` is only allowed when `terrain_type = 'plaine_fluviale'` — stored inconsistencies are rejected at DB level if possible, otherwise at the server function level with an explicit test

**Given** the Drizzle schema file `src/db/schema.ts`
**When** I inspect it after the migration
**Then** a `tiles` pgTable declaration matches the DB structure
**And** a relation links `tiles` to `playerTerritories` (`one` from the territory side, `many` from the territory relations block)

**Given** `pnpm drizzle-kit generate` has been run
**When** the migration file is inspected
**Then** the file is named with a descriptive suffix (e.g., `XXXX_territory_tiles.ts`) and contains only the `tiles`-related DDL for this story — no pre-emptive creation of `colonies`, `buildings`, `co_transactions`, or `campaign_settings`

---

## Story 2.2: Tile Server Functions — Add / Remove / Toggle River Adjacency

As a player,
I want server functions to add a tile to my territory, remove a tile, and toggle the river-adjacency flag on river plain tiles,
So that the UI (in later stories) can mutate my tile state with ownership and rule enforcement guaranteed server-side.

**Acceptance Criteria:**

**Given** the `tiles` table exists (Story 2.1) and `src/lib/validators/territory.ts` is created (new file)
**When** Story 2.2 is complete
**Then** `src/lib/validators/territory.ts` exports `addTileSchema`, `removeTileSchema`, `toggleRiverAdjacencySchema` — Zod schemas defining the exact input shape for each mutation
**And** `addTileSchema` requires `terrainType` (enum of 8 canonical values) and accepts optional `name` (trimmed string, max 60 chars)
**And** `removeTileSchema` requires `tileId` (UUID)
**And** `toggleRiverAdjacencySchema` requires `tileId` (UUID) and `riverAdjacent` (boolean)

**Given** the validators exist
**When** `src/server-fns/territory-mutations.ts` is created
**Then** it exports three `createServerFn` handlers: `addTileFn`, `removeTileFn`, `toggleRiverAdjacencyFn`
**And** all three use `authMiddleware` only (no new middleware — ownership checked inside the handler)
**And** all three return the existing `ServerResult<T>` envelope pattern
**And** all DB access goes through a new `src/db/queries/territory.ts` module — handlers never import Drizzle tables directly

**Given** `addTileFn` is called with a valid payload
**When** the handler runs
**Then** it resolves the `player_territories.id` from `session.playerId`, lazy-creating one if missing (reusing the bootstrap from Story 1.4)
**And** it inserts a new `tiles` row with `river_adjacent = false`
**And** it returns `{ success: true, data: { tileId } }`

**Given** `removeTileFn` is called with a `tileId`
**When** the handler runs
**Then** it fetches the tile and verifies `tile.player_territory_id` belongs to `session.playerId` — if not, returns `{ success: false, error: { code: 'FORBIDDEN', message: '...' } }`
**And** if ownership passes, it deletes the tile row
**And** a code comment marks a TODO for future epics: "Epic 3/4: block removal if tile has colonies or buildings — currently no such tables exist"

**Given** `toggleRiverAdjacencyFn` is called with a `tileId` and a boolean
**When** the handler runs
**Then** it verifies ownership (same pattern as remove)
**And** it verifies `tile.terrain_type === 'plaine_fluviale'` — if not, returns `{ success: false, error: { code: 'BAD_REQUEST', message: "Adjacence rivière disponible uniquement sur plaine fluviale" } }`
**And** on success, it updates `river_adjacent` to the requested value

**Given** unit/integration tests for these three handlers (via the "extract pure business logic" pattern from the architecture testing strategy)
**When** `pnpm vitest` runs
**Then** each handler's ownership guard is tested with a malicious cross-player tile ID (expect `FORBIDDEN`)
**And** `addTileFn` is tested with each of the 8 terrain types (parametrized `it.each`)
**And** `toggleRiverAdjacencyFn` is tested on a non-river-plain tile (expect `BAD_REQUEST`)

---

## Story 2.3: `TileCard` Collapsed + 2-Column Grid on Dashboard

As a player,
I want my owned tiles to render in a 2-column grid on the Territoires dashboard, each tile shown as a collapsed card with terrain color strip, name, terrain label, base income badge, and empty slot-dot indicators,
So that I can see the shape of my empire at a glance.

**Acceptance Criteria:**

**Given** Story 1.5 delivered the dashboard shell with empty state
**When** Story 2.3 is complete
**Then** `loadTerritoryDashboardFn` is extended to return `tiles: Array<{ id, terrainType, name, riverAdjacent, baseIncome }>` in addition to the previous fields
**And** `baseIncome` is computed per terrain type using a pure function (e.g., `getBaseIncome(terrainType)`) in `src/lib/territory-income.ts` — values match `docs/territory_rule.md`
**And** when the player has ≥1 tile, the empty state from Story 1.5 is replaced by the tile grid; when the player has 0 tiles, the empty state remains visible

**Given** the tile grid is rendered
**When** I inspect the layout
**Then** the grid uses CSS Grid with `grid-template-columns: 1fr 1fr` and a gap of 0.75rem (12px)
**And** the grid is contained within the existing `max-width: 720px` centered container
**And** the grid uses Tailwind classes only — no inline CSS

**Given** the `TileCard` component at `src/components/territory/TileCard.tsx` (new file)
**When** it renders in collapsed state
**Then** the top of the card shows a terrain-color strip mapped from a constant `TERRAIN_COLORS` record (8 entries, one per terrain type) — each color is defined as a Tailwind utility or a CSS var
**And** the card displays the tile `name` in Cinzel font (falls back to the terrain display label if name is null)
**And** the card displays a small badge showing the terrain display label in French (e.g., "Plaine agricole")
**And** the card displays a revenue badge showing base income (e.g., "20 CO") — if `river_adjacent = true`, the badge shows the bonus inline (e.g., "20 + 20 CO")
**And** the card shows an empty slot-dot indicator row representing the maximum slots possible for the terrain — at this story, all dots are "empty" state (no colony yet) and a screen-reader-only label describes "Aucune colonie construite"
**And** the card has `aria-expanded="false"` and a tap target ≥ 44px — tapping is a noop at this story (expansion comes in Story 2.5)
**And** the card respects WCAG AA contrast ratios (primary text #171310 on #fffbf5 card surface)

**Given** a Playwright e2e test with a test player seeded with 3 tiles of different terrain types
**When** the test visits `/territories`
**Then** the grid renders exactly 3 `TileCard`s
**And** each card displays the correct terrain label and base income
**And** the hydration pattern from Story 1.5 is reused — no `networkidle`

---

## Story 2.4: Add Tile Flow — "+" Placeholder `TileCard` + Bottom Sheet Form

As a player,
I want a special "+" placeholder `TileCard` at the end of my grid that opens a bottom Sheet with a form to add a new tile by selecting a terrain type and an optional name,
So that I can grow my empire with a single familiar gesture that fits naturally into the grid.

**Acceptance Criteria:**

**Given** the tile grid from Story 2.3
**When** Story 2.4 is complete
**Then** a new `AddTileCard` component (or a `variant="add"` of `TileCard`) renders as the last item in the grid
**And** the placeholder card visually differs from standard tiles: dashed border using `--color-border`, transparent/subtle background, centered "+" icon plus a "Ajouter une tuile" label in Cinzel
**And** the placeholder is always present — it is the primary "add tile" entry point and is never hidden
**And** the placeholder has a tap target ≥ 44px, role `button`, and accessible label "Ajouter une tuile"

**Given** the player taps the "+" placeholder
**When** the tap fires
**Then** a shadcn bottom `Sheet` opens with a form built with TanStack Form + Zod (Standard Schema — pass `addTileSchema` directly to `validators.onSubmit`)
**And** the form contains a shadcn `Select` for terrain type with the 8 options labeled in French (e.g., "Plaine agricole", "Forêt", "Plaine fluviale") and no default selection
**And** the form contains a shadcn `Input` for optional `name` (placeholder "Nom de la tuile (optionnel)", max 60 chars)
**And** the form has a primary "Confirmer" button and a secondary "Annuler" button (closes the Sheet)
**And** the "Confirmer" button is disabled while the form is invalid or submitting

**Given** a valid form submission
**When** the user taps "Confirmer"
**Then** `addTileFn` is invoked with `{ terrainType, name }`
**And** on success, the Sheet closes, the query `['territory', playerId]` is invalidated, a success toast displays "Tuile ajoutée", and the new `TileCard` appears in the grid
**And** on server error, a red error toast displays the error message from the `ServerResult` envelope and the Sheet stays open with the form intact

**Given** a Playwright e2e test
**When** the test taps the "+" placeholder, selects "Plaine agricole", leaves the name blank, and confirms
**Then** the Sheet closes
**And** a new `TileCard` with terrain label "Plaine agricole" and base income badge appears in the grid
**And** the test asserts the DB contains a new `tiles` row linked to the test player's territory

---

## Story 2.5: Expand Tile — Remove Tile Flow + River Adjacency Switch

As a player,
I want to tap a tile in the grid to expand it full-width, see its detail view, toggle river adjacency if it's a river plain, and remove the tile via a confirmation dialog,
So that I can manage individual tiles without leaving the dashboard context.

**Acceptance Criteria:**

**Given** the tile grid from Story 2.3
**When** I tap a collapsed `TileCard`
**Then** the route search param `?tile=<tileId>` is set via TanStack Router `navigate({ search: ... })`
**And** the tapped `TileCard` expands in place to full grid width (`grid-column: 1 / -1`) pushing subsequent tiles down — other tiles remain collapsed
**And** only one tile can be expanded at a time; tapping another tile switches the expanded tile
**And** tapping the expanded tile header again (or a close control) clears `?tile` and collapses it back to grid width
**And** the `TileCard` sets `aria-expanded="true"` when expanded

**Given** a tile is expanded via `?tile=<tileId>`
**When** the expanded render runs its effect
**Then** the expanded card calls `scrollIntoView({ behavior: 'smooth', block: 'start' })` via a ref + useEffect pattern — so mobile users never end up expanded off-screen

**Given** the expanded tile view
**When** I inspect its content at this story
**Then** it shows terrain info (type, base income, any active river adjacency bonus), a future placeholder region labeled "Colonie" with muted text "Pas de colonie" (populated in Epic 3), and an actions row containing:
- For river plain tiles only: a shadcn `Switch` labeled "Adjacent à une autre plaine fluviale" reflecting `river_adjacent`
- A destructive `Button variant="destructive"` labeled "Supprimer la tuile"

**Given** the river adjacency `Switch` on a `plaine_fluviale` tile
**When** I toggle it
**Then** `toggleRiverAdjacencyFn` is called with the new value
**And** on success, the query is invalidated, the `Switch` reflects the new state, and the revenue badge in the collapsed card updates to show the +20 CO bonus
**And** on server error, a red toast displays and the `Switch` rolls back to its previous state

**Given** I tap "Supprimer la tuile"
**When** the button fires
**Then** a shadcn `AlertDialog` opens with title "Supprimer cette tuile ?", a body explaining the action is irreversible, a destructive "Supprimer" confirm button, and a neutral "Annuler" button
**And** tapping "Annuler" or the backdrop closes the dialog with no effect
**And** tapping "Supprimer" invokes `removeTileFn`
**And** on success, the `AlertDialog` and the expanded tile close, the tile is removed from the grid, the `?tile` search param is cleared, a success toast displays "Tuile supprimée"
**And** on server error (e.g., ownership failure — should never happen but handled), a red toast displays the error

**Given** a Playwright e2e test
**When** the test adds a `plaine_fluviale` tile (via Story 2.4 flow), expands it, toggles the river switch on, and reloads the page
**Then** the river switch is still on after reload (persistence)
**And** the collapsed card shows the "+20 CO" bonus
**Then** the test taps "Supprimer la tuile", confirms the AlertDialog, and observes the tile disappear from the grid
**And** the test asserts the DB `tiles` row is deleted

---
