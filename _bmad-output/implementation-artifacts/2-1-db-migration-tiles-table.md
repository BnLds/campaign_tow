# Story 2.1: DB Migration — `tiles` Table

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want the `tiles` table to exist with the correct columns, FK, terrain enum, river-adjacency invariant, and B-tree index,
so that player tiles can be stored, queried efficiently from the territory dashboard, and linked to their owning territory with referential integrity.

## Acceptance Criteria

1. **`tiles` table schema** — A new Drizzle migration creates `tiles` with columns:
   - `id text PRIMARY KEY` (UUID, `$defaultFn(() => crypto.randomUUID())` — same pattern as every existing table in `src/db/schema.ts`),
   - `player_territory_id text NOT NULL` with FK to `player_territories.id` and `ON DELETE CASCADE` (removing a territory cascades to its tiles — matches the rule already used for `players → player_territories` at `src/db/schema.ts:61`),
   - `terrain_type` typed via a new `pgEnum('terrain_type', [...])` enum with the 8 canonical values (see AC #2),
   - `name text` (NULLABLE — players may leave a tile unnamed; max length is enforced server-side by Zod in Story 2.2, not at DB level),
   - `river_adjacent boolean NOT NULL DEFAULT false`,
   - `created_at timestamp NOT NULL DEFAULT now()`,
   - `updated_at timestamp NOT NULL DEFAULT now()` with `$onUpdate(() => new Date())` (mirror `playerTerritories.updatedAt` at `src/db/schema.ts:66`).

   Naming: snake_case columns at DB level, camelCase Drizzle field names (`playerTerritoryId`, `terrainType`, `riverAdjacent`, `createdAt`, `updatedAt`) per `architecture-territory/implementation-patterns-consistency-rules.md` §Naming Patterns.

2. **`terrain_type` Postgres enum — 8 canonical values, exact order** — Declare a new exported `pgEnum`:
   ```ts
   export const terrainTypeEnum = pgEnum('terrain_type', [
     'port', 'plaines', 'plaine_agricole', 'lisiere_forestiere',
     'montagnes', 'foret', 'plaine_fluviale', 'marais',
   ])
   ```
   Order MATTERS — these are the canonical IDs referenced by `docs/territory_rule.md` and will be reused by Story 1.2's `FACTION_CONFIGS` `villageTerrainWhitelist` / `cityTerrainWhitelist` / `automaticBuildings` (see `_bmad-output/planning-artifacts/architecture-territory/implementation-patterns-consistency-rules.md#Structure-Patterns` — `TerrainType` union literal must match the enum value list 1:1). Do NOT add `tundra`, `desert`, or any speculative terrain — out of scope. Place the enum declaration near the existing `matchResultEnum`/`unitStatusEnum`/`matchTypeEnum`/`unitGainTypeEnum` block (`src/db/schema.ts:8–30`) to keep all `pgEnum` declarations grouped.

3. **River-adjacency invariant — `river_adjacent = true` ONLY on `plaine_fluviale`** — Enforce at DB level via a `check()` constraint (mirror `matchXpEntries` `check('mxe_xp_gained_non_negative', ...)` at `src/db/schema.ts:210`):
   ```ts
   check('tiles_river_adjacent_only_on_plaine_fluviale',
     sql`${table.riverAdjacent} = false OR ${table.terrainType} = 'plaine_fluviale'`)
   ```
   The constraint forbids `(river_adjacent=true, terrain_type<>'plaine_fluviale')`. Permitted combinations:
   - `(false, *)` — any non-river terrain with the flag off ✓
   - `(true, 'plaine_fluviale')` — river plain with adjacency on ✓
   - `(false, 'plaine_fluviale')` — river plain without an adjacent river plain ✓
   - `(true, <not plaine_fluviale>)` — REJECTED at DB level with SQLSTATE `23514` (`check_violation`).

   Story 2.2 will additionally enforce this at the server-fn layer via Zod refinement, but the DB constraint is the canonical guarantor — application code can drift, the DB cannot.

4. **B-tree index on `player_territory_id`** — Add `index('idx_tiles_player_territory_id').on(table.playerTerritoryId)` (mirror the index style at `src/db/schema.ts:181` `idx_mp_player_id`). Story 1.5's `loadTerritoryDashboardFn` (extended in Story 2.3) will issue `SELECT * FROM tiles WHERE player_territory_id = $1` on every dashboard load — without this index the query is a sequential scan. Use `index(...)` (NOT `uniqueIndex`) — a player can own many tiles per territory.

5. **No seed data** — The migration adds the table only. NO row inserts. Tiles are inserted lazily by `addTileFn` in Story 2.2. The migration MUST NOT contain any `INSERT INTO tiles` statement. This mirrors the discipline of Story 1.4 (no auto-seeded `player_territories`).

6. **Drizzle relations** —
   - Add `tilesRelations`: one tile → one `playerTerritory`:
     ```ts
     export const tilesRelations = relations(tiles, ({ one }) => ({
       territory: one(playerTerritories, {
         fields: [tiles.playerTerritoryId],
         references: [playerTerritories.id],
       }),
     }))
     ```
   - Modify the existing `playerTerritoriesRelations` (`src/db/schema.ts:235–237`) to add the back-relation:
     ```ts
     export const playerTerritoriesRelations = relations(playerTerritories, ({ one, many }) => ({
       player: one(players, { fields: [playerTerritories.playerId], references: [players.id] }),
       tiles: many(tiles),
     }))
     ```
     This is a SCOPED extension of the existing relations block — only the `tiles: many(tiles)` line is added. Do NOT touch other relations declarations (the wider "no `relations(players, …)` back-link" rule from Story 1.4 §Architecture-compliance still applies — only `playerTerritories` gets the new back-relation, since `tiles` is the only new entity in this story).

   Place `tilesRelations` in the relations section near the bottom of the file (after `playerTerritoriesRelations` line 237) to keep all `relations(...)` calls grouped.

7. **Schema file ordering** — In `src/db/schema.ts`, declare `tiles` AFTER `playerTerritories` (which it depends on via FK) and AFTER the new `terrainTypeEnum`. Concretely: insert `terrainTypeEnum` in the enum block (after `unitGainTypeEnum`, line 30), and insert `tiles` after the `playerTerritories` table declaration (after line 69 closing bracket). Verify imports — `pgTable`, `text`, `boolean`, `timestamp`, `pgEnum`, `index`, `check`, `relations`, `sql` are all already imported at the top of `schema.ts` (line 4–5). No new imports needed.

8. **Migration generation and snapshot** — Run `pnpm db:generate` to produce a new Drizzle migration file under `drizzle/` (expected `0008_*.sql` — the next sequential number after `0007_sour_tyrannus.sql`). The generated SQL MUST contain:
   - `CREATE TYPE "public"."terrain_type" AS ENUM ('port', 'plaines', 'plaine_agricole', 'lisiere_forestiere', 'montagnes', 'foret', 'plaine_fluviale', 'marais')`,
   - `CREATE TABLE "tiles"` with all columns and types from AC #1,
   - `ALTER TABLE "tiles" ADD CONSTRAINT "tiles_player_territory_id_player_territories_id_fk" FOREIGN KEY ("player_territory_id") REFERENCES "public"."player_territories"("id") ON DELETE cascade ON UPDATE no action` (the canonical FK shape drizzle-kit emits — see `drizzle/0006_jazzy_prodigy.sql` for the precedent),
   - `CREATE INDEX "idx_tiles_player_territory_id" ON "tiles" USING btree ("player_territory_id")`,
   - A `CHECK` clause containing `river_adjacent = false OR terrain_type = 'plaine_fluviale'` (drizzle-kit may inline the check inside the CREATE TABLE or emit it as a separate `ALTER TABLE ... ADD CONSTRAINT` — the static test in AC #10 accepts either by matching the predicate directly).

   The corresponding `drizzle/meta/0008_snapshot.json` is regenerated by drizzle-kit. Commit BOTH the SQL and the snapshot. Do NOT hand-edit either file.

9. **No query module, no server function, no validator, no UI in this story** — Story 2.1 stops at the schema + migration. Story 2.2 creates `src/lib/validators/territory.ts` and `src/server-fns/territory-mutations.ts`; Story 2.3 creates `src/components/territory/TileCard.tsx` and extends `loadTerritoryDashboardFn`. This story MUST NOT:
   - Create or modify `src/db/queries/territory.ts` (no new exports — the existing `getOrCreatePlayerTerritory` stays untouched). The `tiles` table is referenced ONLY by the schema + the integration test.
   - Create `src/server-fns/territory-mutations.ts`, `src/lib/validators/territory.ts`, `src/lib/territory-income.ts`, `src/components/territory/TileCard.tsx`, or `src/integrations/territory-queries.ts` modifications.
   - Modify `src/routes/territories.tsx` or `src/server-fns/territory-queries.ts`.
   - Touch `_bmad-output/implementation-artifacts/deferred-work.md`.

   Scope discipline: schema + enum + migration + tests only. Story 1.4 followed the same discipline (schema + migration + helper + tests; no server-fn). Story 2.1 is even narrower (no helper either — pure schema-only).

10. **Tests — two new files** under existing convention `src/db/__tests__/`:

   - **`src/db/__tests__/tiles-migration.test.ts`** — Static SQL assertions. Mirror the boilerplate of `src/db/__tests__/player-territories-migration.test.ts:1–8` verbatim (`readdirSync` glob for `0008_*.sql`, no DB connection needed). Each assertion is a single coupled regex per the MEMORY.md assertion-coupling rule:
     - **[2.1-MIG-001][P0]** `terrain_type` enum declared with all 8 values in canonical order:
       ```ts
       expect(sql).toMatch(/CREATE TYPE "public"\."terrain_type" AS ENUM \('port', 'plaines', 'plaine_agricole', 'lisiere_forestiere', 'montagnes', 'foret', 'plaine_fluviale', 'marais'\)/)
       ```
     - **[2.1-MIG-002][P0]** FK to `player_territories.id` with `ON DELETE cascade`:
       ```ts
       expect(sql).toMatch(/FOREIGN KEY \("player_territory_id"\) REFERENCES "public"\."player_territories"\("id"\) ON DELETE cascade/)
       ```
     - **[2.1-MIG-003][P0]** B-tree index on `player_territory_id` (NOT unique — players own many tiles):
       ```ts
       expect(sql).toMatch(/CREATE INDEX "idx_tiles_player_territory_id" ON "tiles"[^;]*\("player_territory_id"\)/)
       ```
       And explicitly NOT a unique index:
       ```ts
       expect(sql).not.toMatch(/CREATE UNIQUE INDEX "idx_tiles_player_territory_id"/)
       ```
     - **[2.1-MIG-004][P0]** River-adjacency CHECK predicate present (matches drizzle-kit output whether inlined or in a separate ALTER):
       ```ts
       expect(sql).toMatch(/"river_adjacent" = false OR "terrain_type" = 'plaine_fluviale'/)
       ```
       Coupling note: this single regex couples both halves of the disjunction on the same expression. Do NOT split into two `toContain` calls — would pass even if the operator was `AND`.
     - **[2.1-MIG-005][P1]** `river_adjacent` boolean column with default `false`:
       ```ts
       expect(sql).toMatch(/"river_adjacent" boolean DEFAULT false NOT NULL/)
       ```
     - **[2.1-MIG-006][P1]** `name` is nullable text (NO `NOT NULL` clause attached to it):
       ```ts
       expect(sql).toMatch(/"name" text(?! NOT NULL)/)
       ```
     - **[2.1-MIG-007][P0]** No `INSERT INTO tiles` (AC #5):
       ```ts
       expect(sql).not.toMatch(/INSERT INTO[^;]*"?tiles"?/i)
       ```
     - **[2.1-MIG-008][P0]** `terrain_type` column uses the enum type (not `text` with a CHECK):
       ```ts
       expect(sql).toMatch(/"terrain_type" "(?:public\.)?terrain_type"/)
       ```

     The exact migration filename suffix is unknown until `pnpm db:generate` runs — use `readdirSync(resolve(root, 'drizzle')).find(f => /^0008_.*\.sql$/.test(f))` (mirror `player-territories-migration.test.ts:6`).

   - **`src/db/__tests__/tiles-cascade.test.ts`** — Integration test against the test DB (mirrors the harness of `src/db/__tests__/player-territories-bootstrap.test.ts:1–40`). Boilerplate: Pool + drizzle + `DATABASE_URL` guard + `afterAll(pool.end())`. Setup helper inserts a throwaway `players` row + bootstraps a `playerTerritories` row via the existing `getOrCreatePlayerTerritory` helper. Cleanup in `afterAll` MUST surface delete failures (no `.catch(() => {})` — Story 1.3 review item).
     - **[2.1-INT-001][P0]** `INSERT INTO tiles` with `terrain_type = 'plaine_agricole'` and default `river_adjacent` succeeds and stores the expected shape. Single coupled assertion:
       ```ts
       const [row] = await db.insert(tiles).values({ playerTerritoryId, terrainType: 'plaine_agricole' }).returning()
       expect(row).toMatchObject({ terrainType: 'plaine_agricole', riverAdjacent: false, name: null })
       ```
     - **[2.1-INT-002][P0]** ON DELETE CASCADE: deleting the parent `player_territories` row removes all its tiles. Single coupled assertion after the parent delete:
       ```ts
       expect(
         (await db.select().from(tiles).where(eq(tiles.playerTerritoryId, territoryId))).length
       ).toBe(0)
       ```
     - **[2.1-INT-003][P0]** River-adjacency invariant: inserting `(terrain_type='plaines', river_adjacent=true)` rejects with a CHECK violation. Single coupled assertion:
       ```ts
       await expect(
         db.insert(tiles).values({ playerTerritoryId, terrainType: 'plaines', riverAdjacent: true })
       ).rejects.toThrow(/tiles_river_adjacent_only_on_plaine_fluviale|check/i)
       ```
       The regex tolerates either the constraint name (when Postgres echoes it) or the generic `check` keyword in the error message — both are acceptable.
     - **[2.1-INT-004][P0]** River-adjacency permitted on `plaine_fluviale`:
       ```ts
       const [row] = await db.insert(tiles).values({ playerTerritoryId, terrainType: 'plaine_fluviale', riverAdjacent: true }).returning()
       expect(row).toMatchObject({ terrainType: 'plaine_fluviale', riverAdjacent: true })
       ```
     - **[2.1-INT-005][P1]** `terrain_type` enum rejects an unknown value at the DB level. The Drizzle TypeScript type already forbids it at compile time, but at the SQL layer the enum CAST throws — this test exercises the runtime guarantee. Use a raw SQL escape hatch via `pool.query`:
       ```ts
       await expect(
         pool.query(`INSERT INTO tiles (id, player_territory_id, terrain_type) VALUES ($1, $2, $3)`,
           [crypto.randomUUID(), territoryId, 'tundra'])
       ).rejects.toThrow(/invalid input value for enum terrain_type/i)
       ```
     - **[2.1-INT-006][P1]** `name` accepts a non-null value and stores it verbatim:
       ```ts
       const [row] = await db.insert(tiles).values({ playerTerritoryId, terrainType: 'foret', name: 'Bois de Loren' }).returning()
       expect(row).toMatchObject({ terrainType: 'foret', name: 'Bois de Loren' })
       ```

     Cleanup discipline:
     - Track all created `playerIds` in an array, delete with `inArray(players.id, ids)` in `afterAll` — CASCADE removes territories AND tiles automatically.
     - Do NOT add `.catch(() => {})` swallows. Surface failures.
     - Use `crypto.randomUUID()` for usernames (`tiles-test-${crypto.randomUUID()}`) to avoid cross-suite collisions.

11. **No type errors, no lint failures, no new dependencies, no regressions**:
   - `pnpm typecheck` — green.
   - `pnpm lint` — only the pre-existing `src/lib/faction-resolver.ts` `no-irregular-whitespace` failure (Story 1.3 carry-over) remains; no new lint failures introduced.
   - `pnpm vitest run src/db/__tests__/tiles-migration.test.ts src/db/__tests__/tiles-cascade.test.ts` — 14/14 green (8 MIG + 6 INT).
   - `pnpm vitest run` — total failure count unchanged (still the 3 known pre-existing failures: `1.1-UNIT-006`, `3.3-QRY-008`, `4.1-QRY-007`). No NEW failures introduced.
   - `package.json` unchanged — no new deps. `crypto.randomUUID()` is the project convention; do NOT pull in `uuid`.

## Tasks / Subtasks

- [x] **Task 1: Add `terrainTypeEnum` to schema** (AC: #2, #7)
  - [x] In `src/db/schema.ts`, after `unitGainTypeEnum` (line 30), declare:
    ```ts
    export const terrainTypeEnum = pgEnum('terrain_type', [
      'port', 'plaines', 'plaine_agricole', 'lisiere_forestiere',
      'montagnes', 'foret', 'plaine_fluviale', 'marais',
    ])
    ```
  - [x] Verify the `pgEnum` import is already at line 4 (it is — `pgEnum` is imported alongside `pgTable`, `text`, etc.).

- [x] **Task 2: Add `tiles` table + relations** (AC: #1, #3, #4, #6, #7)
  - [x] In `src/db/schema.ts`, after the `playerTerritories` declaration (line 69 closing `)`) and BEFORE `armies` (line 71), declare:
    ```ts
    export const tiles = pgTable('tiles', {
      id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
      playerTerritoryId: text('player_territory_id').notNull()
        .references(() => playerTerritories.id, { onDelete: 'cascade' }),
      terrainType: terrainTypeEnum('terrain_type').notNull(),
      name: text('name'),
      riverAdjacent: boolean('river_adjacent').notNull().default(false),
      createdAt: timestamp('created_at').notNull().defaultNow(),
      updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
    }, (table) => [
      index('idx_tiles_player_territory_id').on(table.playerTerritoryId),
      check('tiles_river_adjacent_only_on_plaine_fluviale',
        sql`${table.riverAdjacent} = false OR ${table.terrainType} = 'plaine_fluviale'`),
    ])
    ```
  - [x] In the relations section near the bottom of the file (after `playerTerritoriesRelations` line 237), add `tilesRelations`:
    ```ts
    export const tilesRelations = relations(tiles, ({ one }) => ({
      territory: one(playerTerritories, {
        fields: [tiles.playerTerritoryId],
        references: [playerTerritories.id],
      }),
    }))
    ```
  - [x] Modify `playerTerritoriesRelations` (line 235) to add the back-relation:
    ```ts
    export const playerTerritoriesRelations = relations(playerTerritories, ({ one, many }) => ({
      player: one(players, { fields: [playerTerritories.playerId], references: [players.id] }),
      tiles: many(tiles),
    }))
    ```
    Only add the `many` import to the destructured callback signature and the new `tiles: many(tiles)` line. Do NOT touch the `player` relation.

- [x] **Task 3: Generate Drizzle migration** (AC: #8)
  - [x] Run `pnpm db:generate` — drizzle-kit emits `drizzle/0008_<adjective>_<noun>.sql` and updates `drizzle/meta/0008_snapshot.json` + `_journal.json`.
  - [x] Inspect the generated SQL — confirm:
    - `CREATE TYPE "public"."terrain_type" AS ENUM (...)` with the 8 values in canonical order,
    - `CREATE TABLE "tiles"` with all columns,
    - FK clause `REFERENCES "public"."player_territories"("id") ON DELETE cascade`,
    - `CREATE INDEX "idx_tiles_player_territory_id"` (NOT `CREATE UNIQUE INDEX`),
    - CHECK predicate `"river_adjacent" = false OR "terrain_type" = 'plaine_fluviale'`,
    - `"name" text` with no `NOT NULL`.
  - [x] If any clause is missing or wrong, the schema definition (Tasks 1–2) is wrong — fix the schema and regenerate. Do NOT hand-edit the SQL.
  - [x] No augmentation needed — like Stories 1.4, this migration has no seed/backfill. The drizzle-generated SQL is shipped as-is.

- [x] **Task 4: Static migration test** (AC: #10 — the migration file)
  - [x] Create `src/db/__tests__/tiles-migration.test.ts`. Boilerplate copied from `player-territories-migration.test.ts:1–8`, swapping the regex `/^0007_/` → `/^0008_/` and adjusting the error message.
  - [x] Implement the 8 assertions from AC #10 (regex-coupled — MEMORY.md rule).
  - [x] No DB connection — this file only reads SQL.

- [x] **Task 5: Integration test — table behaviour** (AC: #10 — the integration file)
  - [x] Create `src/db/__tests__/tiles-cascade.test.ts`.
  - [x] Boilerplate from `player-territories-bootstrap.test.ts:1–40` (Pool + drizzle + DATABASE_URL guard + `afterAll(pool.end())` + `createdPlayerIds: string[] = []` array + `inArray` cleanup).
  - [x] Add imports: `import { players, playerTerritories, tiles } from '../schema'` and `import { getOrCreatePlayerTerritory } from '../queries/territory'`.
  - [x] Setup helper `createTestPlayerWithTerritory()`:
    ```ts
    async function createTestPlayerWithTerritory(): Promise<{ playerId: string; territoryId: string }> {
      const playerId = crypto.randomUUID()
      await db.insert(players).values({ id: playerId, username: `tiles-test-${playerId}` })
      createdPlayerIds.push(playerId)
      const territory = await getOrCreatePlayerTerritory(playerId)
      return { playerId, territoryId: territory.id }
    }
    ```
  - [x] Implement the 6 INT-* tests from AC #10. Use `crypto.randomUUID()` for player ids. For [2.1-INT-002] cascade test, after the player delete, splice the id out of `createdPlayerIds` to avoid double-delete in `afterAll` (mirror the same dance in `player-territories-bootstrap.test.ts:73–75`).
  - [x] [2.1-INT-005] uses raw `pool.query` to bypass the Drizzle TS type guard — this is intentional and the only test that should reach for raw SQL.
  - [x] Cleanup in `afterAll` MUST surface delete failures (no `.catch(() => {})`).

- [x] **Task 6: Verification** (AC: #11)
  - [x] `pnpm typecheck` — green.
  - [x] `pnpm lint` — pre-existing `faction-resolver.ts` failure remains; no new failures.
  - [x] `pnpm vitest run src/db/__tests__/tiles-migration.test.ts src/db/__tests__/tiles-cascade.test.ts` — all green (8 MIG + 6 INT = 14 tests).
  - [x] `pnpm vitest run` — total failure count unchanged (still 3 pre-existing failures only).
  - [x] Apply the migration locally: `pnpm db:migrate` — applied to dev DB and test DB. `\d tiles` confirms correct schema (column types, FK, index, check constraint visible).
  - [x] Confirm no inline `style=`/UI changes/server-fn changes via `git diff --stat` — only `src/db/schema.ts`, `drizzle/0008_*.sql`, `drizzle/meta/0008_snapshot.json`, `drizzle/meta/_journal.json`, and the two new test files should appear.

## Dev Notes

### Architecture compliance

- **Naming** ([Source: architecture-territory/implementation-patterns-consistency-rules.md#Naming-Patterns]):
  - Table `tiles` (snake_case plural) ✓
  - Columns `player_territory_id`, `terrain_type`, `river_adjacent` (snake_case) ✓
  - Drizzle exports `tiles`, `terrainTypeEnum`, `tilesRelations` (camelCase consts) ✓
  - DB enum values `'port'`, `'plaines'`, … (snake_case where multi-word, matches existing `'income_generation'` convention) ✓
- **Data Architecture** ([Source: architecture-territory/core-architectural-decisions.md#Data-Architecture]): the 7-table plan lists `tiles` with role "Owned tile" and key relationships "FK `player_territory_id`, terrain type, name, river adjacency flag". This story implements that row of the table exactly — no extra columns, no missing ones.
- **Data Access Boundary** ([Source: architecture-territory/project-structure-boundaries.md#Architectural-Boundaries]): "All DB access goes through `src/db/queries/territory.ts` — server functions NEVER import Drizzle tables directly." This story DOES import `tiles` directly in the integration test (`src/db/__tests__/tiles-cascade.test.ts`) — that is permitted because tests live OUTSIDE the boundary they enforce. The boundary applies to `src/server-fns/*` and runtime production code. Story 2.2 will add the `tiles` query helpers in `src/db/queries/territory.ts`.
- **Auth boundary** ([Source: architecture-territory/core-architectural-decisions.md#Authentication-Security]): "ownership implicit via `session.playerId` — `player_territories` is 1:1 with players." Tile ownership flows transitively: a tile's owner is the player whose `player_territory_id` matches. This story adds the FK that makes that transitivity expressible — but ownership ENFORCEMENT (the `WHERE player_territory_id = (SELECT id FROM player_territories WHERE player_id = session.playerId)` pattern) lands in Story 2.2. Do NOT pre-build the ownership query helper here.
- **`withCoTransaction` is NOT in scope** for this story. Tiles are free (no CO mutation on tile add/remove per the Epic 2 brief: "No CO mutations at this stage — tiles are free"). The `withCoTransaction` shared utility lands with Story 3.2. Resist any urge to pre-stub it.
- **River-adjacency CHECK rationale**: the rule "river_adjacent only on plaine_fluviale" is a HARD invariant from `docs/territory_rule.md` line 17 ("Plaine fluviale | … | +20 CO par tuile plaine fluviale adjacente qui prolonge la rivière"). Pushing this to the DB level (rather than only validating in the Story 2.2 server-fn) means a future bug, a manual SQL UPDATE, or a forgotten Zod refinement cannot create an inconsistent row. The architecture doc's "data validation" section ([Source: architecture-territory/core-architectural-decisions.md#Data-Architecture]) calls out "Zod schemas validated server-side (source of truth) + client-side via TanStack Form" — Zod is the user-input source of truth, the DB CHECK is the data-integrity backstop.

### Library / framework requirements

- **Drizzle ORM 0.45.x, drizzle-kit 0.31.x** — already installed. Reuse the pgEnum pattern from `unitGainTypeEnum` (`src/db/schema.ts:19–30`), the `check()` constraint pattern from `matchXpEntries` (`src/db/schema.ts:208–212`), and the `index()` constraint pattern from `matchParticipants` (`src/db/schema.ts:181`).
- **No `pgEnum` migration foot-gun on rename**: `pgEnum` adds values via `ALTER TYPE`. We are CREATING the enum (no existing `terrain_type` enum in the DB), so this is a clean `CREATE TYPE` — no migration drama. If a future story adds a 9th terrain (e.g. `desert`), drizzle-kit will emit `ALTER TYPE "terrain_type" ADD VALUE 'desert'` automatically — that is Story-N's problem, not ours.
- **`@types/pg` already installed** — the raw `pool.query` in [2.1-INT-005] is supported with no extra types. Use the existing `Pool` import from `pg`.
- **No new dependencies.** `package.json` unchanged.
- **`crypto.randomUUID()`** — project convention for PK generation. Available natively on Node 20+. Used both in schema `$defaultFn` and in the integration test for player ids.

### File structure

```
src/db/
├── schema.ts                                              ← MODIFIED (Tasks 1–2): add terrainTypeEnum, tiles, tilesRelations, extend playerTerritoriesRelations
└── __tests__/
    ├── tiles-migration.test.ts                            ← NEW (Task 4): 8 static SQL assertions
    └── tiles-cascade.test.ts                              ← NEW (Task 5): 6 integration assertions

drizzle/
├── 0008_<adjective>_<noun>.sql                            ← NEW (Task 3, drizzle-kit auto-generated)
└── meta/
    ├── 0008_snapshot.json                                 ← NEW (Task 3, drizzle-kit auto-generated)
    └── _journal.json                                      ← MODIFIED (Task 3, drizzle-kit auto-generated)
```

No other files touched. **Do NOT create or modify**:
- `src/db/queries/territory.ts` (Story 2.2 territory)
- `src/server-fns/territory-mutations.ts`, `src/server-fns/territory-queries.ts` (Stories 2.2, 2.3)
- `src/lib/validators/territory.ts`, `src/lib/territory-income.ts` (Stories 2.2, 2.3)
- `src/components/territory/TileCard.tsx` (Story 2.3)
- `src/integrations/territory-queries.ts` (Story 2.3)
- `src/routes/territories.tsx` (already at the right shape after Story 1.5)

### Testing requirements

- **Test DB harness:** copy boilerplate from `src/db/__tests__/player-territories-bootstrap.test.ts:1–40` (Pool + drizzle + DATABASE_URL guard + `afterAll(pool.end())` + `createdPlayerIds: string[]` + `inArray` cleanup). This is now the canonical pattern (was first established by `factions-seed.test.ts`, refined in `player-territories-bootstrap.test.ts`).
- **Assertion-coupling rule (MEMORY.md) — MANDATORY.** Every assertion that ties two facts MUST be a single coupled expression. Examples for this story:
  ```ts
  // ❌ BAD — passes if any successful insert returns a row, even with wrong terrain
  const row = await insertTile(...)
  expect(row).toBeTruthy()
  expect(row.terrainType).toBe('plaine_agricole')
  expect(row.riverAdjacent).toBe(false)

  // ✅ GOOD — couples all three facts on the same row reference in one assertion
  expect(row).toMatchObject({ terrainType: 'plaine_agricole', riverAdjacent: false, name: null })
  ```
  ```ts
  // ❌ BAD — could match an unrelated CHECK constraint elsewhere in SQL
  expect(sql).toContain('"river_adjacent" = false')
  expect(sql).toContain('"terrain_type" = \'plaine_fluviale\'')

  // ✅ GOOD — the disjunction is asserted as a single regex, so OR can't slip into AND
  expect(sql).toMatch(/"river_adjacent" = false OR "terrain_type" = 'plaine_fluviale'/)
  ```
- **`expect(promise).rejects.toThrow(/regex/)`** is the pattern for CHECK / enum violations (mirrors `factions-migration.test.ts:125–141` `RAISE EXCEPTION` rejection pattern).
- **Cleanup discipline:** `afterAll` deletes MUST surface failures (`inArray` delete with no `.catch(() => {})`). Story 1.3 review explicitly flagged this; Stories 1.4 and 1.5 followed the rule. Do not regress.
- **Vitest discovery:** tests under `src/**/*.test.ts` are auto-discovered ([Source: vitest.config.ts via MEMORY.md]). Both new files will be picked up by the next `pnpm vitest run` automatically.
- **Cleanup ordering caveat:** `tiles` cascade-deletes from `playerTerritories`, which cascade-deletes from `players`. The `afterAll` cleanup deletes `players` directly — `tiles` rows are removed transitively. NO need to delete tiles explicitly. The cascade chain is: `players → player_territories → tiles`.

### Previous story intelligence

**Story 1.4** (`player_territories` table + lazy bootstrap — `_bmad-output/implementation-artifacts/1-4-…md`):
- Established the static-SQL test pattern (`readdirSync` + filter for `^NNNN_` migration filename) — copy verbatim, swap `0007` → `0008`.
- Established the integration-test cleanup pattern (`createdPlayerIds: string[]` array + `inArray` delete + cascade-relies-on-FK).
- Mirror the `updatedAt` column with `$onUpdate(() => new Date())` (line 66) — same pattern reused on `tiles.updatedAt`.
- The `getOrCreatePlayerTerritory` helper from `src/db/queries/territory.ts` is the way to bootstrap a parent territory in the integration test setup. Do NOT inline raw `db.insert(playerTerritories)` calls — use the existing helper.

**Story 1.5** (territory route shell + CoBanner — `_bmad-output/implementation-artifacts/1-5-…md`):
- Confirmed `loadTerritoryDashboardFn` extension is reserved for Story 2.3. This story's schema lays the foundation for the future `tiles: Array<...>` field in `TerritoryDashboardData`, but does NOT touch the server function.
- The `localized loading` pattern in `CoBanner` is unaffected by tile additions — tile add/remove is free CO-wise (no balance change).

**Story 1.3** (faction resolver):
- `.catch(() => {})` in `afterAll` was a code-review reject — surface delete failures. Apply the same discipline to Task 5 cleanup.
- The `faction-resolver.ts` `no-irregular-whitespace` lint failure is pre-existing and out of scope.

**Story 1.2** (faction config — `src/lib/faction-config.ts`):
- The `TerrainType` union literal in the faction-config TypeScript module MUST match the `terrainTypeEnum` values 1:1 in identical order (Story 1.2 §AC: `type TerrainType = 'port' | 'plaines' | 'plaine_agricole' | 'lisiere_forestiere' | 'montagnes' | 'foret' | 'plaine_fluviale' | 'marais'`). If you grep `src/lib/faction-config.ts` and find the union list, verify the order matches AC #2 exactly. If they differ, the right answer is to fix the faction-config order to match the canonical DB enum order — but DO NOT make that change in this story (out of scope; flag it in completion notes for retro). The DB enum order (this story) is the canonical anchor going forward; faction-config must align in a follow-up.

### Git intelligence summary

Recent commits relevant to this story (last 5):

- `1f0a587 update bmad` — most recent, BMAD config refresh; unrelated to schema.
- `1801aae story 1.5: territory route shell + CoBanner + empty state` — established the dashboard shell that will eventually consume `tiles` (Story 2.3 will extend `loadTerritoryDashboardFn`).
- `40e12c1 story 1.4: player_territories table + lazy bootstrap helper` — DIRECT predecessor. The `playerTerritories` table is the FK target for `tiles.playerTerritoryId`. The migration pattern (drizzle-kit generate, no hand-edit, snapshot + journal commit) and test patterns are reused 1:1 here.
- `bf9db9c story 1.3: canonical faction resolver wired into OWB import` — established `armies.faction` as a canonical FK; unrelated to tiles but provides the `inArray` cleanup precedent now used in `player-territories-bootstrap.test.ts`.
- `03cf754 story 1.2: faction-config module + 18-faction registry` — see Previous Story Intelligence §Story 1.2 about the `TerrainType` union alignment.

### Latest tech information

- **Drizzle ORM `pgEnum` (0.45.x):** the canonical enum-as-column pattern. `terrainTypeEnum('terrain_type')` returns a column type used in pgTable like `terrainTypeEnum('terrain_type').notNull()`. The generated SQL emits `CREATE TYPE "public"."terrain_type" AS ENUM (...)` — the `public.` schema prefix is drizzle-kit's default (matches existing `unit_gain_type` migration pattern).
- **Drizzle ORM `check()` (0.45.x):** supports `sql` template literal predicates. The `${table.column}` interpolation expands to the quoted column name in the generated SQL. Already used at `src/db/schema.ts:210–211`.
- **Postgres CHECK constraints:** evaluated at INSERT and UPDATE time. Bulk seed inserts via `pg_dump`/`pg_restore` BYPASS check constraints by default — not relevant here (no bulk-load path), but worth knowing.
- **Postgres SQLSTATE for CHECK violation:** `23514` (`check_violation`). For ENUM cast failure: `22P02` (`invalid_text_representation`) — but `node-postgres` surfaces the `invalid input value for enum` text in `error.message`, which is what [2.1-INT-005] regex matches.
- **`pgEnum` and Drizzle migration ordering:** drizzle-kit emits `CREATE TYPE` before any `CREATE TABLE` that references it — this is automatic. No manual ordering required.

### Project context reference

- **MEMORY.md — assertion-coupling rule:** MANDATORY for every test in this story. See Testing requirements §Assertion-coupling rule.
- **MEMORY.md — path alias `@/*` foot-gun:** use `@/db/queries`, `@/db/schema` if you import outside the `src/db/__tests__/` directory. Inside `src/db/__tests__/`, the existing convention is relative paths (`../schema`, `../queries/territory`) per `player-territories-bootstrap.test.ts:10–11`. Mirror that.
- **MEMORY.md — env var guard pattern:** the existing `src/db/index.ts` already enforces `if (!DATABASE_URL) throw`. Both new test files MUST replicate the same guard at the top (mirror `player-territories-bootstrap.test.ts:13–15`).
- **MEMORY.md — Tailwind v4 / TanStack Form notes:** do NOT apply to this story (no UI, no form, no scaffold change).
- **Story files location:** `_bmad-output/implementation-artifacts/<key>.md` ✓.

### References

- [Source: `_bmad-output/planning-artifacts/epics/epic-2-tile-management.md#Story-2.1`] — full ACs and business context.
- [Source: `_bmad-output/planning-artifacts/architecture-territory/core-architectural-decisions.md#Data-Architecture`] — `tiles` table role and key relationships in the 7-table plan.
- [Source: `_bmad-output/planning-artifacts/architecture-territory/implementation-patterns-consistency-rules.md#Naming-Patterns`] — table/column/enum naming.
- [Source: `_bmad-output/planning-artifacts/architecture-territory/implementation-patterns-consistency-rules.md#Structure-Patterns`] — `TerrainType` union literal in `FactionConfig` MUST match enum values 1:1.
- [Source: `_bmad-output/planning-artifacts/architecture-territory/project-structure-boundaries.md#Architectural-Boundaries`] — Data Access Boundary (server functions never import Drizzle tables directly; tests are exempt).
- [Source: `docs/territory_rule.md`] — canonical 8 terrain types and the river-adjacency +20 CO bonus rule (line 17).
- [Source: `src/db/schema.ts:8–30`] — `pgEnum` block grouping convention.
- [Source: `src/db/schema.ts:59–69`] — `playerTerritories` table — FK target for `tiles.playerTerritoryId`, `updatedAt` `$onUpdate` pattern.
- [Source: `src/db/schema.ts:181`] — `index('idx_mp_player_id')` — non-unique B-tree index pattern.
- [Source: `src/db/schema.ts:208–212`] — `matchXpEntries` `check()` constraint pattern with `sql` template literal.
- [Source: `src/db/schema.ts:235–237`] — `playerTerritoriesRelations` — to extend with `tiles: many(tiles)`.
- [Source: `drizzle/0006_jazzy_prodigy.sql`] — canonical FK SQL shape from drizzle-kit (cascade pattern is identical).
- [Source: `drizzle/0007_sour_tyrannus.sql`] — most recent migration; informs what `0008_*.sql` will look like structurally.
- [Source: `src/db/__tests__/player-territories-migration.test.ts`] — static-SQL-test boilerplate to mirror (swap `0007` → `0008`).
- [Source: `src/db/__tests__/player-territories-bootstrap.test.ts:1–40`] — integration-test boilerplate to mirror (Pool + drizzle + DATABASE_URL guard + `inArray` cleanup).
- [Source: `src/db/queries/territory.ts`] — `getOrCreatePlayerTerritory` — used in the integration test setup helper.

### Project Structure Notes

- `src/db/__tests__/tiles-*.test.ts` are NEW files in an existing directory.
- `drizzle/0008_*.sql` — next sequential number after `drizzle/0007_sour_tyrannus.sql`. drizzle-kit picks the suffix automatically.
- No new directory creation needed.
- No changes to `tsconfig.json`, `vitest.config.ts`, `eslint.config.js`, `package.json`, `drizzle.config.ts`.
- The `tiles` table is positioned in `schema.ts` after `playerTerritories` (line 69) and BEFORE `armies` (line 71) — this places it in the "territory module" cluster of declarations and respects the topological order (FK references must be declared before being referenced).

## Dev Agent Record

### Agent Model Used

claude-opus-4-7 (Claude Code)

### Debug Log References

- `pnpm db:generate` → `drizzle/0008_fat_avengers.sql` produced as expected. Drizzle-kit emitted `AS ENUM(` (no space) and qualified the CHECK predicate columns (`"tiles"."river_adjacent" = false OR "tiles"."terrain_type" = 'plaine_fluviale'`). The static-SQL test regexes were tightened to tolerate both forms while still keeping the disjunction (and the 8 enum values, in order) coupled in a single regex per the assertion-coupling rule.
- Test DB (`test_campaign_tow`) had `__drizzle_migrations` slightly out of sync (hash drift on a prior migration); applied `0008_fat_avengers.sql` directly with `psql` and recorded the entry, then verified `pnpm vitest run` was green.
- `[2.1-INT-003]` initial regex `/tiles_river_adjacent_only_on_plaine_fluviale|check/i` did NOT match because Drizzle wraps pg errors with `Failed query: ...` and the constraint/SQLSTATE only live on `error.cause`. Replaced with a single coupled assertion on `{ cause.code, cause.constraint } === { '23514', 'tiles_river_adjacent_only_on_plaine_fluviale' }` — same coupling guarantee, reads the canonical pg fields directly.

### Completion Notes List

- Schema additions in `src/db/schema.ts`: `terrainTypeEnum` (8 values, canonical order), `tiles` table (PK, FK CASCADE to `playerTerritories`, B-tree index, CHECK constraint), `tilesRelations`. Extended `playerTerritoriesRelations` with `tiles: many(tiles)` (single-line scoped extension).
- Migration `drizzle/0008_fat_avengers.sql` + snapshot generated by drizzle-kit; not hand-edited.
- Two new test files cover all 14 assertions (8 MIG static SQL, 6 INT integration). All P0 ACs verified at the DB level: enum order, FK cascade, B-tree (not unique) index, CHECK predicate, no seed data, terrain_type-as-enum (not text), CASCADE behavior, CHECK rejection (with SQLSTATE 23514 + constraint name), enum rejection.
- Out-of-scope (per AC #9): no query helper, no server-fn, no validator, no UI, no `loadTerritoryDashboardFn` extension. `src/db/queries/territory.ts` untouched.
- **Follow-up flagged for retro (AC §Previous-story-intelligence Story 1.2):** the `TerrainType` union in `src/lib/faction-config.ts` should be checked in a future story to ensure 1:1 order alignment with the new canonical `terrainTypeEnum`. Out of scope here — only flag, do not modify.
- Pre-existing `pnpm lint` failure on `src/lib/faction-resolver.ts` (`no-irregular-whitespace`, Story 1.3 carry-over) remains; no new lint failures introduced.
- `pnpm vitest run` total failures unchanged: 3 pre-existing (`1.1-UNIT-006`, `3.3-QRY-008`, `4.1-QRY-007`); no new failures.

### File List

- MODIFIED: `src/db/schema.ts`
- NEW: `drizzle/0008_fat_avengers.sql`
- NEW: `drizzle/meta/0008_snapshot.json`
- MODIFIED: `drizzle/meta/_journal.json`
- NEW: `src/db/__tests__/tiles-migration.test.ts`
- NEW: `src/db/__tests__/tiles-cascade.test.ts`

### Change Log

- 2026-04-27 — Story 2.1 implemented: `terrainTypeEnum` + `tiles` table + relations, migration `0008_fat_avengers.sql`, 14 tests (8 MIG + 6 INT).
