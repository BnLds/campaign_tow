# Story 1.3: OWB Import Script — Canonical Faction Detection & Assignment

Status: done

## Story

As a player importing an army via OWB,
I want the OWB import flow to detect my army's faction from the export and map it to the canonical `factions.id` seeded in Story 1.1 so my `armies.faction` row is written with a valid FK value,
so that the territory module (Epics 1–7) immediately recognises my faction without any manual intervention or silent fallback.

## Acceptance Criteria

1. **New pure function `resolveCanonicalFactionId`** — a new module `src/lib/faction-resolver.ts` exports:
   ```ts
   export function resolveCanonicalFactionId(rawFaction: string): CanonicalFactionId | null
   ```
   The return type MUST be `CanonicalFactionId | null` (imported from `@/db/seeds/factions`) — **not** `string | null`. This forces downstream consumers to treat unknown input as `null` at compile time and keeps the function parallel-safe with `FACTION_CONFIGS` lookups from Story 1.2. The function is pure: no DB access, no I/O, no side effects, no top-level await.

2. **18 canonical factions covered** — `resolveCanonicalFactionId` maps every canonical faction from `docs/factions.md` / `CANONICAL_FACTIONS` (Story 1.1) via at minimum these three per-faction variants:
   - exact English canonical name (e.g. `'Kingdom of Bretonnia'`),
   - exact French display name (e.g. `'Royaume de Bretonnie'`),
   - kebab-case canonical id (e.g. `'kingdom-of-bretonnia'`).
   Variant table MUST be a superset of the SQL variants list already shipped in `drizzle/0005_chemical_goliath.sql` (backfill step) — any value the DB backfill accepted, the TS resolver must also accept. Reproduce exactly the same canonical mapping; do NOT invent a new variant list. See Dev Notes §Variant table for the full copy-paste source.

3. **Normalisation pipeline matches the SQL backfill byte-for-byte** — input is normalised before variant lookup using the same transformation the migration applies, in the same order:
   1. replace U+2019 (`’`) and U+2018 (`‘`) with `'` (ASCII apostrophe),
   2. replace U+00A0 (NBSP) with regular space,
   3. collapse any run of whitespace (`/\s+/g`) to a single space,
   4. `trim()`,
   5. remove diacritics via `String.prototype.normalize('NFD').replace(/[̀-ͯ]/g, '')` (the JS equivalent of Postgres `unaccent`),
   6. `toLowerCase()` (locale-independent — use plain `.toLowerCase()`, NOT `toLocaleLowerCase()`).
   This ordering is load-bearing: NFD stripping before lowercase is safe; the variant table entries are already lowercased and unaccented, so changing the order would cause lookups to miss `"Démons du Chaos"` after lowercasing leaves a combining acute accent. A parity test between the TS normaliser and a hand-built list of `{ raw, expected }` cases from the SQL VALUES list enforces this.

4. **Tolerance for case, accents, whitespace, OWB label variants** — `resolveCanonicalFactionId` MUST return the correct canonical id for, at minimum, these edge cases (see full test matrix in AC #7):
   - `'kingdom of bretonnia'` (lowercased) → `'kingdom-of-bretonnia'`,
   - `'  Royaume de Bretonnie  '` (whitespace padding) → `'kingdom-of-bretonnia'`,
   - `'Démons du Chaos'` and `'Demons du Chaos'` (accented + stripped) → `'daemons-of-chaos'`,
   - `"Empire de l’Homme"` (curly apostrophe) → `'empire-of-man'`,
   - `'Tribus des Orques et Gobelins'` and `'Tribus des Orques & Gobelins'` (ampersand vs `et`) → `'orc-and-goblin-tribes'`,
   - `'High Elves'` / `'Wood Elves'` / `'Skaven Clans'` / `'Orcs & Goblins'` (common OWB shorthand variants present in migration variants table) → correct canonical id.

5. **Unknown input returns `null`, never a fallback** — `resolveCanonicalFactionId('')`, `resolveCanonicalFactionId('   ')`, `resolveCanonicalFactionId('Not A Faction')`, `resolveCanonicalFactionId('null')` all return `null`. The function MUST NOT default to a sentinel faction, MUST NOT throw. `null` is the contract for "unrecognised".

6. **Import flow writes the canonical FK and surfaces errors to the user** — both server functions that call `parseOwbExport` + `createArmyWithUnits` are updated:
   - `src/lib/server-fns/player-import-army.ts` (player self-import),
   - `src/server-fns/admin-armies.ts` → `importArmyFn` (admin import).
   After `parseOwbExport`, both call `resolveCanonicalFactionId(parsed.faction)`. When the result is `null`, the server function returns `{ success: false, error: { code: 'VALIDATION_ERROR', message: "Faction non reconnue dans l'export OWB : « {rawFaction} ». Vérifiez que la ligne « Warhammer: The Old World, {faction}, … » utilise un nom canonique." } }` BEFORE any DB write. When non-null, the canonical id is passed down to `createArmyWithUnits` as `parsed.faction` (see AC #8). The FK from Story 1.1 (`armies.faction → factions.id ON DELETE RESTRICT`) accepts the write. No new error code is introduced — `VALIDATION_ERROR` already exists in `ServerResult` envelope.

7. **Test suite — `src/lib/__tests__/faction-resolver.test.ts`** covers:
   - A `describe.each(CANONICAL_FACTIONS)` block iterating the 18 factions and asserting each resolves correctly for the three required variants (English `name`, French `displayName`, kebab-case `id`) — one `.each` row per faction with three `it(...)` variants, or three parameterised blocks, so a failure localises to `(factionId, variant)`.
   - A `describe('edge cases')` block with at least the six named variants from AC #4 plus: `"DARK ELVES"` (uppercase), `" \t dark-elves \n"` (mixed whitespace), `"empire de l’homme"` (curly apostrophe post-lowercase), `"skaven clans"` (OWB-specific shorthand).
   - A `it('returns null for unknown faction labels')` asserting `resolveCanonicalFactionId('Not A Faction')`, `resolveCanonicalFactionId('')`, `resolveCanonicalFactionId('   ')`, `resolveCanonicalFactionId('Warhammer: The Old World')` all return `null` (single `.each` + `.toBeNull()` — one assertion per row).
   - A **SQL parity test**: statically import the variant list directly from the resolver module (AC #9 requires it be exported for test inspection — NOT re-parsed from SQL at runtime) and assert `resolveCanonicalFactionId(variant)` returns `canonicalId` for every entry. This protects against drift if a future dev adds a variant to the SQL migration without updating the TS resolver (or vice-versa) — see Dev Notes §SQL parity for the enforcement mechanism.
   - A type-level line: `const _: CanonicalFactionId | null = resolveCanonicalFactionId('anything'); void _` — fails typecheck if the return type regresses to `string | null`.
   - **Assertion-coupling rule (MEMORY.md):** every `.each` row must couple the input-to-output relationship in a single assertion (e.g. `expect(resolveCanonicalFactionId(raw)).toBe(expectedId)`), NOT two assertions like `expect(result).toBeTruthy(); expect(result).toContain('bretonnia')`. See Dev Notes for the pattern.

8. **Parser / resolver separation — `ParsedArmy.faction` stays raw, canonical id resolved at the boundary** — `parseOwbExport` is NOT modified to call `resolveCanonicalFactionId` internally. Rationale: the parser remains a pure extraction step (raw OWB text → `ParsedArmy`), and `ParsedArmy.faction` keeps its current `string` type (the raw OWB label). The mapping happens at the server-function boundary (AC #6). This preserves the parser's test suite unchanged, avoids coupling the parser to DB-seeded canonical data, and matches the existing architecture principle "pure parsers vs boundary validators". `createArmyWithUnits` continues to take `ParsedArmy` **but** the caller MUST overwrite `parsed.faction` with the canonical id before passing it in (see Dev Notes §Integration pattern for the exact call shape — use object spread, NOT mutation).

9. **Resolver module exports the variant table for test inspection only** — `src/lib/faction-resolver.ts` exports a second symbol:
   ```ts
   export const FACTION_VARIANTS: ReadonlyArray<readonly [variant: string, canonicalId: CanonicalFactionId]>
   ```
   Consumers MUST NOT use this for lookups — only the resolver function is the public API for resolving. `FACTION_VARIANTS` exists so the SQL-parity test can iterate it without re-reading `drizzle/0005_*.sql`. The variant strings in this table MUST be already-normalised (lowercased, unaccented, whitespace-collapsed) — same shape as the SQL `v.variant` column. Add a file-header comment: `// Source of truth for variants: drizzle/0005_chemical_goliath.sql (UPDATE armies ... v.variant). Any change here MUST be mirrored in the SQL migration OR a follow-up migration.`

10. **No new dependencies, no new DB columns, no new server function files** — `package.json` is unchanged. No new Drizzle migration. No new `src/server-fns/` or `src/lib/server-fns/` files — only targeted edits to the two existing import handlers. The `armies.faction` FK is already in place from Story 1.1; this story is the application-layer companion.

11. **Re-import regression test** — an integration test (or a server-function test using the DB test harness at `src/db/__tests__/`) asserts that importing the same OWB text twice for two different players (or simulating the re-import path for admin) produces two `armies` rows both with `faction = 'orc-and-goblin-tribes'` (using the existing `docs/army_example.txt` fixture, OWB label `'Tribus des Orques & Gobelins'`). This exercises the full pipeline: parse → resolve → FK write. The existing player-side "already has an army" guard rail remains untouched.

## Tasks / Subtasks

- [x] **Task 1: Create `src/lib/faction-resolver.ts`** (AC: #1, #2, #3, #5, #9, #10)
  - [x] Create the file. Import `{ CANONICAL_FACTIONS, type CanonicalFactionId }` from `@/db/seeds/factions` (NOT `~/` — alias is `@/*`; see MEMORY.md path-alias note and Story 1.2 Debug Log). NO imports from `@/db/schema`, `@/db/index`, or any `@/db/queries/*`.
  - [x] Implement the `normalize(raw: string): string` helper privately with the exact 6-step pipeline from AC #3. Do NOT export it — it is an internal implementation detail. Unit-test it indirectly via the resolver.
  - [x] Declare `export const FACTION_VARIANTS` as a `ReadonlyArray<readonly [string, CanonicalFactionId]>` literal, containing EXACTLY the variants from `drizzle/0005_chemical_goliath.sql` (see Dev Notes §Variant table for copy-paste source). Pre-normalise each variant string at authoring time — i.e. the literal contains already-normalised strings like `'royaume de bretonnie'`, NOT the raw `'Royaume de Bretonnie'`. This keeps the lookup a single O(1) Map hit.
  - [x] Build a module-level `const LOOKUP = new Map<string, CanonicalFactionId>(FACTION_VARIANTS)` computed once at module load (not per-call).
  - [x] `export function resolveCanonicalFactionId(rawFaction: string): CanonicalFactionId | null { const key = normalize(rawFaction); if (!key) return null; return LOOKUP.get(key) ?? null; }`.
  - [x] Add the file-header comment from AC #9.

- [x] **Task 2: Populate the variant table** (AC: #2, #4)
  - [x] Copy the full variants list from `drizzle/0005_chemical_goliath.sql` (the `UPDATE armies ... FROM (VALUES ...) AS v(variant, canonical_id)` block). See Dev Notes §Variant table for the full list — paste verbatim, quoting-style aside.
  - [x] Ensure the three required per-faction variants (EN name, FR display, kebab id) are all present for every canonical id — cross-check against `CANONICAL_FACTIONS`. AC #2 requires this as a minimum; the SQL list already exceeds it.
  - [x] Verify, via a `describe.each(CANONICAL_FACTIONS)` test, that each canonical id has at least 2 variants mapped to it (Grand Cathay exception: EN name == FR displayName, so only 2 unique normalised forms; 3-variant test adjusted accordingly — all 3 input forms still tested in canonical coverage block).

- [x] **Task 3: Write test suite** (AC: #7)
  - [x] Create `src/lib/__tests__/faction-resolver.test.ts`.
  - [x] `describe.each(CANONICAL_FACTIONS)` — for each `{ id, name, displayName }`, three `it` cases asserting resolver returns `id` for `name`, `displayName`, and `id` (kebab-case). Couple the input/output per AC #7 (single `toBe` per case).
  - [x] `describe('edge cases')` — at minimum the 10 edge cases from AC #4 + AC #7. Use `it.each([ [raw, expected], ... ])`.
  - [x] `describe('unknown input')` — 5 null-return cases via `it.each`. Single `.toBeNull()` assertion per row.
  - [x] SQL parity: `it('every variant in FACTION_VARIANTS round-trips')` iterating `FACTION_VARIANTS` and asserting `resolveCanonicalFactionId(variant) === canonicalId` (single assertion per row).
  - [x] Type-level guard: `const _: CanonicalFactionId | null = resolveCanonicalFactionId('x'); void _;` at file top (mirrors the Story 1.2 pattern — see MEMORY.md and Story 1.2 Dev Notes).
  - [x] Run `pnpm vitest src/lib/__tests__/faction-resolver.test.ts` — all green (93 tests).

- [x] **Task 4: Wire resolver into `playerImportArmyFn`** (AC: #6, #8, #10)
  - [x] Edit `src/lib/server-fns/player-import-army.ts`.
  - [x] After the `parseOwbExport` try/catch, add: `const { resolveCanonicalFactionId } = await import('../faction-resolver')` (use dynamic import to match existing lazy-import pattern in this file — see the `parseOwbExport` / `db/queries` imports above).
  - [x] Compute `const canonicalFaction = resolveCanonicalFactionId(parsed.faction)`. When `canonicalFaction === null`, return the `VALIDATION_ERROR` from AC #6 (exact message from AC #6, including the raw input interpolated). Return BEFORE `createArmyWithUnits`.
  - [x] When non-null, pass a new object to `createArmyWithUnits`: `createArmyWithUnits({ ...parsed, faction: canonicalFaction })`. Use object spread — do NOT mutate `parsed.faction` in place (the `ParsedArmy` object is used again downstream for the `faction: parsed.faction` response payload — see line 71 of the existing file; make sure the response `faction` also uses `canonicalFaction` so the UI receives the canonical id).
  - [x] Update the return `data.faction` to `canonicalFaction` as well (the response contract stays `string`, consumers can treat the canonical id as an opaque string).

- [x] **Task 5: Wire resolver into admin `importArmyFn`** (AC: #6, #8, #10)
  - [x] Edit `src/server-fns/admin-armies.ts`.
  - [x] Apply the same pattern as Task 4 to `importArmyFn` (lines 8–40).
  - [x] Dynamic import: `const { resolveCanonicalFactionId } = await import('../lib/faction-resolver')`.
  - [x] On `null`: return `{ success: false, error: { code: 'VALIDATION_ERROR', message: <AC #6 message> } }`.
  - [x] On hit: call `createArmyWithUnits({ ...parsed, faction: canonicalFaction })`.
  - [x] The existing response shape `{ armyId, armyName, unitCount }` does NOT expose `faction` — leave it unchanged. No UI regression.

- [x] **Task 6: Re-import regression test** (AC: #11)
  - [x] Added `src/db/__tests__/player-import-army.faction-resolution.test.ts` (placed under `src/db/__tests__/` — consistent with existing integration tests that use the real DB).
  - [x] Uses the existing test DB harness pattern (Pool + drizzle). Invokes the pipeline directly (parseOwbExport → resolveCanonicalFactionId → createArmyWithUnits) with the fixture `src/lib/__fixtures__/owb-sample.txt` (OWB label: `'Tribus des Orques & Gobelins'`).
  - [x] Assert the inserted `armies` row has `faction = 'orc-and-goblin-tribes'`. Single assertion coupling army id + faction on same row select.
  - [x] Negative case: assert `resolveCanonicalFactionId('Not A Faction')` returns null and no DB write occurs.

- [x] **Task 7: Final verification** (AC: all)
  - [x] `pnpm typecheck` — green.
  - [x] `pnpm lint` — green.
  - [x] `pnpm vitest run` — 3 pre-existing failures unchanged (scaffold nixpacks, queries-match-results future story, queries-post-match future story). No new failures introduced.
  - [x] Integration test confirms player-import pipeline writes canonical id to DB.

## Dev Notes

### Architecture compliance

- **Pure boundary resolution:** the resolver is a pure TS module mirroring Story 1.2's `faction-config.ts` pattern (no DB imports, no side effects, module-load-time lookup map). Do NOT reintroduce a DB round-trip — the canonical id set is frozen at `docs/factions.md` (Story 1.1), and the TS source of truth for the 18 ids is `src/db/seeds/factions.ts`.
- **Parser purity preserved (AC #8):** `src/lib/owb-parser.ts` stays untouched. `ParsedArmy.faction: string` keeps its raw-OWB-label semantics. The "raw vs canonical" distinction lives at the server-function boundary. This decision is **not** up for debate in this story; if the dev agent feels the urge to refactor `ParsedArmy.faction` to `CanonicalFactionId`, flag it as a follow-up in completion notes rather than acting on it — that refactor has cross-cutting consequences (fixtures, existing parser tests, 2.x tests).
- **Path alias:** `@/*` (NOT `~/*`) — Story 1.2 Debug Log recorded the confusion cost. Use `@/db/seeds/factions`, `@/lib/faction-resolver`.
- **No new FK, no new migration:** the FK `armies.faction → factions.id ON DELETE RESTRICT` already exists (Story 1.1 Task 4, `drizzle/0006_jazzy_prodigy.sql`). This story is the application layer that respects it.
- **Transaction boundary unchanged:** `createArmyWithUnits` already wraps the insert in `db.transaction()`. No transaction nesting concerns introduced — the resolver is called BEFORE the transaction, and the transaction receives only the canonical id.

### Variant table (copy-paste source from `drizzle/0005_chemical_goliath.sql`)

The resolver's `FACTION_VARIANTS` MUST mirror these entries (the left column is the pre-normalised key, the right column is the canonical id). Format-convert from SQL `('variant', 'canonical_id')` tuples to TS `['variant', 'canonical_id'] as const`. Note: SQL variants are already lowercased + unaccented + whitespace-collapsed, so they paste directly into the TS literal with no further transformation.

```
beastmen brayherds            → beastmen-brayherds
beastmen-brayherds            → beastmen-brayherds
braillehardes hommes-betes    → beastmen-brayherds
braillehardes hommes betes    → beastmen-brayherds
chaos dwarfs                  → chaos-dwarfs
chaos-dwarfs                  → chaos-dwarfs
nains du chaos                → chaos-dwarfs
daemons of chaos              → daemons-of-chaos
daemons-of-chaos              → daemons-of-chaos
demons of chaos               → daemons-of-chaos
demons du chaos               → daemons-of-chaos
daemons du chaos              → daemons-of-chaos
dark elves                    → dark-elves
dark-elves                    → dark-elves
elfes noirs                   → dark-elves
dwarfen mountain holds        → dwarfen-mountain-holds
dwarfen-mountain-holds        → dwarfen-mountain-holds
forteresses naines            → dwarfen-mountain-holds
empire of man                 → empire-of-man
empire-of-man                 → empire-of-man
empire de l'homme             → empire-of-man
empire de l homme             → empire-of-man
grand cathay                  → grand-cathay
grand-cathay                  → grand-cathay
high elf realms               → high-elf-realms
high-elf-realms               → high-elf-realms
high elves                    → high-elf-realms
royaumes hauts elfes          → high-elf-realms
kingdom of bretonnia          → kingdom-of-bretonnia
kingdom-of-bretonnia          → kingdom-of-bretonnia
royaume de bretonnie          → kingdom-of-bretonnia
lizardmen                     → lizardmen
hommes-lezards                → lizardmen
hommes lezards                → lizardmen
ogre kingdoms                 → ogre-kingdoms
ogre-kingdoms                 → ogre-kingdoms
royaumes ogres                → ogre-kingdoms
orc & goblin tribes           → orc-and-goblin-tribes
orc and goblin tribes         → orc-and-goblin-tribes
orc-and-goblin-tribes         → orc-and-goblin-tribes
tribus des orques & gobelins  → orc-and-goblin-tribes
tribus des orques et gobelins → orc-and-goblin-tribes
orcs and goblins              → orc-and-goblin-tribes
orcs & goblins                → orc-and-goblin-tribes
renegade crowns               → renegade-crowns
renegade-crowns               → renegade-crowns
couronnes renegates           → renegade-crowns
skaven                        → skaven
skavens                       → skaven
skaven clans                  → skaven
tomb kings of khemri          → tomb-kings-of-khemri
tomb-kings-of-khemri          → tomb-kings-of-khemri
rois des tombes de khemri     → tomb-kings-of-khemri
vampire counts                → vampire-counts
vampire-counts                → vampire-counts
comtes vampires               → vampire-counts
warriors of chaos             → warriors-of-chaos
warriors-of-chaos             → warriors-of-chaos
guerriers du chaos            → warriors-of-chaos
wood elf realms               → wood-elf-realms
wood-elf-realms               → wood-elf-realms
wood elves                    → wood-elf-realms
royaumes elfes sylvains       → wood-elf-realms
```

**Important — `&` and apostrophes survive normalisation:** the normalisation pipeline does NOT strip `&` or `'`. The variant `'orc & goblin tribes'` stays `'orc & goblin tribes'` after normalisation. The variant `'empire de l'homme'` after curly-to-ASCII replacement is `'empire de l'homme'` (note the embedded ASCII apostrophe — retain it in the TS literal with escaped quoting `"empire de l'homme"` or `'empire de l\'homme'`).

### SQL parity enforcement

The resolver variant list and the SQL migration variants list MUST stay in sync. Two mechanisms enforce this:

1. **Authoring-time convention:** the file header comment on `faction-resolver.ts` (AC #9) instructs any future dev that changes MUST be mirrored in a new migration. Reviewer checks this during code review.
2. **Runtime SQL parity test (optional, recommended):** the test file can read `drizzle/0005_chemical_goliath.sql` at test time (Node `fs.readFileSync`), extract the VALUES block with a regex, parse tuples, and assert each appears in `FACTION_VARIANTS`. This is an optional enhancement beyond AC #7 (the required parity test just iterates `FACTION_VARIANTS` forward). If the dev agent implements it, keep it in the same test file under `describe('[optional] SQL migration parity')` so a failure localises clearly.

### Integration pattern (AC #6 + #8) — exact call shape

Existing code path in both import handlers:

```ts
const parsed = parseOwbExport(data.rawText)           // parsed.faction: raw OWB label
// ... existing guards (unit count, duplicate army) ...
const { armyId, unitCount } = await createArmyWithUnits(parsed)
```

Change to:

```ts
const parsed = parseOwbExport(data.rawText)
const { resolveCanonicalFactionId } = await import('../faction-resolver')  // adjust relative path per file
const canonicalFaction = resolveCanonicalFactionId(parsed.faction)
if (canonicalFaction === null) {
  return {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: `Faction non reconnue dans l'export OWB : « ${parsed.faction} ». Vérifiez que la ligne « Warhammer: The Old World, {faction}, … » utilise un nom canonique.`,
    },
  }
}
// ... existing guards ...
const { armyId, unitCount } = await createArmyWithUnits({ ...parsed, faction: canonicalFaction })
```

In the **player** handler, ALSO update the success-response `faction` field (line 71 of `player-import-army.ts`) to use `canonicalFaction` rather than `parsed.faction` — otherwise the response returns the raw label while the DB row has the canonical id (consumer-visible inconsistency).

In the **admin** handler, the response shape does not expose `faction` at all — no additional change.

### Library / framework requirements

- TypeScript 5.x (already installed).
- Vitest 2.x (already installed). Path alias `@/*` resolves via existing `tsconfig.json`.
- No new dependencies. `String.prototype.normalize('NFD')` is ES2015+ and has been available in all supported runtimes for years — Node 20+ handles it natively.
- **Do NOT** pull in `diacritic`, `remove-accents`, `latinize`, or any unaccent npm package. The 2-line normalisation (`normalize('NFD').replace(/[̀-ͯ]/g, '')`) is a well-known idiom and matches Postgres `unaccent` for the Latin character range we care about.

### File structure

```
src/lib/
├── faction-resolver.ts                    ← NEW
└── __tests__/
    └── faction-resolver.test.ts           ← NEW

src/lib/server-fns/
└── player-import-army.ts                  ← MODIFIED (Task 4)

src/server-fns/
└── admin-armies.ts                        ← MODIFIED (Task 5)

src/lib/server-fns/__tests__/              ← may not exist yet
└── player-import-army.faction-resolution.test.ts   ← NEW (Task 6; see Task 6 note about alternative placement)
```

No other files are created or modified.

### Testing requirements

- **Unit tests** for the resolver: pure value assertions, no DB.
- **Integration test** for Task 6: uses the real test DB (same harness as `src/db/__tests__/factions-migration.test.ts`). Scan that file before writing to reuse the setup/teardown helpers.
- **Assertion coupling rule (MEMORY.md) — MANDATORY.** Every test case that asserts `resolver(raw) === expectedId` MUST express this as a single `expect(resolveCanonicalFactionId(raw)).toBe(expectedId)`. Forbidden anti-patterns:

  ```ts
  // ❌ BAD — passes even if result is a canonical id but for a different faction
  expect(result).toBeTruthy()
  expect(result).toContain('bretonnia')

  // ❌ BAD — decoupled
  const result = resolveCanonicalFactionId('Kingdom of Bretonnia')
  expect(result).not.toBeNull()
  expect(CANONICAL_FACTIONS.map(f => f.id)).toContain(result)
  ```

  ```ts
  // ✅ GOOD — single coupling assertion
  expect(resolveCanonicalFactionId('Kingdom of Bretonnia')).toBe('kingdom-of-bretonnia')

  // ✅ GOOD — negative case, single assertion
  expect(resolveCanonicalFactionId('Not A Faction')).toBeNull()
  ```

- **Type-level test (AC #7):** mirrors the Story 1.2 pattern of a top-of-file `const _: ... = ...; void _` line. This is a compile-time check; `void _` silences `noUnusedLocals`.

### Previous story intelligence

**Story 1.1** (factions table + backfill):
- Canonical source: `src/db/seeds/factions.ts` exports `CANONICAL_FACTIONS` + type `CanonicalFactionId`. Consume these — do NOT re-declare.
- Backfill SQL at `drizzle/0005_chemical_goliath.sql` already implements the exact variant table this story's resolver mirrors. **Copy, don't invent** (Dev Notes §Variant table).
- Reviewers flagged decoupled assertions in Story 1.1 tests — the resolver tests MUST apply the coupling rule from the outset.

**Story 1.2** (faction-config module):
- Established the `@/db/seeds/factions` import pattern — reuse it. Path alias is `@/*`, NOT `~/*` (a Debug-Log-recorded foot-gun).
- Established `src/lib/__tests__/<module>.test.ts` convention — follow it.
- `Record<CanonicalFactionId, ...>` with explicit type annotation is the idiomatic completeness-enforcement pattern in this codebase. For `FACTION_VARIANTS` the shape is different (`ReadonlyArray<readonly [string, CanonicalFactionId]>`) so this pattern doesn't directly apply, but AC #7's `describe.each(CANONICAL_FACTIONS)` test achieves equivalent runtime completeness enforcement.
- `const _: ...; void _` pattern silences `noUnusedLocals` — reuse (Story 1.2 Debug Log).

### Git intelligence summary

Recent commits relevant to this story:

- `03cf754 story 1.2: faction-config module + 18-faction registry` — established the resolver's sibling module. Imports `CANONICAL_FACTIONS` / `CanonicalFactionId` from `@/db/seeds/factions` — use the same import.
- `dba3e22 story 1.1: factions table + backfill armies.faction FK` — introduced the variant table in `drizzle/0005_chemical_goliath.sql` (the source of truth for AC #2's variant superset requirement).
- `a31a82e cleanup: remove obsolete test-artifacts scaffolding` — unrelated.

### Project context reference

- **MEMORY.md — assertion-coupling rule:** MANDATORY for every resolver test (see Testing requirements §Assertion coupling rule above).
- **MEMORY.md — path alias foot-gun:** use `@/*`, not `~/*` (Story 1.2 Debug Log).
- **MEMORY.md — env var guard / CSS tokens / TanStack Form:** do NOT apply (no env access, no CSS, no form).
- **MEMORY.md — Tailwind v4:** does NOT apply.
- **Story files live under `_bmad-output/implementation-artifacts/`.** ✓

### References

- [Source: `_bmad-output/planning-artifacts/epics/epic-1-territory-foundation-faction-recognition.md#Story-1.3`] — full ACs and business context.
- [Source: `_bmad-output/planning-artifacts/architecture-territory/implementation-patterns-consistency-rules.md#Naming-Patterns`] — `Faction config keys = faction id from DB`, FK pattern.
- [Source: `docs/factions.md`] — 18 canonical factions (the mapping's target set).
- [Source: `drizzle/0005_chemical_goliath.sql`] — SQL variant table (copy-paste source for Task 2; parity target for AC #2 and AC #9).
- [Source: `src/db/seeds/factions.ts`] — `CANONICAL_FACTIONS` + `CanonicalFactionId` (Story 1.1).
- [Source: `src/lib/owb-parser.ts`] — existing parser; stays untouched (AC #8).
- [Source: `src/lib/server-fns/player-import-army.ts`] — player import handler (Task 4).
- [Source: `src/server-fns/admin-armies.ts` lines 8–40] — admin `importArmyFn` (Task 5).
- [Source: `src/db/queries/armies.ts` line 13] — `createArmyWithUnits` writes `faction: data.faction` to `armies` table; no change to this file required.
- [Source: `src/lib/__tests__/faction-config.test.ts`] — reference pattern for `describe.each` over canonical factions + type-level guard (Story 1.2).

### Project Structure Notes

- `src/lib/faction-resolver.ts` is a **new file** — verified: no existing `src/lib/faction-resolver*` entries. No symbol conflict.
- `src/lib/__tests__/faction-resolver.test.ts` is a **new file** in an existing test directory.
- The integration test in Task 6 creates `src/lib/server-fns/__tests__/` if absent. If that directory doesn't yet exist, check first whether server-fn integration tests live elsewhere (e.g. `src/db/__tests__/`) and prefer the existing location to avoid proliferating test trees. Record the chosen location in Completion Notes.
- No changes to `tsconfig.json`, `vitest.config.ts`, `eslint.config.js`, `package.json`, or any Drizzle config.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- **Grand Cathay variant count:** `CANONICAL_FACTIONS` has `name === displayName === 'Grand Cathay'` for this faction. Both normalize to the same key, so `FACTION_VARIANTS` only has 2 entries (not 3) for `grand-cathay`. The SQL migration confirms this (2 entries). The "≥ 3 variants" test was adjusted to "≥ 2"; all 3 input forms are still exercised via the canonical coverage `describe.each` block.
- **no-irregular-whitespace lint error:** The original Write call embedded literal NBSP (U+00A0) and combining-character range in the regex literals. Fixed by using `/ /g` (Unicode escape) for NBSP step 2, and keeping the combining-range regex with `̀-ͯ` comments for clarity.
- **PAI-053 test update:** Pre-existing file-content test asserted `faction: parsed.faction` in the success response. Updated to `faction: canonicalFaction` to reflect the intentional AC #6 change.

### Completion Notes List

- `src/lib/faction-resolver.ts`: Pure TS module, no DB imports. 6-step normalisation pipeline (`’/‘ → '`, `  → space`, whitespace collapse, trim, NFD diacritic strip, lowercase). `FACTION_VARIANTS` is a pre-normalised `ReadonlyArray` of 63 tuples covering all 18 factions. Module-level `LOOKUP` map for O(1) lookups.
- `src/lib/__tests__/faction-resolver.test.ts`: 93 tests — 54 canonical coverage (3×18), 18 min-variant counts, 15 edge cases, 5 unknown-input null-returns, 1 SQL parity round-trip. Type-level guard at file top.
- `src/lib/server-fns/player-import-army.ts`: Resolver wired after parse try/catch. Returns `VALIDATION_ERROR` on null before any DB write. Passes `{ ...parsed, faction: canonicalFaction }` to `createArmyWithUnits`. Response `faction` field updated to `canonicalFaction`.
- `src/server-fns/admin-armies.ts`: Same pattern applied to `importArmyFn`. Response shape unchanged (no `faction` field exposed).
- `src/db/__tests__/player-import-army.faction-resolution.test.ts`: Integration test placed under `src/db/__tests__/` (consistent with existing real-DB tests). Exercises full pipeline with `owb-sample.txt`. Both positive (faction written correctly) and negative (resolver returns null → no DB write) cases covered.
- Pre-existing failures (3): `scaffold.test.ts [1.1-UNIT-006]` (nixpacks.toml, post-Railway migration), `queries-match-results [3.3-QRY-008]` (future story), `queries-post-match [4.1-QRY-007]` (future story) — unchanged.

### File List

- `src/lib/faction-resolver.ts` (NEW)
- `src/lib/__tests__/faction-resolver.test.ts` (NEW)
- `src/db/__tests__/player-import-army.faction-resolution.test.ts` (NEW)
- `src/lib/server-fns/player-import-army.ts` (MODIFIED)
- `src/server-fns/admin-armies.ts` (MODIFIED)
- `tests/server-fns/player-import-army.test.ts` (MODIFIED — updated PAI-053 assertion to reflect canonical faction in response)

### Change Log

- 2026-04-22: Story 1.3 implementation complete — faction resolver module, 93-test suite, integration test, wired into both import handlers (Date: 2026-04-22)

### Review Findings

- [x] [Review][Patch] Remove dead `CANONICAL_FACTIONS` value import + `void CANONICAL_FACTIONS` [src/lib/faction-resolver.ts:4,7]
- [x] [Review][Patch] Rewrite `[1.3-INT-004]` (now `[1.3-UNIT-004]`, unit-level) + two-player scenario in `[1.3-INT-002]` [src/db/__tests__/player-import-army.faction-resolution.test.ts]
- [x] [Review][Patch] Surface `afterAll` delete failures instead of swallowing with `.catch(() => {})` [src/db/__tests__/player-import-army.faction-resolution.test.ts]
- [x] [Review][Patch] Replace raw combining-character regex with explicit `̀-ͯ` [src/lib/faction-resolver.ts:13]
- [x] [Review][Patch] Add test asserting every `CANONICAL_FACTIONS.id` appears ≥1 time in `FACTION_VARIANTS` [src/lib/__tests__/faction-resolver.test.ts]
- [x] [Review][Patch] Add test asserting `FACTION_VARIANTS` has no duplicate variant keys mapped to different canonical ids [src/lib/__tests__/faction-resolver.test.ts]
- [x] [Review][Defer] Cleanup does not delete linked `units` rows — deferred, FK cascade not verified in diff scope
- [x] [Review][Defer] Raw user input interpolated in error message without length cap — deferred, minor surface
- [x] [Review][Defer] `.toLowerCase()` locale edge cases (Turkish ı, German ß) untested — deferred, not realistic in OWB exports
- [x] [Review][Defer] Additional curly quote chars (U+02BC, U+FF07) not handled — deferred, not observed in OWB
- [x] [Review][Defer] En/em dashes not normalised — deferred, no variant uses them
- [x] [Review][Defer] `parsed.faction` non-string defensive guard — deferred, parser typed as string
- [x] [Review][Defer] Admin handler does not validate `parsed.units.length === 0` — deferred, pre-existing
- [x] [Review][Defer] Real SQL migration parity test (read `drizzle/0005_*.sql`) — deferred, spec §SQL parity marks it "optional, recommended"
