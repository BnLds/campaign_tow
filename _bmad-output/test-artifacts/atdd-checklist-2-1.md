---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate']
lastStep: 'step-04c-aggregate'
lastSaved: '2026-03-13'
workflowType: 'testarch-atdd'
inputDocuments:
  - '_bmad-output/implementation-artifacts/2-1-owb-army-import-player-assignment.md'
  - 'docs/army_example.txt'
  - 'src/db/schema.ts'
  - 'src/db/queries.ts'
  - 'src/lib/middleware.ts'
  - 'src/lib/validators.ts'
  - 'src/routes/admin/index.tsx'
  - 'e2e/global-setup.ts'
  - 'e2e/helpers/waitForHydration.ts'
  - 'e2e/admin.spec.ts'
  - 'e2e/admin-list-delete.spec.ts'
  - 'tests/integration/admin.test.ts'
  - 'tests/integration/admin-list-delete.test.ts'
---

# ATDD Checklist — Epic 2, Story 2.1: OWB Army Import & Player Assignment

**Date:** 2026-03-13
**Author:** Ben
**Primary Test Level:** Unit (OWB parser) + Integration (static file-contract) + E2E (Playwright)

---

## Story Summary

The admin can import a Warhammer: The Old World army from an Old World Builder (OWB) text export and assign it to a player. The `owb-parser.ts` module parses the semi-structured OWB text into structured typed data, which is then inserted atomically into the `armies`, `units`, and `sub_profiles` tables via a Drizzle transaction. The admin UI on `/admin` gains two new sections: an import form and an army list with player assignment dropdowns.

**As a** admin (Ben)
**I want** to import an army from an OWB text export and assign it to a player
**So that** all armies are pre-loaded and assigned before the first campaign session

---

## Acceptance Criteria

1. **AC1** — Admin pastes OWB text → parser creates structured data → inserted into armies/units/sub_profiles tables
2. **AC2** — Parse completes in < 5 seconds; success summary shows army name + unit count
3. **AC3** — Admin selects player from dropdown and confirms → army.playerId updated
4. **AC4** — Parse failure → clear error message, no partial data saved (transaction rollback)

---

## Failing Tests Created (RED Phase)

### Unit Tests (32 tests)

**File:** `src/lib/owb-parser.test.ts`

All tests fail with `Cannot find module './owb-parser'` until `src/lib/owb-parser.ts` is created.

- ✅ **Test:** `[2.1-UNIT-001]` parses army name from `## {Name} [{pts} pts]` header
  - **Status:** RED — module doesn't exist yet
  - **Verifies:** AC1 — `result.name === 'Zboooiiiiing'`

- ✅ **Test:** `[2.1-UNIT-002]` parses faction from second line
  - **Status:** RED — module doesn't exist yet
  - **Verifies:** AC1 — `result.faction === 'Tribus des Orques & Gobelins'`

- ✅ **Test:** `[2.1-UNIT-003]` parses totalPoints as integer
  - **Status:** RED — module doesn't exist yet
  - **Verifies:** AC1 — `result.totalPoints === 500`

- ✅ **Test:** `[2.1-UNIT-004]` returns 4 units for the sample army
  - **Status:** RED — module doesn't exist yet
  - **Verifies:** AC1 — unit count from sample export

- ✅ **Test:** `[2.1-UNIT-005..008]` assigns correct type to each unit section (Personnages, Unités de base, Unités spéciales, Unités rares)
  - **Status:** RED — module doesn't exist yet
  - **Verifies:** AC1 — unit type categorization by section headers

- ✅ **Test:** `[2.1-UNIT-009..011]` extracts modelCount (numeric prefix) or null for single models
  - **Status:** RED — module doesn't exist yet
  - **Verifies:** AC1 — `15` for multi-model, `null` for single

- ✅ **Test:** `[2.1-UNIT-012..016]` sub-profile extraction (count, labels, leading space trim)
  - **Status:** RED — module doesn't exist yet
  - **Verifies:** AC1 — multiple sub-profiles per unit, label cleaning

- ✅ **Test:** `[2.1-UNIT-017..022]` stat values stored as text (regular numbers, 3D6, D6, `-`, `(+1)`, `0`)
  - **Status:** RED — module doesn't exist yet
  - **Verifies:** AC1 — all 6 stat value types

- ✅ **Test:** `[2.1-UNIT-023..026]` special rules and options extraction (including null cases)
  - **Status:** RED — module doesn't exist yet
  - **Verifies:** AC1 — specialRules from `__Règles spéciales:__`, options from `-#`

- ✅ **Test:** `[2.1-UNIT-027..028]` unit points parsed correctly
  - **Status:** RED — module doesn't exist yet
  - **Verifies:** AC1 — `unit.points` as integer

- ✅ **Test:** `[2.1-UNIT-029]` footer line ignored (no spurious unit created)
  - **Status:** RED — module doesn't exist yet
  - **Verifies:** AC1 — `*Créé avec "Old World Builder"*` not treated as a unit

- ✅ **Test:** `[2.1-UNIT-030..032]` error cases: empty input, non-OWB format, descriptive error message
  - **Status:** RED — module doesn't exist yet
  - **Verifies:** AC4 — `parseOwbExport('')` throws, `parseOwbExport('random text')` throws

---

### Integration Tests (19 tests)

**File:** `tests/integration/army-import.test.ts`

All tests fail naturally because `armies`/`units`/`subProfiles` tables, query functions, validators, and server functions don't exist yet.

- ✅ **Test:** `[2.1-INT-001]` schema.ts exports `armies` pgTable
  - **Status:** RED — table not added yet
  - **Verifies:** AC1 — `export const armies = pgTable(...)`

- ✅ **Test:** `[2.1-INT-002]` armies.playerId nullable FK → players.id ON DELETE SET NULL
  - **Status:** RED — table not added yet
  - **Verifies:** AC3 — nullable FK preserves army when player deleted

- ✅ **Test:** `[2.1-INT-003]` armies.name and armies.faction are text NOT NULL
  - **Status:** RED — table not added yet
  - **Verifies:** AC1 — required army fields

- ✅ **Test:** `[2.1-INT-004]` schema.ts exports `units` pgTable
  - **Status:** RED — table not added yet
  - **Verifies:** AC1

- ✅ **Test:** `[2.1-INT-005]` units.armyId FK → armies.id ON DELETE CASCADE
  - **Status:** RED — table not added yet
  - **Verifies:** AC4 — units deleted when army deleted (import rollback)

- ✅ **Test:** `[2.1-INT-006]` units.xp is integer DEFAULT 0
  - **Status:** RED — table not added yet
  - **Verifies:** AC1 — XP tracking initialized at 0

- ✅ **Test:** `[2.1-INT-007]` schema.ts exports `subProfiles` pgTable
  - **Status:** RED — table not added yet
  - **Verifies:** AC1

- ✅ **Test:** `[2.1-INT-008]` subProfiles.unitId FK → units.id ON DELETE CASCADE
  - **Status:** RED — table not added yet
  - **Verifies:** AC4 — sub-profiles deleted when unit deleted

- ✅ **Test:** `[2.1-INT-009]` stat columns (m, cd) are text type (not integer)
  - **Status:** RED — table not added yet
  - **Verifies:** AC1 — dice expressions like 3D6 stored as text

- ✅ **Test:** `[2.1-INT-010]` stat columns are nullable
  - **Status:** RED — table not added yet
  - **Verifies:** AC1 — OWB may omit stats for some sub-profiles

- ✅ **Test:** `[2.1-INT-011..017]` DB query functions: createArmyWithUnits (+ transaction), assignArmyToPlayer, getArmyById, getAllArmies, deleteArmy, no bcryptjs in queries.ts
  - **Status:** RED — functions don't exist yet
  - **Verifies:** AC1/AC3/AC4

- ✅ **Test:** `[2.1-INT-018..021]` importArmySchema (rawText .min(1)) and assignArmySchema (armyId + playerId)
  - **Status:** RED — schemas not added to validators.ts yet
  - **Verifies:** AC1/AC3

- ✅ **Test:** `[2.1-INT-022..025]` armyOwnerMiddleware: exported, chains authMiddleware, throws FORBIDDEN, checks playerId
  - **Status:** RED — implementation is pass-through
  - **Verifies:** AC3 — ownership enforcement for future stories

- ✅ **Test:** `[2.1-INT-026..031]` importArmyFn, listArmiesFn, assignArmyFn: createServerFn + adminMiddleware
  - **Status:** RED — server functions not added yet
  - **Verifies:** AC1/AC3

- ✅ **Test:** `[2.1-INT-032..033]` owb-parser and createArmyWithUnits are dynamically imported inside handlers
  - **Status:** RED — server functions not added yet
  - **Verifies:** AC1 — import-protection pattern

- ✅ **Test:** `[2.1-INT-034]` query key `['admin', 'armies']` invalidated after import/assignment
  - **Status:** RED — UI not added yet
  - **Verifies:** AC1/AC3 — TanStack Query cache invalidation

---

### E2E Tests (7 tests)

**File:** `e2e/army-import.spec.ts`

All tests fail because the import form and army list UI don't exist yet on `/admin`.

- ✅ **Test:** `[2.1-E2E-001]` admin sees "Importer une armée OWB" section on /admin
  - **Status:** RED — section not implemented yet
  - **Verifies:** AC1 — import form visible (heading + textarea + submit button)

- ✅ **Test:** `[2.1-E2E-002]` admin pastes valid OWB text → success with unit count
  - **Status:** RED — form not implemented
  - **Verifies:** AC1/AC2 — success summary shows "1 unité"

- ✅ **Test:** `[2.1-E2E-003]` admin sees "Armées" section with army list container
  - **Status:** RED — section not implemented
  - **Verifies:** AC1 — armies list renders after import

- ✅ **Test:** `[2.1-E2E-004]` admin assigns army to player via dropdown
  - **Status:** RED — assignment UI not implemented
  - **Verifies:** AC3 — assignment confirmed via success indicator

- ✅ **Test:** `[2.1-E2E-005]` unassigned army shows "Non assignée" in army list
  - **Status:** RED — army list not implemented
  - **Verifies:** AC3 — assignment status displayed

- ✅ **Test:** `[2.1-E2E-006]` invalid OWB text shows error message (no success text)
  - **Status:** RED — form not implemented
  - **Verifies:** AC4 — error state displayed correctly

- ✅ **Test:** `[2.1-E2E-007]` after parse failure, admin page remains functional
  - **Status:** RED — form not implemented
  - **Verifies:** AC4 — form stays open, no broken state

---

## Required `data-testid` Attributes

### Admin page — Import section (`src/routes/admin/index.tsx`)

- `data-testid="owb-import-textarea"` — textarea for pasting OWB text
- `data-testid="owb-import-submit"` — import submit button
- `data-testid="import-result-message"` — success or error message after import attempt

### Admin page — Army list section

- `data-testid="army-list"` — container for the armies list
- `data-testid="assign-result-message"` — success or error message after assignment attempt

**Implementation example:**
```tsx
<textarea data-testid="owb-import-textarea" ... />
<button data-testid="owb-import-submit">Importer</button>
{result && <p data-testid="import-result-message">{result.message}</p>}

<div data-testid="army-list">
  {armies.map(army => (
    <div key={army.id}>...</div>
  ))}
</div>
{assignResult && <p data-testid="assign-result-message">{assignResult.message}</p>}
```

---

## Implementation Checklist

### Test: `[2.1-UNIT-001..032]` — OWB Parser unit tests

**File:** `src/lib/owb-parser.test.ts`

**Tasks to make these tests pass:**

- [ ] Create `src/lib/owb-parser.ts` exporting `parseOwbExport(text: string): ParsedArmy`
- [ ] Implement header parsing: `## {name} [{pts} pts]` → `name`, `totalPoints`
- [ ] Implement faction parsing: line 2 after `Warhammer: The Old World,`
- [ ] Implement section parser: `### {type} [{pts} pts]` → unit type tracking
- [ ] Implement unit entry parser: `- {count?} {name} [{pts} pts]` → `name`, `points`, `modelCount`
- [ ] Implement equipment parser: `-# ({options})` → `options`
- [ ] Implement special rules parser: `__Règles spéciales:__ *{rules}*` → `specialRules`
- [ ] Implement sub-profile parser: `- [{label}] M({m}) CC({cc})...` → `ParsedSubProfile`
- [ ] Store all 9 stats as raw strings (no number conversion)
- [ ] Handle all stat variants: integer, `3D6`, `D6`, `-`, `(+1)`, `0`
- [ ] Trim leading/trailing spaces from sub-profile labels
- [ ] Ignore footer line `*Créé avec "Old World Builder"*`
- [ ] Throw descriptive error on empty or non-OWB input
- [ ] Run: `pnpm vitest run src/lib/owb-parser.test.ts`
- [ ] ✅ All 32 tests pass (green phase)

**Estimated Effort:** 3–4 hours

---

### Test: `[2.1-INT-001..034]` — Integration structural tests

**File:** `tests/integration/army-import.test.ts`

**Tasks to make these tests pass:**

- [ ] Add `armies`, `units`, `subProfiles` tables to `src/db/schema.ts` (Tasks 1.1–1.3)
- [ ] Import `integer` from `drizzle-orm/pg-core` for `xp` column
- [ ] Run `pnpm db:generate && pnpm db:push`
- [ ] Add `createArmyWithUnits`, `assignArmyToPlayer`, `getArmyById`, `getAllArmies`, `deleteArmy` to `src/db/queries.ts` (Task 3)
- [ ] Add `importArmySchema`, `assignArmySchema` to `src/lib/validators.ts` (Task 4)
- [ ] Implement `armyOwnerMiddleware` body in `src/lib/middleware.ts` (Task 7)
- [ ] Add `importArmyFn`, `listArmiesFn`, `assignArmyFn` to `src/routes/admin/index.tsx` with dynamic imports (Task 5)
- [ ] Add `invalidateQueries(['admin', 'armies'])` after import/assignment mutations (Task 6.5)
- [ ] Run: `pnpm vitest run tests/integration/army-import.test.ts`
- [ ] ✅ All 19 tests pass (green phase)

**Estimated Effort:** 5–6 hours

---

### Test: `[2.1-E2E-001..007]` — Playwright E2E tests

**File:** `e2e/army-import.spec.ts`

**Tasks to make these tests pass:**

- [ ] Add "Importer une armée OWB" section to `/admin` with:
  - `<textarea data-testid="owb-import-textarea" />`
  - `<button data-testid="owb-import-submit">Importer</button>`
  - `<p data-testid="import-result-message">...</p>` (conditionally rendered)
- [ ] Add "Armées" section with `<div data-testid="army-list">` (Task 6.2)
- [ ] Add player assignment dropdown (combobox) and "Assigner" button per army row (Task 6.3)
- [ ] Add `<p data-testid="assign-result-message">` for assignment feedback (Task 6.4)
- [ ] Display "Non assignée" for unassigned armies
- [ ] All UI text in French (Task 6.6)
- [ ] Run: `pnpm exec playwright test e2e/army-import.spec.ts`
- [ ] ✅ All 7 tests pass (green phase)

**Estimated Effort:** 3–4 hours

---

## Running Tests

```bash
# Run all unit tests for this story
pnpm vitest run src/lib/owb-parser.test.ts

# Run all integration tests for this story
pnpm vitest run tests/integration/army-import.test.ts

# Run all tests for this story (unit + integration)
pnpm vitest run src/lib/owb-parser.test.ts tests/integration/army-import.test.ts

# Run E2E tests for this story
pnpm exec playwright test e2e/army-import.spec.ts

# Run E2E in headed mode (see browser)
pnpm exec playwright test e2e/army-import.spec.ts --headed

# Debug specific E2E test
pnpm exec playwright test e2e/army-import.spec.ts --debug

# Run full baseline (must not break)
pnpm vitest run
pnpm exec playwright test
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

**TEA Agent Responsibilities:**

- ✅ Unit tests written and failing (import error — module doesn't exist)
- ✅ Integration tests written and failing (structural checks — code not added yet)
- ✅ E2E tests written and failing (UI elements not present)
- ✅ Required `data-testid` attributes documented
- ✅ Implementation checklist created

**Verification:**

- Unit tests fail: `Cannot find module './owb-parser'`
- Integration tests fail: `expect(schema).toMatch(...)` — armies/units/subProfiles not in schema.ts
- E2E tests fail: `TimeoutError` — testids not found in DOM

---

### GREEN Phase (DEV Agent — Next Steps)

**DEV Agent Responsibilities:**

1. **Start with unit tests** (`src/lib/owb-parser.test.ts`) — pure function, no DB
2. Create `src/lib/owb-parser.ts` — implement `parseOwbExport`
3. Run unit tests → fix until all 32 pass
4. **Move to schema** — add tables to `schema.ts`, run migrations
5. Run integration tests for schema assertions → fix until passing
6. **Add queries** to `queries.ts` — implement all 5 functions
7. **Add validators** to `validators.ts`
8. **Implement middleware** body in `middleware.ts`
9. **Add server functions + UI** to `admin/index.tsx`
10. Run all integration tests → fix until passing
11. Run E2E tests → fix until passing
12. **Run baseline**: `pnpm vitest run && pnpm exec playwright test`

**Key Principles:**

- One failing test at a time → minimal implementation → verify green
- Parser is pure function (no DB, no side effects) → implement first
- Transaction is mandatory for `createArmyWithUnits` (AC4)
- All stat values stored as text strings (never parse to numbers)

---

### REFACTOR Phase (After All Tests Pass)

- Verify 32 + 19 + 7 = 58 new tests pass
- Baseline preserved: 173 integration + 25 E2E still pass (no regressions)
- Total after story 2.1: ~230 integration tests + ~32 E2E tests

---

## Next Steps

1. **Start implementing** with `src/lib/owb-parser.ts` (pure function, fastest feedback loop)
2. **Use the unit test suite** as your implementation guide
3. **Reference** `docs/army_example.txt` as the canonical OWB format sample
4. **Baseline before committing:** `pnpm vitest run && pnpm exec playwright test`
5. **When all tests pass**, manually update sprint-status.yaml story 2.1 to 'done'

---

## Knowledge Base References Applied

- **test-quality.md** — Given-When-Then, one assertion per test, determinism
- **selector-resilience.md** — Resilient selectors (getByRole, getByTestId)
- **data-factories.md** — Inline test fixtures (no factory needed — parser is pure function)
- **test-levels-framework.md** — Unit for parser logic, integration for contracts, E2E for UI journeys
- **fixture-architecture.md** — Auth fixtures via storageState (ADMIN_STATE pattern)

---

## Notes

- **Parser is pure** — no DB, no imports from the app. Implement and test in isolation first.
- **Stats are text** — all 9 stat columns must be `text` type. Never `integer`. Enforced by [2.1-INT-009].
- **Transaction is mandatory** — `createArmyWithUnits` must use `db.transaction`. Enforced by [2.1-INT-012].
- **Dynamic imports** — `owb-parser` and `createArmyWithUnits` must be dynamically imported inside `.handler()`. Enforced by [2.1-INT-032..033].
- **Baseline** — 173 integration + 25 E2E must not regress. Run baseline before and after implementing.
- **` Bounder Squig`** has a leading space in the OWB format (`[ Bounder Squig]`) — the parser must trim it. Enforced by [2.1-UNIT-016].

---

**Generated by BMad TEA Agent** - 2026-03-13
