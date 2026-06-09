# Story 1.1: DB Migration — `factions` Table and Backfill `armies.faction` FK

Status: done

## Story

As a developer,
I want the `factions` table to exist with all 18 canonical campaign factions seeded and every existing `armies.faction` free-text value backfilled to the corresponding canonical faction ID,
so that the territory module has a stable, normalized foundation for faction-aware logic without breaking existing army data.

## Acceptance Criteria

1. **factions table schema** — The Drizzle migration creates `factions` with columns: `id text PK`, `name text NOT NULL UNIQUE` (English canonical, snake_case hyphenated kebab-case per `docs/factions.md` IDs), `display_name text NOT NULL` (French label). No timestamps required (static reference data).
2. **Canonical seed from `docs/factions.md`** — Exactly 18 rows seeded. Source is a strongly-typed TypeScript module at `src/db/seeds/factions.ts` exporting `CANONICAL_FACTIONS: ReadonlyArray<{ id: string; name: string; displayName: string }>` — never hardcoded inline in the migration SQL. Seed values match `docs/factions.md` exactly (IDs like `kingdom-of-bretonnia`, English `name` column = `Kingdom of Bretonnia`, French `display_name` = `Royaume de Bretonnie`).
3. **Seed integration** — Seed is idempotent (`ON CONFLICT (id) DO NOTHING` or equivalent Drizzle upsert). Runs automatically as part of the migration sequence so a fresh DB boot (`pnpm db:migrate`) produces 18 rows without any separate command.
4. **FK constraint on `armies.faction`** — After backfill, `armies.faction` has a FK constraint referencing `factions.id` with `ON DELETE RESTRICT`. The column remains `NOT NULL` (matches existing schema).
5. **Backfill existing free-text values** — Migration script maps every existing `armies.faction` free-text value to the canonical `factions.id`. Mapping handles case, accents, whitespace variants (e.g., `"Kingdom of Bretonnia"`, `"kingdom of bretonnia"`, `"Royaume de Bretonnie"` all resolve to `kingdom-of-bretonnia`).
6. **Fail-loud on unmapped values** — If ANY existing `armies.faction` row cannot be resolved, the migration aborts with a descriptive error listing the unmapped raw values. No silent defaults, no fallback faction. The transaction rolls back so the DB stays in the pre-migration state.
7. **Drizzle introspect verification** — Running `pnpm drizzle-kit introspect` (or reading the generated snapshot) shows `armies.faction` with FK constraint to `factions.id` and `ON DELETE RESTRICT`.
8. **Existing schema preserved** — `armies.playerId` uniqueIndex, `armies.initialXpCompletedAt`, all other columns and existing FK behaviors remain unchanged. No regression in existing army queries.
9. **Fresh boot test** — A test (integration) boots a fresh DB, runs migrations, queries `SELECT COUNT(*) FROM factions` — returns 18. Queries a specific canonical row (e.g., `chaos-dwarfs`) and asserts `display_name = 'Nains du Chaos'`.

## Tasks / Subtasks

- [x] **Task 1: Create canonical faction source module** (AC: #2, #3)
  - [x] Create `src/db/seeds/factions.ts` exporting `CANONICAL_FACTIONS` as a `ReadonlyArray<{ id: string; name: string; displayName: string }>` with exactly 18 entries transcribed from `docs/factions.md`.
  - [x] Also export a typed union `CanonicalFactionId = typeof CANONICAL_FACTIONS[number]['id']` for downstream consumers (Story 1.2 will import this).
  - [x] Add a unit test `src/db/seeds/__tests__/factions.test.ts` asserting: length === 18, IDs are unique, IDs match the kebab-case pattern `/^[a-z]+(-[a-z]+)*$/`, every ID matches a line in `docs/factions.md` (read file at test time to prevent drift).

- [x] **Task 2: Add `factions` table to Drizzle schema** (AC: #1)
  - [x] In `src/db/schema.ts`, add the `factions` pgTable after `armies` definition: `id text PK`, `name text notNull unique`, `displayName text notNull` (DB column `display_name`).
  - [x] Export as `export const factions = pgTable('factions', ...)`.
  - [x] Do NOT change `armies.faction` column definition yet — FK is added in Task 4 after backfill runs, to keep `pnpm db:generate` output clean.

- [x] **Task 3: Generate migration SQL (structural)** (AC: #1, #7)
  - [x] Run `pnpm db:generate` to produce a new migration file under `drizzle/` (expected `0005_*.sql`).
  - [x] Verify the generated SQL creates the `factions` table with the correct columns and unique constraint on `name`.
  - [x] Do NOT commit yet — Task 4 augments the same migration with seed + backfill + FK SQL.

- [x] **Task 4: Augment migration with seed + backfill + FK** (AC: #2, #3, #4, #5, #6)
  - [x] Append to the generated `0005_*.sql`:
    1. **Seed INSERT** — generated from `scripts/emit-factions-seed.ts` (codegen script).
    2. **Backfill UPDATE** — uses `lower(unaccent(trim()))` + exhaustive variants VALUES list.
    3. **Fail-loud guard** — RAISE EXCEPTION with array of unmapped values.
    4. **FK constraint** — managed in `drizzle/0006_jazzy_prodigy.sql` (Drizzle-generated to stay in sync with snapshot).
  - [x] Update `src/db/schema.ts`: add `.references(() => factions.id, { onDelete: 'restrict' })` on `armies.faction`.

- [x] **Task 5: Variant mapping for backfill** (AC: #5, #6)
  - [x] Inventory existing `armies.faction` raw values in the production/dev DB (`SELECT DISTINCT faction FROM armies`). Document findings in the migration file as a comment header.
  - [x] Build the variants table covering: exact English canonical (`Kingdom of Bretonnia`), exact French display (`Royaume de Bretonnie`), lowercased, accented vs unaccented, known OWB export variants.
  - [x] Include a test at `src/db/__tests__/factions-migration.test.ts` covering known variant mappings and live DB FK integrity.

- [x] **Task 6: Integration test — fresh boot** (AC: #9)
  - [x] Add `src/db/__tests__/factions-seed.test.ts`: connects to test DB, asserts 18 rows, asserts `chaos-dwarfs` has `displayName === 'Nains du Chaos'`.

- [x] **Task 7: Update Drizzle snapshot and verify** (AC: #7)
  - [x] `drizzle/meta/0005_snapshot.json` and `0006_snapshot.json` reflect the new table + FK (generated by drizzle-kit).
  - [x] `pnpm typecheck && pnpm lint && pnpm test` — all green (3 pre-existing failures unrelated to this story).
  - [x] Migrations applied successfully to both dev and test DBs.

## Dev Notes

### Architecture compliance

- **Source of canonical truth:** `docs/factions.md` is the ONLY canonical source. The TypeScript module `src/db/seeds/factions.ts` transcribes it; the DB `factions` table is seeded from the TS module. Never invent a new canonical list elsewhere.
- **Naming (from `architecture-territory/implementation-patterns-consistency-rules.md`):**
  - DB table: `factions` (snake_case plural) ✓
  - DB columns: `id`, `name`, `display_name` (snake_case) ✓
  - Drizzle export: `factions` (camelCase would conflict — table name is already lowercase plural)
  - FK on `armies.faction`: `ON DELETE RESTRICT` (explicit per AC #4)
- **Faction ID format:** kebab-case, lowercase, English (e.g., `kingdom-of-bretonnia`). This matches `docs/factions.md` exactly and is NOT to be converted to snake_case.
- **No new middleware, no new server functions, no new components** in this story. Schema + migration + seed + backfill only.

### Library / framework requirements

- **Drizzle ORM** `^0.45.1`, **drizzle-kit** `^0.31.9` (already in `package.json`). Use the existing patterns from `src/db/schema.ts`.
- **PostgreSQL `unaccent` extension** — required for robust accent-insensitive variant matching. The migration must `CREATE EXTENSION IF NOT EXISTS unaccent;` before using it. Verify the prod DB role has permission (Supabase/self-hosted PG both support it by default; if not, fall back to an explicit exhaustive variant list).
- **No new dependencies added.** If a variant mapping needs fuzzy matching beyond unaccent+lower+trim, prefer extending the explicit variants list over adding a library.

### File structure

```
src/db/
├── schema.ts                  ← ADD `factions` pgTable + FK on armies.faction
├── seeds/                     ← NEW directory
│   ├── factions.ts            ← NEW — CANONICAL_FACTIONS export
│   └── __tests__/
│       └── factions.test.ts   ← NEW — length, uniqueness, ID pattern, docs drift check
├── __tests__/
│   ├── factions-seed.test.ts         ← NEW — fresh-boot integration test
│   └── factions-migration.test.ts    ← NEW — variant backfill test
drizzle/
└── 0005_*.sql                 ← NEW generated + augmented (seed + backfill + FK)
scripts/
└── emit-factions-seed.ts      ← NEW (codegen for auditable seed INSERT)
```

### Testing requirements

- **Unit test** `src/db/seeds/__tests__/factions.test.ts`:
  - Assert `CANONICAL_FACTIONS.length === 18`.
  - Assert all IDs unique and match `/^[a-z]+(-[a-z]+)*$/`.
  - Read `docs/factions.md` at test time, parse the markdown table, assert every ID in the file appears in `CANONICAL_FACTIONS` and vice versa (prevents silent drift).
  - Use a single `describe.each(CANONICAL_FACTIONS)` block for per-faction assertions.
- **Integration tests** require a real Postgres instance. Follow the pattern in `src/db/__tests__/queries-record.test.ts` (existing).
- **Assertion coupling rule** (from MEMORY.md): pair related facts in a single regex/string.
  - Good: `expect(sql).toMatch(/ADD CONSTRAINT armies_faction_fk FOREIGN KEY \(faction\) REFERENCES factions\(id\) ON DELETE RESTRICT/)`.
  - Bad: two separate `toContain('FOREIGN KEY (faction)')` and `toContain('RESTRICT')`.
- **Vitest command:** `pnpm test` (see `vitest.config.ts`). Tests under `src/**/*.test.ts` are auto-discovered.

### Project context reference

- **CLAUDE memory — `docs/factions.md` = single source of truth**. IDs are kebab-case, lowercase.
- **MEMORY.md — `_bmad-output/implementation-artifacts/`** is where story files live.
- **MEMORY.md — Tailwind/CSS pitfall** does not apply here (no CSS in this story).
- **MEMORY.md — TanStack CLI patterns** do not apply (no scaffold changes).
- **MEMORY.md — env var guard pattern**: already applied in `src/db/index.ts` and `drizzle.config.ts`. No changes needed.

### References

- [Source: `_bmad-output/planning-artifacts/epics/epic-1-territory-foundation-faction-recognition.md#Story-1.1`] — full ACs and business context.
- [Source: `_bmad-output/planning-artifacts/architecture-territory/core-architectural-decisions.md#Data-Architecture`] — 7-table plan, `factions` role as FK target.
- [Source: `_bmad-output/planning-artifacts/architecture-territory/implementation-patterns-consistency-rules.md#Naming-Patterns`] — DB naming conventions.
- [Source: `docs/factions.md`] — canonical list of 18 factions with IDs, English names, French display names.
- [Source: `src/db/schema.ts:53-63`] — current `armies` table definition (faction as free text).
- [Source: `src/lib/owb-parser.ts:253-260`] — how `armies.faction` values are currently produced from OWB imports (relevant for variant inventory in Task 5).
- [Source: `scripts/backfill-unit-gain-type.sql`] — existing precedent for post-migration backfill SQL script pattern.
- [Source: `drizzle/meta/_journal.json`] — next migration idx is 5.

### Project Structure Notes

- `src/db/seeds/` is a new directory. Conforms to the `src/db/` top-level layout (queries, __tests__ already exist).
- No conflict with existing modules. `factions` export name does not collide with any current symbol (verified via grep — existing references to `faction` are column access, not a table named `factions`).
- The `drizzle/meta/_journal.json` will be updated automatically by `pnpm db:generate`.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (2026-04-20)

### Debug Log References

- FK split into 0006 because Drizzle snapshot was generated before `.references()` added to schema; 0006 keeps Drizzle in sync rather than patching snapshot manually.
- Test regex for 18 SQL rows failed on `Empire de l''Homme` (doubled apostrophe); replaced with per-ID `toContain` assertions.
- Test DB (`test_campaign_tow`) created and seeded for integration tests.

### Completion Notes List

- `src/db/seeds/factions.ts` — 18 canonical factions from `docs/factions.md`, exports `CANONICAL_FACTIONS` and `CanonicalFactionId`.
- `drizzle/0005_chemical_goliath.sql` — augmented with seed INSERT (from `scripts/emit-factions-seed.ts`), `unaccent` extension, backfill UPDATE with exhaustive variants table (64 variants for all 18 factions), fail-loud guard.
- `drizzle/0006_jazzy_prodigy.sql` — Drizzle-generated FK `armies.faction → factions.id ON DELETE RESTRICT`.
- Migrations applied to dev DB (`campaign_tow_dev`) and test DB (`test_campaign_tow`) successfully.
- Inventoried 5 distinct existing values in dev DB — all resolved by the variant table.
- 37 new tests added (23 unit + 10 static migration contract + 4 integration live DB).
- Pre-existing test failures (3): nixpacks.toml, queries-match-results, queries-post-match — unrelated to this story.

### File List

- `src/db/seeds/factions.ts` (new)
- `src/db/seeds/__tests__/factions.test.ts` (new)
- `src/db/__tests__/factions-seed.test.ts` (new)
- `src/db/__tests__/factions-migration.test.ts` (new)
- `src/db/schema.ts` (modified — factions table added, armies.faction FK added)
- `drizzle/0005_chemical_goliath.sql` (new)
- `drizzle/0006_jazzy_prodigy.sql` (new)
- `drizzle/meta/_journal.json` (modified)
- `drizzle/meta/0005_snapshot.json` (new)
- `drizzle/meta/0006_snapshot.json` (new)
- `scripts/emit-factions-seed.ts` (new)

### Review Findings

- [x] [Review][Decision] `unaccent` extension provisioning strategy — **Resolved 2026-04-21: keep migration-time `CREATE EXTENSION IF NOT EXISTS unaccent`** (option 1). Project runs on self-hosted PG (VPS Ubuntu), app role has CREATE privilege. Revisit if migrating to a restrictive managed PG.
- [x] [Review][Patch] Curly apostrophe U+2019 not covered in variant backfill [drizzle/0005_chemical_goliath.sql:86-90] — a value like `"Empire de l'Homme"` (curly `'`) survives `lower(unaccent(trim(...)))` as-is; not in variants → migration aborts. Fix: normalize curly quotes before join (`replace(armies.faction, '\u2019', chr(39))`) or add curly-quote variants.
- [x] [Review][Patch] Internal whitespace / tab / NBSP not normalized in backfill [drizzle/0005_chemical_goliath.sql:140] — `trim()` only strips edges. Values like `"High  Elf  Realms"` or with U+00A0 NBSP from web paste fall through. Fix: wrap LHS in `regexp_replace(..., '\s+', ' ', 'g')` and also replace NBSP.
- [x] [Review][Patch] Variant table gaps — legacy OWB variants and common shorthands [drizzle/0005_chemical_goliath.sql:60-140] — e.g. `"Orcs & Goblins"` (pre-rename OWB), `"wood elves"`, `"high elves"`, plural/singular variants not all covered. Cross-check with `src/lib/owb-parser.ts:253-260` exporter output history; inventory only covered 5 current dev values.
- [x] [Review][Patch] `DATABASE_URL` used without fail-loud guard in integration tests [src/db/__tests__/factions-migration.test.ts, src/db/__tests__/factions-seed.test.ts] — `new Pool({ connectionString: process.env.DATABASE_URL })` silently falls back to PGHOST/PGUSER when unset. MEMORY.md explicitly prohibits this pattern. Fix: add `if (!process.env.DATABASE_URL) throw new Error(...)` at module top.
- [x] [Review][Patch] No test enforces TS seed ↔ SQL INSERT parity [scripts/emit-factions-seed.ts ↔ drizzle/0005_chemical_goliath.sql] — emitter is a manual codegen step; nothing verifies the committed SQL still matches running the emitter on current `CANONICAL_FACTIONS`. Fix: add a test that runs the emitter and asserts the 18 INSERT tuples appear verbatim in 0005_*.sql.
- [x] [Review][Patch] `factions-seed.test.ts` asserts exact count 18 (brittle) [src/db/__tests__/factions-seed.test.ts:17-19] — will fail across branches once Epic adds a 19th faction or test runs against a DB with additional seeded reference rows. Fix: assert `>= 18` and check each canonical ID explicitly.
- [x] [Review][Patch] `docs/factions.md` drift-check regex matches spurious rows / skips edge IDs [src/db/seeds/__tests__/factions.test.ts ~line 422] — `/^\|\s*([a-z][a-z-]+[a-z])\s*\|/` requires len ≥ 3, rejects IDs ending in hyphen or digit, and can match example tables elsewhere in the doc. Fix: anchor to the specific table section or tighten to `/^\|\s*([a-z][a-z0-9-]*)\s*\|\s*([A-Z])/` with explicit header filter.
- [x] [Review][Patch] `emit-factions-seed.ts` escaping only handles single-quote [scripts/emit-factions-seed.ts] — backslash, control chars, null bytes not escaped or rejected. Not exploitable today but future-risky. Fix: `replace(/\\/g,'\\\\').replace(/'/g,"''")` and reject strings containing `\0` or control chars.
- [x] [Review][Patch] FK regex in `[1.1-MIG-001]` too permissive [src/db/__tests__/factions-migration.test.ts] — current pattern uses `.*` greedy across clauses; passes if `faction` and `factions` appear in any order. Fix: tighten to `/FOREIGN KEY \("faction"\) REFERENCES "public"\."factions"\("id"\) ON DELETE restrict/i`.
- [x] [Review][Patch] Fail-loud guard behavior has no direct test [src/db/__tests__/factions-migration.test.ts] — `[1.1-MIG-010]` is tautological once FK+NOT NULL is in place (DB physically cannot hold unmapped values). Fix: add a test that seeds an armies row with an unmapped faction BEFORE running the backfill block and asserts the guard `RAISE EXCEPTION` fires.
- [x] [Review][Defer] No down/rollback migration — deferred, pre-existing project pattern (no migration in `drizzle/` has a down script).
- [x] [Review][Defer] `CanonicalFactionId` exported but unused in this story — deferred, Story 1.2 is the declared consumer per spec Task 1.
- [x] [Review][Defer] `ON DELETE RESTRICT` runtime behavior not exercised by a test — deferred, covered by snapshot assertion; behavioral test more valuable after Story 1.2 introduces faction admin flows.
- [x] [Review][Defer] `[1.1-MIG-003]` only couples id (not name/displayName) at migration-SQL layer — deferred, compensated by `[1.1-FAC-005]` (docs drift) and `[1.1-SEED-003]` (live `chaos-dwarfs` → `Nains du Chaos`).
