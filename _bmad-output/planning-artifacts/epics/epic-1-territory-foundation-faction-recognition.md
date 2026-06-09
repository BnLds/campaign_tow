# Epic 1: Territory Foundation & Faction Recognition

A player opening the "Territoires" tab for the first time sees a personalized dashboard — the app recognizes their faction from their existing army data, displays their current CO balance (zero or populated), and offers a path to setup. This epic establishes the DB foundation (`factions` + `player_territories` tables), the canonical faction config TypeScript module for all 18 factions, updates the OWB import script to assign canonical faction IDs, and delivers the minimal route shell with `CoBanner` and empty state.

## Story 1.1: DB Migration — `factions` Table and Backfill `armies.faction` FK

As a developer,
I want the `factions` table to exist with all 18 canonical campaign factions seeded and every existing `armies.faction` free-text value backfilled to the corresponding canonical faction ID,
So that the territory module has a stable, normalized foundation for faction-aware logic without breaking existing army data.

**Acceptance Criteria:**

**Given** the codebase at baseline with `armies.faction` as free-text
**When** the Drizzle migration for Story 1.1 is run
**Then** a new `factions` table exists with columns `id` (text PK), `name` (text, unique, snake_case canonical), `display_name` (text, human-readable French label)
**And** the table is seeded with exactly the 18 rows defined in `docs/factions.md` (the canonical source), each with `id`, `name` (English canonical), and `display_name` (French label) from that file — e.g., `kingdom-of-bretonnia` / `Kingdom of Bretonnia` / `Royaume de Bretonnie`
**And** each seeded row has a unique canonical `id` usable as FK target
**And** the seed logic reads the canonical list from `docs/factions.md` or an equivalent strongly-typed source in `src/db/seeds/` — never hardcoded inline in the migration

**Given** the `armies` table contains existing rows with free-text `faction` values
**When** the same migration runs the backfill step
**Then** `armies.faction` is migrated to reference `factions.id` (FK constraint added)
**And** every existing army row has a valid FK value — no NULLs, no orphans
**And** the mapping from free-text to canonical ID handles common variants (case, accents, spacing)
**And** if any existing army cannot be mapped automatically, the migration fails loudly with a clear error message listing the unmapped values (rather than silently defaulting)

**Given** the migration has completed successfully
**When** I inspect the schema via `drizzle-kit` introspect
**Then** `armies.faction` has a FK constraint referencing `factions.id`
**And** the FK constraint uses `ON DELETE RESTRICT` (factions cannot be deleted while armies reference them)

**Given** the `factions` migration is merged
**When** any later test or dev boots the app against a fresh database
**Then** the factions seed runs automatically as part of the migration sequence

---

## Story 1.2: Faction Config TypeScript Module — 18 Factions

As a developer,
I want a single TypeScript module `src/lib/faction-config.ts` exporting a `FACTION_CONFIGS` record covering all 18 factions with their colonization rules, available buildings, and special structures,
So that every server function and client component can consult a single source of truth for faction rules without hardcoding logic per faction.

**Acceptance Criteria:**

**Given** the file `src/lib/faction-config.ts` does not yet exist
**When** the story is complete
**Then** the file exports the exact `FactionConfig` interface specified in `implementation-patterns-consistency-rules.md` (no extensions, no renamed fields)
**And** the file exports `FACTION_CONFIGS: Record<string, FactionConfig>` with one entry per canonical faction ID from Story 1.1
**And** every entry is populated using the rules in `docs/faction_rule.md` (colonization rights, building availability, alternative structures like Chaos Portal, Tyrant Hall, god consecration for Chaos Warriors/Marauders)
**And** the module imports no DB modules and has no runtime side effects — pure static data

**Given** the new faction config module exists
**When** I run `pnpm vitest src/lib/__tests__/faction-config.test.ts`
**Then** a `describe.each` test iterates over all 18 factions and asserts each has a non-empty `availableBuildings` list, a boolean `canBuildVillage`, a boolean `canBuildCity`, and a valid `terrainRestrictions` array
**And** a test asserts that factions using `alternativeStructure` (Chaos Daemons, Ogres) have `canBuildVillage === false` and `canBuildCity === false`
**And** a test asserts that every `FACTION_CONFIGS` key matches a real faction ID seeded in the `factions` DB table (integration check via a constant re-exported from the seed module — no DB hit)
**And** all tests pass

**Given** the faction config is importable
**When** a consumer does `import { FACTION_CONFIGS } from '~/lib/faction-config'`
**Then** the consumer gets type-safe access to all faction rules with full TypeScript inference

---

## Story 1.3: OWB Import Script — Canonical Faction Detection & Assignment

As a player importing an army via OWB,
I want the import script to detect my army's faction from the OWB export and map it to the canonical `factions.id` so my army row is created with a valid FK value,
So that the territory module immediately recognizes my faction without any manual intervention.

**Acceptance Criteria:**

**Given** the existing OWB parser at `src/lib/owb-parser.ts` extracts `faction` as free text from the second line of the OWB export (pattern `"Warhammer: The Old World, {faction}, …"`)
**When** Story 1.3 is complete
**Then** a new mapping function (e.g., `resolveCanonicalFactionId(rawFaction: string): string | null`) lives alongside the parser and translates the free-text faction label to the canonical `factions.id` from Story 1.1
**And** the mapping covers all 18 canonical factions (from `docs/factions.md`) with tolerance for case, accents, and common OWB label variants
**And** if the free-text faction cannot be mapped, the function returns `null` and the import flow surfaces a clear error to the user — never silently assigns a default

**Given** the import flow that creates/updates an `armies` row from an OWB export
**When** an army is imported
**Then** the `armies.faction` column is written with the canonical faction ID returned by `resolveCanonicalFactionId`
**And** the FK constraint from Story 1.1 accepts the write

**Given** I run `pnpm vitest src/lib/owb-parser.test.ts` (or the appropriate test file for the mapping function)
**When** the tests execute
**Then** a `describe.each` covers the 18 canonical factions plus at least 3 edge cases (extra whitespace, different casing, accented variants) and asserts each resolves to the expected canonical ID
**And** a test asserts that an unknown faction label returns `null` (or the equivalent error sentinel defined in the story)

**Given** an existing army imported before Story 1.1 merged
**When** the user re-imports it after Story 1.3 is deployed
**Then** the import updates the `faction` FK to the canonical ID without breaking the army's units, XP, or history

---

## Story 1.4: DB Migration — `player_territories` Table + Lazy Bootstrap

As a player visiting the Territoires tab for the first time,
I want a `player_territories` row to be created automatically for my player with a zero CO balance,
So that I can see the dashboard shell immediately without any explicit "create territory" action.

**Acceptance Criteria:**

**Given** the Drizzle migration baseline after Story 1.1
**When** the migration for Story 1.4 runs
**Then** a new `player_territories` table exists with columns `id` (text PK, UUID), `player_id` (text, FK to `players.id`, unique — 1:1), `co_balance` (integer, default 0, NOT NULL), `last_income_week` (integer, default 0, NOT NULL), `setup_completed_at` (timestamp, nullable), `created_at` and `updated_at` (timestamps, defaults)
**And** the `player_id` unique constraint enforces the 1:1 relationship
**And** the FK uses `ON DELETE CASCADE` (a player deletion cascades to their territory)
**And** no `player_territories` rows are seeded — rows are created lazily on first access

**Given** the new table and a logged-in player with no existing `player_territories` row
**When** the server function `loadTerritoryDashboardFn` is called (stubbed in this story, implemented in Story 1.5)
**Then** the function creates a new `player_territories` row with `player_id = session.playerId`, `co_balance = 0`, `last_income_week = 0`, `setup_completed_at = null`
**And** the creation happens inside a single `db.transaction()` to avoid duplicate-create race conditions (e.g., two tabs opening simultaneously)
**And** subsequent calls return the existing row without recreating it

**Given** the lazy-bootstrap behavior
**When** I run an integration test that invokes the bootstrap twice for the same player
**Then** only one `player_territories` row exists for that player
**And** the row returned by the second call has the same `id` as the first

---

## Story 1.5: Territory Route Shell — `loadTerritoryDashboardFn` + `CoBanner` + Empty State

As a player,
I want to tap the "Territoires" tab and land on a dashboard showing my CO balance in a sticky navy banner and an empty-state illustration with a "Configurer mes territoires" CTA button,
So that I have immediate feedback that the module is alive and know how to get started.

**Acceptance Criteria:**

**Given** the existing placeholder `src/routes/territories.tsx`
**When** Story 1.5 is complete
**Then** the route exports a `createFileRoute('/territories')` with an explicit `validateSearch` Zod schema: `{ tile: z.string().optional(), view: z.enum(['grid', 'history']).default('grid'), setup: z.number().optional() }`
**And** the route is gated by the existing `authMiddleware` equivalent at the route level (unauthenticated visits redirect to login — consistent with existing routes)

**Given** an authenticated player visiting `/territories`
**When** the route renders
**Then** it calls `loadTerritoryDashboardFn` (new server function in `src/server-fns/territory-queries.ts`) which returns `{ coBalance: number, factionId: string, factionDisplayName: string, setupCompletedAt: string | null }` inside the existing `ServerResult<T>` envelope
**And** the server function uses `authMiddleware` only (no new middleware — ownership implicit via `session.playerId`)
**And** the server function triggers the lazy bootstrap from Story 1.4 if no `player_territories` row exists for the player
**And** TanStack Query caches the result under key `['territory', playerId]` with a 30s stale time (new constant `STALE_TIME_TERRITORY` added to `src/lib/query-constants.ts`)

**Given** the dashboard data is loaded
**When** the UI renders
**Then** a new `CoBanner` component (`src/components/territory/CoBanner.tsx`) is sticky positioned directly below the existing AppHeader
**And** `CoBanner` has `--color-brand-dark` (#1e293b) background with white text
**And** `CoBanner` displays the CO balance as a large number with `aria-live="polite"`
**And** `CoBanner` displays a secondary line with the faction display name (e.g., "Bretonniens")
**And** `CoBanner` includes a placeholder area for "estimated weekly income" showing "—" at this stage (to be populated in Epic 5)
**And** `CoBanner` uses Tailwind classes only — no inline CSS
**And** `CoBanner` uses shadcn primitives where available (no custom reimplementation of standard UI)

**Given** the player's `setup_completed_at` is `null` (first visit)
**When** the dashboard renders below the `CoBanner`
**Then** an empty-state block shows a sober illustration/icon + the text "Configurez vos territoires pour commencer"
**And** a primary button "Configurer mes territoires" is visible but its onClick handler is a placeholder (documented TODO for Epic 7 wizard wiring)
**And** the empty state respects WCAG AA contrast ratios (primary text #171310 on #f1eade, secondary #6b5f52 on #fffbf5)

**Given** the data query is in flight
**When** the route first loads
**Then** a "Chargement…" centered loading text is displayed (existing app pattern) until the query resolves
**And** the CoBanner does NOT trigger a full-page reload on subsequent fetches — it shows a localized loading indicator via TanStack Query `isFetching`

**Given** a Playwright e2e test targets the `/territories` route
**When** the test runs against a fresh test user
**Then** the existing hydration pattern (`__reactFiber` keys wait) is used — no `networkidle`
**And** the test asserts CO balance = 0, faction display name matches the test user's seeded faction, and the "Configurer mes territoires" CTA button is visible
**And** the test asserts a `player_territories` row was created in the test DB for this player (lazy bootstrap verification)

---
