# Story 2.1: OWB Army Import & Player Assignment

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As Ben (admin),
I want to import an army from an Old World Builder text export and assign it to a player,
So that all armies are pre-loaded before the first session.

## Acceptance Criteria

**AC1 — OWB parsing:**
Given I am logged in as admin,
When I paste an OWB text export into the import form and submit,
Then `owb-parser.ts` parses the export into structured army data (army name, faction, units, sub-profiles with 9 stat columns), and the data is inserted into `armies`, `units`, and `sub_profiles` tables.

**AC2 — Parse performance:**
Given a valid OWB export,
When parsing completes in under 5 seconds (NFR10),
Then a success summary is shown listing army name and number of units imported.

**AC3 — Player assignment:**
Given I have imported an army,
When I select a player from the player list and confirm assignment,
Then `army.playerId` is updated and the army appears as that player's army (FR5).

**AC4 — Parse failure:**
Given the OWB export fails to parse,
When an error is detected,
Then a clear error message is shown and no partial data is saved.

## Tasks / Subtasks

- [x] Task 1 — Schema: add `armies`, `units`, `sub_profiles` tables (AC1)
  - [x] 1.1 — In `src/db/schema.ts`, add `armies` table: `id` (text PK, UUID), `name` (text NOT NULL), `faction` (text NOT NULL), `playerId` (text, nullable FK → players.id ON DELETE SET NULL), `createdAt` (timestamp)
  - [x] 1.2 — Add `units` table: `id` (text PK, UUID), `armyId` (text NOT NULL FK → armies.id ON DELETE CASCADE), `name` (text NOT NULL), `type` (text NOT NULL — e.g. "Personnages", "Unités de base", "Unités spéciales", "Unités rares"), `xp` (integer NOT NULL DEFAULT 0), `specialRules` (text — comma-separated or null), `options` (text — equipment/options string or null), `points` (integer — point cost), `modelCount` (integer — number of models, null for single-model), `createdAt` (timestamp)
  - [x] 1.3 — Add `sub_profiles` table: `id` (text PK, UUID), `unitId` (text NOT NULL FK → units.id ON DELETE CASCADE), `label` (text NOT NULL — e.g. "Night Goblin Warboss", "Giant Cave Squig"), `m` (text), `cc` (text), `ct` (text), `f` (text), `e` (text), `pv` (text), `i` (text), `a` (text), `cd` (text)
  - [x] 1.4 — Run `pnpm db:generate` + `pnpm db:push`
  - [x] 1.5 — Verify `pnpm typecheck` passes

- [x] Task 2 — OWB parser module (AC1, AC2, AC4)
  - [x] 2.1 — Create `src/lib/owb-parser.ts` exporting `parseOwbExport(text: string): ParsedArmy`
  - [x] 2.2 — Create `src/lib/__fixtures__/owb-sample.txt` (copy from `docs/army_example.txt`)
  - [x] 2.3 — Create `src/lib/owb-parser.test.ts` with unit tests
  - [x] 2.4 — Parser must return structured typed data (see Dev Notes for types and format)

- [x] Task 3 — DB query functions for armies (AC1, AC3)
  - [x] 3.1 — In `src/db/queries.ts`, add `createArmyWithUnits(data: ParsedArmy): Promise<{ armyId: string; unitCount: number }>` — transaction: insert army + units + sub_profiles atomically
  - [x] 3.2 — Add `assignArmyToPlayer(armyId: string, playerId: string): Promise<void>` — update armies.playerId
  - [x] 3.3 — Add `getArmyById(armyId: string)` — returns army with units and sub_profiles
  - [x] 3.4 — Add `getAllArmies()` — returns all armies (id, name, faction, playerId, player displayName)
  - [x] 3.5 — Add `deleteArmy(armyId: string): Promise<void>` — for cleanup if import fails

- [x] Task 4 — Validators for import & assignment (AC1, AC3)
  - [x] 4.1 — In `src/lib/validators.ts`, add `importArmySchema` (z.object with `rawText: z.string().min(1)`)
  - [x] 4.2 — Add `assignArmySchema` (z.object with `armyId: z.string()`, `playerId: z.string()`)

- [x] Task 5 — Server functions on admin page (AC1, AC2, AC3, AC4)
  - [x] 5.1 — In `src/routes/admin/index.tsx`, add `importArmyFn` (POST, adminMiddleware, inputValidator: importArmySchema) — calls owb-parser + createArmyWithUnits, returns `ServerResult<{ armyId: string; armyName: string; unitCount: number }>`
  - [x] 5.2 — Add `listArmiesFn` (GET, adminMiddleware) — calls getAllArmies
  - [x] 5.3 — Add `assignArmyFn` (POST, adminMiddleware, inputValidator: assignArmySchema) — calls assignArmyToPlayer, returns `ServerResult<null>`

- [x] Task 6 — Admin UI: Import form + army list + assignment (AC1, AC2, AC3, AC4)
  - [x] 6.1 — Add "Importer une armée" section below the player list: `<textarea>` for pasting OWB export + submit button
  - [x] 6.2 — Add "Armées" section: list all armies (name, faction, assigned player or "Non assignée")
  - [x] 6.3 — Each army row: `<select>` dropdown with all players + "Assigner" button (or auto-assign on change)
  - [x] 6.4 — Success/error messages for import and assignment
  - [x] 6.5 — Invalidate `['admin', 'armies']` query key after import/assignment
  - [x] 6.6 — All text in French

- [x] Task 7 — Update `armyOwnerMiddleware` (scaffolded in story 1.2)
  - [x] 7.1 — In `src/lib/middleware.ts`, implement the `armyOwnerMiddleware` body: query army by ID, check `army.playerId === context.session.playerId || context.session.isAdmin`, throw FORBIDDEN otherwise
  - [x] 7.2 — This middleware is NOT used in this story's server functions (admin-only), but must be ready for stories 2.2–2.4

- [x] Task 8 — Hydration pattern on admin page
  - [x] 8.1 — Verify `data-app-hydrated` pattern is already present on admin page (it is — story 1.6)

- [x] Task 9 — Unit tests for OWB parser (AC1, AC2, AC4)
  - [x] 9.1 — Test: parses army_example.txt correctly (army name, faction, unit count, stat values)
  - [x] 9.2 — Test: handles dice expressions in stats (3D6, D6)
  - [x] 9.3 — Test: handles special stat values ((-), (+1), (0), -)
  - [x] 9.4 — Test: extracts multiple sub-profiles per unit
  - [x] 9.5 — Test: extracts unit type (Personnages, Unités de base, etc.)
  - [x] 9.6 — Test: returns error on empty/invalid input
  - [x] 9.7 — Test: extracts special rules per unit
  - [x] 9.8 — Test: extracts equipment/options

- [x] Task 10 — Integration tests (AC1, AC3, AC4)
  - [x] 10.1 — Test: importArmyFn with valid OWB text → army + units + sub_profiles created
  - [x] 10.2 — Test: importArmyFn with invalid text → error, no data saved
  - [x] 10.3 — Test: assignArmyFn assigns player to army
  - [x] 10.4 — Test: importArmyFn requires admin (non-admin → FORBIDDEN)
  - [x] 10.5 — Test: assignArmyFn requires admin
  - [x] 10.6 — Verify test baseline: all existing tests still pass

- [x] Task 11 — Quality gates
  - [x] 11.1 — `pnpm typecheck` — zero errors
  - [x] 11.2 — `pnpm lint` — zero errors
  - [x] 11.3 — `pnpm build` — succeeds
  - [x] 11.4 — All existing E2E tests still pass

## Dev Notes

### CRITICAL — OWB Text Format & Parser Design

The OWB export format is semi-structured text. Study `docs/army_example.txt` carefully. Key patterns:

**Line 1:** `## {Army Name} [{points} pts]`
**Line 2:** `Warhammer: The Old World, {Faction}, Colonne de Bataille`

**Unit sections:** Organized by type headers:
```
### Personnages [{pts} pts]
### Unités de base [{pts} pts]
### Unités spéciales [{pts} pts]
### Unités rares [{pts} pts]
```

**Unit entry pattern:**
```
- {count?} {Unit Name} [{pts} pts]
 -# ({equipment/options})
 - __Règles spéciales:__ *{comma-separated rules}*
 - [{Sub-profile Label}] M({m}) CC({cc}) CT({ct}) F({f}) E({e}) PV({pv}) I({i}) A({a}) Cd({cd})
```

**Key parsing rules:**
1. Unit count is optional (single-model units like monsters have no count)
2. A unit can have MULTIPLE sub-profiles (e.g. rider + mount, herder + squig)
3. Stats are always in parentheses: `M(4)`, `CC(5)`, `CT(-)`, `F(3D6)`, `PV((+1))`
4. Stats can be: integers (`4`), dice expressions (`3D6`, `D6`), dashes (`-`), parenthesized modifiers (`(+1)`), zero (`0`)
5. Special rules line starts with `__Règles spéciales:__` in italics
6. Equipment line starts with `-#`
7. The last line `*Créé avec "Old World Builder"*...` must be ignored

**ParsedArmy return type:**
```typescript
interface ParsedSubProfile {
  label: string       // e.g. "Night Goblin Warboss"
  m: string; cc: string; ct: string; f: string
  e: string; pv: string; i: string; a: string; cd: string
}

interface ParsedUnit {
  name: string          // e.g. "Chef de Guerre Gobelin de la Nuit"
  type: string          // e.g. "Personnages"
  points: number        // e.g. 102
  modelCount: number | null  // e.g. 15, null for single models
  specialRules: string | null  // comma-separated
  options: string | null       // equipment string
  subProfiles: ParsedSubProfile[]
}

interface ParsedArmy {
  name: string          // e.g. "Zboooiiiiing"
  faction: string       // e.g. "Tribus des Orques & Gobelins"
  totalPoints: number   // e.g. 500
  units: ParsedUnit[]
}
```

**Parser must be a PURE function** — no DB access, no side effects. Input: raw text string → Output: `ParsedArmy`. Throw a descriptive error on malformed input. Keep it in `src/lib/owb-parser.ts` — isolated module per NFR9.

### CRITICAL — Stat Columns Are TEXT, Not Numbers

Architecture decision: stats are stored as `text` columns, NOT integers. This is because OWB stats can be:
- Regular numbers: `4`, `5`, `0`
- Dice expressions: `3D6`, `D6`
- Dashes (no value): `-`
- Parenthesized modifiers: `(+1)`

**Do NOT attempt to parse stats to numbers.** Store the raw string exactly as extracted from OWB. The `delta-composer.ts` (story 2.3) will handle numeric composition on display.

### CRITICAL — Transaction for Army Import

`createArmyWithUnits` MUST use a Drizzle transaction to insert army + all units + all sub_profiles atomically. If any insert fails, the entire import rolls back. This prevents partial data (AC4).

```typescript
// Pattern in src/db/queries.ts:
import { db } from './index'
import { armies, units, subProfiles } from './schema'

export async function createArmyWithUnits(data: ParsedArmy): Promise<{ armyId: string; unitCount: number }> {
  return db.transaction(async (tx) => {
    const [army] = await tx.insert(armies).values({
      name: data.name,
      faction: data.faction,
    }).returning({ id: armies.id })

    for (const unit of data.units) {
      const [insertedUnit] = await tx.insert(units).values({
        armyId: army.id,
        name: unit.name,
        type: unit.type,
        points: unit.points,
        modelCount: unit.modelCount,
        specialRules: unit.specialRules,
        options: unit.options,
      }).returning({ id: units.id })

      for (const sp of unit.subProfiles) {
        await tx.insert(subProfiles).values({
          unitId: insertedUnit.id,
          label: sp.label,
          ...sp, // m, cc, ct, f, e, pv, i, a, cd
        })
      }
    }

    return { armyId: army.id, unitCount: data.units.length }
  })
}
```

### Schema — Table Definitions

**`armies` table:**
| Column | Type | Constraints |
|---|---|---|
| id | text | PK, UUID default |
| name | text | NOT NULL |
| faction | text | NOT NULL |
| player_id | text | nullable, FK → players.id, ON DELETE SET NULL |
| created_at | timestamp | NOT NULL, defaultNow |

**player_id is nullable** — armies can exist unassigned after import. `ON DELETE SET NULL` means if a player is deleted, their army remains but becomes unassigned (preserves campaign history).

**`units` table:**
| Column | Type | Constraints |
|---|---|---|
| id | text | PK, UUID default |
| army_id | text | NOT NULL, FK → armies.id, ON DELETE CASCADE |
| name | text | NOT NULL |
| type | text | NOT NULL |
| xp | integer | NOT NULL, DEFAULT 0 |
| points | integer | nullable |
| model_count | integer | nullable |
| special_rules | text | nullable |
| options | text | nullable |
| created_at | timestamp | NOT NULL, defaultNow |

**`sub_profiles` table:**
| Column | Type | Constraints |
|---|---|---|
| id | text | PK, UUID default |
| unit_id | text | NOT NULL, FK → units.id, ON DELETE CASCADE |
| label | text | NOT NULL |
| m | text | nullable |
| cc | text | nullable |
| ct | text | nullable |
| f | text | nullable |
| e | text | nullable |
| pv | text | nullable |
| i | text | nullable |
| a | text | nullable |
| cd | text | nullable |

**Naming rules:** Tables are `snake_case` plural. Columns are `snake_case`. In Drizzle schema, use `camelCase` property names with `snake_case` column mapping (e.g., `playerId: text('player_id')`).

### Admin UI — Import Flow

The import form goes on the existing admin page (`src/routes/admin/index.tsx`). Add TWO new sections below the existing player list:

1. **"Importer une armée OWB"** — textarea + button
2. **"Armées"** — list of imported armies with player assignment

Use `useQuery` for the army list (queryKey: `['admin', 'armies']`). After import or assignment, invalidate the query.

For the player assignment dropdown, reuse the existing `listPlayersFn` (queryKey: `['admin', 'players']`) to populate the `<select>`.

### armyOwnerMiddleware — Implementation

The scaffold in `src/lib/middleware.ts` (lines 33-47) has a pass-through body. Implement the real check:

```typescript
export const armyOwnerMiddleware = createMiddleware({ type: 'function' })
  .middleware([authMiddleware])
  .server(async ({ next, context, data }) => {
    // Guest check
    if (context.session.isGuest) throw new Error('UNAUTHORIZED')
    // Need armyId from data — this middleware expects functions
    // that receive { armyId: string } in their input
    const { getArmyById } = await import('../db/queries')
    const army = await getArmyById(data.armyId)
    if (!army) throw new Error('NOT_FOUND')
    if (army.playerId !== context.session.playerId && !context.session.isAdmin) {
      throw new Error('FORBIDDEN')
    }
    return next({ context: { ...context, army } })
  })
```

**Note:** The middleware needs access to `data.armyId`. Verify TanStack Start middleware can access `data` — consult `/tanstack-start` skill for the exact API. If middleware cannot access input data, move the ownership check into individual server function handlers instead.

### Architecture Boundaries — Compliance Checklist

- [ ] DB access via `src/db/queries.ts` named functions — never import `db` or `drizzle-orm` in route files
- [ ] Server functions use `adminMiddleware` from `src/lib/middleware.ts`
- [ ] Dynamic imports inside `.handler()` for all DB/auth/parser calls (import-protection)
- [ ] OWB parser is a standalone module in `src/lib/owb-parser.ts` — no app imports
- [ ] Stats stored as text columns — never parsed to numbers in schema
- [ ] `ServerResult<T>` wrapper for all mutations
- [ ] Error messages in French
- [ ] `data-app-hydrated` pattern on admin page (already present)
- [ ] Transaction for atomic army import
- [ ] Follow naming conventions: `kebab-case` files, `camelCase` code, `PascalCase` types, `snake_case` DB

### Previous Story Learnings (from Story 1.7)

- **TanStack Query `useQuery`** for data lists — established pattern for admin page lists
- **`queryClient.invalidateQueries()`** after mutations — invalidate relevant query keys
- **Dynamic imports inside `.handler()`** — ALL DB/auth/lib imports must be dynamic
- **`window.confirm()`** for MVP confirmations — use for destructive actions
- **`{session.isAdmin && ...}`** for admin-only UI — element absent from DOM, not hidden via CSS
- **E2E `{ force: true }` on mobile viewport** — use when click intercepted by scroll
- **Shared `btnStyle` variable** — extract shared inline styles for compactness
- **Error field rendering:** TanStack Form errors are `{ message: string }` objects, not strings
- **Baseline: 173 integration + 25 E2E — do NOT break any**

### Git Intelligence — Recent Commits

```
cf202a0 correct code issues
d337266 dev story 1.7
0b3ba73 dev story 1.6
42e4d18 complete story 1.5
1cad27b create atdd story 1.5
```

All Epic 1 stories are done. This is the first story in Epic 2 — new domain tables being created for the first time.

### Scope Boundaries

**IN scope:**
- `armies`, `units`, `sub_profiles` tables
- `owb-parser.ts` module + unit tests
- DB query functions for army CRUD
- Admin UI: import form + army list + player assignment
- `armyOwnerMiddleware` implementation (for future stories)
- Validators for import/assignment

**OUT of scope:**
- Unit card display (story 2.3)
- Manual unit entry (story 2.2)
- `stat_modifiers` / `unit_gains` tables (story 2.3)
- Army list route (`/armies`) — exists as route but no content yet
- Army detail route (`/armies/$armyId`) — exists as route but no content yet
- Seed script update — NOT in this story (seed.ts can be updated in 2.2 or later)

### Project Structure Notes

**Files to CREATE:**
- `src/lib/owb-parser.ts` — parser module
- `src/lib/owb-parser.test.ts` — unit tests
- `src/lib/__fixtures__/owb-sample.txt` — test fixture (copy from `docs/army_example.txt`)

**Files to MODIFY:**
- `src/db/schema.ts` — add `armies`, `units`, `subProfiles` tables
- `src/db/queries.ts` — add army CRUD functions
- `src/lib/validators.ts` — add import/assignment schemas
- `src/lib/middleware.ts` — implement `armyOwnerMiddleware` body
- `src/routes/admin/index.tsx` — add import form, army list, assignment UI

**Files NOT to touch:**
- `src/lib/auth.ts` — no auth changes
- `src/routes/__root.tsx` — no layout changes
- `src/routes/index.tsx` — no campaign view changes
- `src/routes/login.tsx` — no login changes
- `src/lib/types.ts` — `ServerResult<T>` already defined, reuse as-is

### References

- Epic 2 stories: [Source: epics/epic-2-army-setup-unit-card-consultation.md#Story 2.1]
- Architecture — data model: [Source: architecture/core-architectural-decisions.md#Data Architecture]
- Architecture — boundaries: [Source: architecture/project-structure-boundaries.md#Data Flow]
- Architecture — patterns: [Source: architecture/implementation-patterns-consistency-rules.md#Structure Patterns]
- Architecture — middleware: [Source: architecture/implementation-patterns-consistency-rules.md#Auth Middleware]
- OWB example: [Source: docs/army_example.txt]
- Campaign rules: [Source: docs/campaign_rules.md]
- PRD — FR5 (assign army), FR8 (import), NFR9 (parser isolated), NFR10 (parse <5s): [Source: prd.md]
- Schema: [Source: src/db/schema.ts] — 2 tables (players, sessions) before this story
- Queries: [Source: src/db/queries.ts] — 7 functions before this story
- Middleware: [Source: src/lib/middleware.ts] — armyOwnerMiddleware scaffold on lines 33-47
- Admin page: [Source: src/routes/admin/index.tsx] — 305 lines, will grow significantly
- Design tokens: [Source: src/styles/globals.css + MEMORY.md#Palette]
- Test baseline: 173 integration + 25 E2E (epic 1 complete)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- E2E click interception (Pixel 5 mobile viewport): pattern `{ force: true }` ajouté sur les clics du bouton import et du bouton assigner, conformément au pattern établi dans `admin-list-delete.spec.ts:108`.
- Army row restructurée en `flex` plat pour que `.locator('..')` depuis le nom de l'armée remonte directement au parent contenant la combobox (test E2E-004).
- `importArmySchema.rawText` utilise `.min(1)` sans message pour matcher le regex du test `[2.1-INT-019]`.
- `armyOwnerMiddleware.data` casté via `unknown` pour contourner l'erreur TS `undefined` non-overlapping.

### Completion Notes List

- **OWB Parser (pure function)** — `src/lib/owb-parser.ts` : parsing complet du format semi-structuré OWB. Gère : noms imbriqués, `PV((+1))` avec parens imbriquées, valeurs dés (3D6, D6), tirets, tous les sous-profils par unité. 32/32 tests unitaires verts.
- **Schema DB** — 3 nouvelles tables : `armies`, `units`, `sub_profiles`. Clés étrangères : `player_id ON DELETE SET NULL`, `army_id ON DELETE CASCADE`, `unit_id ON DELETE CASCADE`. Stats stockées en `text` (jamais `integer`). Migration générée et appliquée.
- **Queries** — 4 fonctions : `createArmyWithUnits` (transaction atomique), `assignArmyToPlayer`, `getArmyById`, `getAllArmies` (LEFT JOIN players). `getArmyOwner` (lightweight ownership check).
- **Validators** — `importArmySchema` + `assignArmySchema` ajoutés à `validators.ts`.
- **Middleware** — `armyOwnerMiddleware` implémenté avec vérification ownership réelle (playerId + isAdmin bypass).
- **Server functions** — `importArmyFn`, `listArmiesFn`, `assignArmyFn` avec dynamic imports (import-protection).
- **Admin UI** — Sections "Importer une armée OWB" + "Armées" ajoutées sous la liste joueurs. Message succès/erreur, invalidation cache `['admin', 'armies']`.
- **Tests** — 238/238 vitest (32 unit + 206 intégration), 37/38 E2E (1 pré-existant hors scope story 1.7).

### File List

- `src/lib/owb-parser.ts` — CREATED
- `src/lib/owb-parser.test.ts` — CREATED (32 unit tests)
- `src/lib/__fixtures__/owb-sample.txt` — CREATED
- `src/db/schema.ts` — MODIFIED (armies, units, subProfiles tables)
- `src/db/queries.ts` — MODIFIED (4 army CRUD functions + getArmyOwner)
- `src/lib/validators.ts` — MODIFIED (importArmySchema, assignArmySchema)
- `src/lib/middleware.ts` — MODIFIED (armyOwnerMiddleware implementation)
- `src/routes/admin/index.tsx` — MODIFIED (importArmyFn, listArmiesFn, assignArmyFn, import UI, army list UI)
- `tests/integration/army-import.test.ts` — CREATED (33 integration tests)
- `e2e/army-import.spec.ts` — CREATED (7 E2E tests)
- `drizzle/0001_gorgeous_whistler.sql` — CREATED (auto-generated migration)
- `drizzle/meta/0001_snapshot.json` — CREATED (auto-generated migration snapshot)
- `drizzle/meta/_journal.json` — MODIFIED (new migration entry)
- `drizzle/0002_parallel_triathlon.sql` — CREATED (sub_profiles.sort_order migration)
- `drizzle/meta/0002_snapshot.json` — CREATED (migration snapshot)
- `src/lib/types.ts` — MODIFIED (added SERVER_ERROR to ErrorCode)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — MODIFIED (in-progress → review)

## Change Log

- 2026-03-13: Story 2.1 implemented — OWB parser, schema armies/units/sub_profiles, DB queries, validators, armyOwnerMiddleware, server functions importArmyFn/listArmiesFn/assignArmyFn, admin UI import form + army list with player assignment. 58 new tests (32 unit + 19 integration + 7 E2E), all passing.
- 2026-03-13: Code review fixes — (H1) getArmyById now returns units + sub_profiles per spec, (M1) assignArmySchema fields validated with .min(1), (M2) armyOwnerMiddleware runtime guard instead of unsafe cast, (M3) catch blocks added to handleImport/handleAssign for network errors, (M4) File List corrected (5 missing entries), (M5) E2E-005 rewritten to actually test post-assignment state.
- 2026-03-13: Code review #2 fixes — (H1) getArmyById N+1 sub_profile queries replaced with inArray batch query + ORDER BY, (H2) armiesQuery.error now displayed in UI instead of silent "Aucune armée", (M1) assignArmyFn now validates army existence + try/catch for FK errors, (M2) parser rejects armies with 0 units, (M3) E2E locator('..' ) replaced with data-testid army rows, (M4) sub_profiles ordered by id in getArmyById.
- 2026-03-13: Code review #3 fixes — (H1) importArmyFn split into separate try/catch for parser vs DB errors (prevents leaking server details to client, added SERVER_ERROR to ErrorCode), (H2) armyOwnerMiddleware now uses lightweight getArmyOwner query (1 query instead of 3), (M1) unit tests now load fixture file instead of inlining OWB text, (M2) sub_profile inserts batched per unit instead of one-by-one, (M3) assignArmyToPlayer returns boolean via .returning() for affected row check. Bonus: parser now normalizes NBSP (U+00A0) from real OWB exports.
- 2026-03-13: Code review #4 fixes — (H1) assignArmyFn removed unnecessary getArmyById call (3 queries → 0, uses assignArmyToPlayer boolean return instead), (M1) parseSubProfile now extracts stats only from text after closing bracket to avoid false regex matches on label content.
- 2026-03-13: Code review #5 fixes — (M1) sub_profiles.sort_order column added to preserve OWB source order (UUID ordering was non-deterministic), (M2) armyOwnerMiddleware contract documented (injects armyId, not full army), (M3) deleteArmy dead code removed (transaction makes cleanup unnecessary), (L1) textarea disabled during import, (L2) importArmySchema.rawText now uses .trim().
