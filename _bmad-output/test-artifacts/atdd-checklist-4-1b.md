---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04c-aggregate
  - step-05-validate-and-complete
lastStep: step-05-validate-and-complete
lastSaved: '2026-03-18'
workflowType: testarch-atdd
inputDocuments:
  - _bmad-output/implementation-artifacts/4-1b-match-xp-tracking-wizard-resume.md
  - _bmad/tea/config.yaml
  - playwright.config.ts
  - vitest.config.ts
  - _bmad/tea/testarch/knowledge/test-quality.md
  - _bmad/tea/testarch/knowledge/data-factories.md
  - _bmad/tea/testarch/knowledge/test-levels-framework.md
  - _bmad/tea/testarch/knowledge/component-tdd.md
  - _bmad/tea/testarch/knowledge/test-healing-patterns.md
---

# ATDD Checklist — Epic 4, Story 4.1b: Match XP Tracking & Wizard Resume

**Date:** 2026-03-18
**Author:** Ben
**Primary Test Level:** Unit (structural) + Component (RTL)

---

## Story Summary

Story 4-1b adds per-unit-per-match XP tracking via a new `matchXpEntries` table, enabling upsert-based delta XP adjustments, wizard resume with pre-filled values, and compact XP display on the campaign timeline.

**As a** player
**I want** each XP entry to be tracked per unit per match and the wizard to resume with pre-filled values if interrupted
**So that** I never lose progress or accidentally double-count XP, and I can see XP gained per unit on match history cards

---

## Acceptance Criteria

1. **AC1 — Upsert XP entry on submit:** `match_xp_entries` record created/updated via upsert, delta applied to `units.xp`
2. **AC2 — Wizard resume with pre-fill:** Previously entered XP values pre-filled when re-opening wizard
3. **AC3 — Re-submission adjusts XP by delta:** `units.xp` adjusted by `newValue - oldValue`, not re-incremented
4. **AC4 — Timeline displays XP per unit:** Compact line (e.g. "Nomarch +3 · Gardes +5") below match card
5. **AC5 — Zero delta is a no-op:** When same value re-submitted, `incrementUnitXp` not called
6. **AC6 — Wizard UX labels:** Clear distinction between "XP avant cette partie" and "XP gagné lors de cette partie"

---

## Failing Tests Created (RED Phase)

### Unit / Structural Tests — Schema (5 tests)

**File:** `src/db/__tests__/queries-post-match.test.ts` (appended)

- ✅ **Test:** `[4.1b-SCH-001]` schema.ts defines matchXpEntries pgTable
  - **Status:** RED — table not yet defined
  - **Verifies:** AC1 — new table exists

- ✅ **Test:** `[4.1b-SCH-002]` matchXpEntries FK to matchParticipants with cascade
  - **Status:** RED — table not yet defined
  - **Verifies:** AC1 — referential integrity

- ✅ **Test:** `[4.1b-SCH-003]` matchXpEntries FK to units with cascade
  - **Status:** RED — table not yet defined
  - **Verifies:** AC1 — referential integrity

- ✅ **Test:** `[4.1b-SCH-004]` matchXpEntries has xpGained integer notNull
  - **Status:** RED — table not yet defined
  - **Verifies:** AC1 — data type constraint

- ✅ **Test:** `[4.1b-SCH-005]` matchXpEntries uniqueIndex on (matchParticipantId, unitId)
  - **Status:** RED — table not yet defined
  - **Verifies:** AC1 — upsert target constraint

### Unit / Structural Tests — DB Queries (12 tests)

**File:** `src/db/__tests__/queries-post-match.test.ts` (appended)

- ✅ **Test:** `[4.1b-QRY-001]` through `[4.1b-QRY-005]` — upsertMatchXpEntry function
  - **Status:** RED — function not yet implemented
  - **Verifies:** AC1, AC3, AC5 — upsert with previousXpGained return

- ✅ **Test:** `[4.1b-QRY-006]` through `[4.1b-QRY-009]` — getMatchXpEntries function
  - **Status:** RED — function not yet implemented
  - **Verifies:** AC2 — pre-fill data retrieval

- ✅ **Test:** `[4.1b-QRY-010]` through `[4.1b-QRY-012]` — getTimelineForArmy modifications
  - **Status:** RED — modifications not yet implemented
  - **Verifies:** AC4 — timeline XP data

### Unit / Structural Tests — Validators (5 tests)

**File:** `src/lib/__tests__/validators-post-match.test.ts` (appended)

- ✅ **Test:** `[4.1b-VAL-001]` through `[4.1b-VAL-005]` — matchParticipantId in submitUnitXpSchema
  - **Status:** RED — field not yet added to schema
  - **Verifies:** AC1, AC3 — input validation includes matchParticipantId

### Unit / Structural Tests — Server Functions (9 tests)

**File:** `src/routes/match/$matchId/__tests__/post-match.test.ts` (appended)

- ✅ **Test:** `[4.1b-SFN-001]` through `[4.1b-SFN-005]` — submitUnitXpFn delta strategy
  - **Status:** RED — delta strategy not yet implemented
  - **Verifies:** AC1, AC3, AC5 — upsert + delta calculation + zero-skip

- ✅ **Test:** `[4.1b-SFN-006]` through `[4.1b-SFN-008]` — loadPostMatchDataFn pre-fill
  - **Status:** RED — pre-fill not yet implemented
  - **Verifies:** AC2 — previousXpGained in loader response

- ✅ **Test:** `[4.1b-SFN-009]` — submitUnitXpFn accesses matchParticipantId
  - **Status:** RED — not yet wired
  - **Verifies:** AC1 — input field used in handler

### Component Tests — PostMatchWizard (10 tests)

**File:** `src/components/__tests__/post-match-wizard.test.tsx` (appended)

- ✅ **Test:** `[4.1b-WIZ-001]` through `[4.1b-WIZ-003]` — Pre-fill from previousXpGained
  - **Status:** RED — pre-fill not yet implemented
  - **Verifies:** AC2 — XP input pre-filled correctly

- ✅ **Test:** `[4.1b-WIZ-004]` — matchParticipantId passed in submit
  - **Status:** RED — not yet wired
  - **Verifies:** AC1, AC3 — server call includes participant ID

- ✅ **Test:** `[4.1b-WIZ-005]` through `[4.1b-WIZ-007]` — UX labels
  - **Status:** RED — labels not yet updated
  - **Verifies:** AC6 — clear XP context labels

- ✅ **Test:** `[4.1b-WIZ-008]` through `[4.1b-WIZ-010]` — Source file structural contracts
  - **Status:** RED — code changes not yet made
  - **Verifies:** AC2, AC6 — code-level patterns

### Component Tests — TimelineEntry (10 tests)

**File:** `src/components/__tests__/timeline-entry-evolutions.test.tsx` (appended)

- ✅ **Test:** `[4.1b-TLE-001]` through `[4.1b-TLE-006]` — Compact XP line display
  - **Status:** RED — XP line not yet implemented
  - **Verifies:** AC4 — XP per unit on timeline cards

- ✅ **Test:** `[4.1b-TLE-007]` — XP line styling (structural)
  - **Status:** RED — styling not yet added
  - **Verifies:** AC4 — correct visual treatment

- ✅ **Test:** `[4.1b-TLE-008]` through `[4.1b-TLE-010]` — Source file structural contracts
  - **Status:** RED — prop not yet added
  - **Verifies:** AC4 — unitXpEntries prop and separator

---

## Data Factories Created

N/A — This story uses inline test fixtures consistent with existing test patterns. No faker-based factories needed (tests are structural contract + component with mock data).

---

## Fixtures Created

N/A — Tests use existing vitest + RTL patterns. Component tests inject mocks via props (`onSubmitUnitXp`, `onCompleteEvolutions`).

---

## Mock Requirements

N/A — No external services to mock. Server functions are tested via structural contract assertions (readFileSync). Component tests use injected callback props.

---

## Required data-testid Attributes

### PostMatchWizard (existing — no new testids needed)
- `wizard-progress` — already exists
- `wizard-unit-name` — already exists
- `wizard-xp-input` — already exists
- `wizard-next-button` — already exists
- `wizard-error` — already exists

### TimelineEntry (no new testids needed)
- XP line is rendered as a `<p>` element inside the existing `timeline-entry` container

---

## Implementation Checklist

### Test: [4.1b-SCH-001..005] — matchXpEntries table

**File:** `src/db/__tests__/queries-post-match.test.ts`

**Tasks to make these tests pass:**
- [ ] Add `matchXpEntries` pgTable to `src/db/schema.ts` (after matchParticipants)
- [ ] Add FK references, xpGained integer, uniqueIndex
- [ ] Export `matchXpEntries`
- [ ] Run `pnpm db:generate && pnpm db:push`
- [ ] Run test: `pnpm vitest run src/db/__tests__/queries-post-match.test.ts`
- [ ] ✅ Tests pass (green phase)

---

### Test: [4.1b-QRY-001..009] — upsertMatchXpEntry + getMatchXpEntries

**File:** `src/db/__tests__/queries-post-match.test.ts`

**Tasks to make these tests pass:**
- [ ] Add `upsertMatchXpEntry(matchParticipantId, unitId, xpGained)` to `src/db/queries.ts`
- [ ] Add `getMatchXpEntries(matchParticipantId)` to `src/db/queries.ts`
- [ ] Import `matchXpEntries` from schema
- [ ] Run test: `pnpm vitest run src/db/__tests__/queries-post-match.test.ts`
- [ ] ✅ Tests pass (green phase)

---

### Test: [4.1b-QRY-010..012] — getTimelineForArmy XP entries

**File:** `src/db/__tests__/queries-post-match.test.ts`

**Tasks to make these tests pass:**
- [ ] Add `matchParticipants.id` to SELECT in `getTimelineForArmy`
- [ ] Add secondary query for matchXpEntries joined with units
- [ ] Return `unitXpEntries` field per timeline entry
- [ ] Run test: `pnpm vitest run src/db/__tests__/queries-post-match.test.ts`
- [ ] ✅ Tests pass (green phase)

---

### Test: [4.1b-VAL-001..005] — matchParticipantId in submitUnitXpSchema

**File:** `src/lib/__tests__/validators-post-match.test.ts`

**Tasks to make these tests pass:**
- [ ] Add `matchParticipantId: z.string().min(1)` to `submitUnitXpSchema`
- [ ] Run test: `pnpm vitest run src/lib/__tests__/validators-post-match.test.ts`
- [ ] ✅ Tests pass (green phase)

---

### Test: [4.1b-SFN-001..009] — submitUnitXpFn delta + loadPostMatchDataFn pre-fill

**File:** `src/routes/match/$matchId/__tests__/post-match.test.ts`

**Tasks to make these tests pass:**
- [ ] Modify `submitUnitXpFn` handler: call `upsertMatchXpEntry`, calculate delta, conditionally call `incrementUnitXp`
- [ ] Modify `loadPostMatchDataFn` handler: call `getMatchXpEntries`, map `previousXpGained` per unit
- [ ] Update `PostMatchLoaderData` type to include `previousXpGained` in units
- [ ] Run test: `pnpm vitest run src/routes/match/\$matchId/__tests__/post-match.test.ts`
- [ ] ✅ Tests pass (green phase)

---

### Test: [4.1b-WIZ-001..010] — PostMatchWizard pre-fill + labels

**File:** `src/components/__tests__/post-match-wizard.test.tsx`

**Tasks to make these tests pass:**
- [ ] Add `previousXpGained: number | null` to unit type in props
- [ ] Pre-fill XP input from `previousXpGained` on step change
- [ ] Update label: "XP avant cette partie : {xp - (previousXpGained ?? 0)}"
- [ ] Update input label: "XP gagné lors de cette partie"
- [ ] Pass `matchParticipantId` to submit calls
- [ ] Run test: `pnpm vitest run src/components/__tests__/post-match-wizard.test.tsx`
- [ ] ✅ Tests pass (green phase)

---

### Test: [4.1b-TLE-001..010] — TimelineEntry compact XP line

**File:** `src/components/__tests__/timeline-entry-evolutions.test.tsx`

**Tasks to make these tests pass:**
- [ ] Add `unitXpEntries?: Array<{ unitName: string; xpGained: number }>` prop
- [ ] Render compact XP line when `hasEvolutions && unitXpEntries?.length > 0`
- [ ] Filter entries with `xpGained === 0`
- [ ] Use ` · ` separator, 0.75rem font-size, secondary color
- [ ] Run test: `pnpm vitest run src/components/__tests__/timeline-entry-evolutions.test.tsx`
- [ ] ✅ Tests pass (green phase)

---

## Running Tests

```bash
# Run all failing tests for this story (4-1b tests only)
pnpm vitest run --reporter=verbose src/db/__tests__/queries-post-match.test.ts src/lib/__tests__/validators-post-match.test.ts src/routes/match/\$matchId/__tests__/post-match.test.ts src/components/__tests__/post-match-wizard.test.tsx src/components/__tests__/timeline-entry-evolutions.test.tsx

# Run specific test file
pnpm vitest run src/db/__tests__/queries-post-match.test.ts

# Run tests matching 4.1b tag
pnpm vitest run --reporter=verbose -t "4.1b"

# Run tests in watch mode
pnpm vitest src/db/__tests__/queries-post-match.test.ts

# Run all tests (including 4-1 regression check)
pnpm vitest run
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

**TEA Agent Responsibilities:**

- ✅ All 51 tests written and failing (RED)
- ✅ Tests follow existing project patterns (structural contract + RTL)
- ✅ No new fixtures needed (inline mocks via props)
- ✅ data-testid requirements verified (no new ones needed)
- ✅ Implementation checklist created

**Verification:**

- All tests fail because implementation doesn't exist yet
- Structural tests fail: `matchXpEntries`, `upsertMatchXpEntry`, `getMatchXpEntries` not found in source
- Component tests fail: `previousXpGained` prop not recognized, labels not updated
- Failures are clear and actionable

---

### GREEN Phase (DEV Team - Next Steps)

**DEV Agent Responsibilities:**

1. **Pick one failing test group** from implementation checklist (start with schema → queries → validators → server fns → components)
2. **Read the tests** to understand expected behavior
3. **Implement minimal code** to make that group pass
4. **Run the tests** to verify green
5. **Move to next group** and repeat

**Key Principles:**

- Follow task order in story spec (Task 1 → Task 11)
- Each task maps to a test group above
- Run tests frequently for immediate feedback

---

### REFACTOR Phase (DEV Team - After All Tests Pass)

1. Verify all 51 new tests + all existing tests pass
2. Review for code quality
3. Ensure no regressions
4. Update story status in sprint-status.yaml

---

## Next Steps

1. **Run failing tests** to confirm RED phase: `pnpm vitest run -t "4.1b"`
2. **Begin implementation** using implementation checklist as guide
3. **Work one test group at a time** (schema → queries → validators → server fns → wizard → timeline)
4. **When all tests pass**, run full suite `pnpm vitest run` for regression check
5. **When complete**, update story status to 'done' in sprint-status.yaml

---

## Knowledge Base References Applied

- **test-quality.md** — Deterministic, isolated tests with explicit assertions
- **data-factories.md** — Inline test data with controlled overrides (not faker for this story)
- **component-tdd.md** — Red-Green-Refactor for component changes
- **test-levels-framework.md** — Unit structural for DB/server, Component RTL for UI
- **test-healing-patterns.md** — Selector resilience via data-testid (already established)

---

## Test Execution Evidence

### Initial Test Run (RED Phase Verification)

**Command:** `pnpm vitest run -t "4.1b"`

**Results:** _To be captured after test files are written_

**Expected:** All 51 tests FAIL (RED phase confirmed)

---

## Notes

- E2E tests explicitly out of scope per story spec
- Existing story 4-1 tests remain untouched — no regressions expected
- `getTimelineForArmy` currently does NOT select `matchParticipants.id` — Risk 1 from story confirmed, test [4.1b-QRY-010] covers this
- The `onSubmitUnitXp` callback signature may need to change from `(unitId, xpGained)` to include `matchParticipantId` — test [4.1b-WIZ-004] verifies this

---

**Generated by BMad TEA Agent** — 2026-03-18
