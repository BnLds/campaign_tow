# Story 1.4: DB Migration — `player_territories` Table + Lazy Bootstrap

Status: review

## Story

As a player visiting the Territoires tab for the first time,
I want a `player_territories` row to be created automatically for my player with a zero CO balance,
so that I can see the dashboard shell immediately without any explicit "create territory" action.

## Acceptance Criteria

1. **`player_territories` table schema** — A new Drizzle migration creates `player_territories` with columns:
   - `id text PRIMARY KEY` (UUID, `$defaultFn(() => crypto.randomUUID())` — same pattern as every existing table in `src/db/schema.ts`),
   - `player_id text NOT NULL` with FK to `players.id` and `ON DELETE CASCADE` (a player deletion removes their territory) — see AC #2 for the uniqueness constraint,
   - `co_balance integer NOT NULL DEFAULT 0`,
   - `last_income_week integer NOT NULL DEFAULT 0`,
   - `setup_completed_at timestamp` (NULLABLE — null means "setup wizard not yet completed"),
   - `created_at timestamp NOT NULL DEFAULT now()`,
   - `updated_at timestamp NOT NULL DEFAULT now()`.

   Naming: snake_case columns at DB level, camelCase Drizzle field names (`playerId`, `coBalance`, `lastIncomeWeek`, `setupCompletedAt`, `createdAt`, `updatedAt`) per the table-naming convention in `architecture-territory/implementation-patterns-consistency-rules.md` §Naming Patterns.

2. **1:1 enforcement via UNIQUE index on `player_id`** — The Drizzle table definition adds `uniqueIndex('player_territories_player_id_unique').on(table.playerId)` (mirror the `armies_player_id_unique` pattern at `src/db/schema.ts:67`). A second insert for the same `player_id` MUST fail with a Postgres unique-constraint violation. This is the canonical 1:1 enforcement for territory ownership (see `core-architectural-decisions.md` §Authentication & Security: "ownership implicit via `session.playerId`").

3. **No seed data** — The migration adds the table only. NO row inserts. Rows are created lazily on first access (AC #4). The migration MUST NOT contain any `INSERT INTO player_territories` statement. This is intentional — pre-seeding for every player would couple territory creation to user creation and leak abandoned rows for players who never open the Territoires tab.

4. **Lazy-bootstrap helper `getOrCreatePlayerTerritory(playerId)`** — A new query module `src/db/queries/territory.ts` exports:
   ```ts
   export async function getOrCreatePlayerTerritory(playerId: string): Promise<PlayerTerritory>
   ```
   Behaviour:
   - Reads `player_territories` for the given `player_id`.
   - If a row exists, returns it.
   - If no row exists, inserts one with `co_balance = 0`, `last_income_week = 0`, `setup_completed_at = null`, then returns the inserted row (use Drizzle `.returning()` — do NOT do a second SELECT round-trip).
   - The read+insert MUST run inside a single `db.transaction()` to avoid the duplicate-create race when two tabs (or two parallel server-fn calls) hit the bootstrap simultaneously. Inside the transaction, after the `findFirst` returns no row, the `INSERT` MAY still race against another transaction — that race is closed by the AC #2 unique constraint: catch the duplicate-key error (Postgres SQLSTATE `23505`, surfaced by `pg` as `error.code === '23505'`), and re-read the row that the winning transaction inserted. Return that row. Treat the catch path as the "expected concurrent-create" branch, NOT a generic error swallow — log nothing, surface nothing.
   - The function does NOT call any auth code, NOT any session code, NOT any server-fn middleware. It is a pure DB helper: in → `playerId`, out → `PlayerTerritory`. Auth / `session.playerId` resolution happens at the server-fn layer in Story 1.5.
   - Type the return as the inferred `typeof playerTerritories.$inferSelect`. Re-export the type alias from the same module: `export type PlayerTerritory = typeof playerTerritories.$inferSelect`.

5. **No server function in this story** — Story 1.4 deliberately stops at the DB helper. `src/server-fns/territory-queries.ts` (and `loadTerritoryDashboardFn` itself) is created in Story 1.5. This story MUST NOT create `src/server-fns/territory-queries.ts`, MUST NOT create `src/server-fns/territory-mutations.ts`, MUST NOT modify `src/routes/territories.tsx`. Scope discipline: schema + migration + helper + tests only. The previous story (1.3) record contains a similar discipline note — the resolver was wired into existing handlers but did NOT create new server-fn files.

6. **Schema export and `queries/index.ts` re-export** — In `src/db/schema.ts`, add `playerTerritories` after `factions` (it depends on `players`, which is declared earlier). Define a `relations(playerTerritories, …)` block linking back to `players` (`one(players, { fields: [playerTerritories.playerId], references: [players.id] })`) — keep the existing relations style; no `relations(players, …)` block exists today, so do NOT add a back-relation on `players` (that would be a wider refactor outside this story's scope; flag in completion notes if you feel the urge). In `src/db/queries/index.ts`, append `export * from './territory'` so consumers (Story 1.5) can `import { getOrCreatePlayerTerritory } from '@/db/queries'`.

7. **Migration generation and snapshot** — Run `pnpm db:generate` to produce a new Drizzle migration file under `drizzle/` (expected `0007_*.sql`). The generated SQL MUST contain:
   - `CREATE TABLE "player_territories"` with all columns and types from AC #1,
   - `ADD CONSTRAINT "player_territories_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action` (or the equivalent inline constraint syntax that Drizzle emits — see `drizzle/0006_jazzy_prodigy.sql` for the canonical FK pattern),
   - `CREATE UNIQUE INDEX "player_territories_player_id_unique" ON "player_territories" USING btree ("player_id")`,
   - integer defaults (`DEFAULT 0`) on `co_balance` and `last_income_week`,
   - `DEFAULT now()` on `created_at` and `updated_at`.
   The corresponding `drizzle/meta/0007_snapshot.json` is regenerated by drizzle-kit. Commit BOTH the SQL and the snapshot. Do NOT hand-edit either file unless the helper note in AC #4 forces it (it does not — generated SQL is sufficient).

8. **Static migration test — `src/db/__tests__/player-territories-migration.test.ts`** — This test reads the new `drizzle/0007_*.sql` file with `readFileSync` (mirror `src/db/__tests__/factions-migration.test.ts` lines 1–28 verbatim for the boilerplate). Assertions, each as a single coupled regex per the MEMORY.md assertion-coupling rule:
   - **[1.4-MIG-001][P0]** FK to `players.id` with `ON DELETE cascade`:
     ```ts
     expect(sql).toMatch(/FOREIGN KEY \("player_id"\) REFERENCES "public"\."players"\("id"\) ON DELETE cascade/)
     ```
   - **[1.4-MIG-002][P0]** unique index on `player_id`:
     ```ts
     expect(sql).toMatch(/CREATE UNIQUE INDEX "player_territories_player_id_unique" ON "player_territories"[^;]*\("player_id"\)/)
     ```
   - **[1.4-MIG-003][P1]** integer column with default `0` for `co_balance` (single coupling):
     ```ts
     expect(sql).toMatch(/"co_balance" integer DEFAULT 0 NOT NULL/)
     ```
   - **[1.4-MIG-004][P1]** integer column with default `0` for `last_income_week` (single coupling):
     ```ts
     expect(sql).toMatch(/"last_income_week" integer DEFAULT 0 NOT NULL/)
     ```
   - **[1.4-MIG-005][P1]** `setup_completed_at` nullable timestamp (NO `NOT NULL`):
     ```ts
     expect(sql).toMatch(/"setup_completed_at" timestamp(?! NOT NULL)/)
     ```
   - **[1.4-MIG-006][P0]** No `INSERT INTO player_territories` (AC #3):
     ```ts
     expect(sql).not.toMatch(/INSERT INTO[^;]*player_territories/i)
     ```
   The exact migration filename suffix is unknown until `pnpm db:generate` runs (drizzle-kit picks a random adjective+noun); the test MUST glob for `drizzle/0007_*.sql` rather than hard-coding the suffix. Pattern: `glob.sync('drizzle/0007_*.sql', { cwd: root })[0]` (use `node:fs/promises` `readdir` + filter if `glob` is not a dependency — it is not, per `package.json`; prefer `readdirSync(resolve(root, 'drizzle')).find(f => f.startsWith('0007_') && f.endsWith('.sql'))`).

8. **Integration test — `src/db/__tests__/player-territories-bootstrap.test.ts`** (uses real test DB, mirrors the harness in `src/db/__tests__/factions-seed.test.ts`):
   - Boilerplate (Pool + drizzle + DATABASE_URL guard + `afterAll(() => pool.end())`) matches the existing pattern at `src/db/__tests__/factions-seed.test.ts:1–20`.
   - Setup helper: insert a throwaway `players` row inside the test (with a unique username like `terr-test-${crypto.randomUUID()}`); cleanup in `afterAll` deletes the player (CASCADE from AC #1 removes the territory automatically — verify this in the test).
   - **[1.4-INT-001][P0]** First call to `getOrCreatePlayerTerritory(playerId)` returns a row with `coBalance === 0`, `lastIncomeWeek === 0`, `setupCompletedAt === null`. Couple the existence + zero balance in a single assertion: `expect(t).toMatchObject({ coBalance: 0, lastIncomeWeek: 0, setupCompletedAt: null })`. Capture `t.id` for the next assertion.
   - **[1.4-INT-002][P0]** Second call with the same `playerId` returns a row with the SAME `id` as the first call (no second insert). Single assertion: `expect(second.id).toBe(first.id)`. Then: `const count = (await db.select().from(playerTerritories).where(eq(playerTerritories.playerId, playerId))).length; expect(count).toBe(1)`.
   - **[1.4-INT-003][P0]** Concurrent-create race: invoke two `getOrCreatePlayerTerritory(otherPlayerId)` calls in parallel via `Promise.all`. Both promises resolve to a row with the SAME `id`. After the await, `SELECT COUNT(*)` for that player returns 1. Single coupled assertion on the resolved IDs: `expect(a.id).toBe(b.id)`. This proves the AC #4 "duplicate-key catch + re-read" branch is wired, not just declared.
   - **[1.4-INT-004][P1]** ON DELETE CASCADE: insert a player, bootstrap their territory, DELETE the player row, assert the `player_territories` row is gone (single coupled assertion: `expect((await db.select().from(playerTerritories).where(eq(playerTerritories.playerId, deletedId))).length).toBe(0)`).

   Cleanup in `afterAll` MUST surface delete failures (do NOT swallow with `.catch(() => {})` — Story 1.3 review item flagged this anti-pattern; see `_bmad-output/implementation-artifacts/1-3-…#Review Findings`). If you create N players, store their ids in an array and run `await db.delete(players).where(inArray(players.id, ids))` — let any error throw.

9. **No type errors, no lint errors, no new dependencies** — `pnpm typecheck && pnpm lint` green. `package.json` unchanged. The 3 pre-existing test failures known to Stories 1.1/1.2/1.3 (`scaffold.test.ts [1.1-UNIT-006]`, `queries-match-results [3.3-QRY-008]`, `queries-post-match [4.1-QRY-007]`) remain unchanged; no NEW failures introduced. Run `pnpm vitest run src/db/__tests__/player-territories-migration.test.ts src/db/__tests__/player-territories-bootstrap.test.ts` and confirm both files green.

## Tasks / Subtasks

- [x] **Task 1: Add `playerTerritories` to Drizzle schema** (AC: #1, #2, #6)
  - [x] In `src/db/schema.ts`, after the `factions` table definition (line 57), declare:
    ```ts
    export const playerTerritories = pgTable('player_territories', {
      id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
      playerId: text('player_id').notNull().references(() => players.id, { onDelete: 'cascade' }),
      coBalance: integer('co_balance').notNull().default(0),
      lastIncomeWeek: integer('last_income_week').notNull().default(0),
      setupCompletedAt: timestamp('setup_completed_at'),
      createdAt: timestamp('created_at').notNull().defaultNow(),
      updatedAt: timestamp('updated_at').notNull().defaultNow(),
    }, (table) => [
      uniqueIndex('player_territories_player_id_unique').on(table.playerId),
    ])
    ```
  - [x] Add a relations block:
    ```ts
    export const playerTerritoriesRelations = relations(playerTerritories, ({ one }) => ({
      player: one(players, { fields: [playerTerritories.playerId], references: [players.id] }),
    }))
    ```
    Place the relations block in the relations section near the bottom of the file (after `matchParticipantsRelations`, line ~221) to keep all `relations(...)` calls grouped — see existing convention at `src/db/schema.ts:204–222`.
  - [x] Verify imports — `pgTable`, `text`, `integer`, `timestamp`, `uniqueIndex`, `relations` are all already imported at the top of `schema.ts` (line 4–5). No new imports needed.

- [x] **Task 2: Generate Drizzle migration** (AC: #7)
  - [x] Run `pnpm db:generate` — drizzle-kit emits `drizzle/0007_reflective_blade.sql` and updates `drizzle/meta/0007_snapshot.json` + `_journal.json`.
  - [x] Inspect the generated SQL — confirm CREATE TABLE, FK with cascade, unique index, integer defaults, nullable `setup_completed_at`. If any clause is missing, the schema definition (Task 1) is wrong — fix Task 1 and regenerate, do NOT hand-edit the SQL.
  - [x] No augmentation needed — unlike Story 1.1, this migration has no seed/backfill. The drizzle-generated SQL is shipped as-is.

- [x] **Task 3: Create `src/db/queries/territory.ts` with `getOrCreatePlayerTerritory`** (AC: #4, #6)
  - [x] Create the file. Imports:
    ```ts
    import { eq } from 'drizzle-orm'
    import { db } from '@/db'
    import { playerTerritories } from '@/db/schema'
    export type PlayerTerritory = typeof playerTerritories.$inferSelect
    ```
  - [x] Implement `getOrCreatePlayerTerritory`:
    ```ts
    export async function getOrCreatePlayerTerritory(playerId: string): Promise<PlayerTerritory> {
      return db.transaction(async (tx) => {
        const existing = await tx.select().from(playerTerritories)
          .where(eq(playerTerritories.playerId, playerId)).limit(1)
        if (existing[0]) return existing[0]
        try {
          const [created] = await tx.insert(playerTerritories)
            .values({ playerId })
            .returning()
          return created
        } catch (err) {
          // Concurrent insert by another transaction — re-read the row that won the race.
          // Postgres SQLSTATE 23505 = unique_violation on player_territories_player_id_unique.
          if (isUniqueViolation(err)) {
            const [winner] = await tx.select().from(playerTerritories)
              .where(eq(playerTerritories.playerId, playerId)).limit(1)
            if (winner) return winner
          }
          throw err
        }
      })
    }

    function isUniqueViolation(err: unknown): boolean {
      return typeof err === 'object' && err !== null && 'code' in err && (err as { code: unknown }).code === '23505'
    }
    ```
    Defaults `coBalance: 0`, `lastIncomeWeek: 0`, `setupCompletedAt: null`, `createdAt`, `updatedAt` are all set by the DB column defaults — do NOT pass them in `.values({})`. This keeps the helper resilient if defaults later change in one place (the schema).
  - [x] Append `export * from './territory'` to `src/db/queries/index.ts`.

- [x] **Task 4: Static migration test** (AC: #8 — first one, the migration test)
  - [x] Create `src/db/__tests__/player-territories-migration.test.ts`. Boilerplate (`readFileSync`, glob for `0007_*.sql`, `DATABASE_URL` guard NOT needed for this file — it only reads SQL, no DB connection).
  - [x] Resolve the migration filename: `const file = readdirSync(resolve(root, 'drizzle')).find(f => /^0007_.*\.sql$/.test(f)); if (!file) throw new Error('migration 0007 not generated yet — run pnpm db:generate')`.
  - [x] Implement the 6 assertions from AC #8 (regex-coupled, MEMORY.md rule).

- [x] **Task 5: Integration test — bootstrap behaviour** (AC: #8 — second one, the integration test)
  - [x] Create `src/db/__tests__/player-territories-bootstrap.test.ts`.
  - [x] Boilerplate from `factions-seed.test.ts:1–20`. Add `import { players, playerTerritories } from '../schema'` and `import { getOrCreatePlayerTerritory } from '../queries/territory'`.
  - [x] Use `crypto.randomUUID()` for player ids and unique usernames to avoid cross-test collisions.
  - [x] Implement the 4 INT-* tests from AC #8. The concurrent-create test (1.4-INT-003) runs without test-only branch — both `Promise.all` calls resolve to the same id. No `setTimeout` branch added (not needed; race is exercised by idempotency guarantee via unique constraint).
  - [x] Cleanup in `afterAll` MUST surface delete failures (no `.catch(() => {})`).

- [x] **Task 6: Verification** (AC: #9)
  - [x] `pnpm typecheck` — green.
  - [x] `pnpm lint` — pre-existing failure in `faction-resolver.ts` (Story 1.3, `no-irregular-whitespace`); no new failures introduced.
  - [x] `pnpm vitest run src/db/__tests__/player-territories-migration.test.ts src/db/__tests__/player-territories-bootstrap.test.ts` — 10/10 green.
  - [x] `pnpm vitest run` — total failure count unchanged (still 3 pre-existing failures only: 1.1-UNIT-006, 3.3-QRY-008, 4.1-QRY-007).
  - [x] Apply the migration locally: `pnpm db:migrate` — applied to dev DB and test DB. `\d player_territories` confirms correct schema.

## Dev Notes

### Architecture compliance

- **Naming** ([Source: architecture-territory/implementation-patterns-consistency-rules.md#Naming-Patterns]):
  - Table `player_territories` (snake_case plural) ✓
  - Columns `player_id`, `co_balance`, `last_income_week`, `setup_completed_at` (snake_case) ✓
  - Drizzle exports `playerTerritories` (camelCase const) ✓
- **Auth boundary** ([Source: architecture-territory/core-architectural-decisions.md#Authentication-Security]): "ownership implicit via `session.playerId` — `player_territories` is 1:1 with players." This story does NOT touch auth — it just makes the 1:1 enforceable at the DB level via the unique index (AC #2).
- **Data Access Boundary** ([Source: architecture-territory/project-structure-boundaries.md#Architectural-Boundaries]): "All DB access goes through `src/db/queries/territory.ts` — server functions NEVER import Drizzle tables directly." This story creates that file, with `getOrCreatePlayerTerritory` as the first export. Story 1.5's `loadTerritoryDashboardFn` will import from this module, NOT from `@/db/schema` directly.
- **`withCoTransaction` is NOT in scope** for this story. The shared CO-transaction utility ([Source: implementation-patterns-consistency-rules.md#Format-Patterns]) lands with Story 3.2 (per `sprint-status.yaml`). Don't pre-stub it here. The lazy bootstrap inserts a row with default `co_balance = 0` — no co_transactions row is created (the table doesn't even exist yet). Resist the urge to "add a starter income_generation transaction" — that comes later in Epic 5.
- **No `relations(players, …)` back-link** — there is currently no `relations(players, ...)` declaration in the codebase. Adding one to back-reference territories would force decisions about every other relation off `players` (sessions, armies, matches, …) — out of scope. The forward relation `playerTerritoriesRelations` is sufficient for Story 1.5's needs.

### Library / framework requirements

- **Drizzle ORM 0.45.x, drizzle-kit 0.31.x** — already installed. Reuse the patterns in `src/db/schema.ts` (lines 32–69 for `players`/`factions`/`armies`).
- **`node-postgres` (`pg`)** — duplicate-key errors surface with `error.code === '23505'` (Postgres SQLSTATE for `unique_violation`). The detection helper `isUniqueViolation` in Task 3 is a 4-line type guard — do NOT pull in `@types/pg` error subtypes or a npm wrapper.
- **No new dependencies.** No `glob`, no `pg-error-constants`, no `uuid` (already use `crypto.randomUUID()` everywhere).
- **`crypto.randomUUID()`** is the project convention for PK generation (see every `pgTable` `.$defaultFn(...)` in `schema.ts`). Available natively on Node 20+. Do NOT import `uuid`.

### File structure

```
src/db/
├── schema.ts                                                  ← MODIFIED (Task 1)
├── queries/
│   ├── index.ts                                               ← MODIFIED (Task 3, append re-export)
│   └── territory.ts                                           ← NEW (Task 3)
└── __tests__/
    ├── player-territories-migration.test.ts                   ← NEW (Task 4)
    └── player-territories-bootstrap.test.ts                   ← NEW (Task 5)

drizzle/
├── 0007_<adjective>_<noun>.sql                                ← NEW (Task 2)
└── meta/
    ├── 0007_snapshot.json                                     ← NEW (Task 2, auto-generated)
    └── _journal.json                                          ← MODIFIED (Task 2, auto-generated)
```

No other files touched. **Do NOT create** `src/server-fns/territory-queries.ts`, `src/server-fns/territory-mutations.ts`, `src/components/territory/*`, or modify `src/routes/territories.tsx` — all reserved for Story 1.5.

### Testing requirements

- **Test DB harness:** copy the boilerplate from `src/db/__tests__/factions-seed.test.ts:1–20` (Pool, drizzle, DATABASE_URL guard, `afterAll(pool.end)`). Do NOT wrap in a custom `setup`/`teardown` helper module — the existing tests inline the harness, follow that convention.
- **Assertion-coupling rule (MEMORY.md) — MANDATORY.** Every assertion that ties a fact to a property MUST be a single coupled expression. Forbidden examples:
  ```ts
  // ❌ BAD — passes if the FK clause exists somewhere AND the cascade clause exists somewhere, even on different tables
  expect(sql).toContain('REFERENCES "public"."players"("id")')
  expect(sql).toContain('ON DELETE cascade')

  // ✅ GOOD — single coupled regex, FK + cascade on the same expression
  expect(sql).toMatch(/FOREIGN KEY \("player_id"\) REFERENCES "public"\."players"\("id"\) ON DELETE cascade/)
  ```
  ```ts
  // ❌ BAD — second call could return a *different* territory row that happens to also be valid
  expect(second).toBeTruthy()
  expect(second.playerId).toBe(playerId)

  // ✅ GOOD — couples first/second on the same id
  expect(second.id).toBe(first.id)
  ```
- **Type-level enforcement (optional, recommended):** add at the top of `queries/territory.ts` (after the type alias) a no-op line `const _typeCheck: PlayerTerritory['coBalance'] extends number ? true : false = true; void _typeCheck` if you want a compile-time guard that `coBalance` infers as `number`. Story 1.2 / 1.3 used this pattern. Skip if it feels redundant given the schema is the single source.
- **Vitest discovery:** tests under `src/**/*.test.ts` are auto-discovered ([Source: vitest.config.ts via MEMORY.md]). The two new files will be picked up by the next `pnpm vitest run` automatically.
- **Cleanup discipline:** afterAll deletes MUST surface failures — Story 1.3 review explicitly flagged `.catch(() => {})` in the integration test and required the patch. Don't repeat the mistake.

### Previous story intelligence

**Story 1.1** (factions table + backfill — `_bmad-output/implementation-artifacts/1-1-…md`):
- Established the static-migration-test pattern (`src/db/__tests__/factions-migration.test.ts`) — copy the boilerplate verbatim. Migration file is read with `readFileSync(resolve(root, 'drizzle/0005_chemical_goliath.sql'), 'utf-8')`. For Story 1.4, the filename is unknown until generation, so use `readdirSync` + `find` instead of hard-coding (Task 4 details).
- Established the `factions-seed.test.ts` pattern for live-DB integration tests — copy the Pool/drizzle/afterAll boilerplate.
- Path alias is `@/*` (NOT `~/*`) — see Story 1.2 Debug Log.

**Story 1.2** (faction-config — `_bmad-output/implementation-artifacts/1-2-…md`):
- Established the type-level guard pattern (`const _: SomeType = ...; void _`) for compile-time invariants. Apply to `queries/territory.ts` if you want to lock the inferred return type.

**Story 1.3** (faction resolver — `_bmad-output/implementation-artifacts/1-3-…md`):
- **Review finding to mirror:** `.catch(() => {})` in `afterAll` was a code-review reject — surface delete failures instead. Apply the same discipline to Task 5 cleanup.
- **Review finding to mirror:** add a test asserting "no orphans / no duplicates" was added in 1.3 (variant uniqueness). For 1.4, the equivalent is the AC #8 1.4-INT-002 single-row-after-bootstrap-twice assertion plus AC #2 unique constraint backed by 1.4-MIG-002.
- **Scope discipline:** Story 1.3 deliberately did NOT modify the parser (kept `ParsedArmy.faction: string` as raw OWB label). Same discipline here: do NOT pre-build `loadTerritoryDashboardFn` or modify the route — those are Story 1.5's deliverables.

### Git intelligence summary

Recent commits relevant to this story (last 5):

- `bf9db9c story 1.3: canonical faction resolver wired into OWB import` — most recent. Established the integration-test placement convention (`src/db/__tests__/` for real-DB tests).
- `03cf754 story 1.2: faction-config module + 18-faction registry` — the type-level guard pattern.
- `dba3e22 story 1.1: factions table + backfill armies.faction FK` — the migration-test pattern + the FK-with-RESTRICT precedent (`armies.faction` uses RESTRICT; `player_territories.player_id` uses CASCADE — different rationale, see AC #1: territory follows the player; armies do not because armies are shared/transferable).
- `a31a82e cleanup: remove obsolete test-artifacts scaffolding` — unrelated.
- `a5040c9 update my_territories: week 5 — nouvelle lisière forestière` — unrelated content update.

### Project context reference

- **MEMORY.md — assertion-coupling rule:** MANDATORY for every test in this story (see Testing requirements §Assertion-coupling rule above and Story 1.3 review history).
- **MEMORY.md — path alias `@/*` foot-gun:** use `@/db/queries`, `@/db/schema`. NOT `~/`.
- **MEMORY.md — env var guard pattern:** the existing `src/db/index.ts` already enforces `if (!DATABASE_URL) throw`. The two new test files MUST replicate the same guard at the top of the file (mirror `factions-seed.test.ts:11–13`).
- **MEMORY.md — Tailwind v4 / TanStack CLI / TanStack Form notes:** do NOT apply to this story (no UI, no form, no scaffold change).
- **Story files location:** `_bmad-output/implementation-artifacts/<key>.md` ✓.

### References

- [Source: `_bmad-output/planning-artifacts/epics/epic-1-territory-foundation-faction-recognition.md#Story-1.4`] — full ACs and business context.
- [Source: `_bmad-output/planning-artifacts/architecture-territory/core-architectural-decisions.md#Data-Architecture`] — `player_territories` table role and 1:1 with players.
- [Source: `_bmad-output/planning-artifacts/architecture-territory/core-architectural-decisions.md#Authentication-Security`] — ownership implicit via `session.playerId`.
- [Source: `_bmad-output/planning-artifacts/architecture-territory/implementation-patterns-consistency-rules.md#Naming-Patterns`] — table/column naming.
- [Source: `_bmad-output/planning-artifacts/architecture-territory/project-structure-boundaries.md#Architectural-Boundaries`] — Data Access Boundary requires all DB access via `src/db/queries/territory.ts`.
- [Source: `src/db/schema.ts:32–69`] — `players`, `factions`, `armies` reference patterns (PK + `crypto.randomUUID()`, FK + unique index, relations block).
- [Source: `src/db/schema.ts:67`] — `armies_player_id_unique` — the `uniqueIndex` pattern to mirror for `player_territories_player_id_unique`.
- [Source: `drizzle/0006_jazzy_prodigy.sql`] — canonical FK SQL shape from drizzle-kit (cascade pattern is identical except `restrict` → `cascade`).
- [Source: `src/db/__tests__/factions-seed.test.ts`] — integration test boilerplate to copy verbatim.
- [Source: `src/db/__tests__/factions-migration.test.ts:1–28`] — static-SQL-test boilerplate to mirror.
- [Source: `_bmad-output/implementation-artifacts/1-3-owb-import-script-canonical-faction-detection-and-assignment.md#Review-Findings`] — `.catch(() => {})` anti-pattern in afterAll cleanup.
- [Source: `src/db/queries/index.ts`] — re-export convention for query modules.

### Project Structure Notes

- `src/db/queries/territory.ts` is a **new file** — verified absent: `ls src/db/queries/` shows only `armies.ts evolutions.ts index.ts matches/ players.ts units.ts`. No symbol conflict.
- `src/db/__tests__/player-territories-*.test.ts` are **new files** in an existing directory.
- `drizzle/0007_*.sql` — next sequential number after `0006_jazzy_prodigy.sql`. drizzle-kit will pick the suffix automatically.
- No changes to `tsconfig.json`, `vitest.config.ts`, `eslint.config.js`, `package.json`, `drizzle.config.ts`.
- The `relations(playerTerritories, …)` block is added; no existing `relations(players, …)` exists — do NOT add one (out of scope, see Architecture compliance §No `relations(players, …)` back-link).

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- TypeScript error on `db.transaction()` return: `[created]` destructuring yields `T | undefined` — fixed with explicit guard `if (!created) throw new Error(...)`. Pattern is correct: `.returning()` should always return one row after an insert, but TS can't prove it statically.
- Pre-existing lint error in `src/lib/faction-resolver.ts` (`no-irregular-whitespace` at line 9:15) — present before this story, not introduced here.
- Concurrent-create test (INT-003): no `setTimeout` test-only branch added. The idempotency is guaranteed by the unique constraint catch+re-read path. The test passes reliably on a single machine; if flakes surface in CI the strategy documented in AC #8 applies.

### Completion Notes List

- `player_territories` table created with all 7 columns: PK UUID, FK `player_id` → `players.id` ON DELETE CASCADE, integer defaults for CO balance and income week, nullable `setup_completed_at`, timestamps.
- `uniqueIndex('player_territories_player_id_unique')` enforces 1:1 player↔territory at DB level — mirrors `armies_player_id_unique` pattern.
- Migration `drizzle/0007_reflective_blade.sql` generated by drizzle-kit, not hand-edited. Applied to both dev DB and test DB.
- `getOrCreatePlayerTerritory(playerId)` runs inside a `db.transaction()`. Race on concurrent first-access is closed by catching Postgres SQLSTATE `23505` and re-reading the winner row. No test-only code path added to production code.
- Cleanup in `afterAll` of integration test uses `inArray` delete with no `.catch()` swallowing — complies with Story 1.3 review finding.
- No back-relation `relations(players, …)` added — would require decisions on all other relations off `players`; flagged as intentional non-scope per Dev Notes.
- No server-fn files created (`src/server-fns/territory-queries.ts`, etc.) — scope discipline maintained per AC #5.

### File List

- `src/db/schema.ts` — modified: added `playerTerritories` table + `playerTerritoriesRelations`
- `src/db/queries/territory.ts` — new: `PlayerTerritory` type alias + `getOrCreatePlayerTerritory`
- `src/db/queries/index.ts` — modified: appended `export * from './territory'`
- `drizzle/0007_reflective_blade.sql` — new (auto-generated by drizzle-kit)
- `drizzle/meta/0007_snapshot.json` — new (auto-generated)
- `drizzle/meta/_journal.json` — modified (auto-generated)
- `src/db/__tests__/player-territories-migration.test.ts` — new: 6 static SQL assertions
- `src/db/__tests__/player-territories-bootstrap.test.ts` — new: 4 integration tests
