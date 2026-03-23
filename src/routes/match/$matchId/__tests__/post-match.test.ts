// src/routes/match/$matchId/__tests__/post-match.test.ts
// Story 4.1: Post-Match Flow — XP Entry per Unit & Character
// Status: RED — written before implementation (TDD)
//
// Static file-contract tests for the post-match route and its server functions:
//   - loadPostMatchDataFn — GET: verifies participant, loads units
//   - submitUnitXpFn — POST: increments XP for one unit
//   - completeEvolutionsFn — POST: stamps evolutionsEnteredAt
//
// Follows the pattern established in src/db/__tests__/queries-record.test.ts.
// These are structural contract tests (file-content assertions).
//
// Covers Tasks 10.10–10.17, 10.27–10.29 (AC: 1, 2, 3, 4, 5, 7, 8)
// All tests will fail until the implementation is complete.

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '../../../../..')

function getPostMatchRoute() {
  return readFileSync(resolve(root, 'src/routes/match/$matchId/post-match.tsx'), 'utf-8')
}

// ---------------------------------------------------------------------------
// Route file existence (Task 3.1)
// ---------------------------------------------------------------------------

describe('[AC1][AC2][P0] Post-match route — file exists (Task 3.1)', () => {
  it('[4.1-SFN-001] src/routes/match/$matchId/post-match.tsx file exists', () => {
    expect(existsSync(resolve(root, 'src/routes/match/$matchId/post-match.tsx'))).toBe(true)
  })

  it('[4.1-SFN-002] post-match.tsx uses createFileRoute for "/match/$matchId/post-match"', () => {
    const code = getPostMatchRoute()
    expect(code).toMatch(/createFileRoute\(['"]\/match\/\$matchId\/post-match['"]/)
  })

  it('[4.1-SFN-003] post-match.tsx exports a Route using createFileRoute', () => {
    const code = getPostMatchRoute()
    expect(code).toMatch(/export const Route/)
  })
})

// ---------------------------------------------------------------------------
// data-app-hydrated pattern (Task 3.4 — MANDATORY)
// ---------------------------------------------------------------------------

describe('[AC1][P0] Post-match route — data-app-hydrated pattern (Task 3.4)', () => {
  it('[4.1-SFN-004] post-match.tsx imports useHydrated (data-app-hydrated MANDATORY pattern)', () => {
    const code = getPostMatchRoute()
    expect(code).toMatch(/import[\s\S]{0,200}useHydrated/)
  })

  it('[4.1-SFN-005] post-match.tsx sets data-app-hydrated attribute on hydration', () => {
    const code = getPostMatchRoute()
    expect(code).toContain('data-app-hydrated')
  })
})

// ---------------------------------------------------------------------------
// 10.27 — loadPostMatchDataFn: rejects guest users (Task 3.2)
// AC: 7
// ---------------------------------------------------------------------------

describe('[AC7][P0] loadPostMatchDataFn — server function contract (Task 3.2)', () => {
  // 10.27 — loadPostMatchDataFn defined as GET server function
  it('[4.1-SFN-006] post-match.tsx defines loadPostMatchDataFn as createServerFn GET', () => {
    const code = getPostMatchRoute()
    expect(code).toMatch(/loadPostMatchDataFn[\s\S]{0,200}createServerFn[\s\S]{0,100}method.*GET|createServerFn[\s\S]{0,100}method.*GET[\s\S]{0,500}loadPostMatchDataFn/)
  })

  // 10.27 — loadPostMatchDataFn uses authMiddleware
  it('[4.1-SFN-007] loadPostMatchDataFn uses authMiddleware middleware', () => {
    const code = getPostMatchRoute()
    expect(code).toMatch(/loadPostMatchDataFn[\s\S]{0,600}authMiddleware/)
  })

  // 10.27 — rejects guest users (redirect or throw)
  it('[4.1-SFN-008] loadPostMatchDataFn rejects guest users (isGuest check present)', () => {
    const code = getPostMatchRoute()
    expect(code).toMatch(/loadPostMatchDataFn[\s\S]{0,1000}isGuest/)
  })

  // 10.28 — rejects non-participant armies
  it('[4.1-SFN-009] loadPostMatchDataFn calls getMatchParticipantForEvolutionByPlayer to verify participation', () => {
    const code = getPostMatchRoute()
    expect(code).toMatch(/loadPostMatchDataFn[\s\S]{0,2000}getMatchParticipantForEvolutionByPlayer/)
  })

  // 10.28 — throws FORBIDDEN when not a participant
  it('[4.1-SFN-010] loadPostMatchDataFn throws FORBIDDEN when army is not a participant', () => {
    const code = getPostMatchRoute()
    expect(code).toMatch(/loadPostMatchDataFn[\s\S]{0,2000}FORBIDDEN/)
  })

  // 10.29 — returns alreadyCompleted: true when evolutionsEnteredAt is set
  it('[4.1-SFN-011] loadPostMatchDataFn returns { alreadyCompleted: true } when evolutionsEnteredAt is not null', () => {
    const code = getPostMatchRoute()
    expect(code).toMatch(/loadPostMatchDataFn[\s\S]{0,2000}alreadyCompleted.*true|alreadyCompleted[\s\S]{0,50}true/)
  })

  // 10.27 — calls getUnitsForArmy to load units
  it('[4.1-SFN-012] loadPostMatchDataFn calls getUnitsForArmy to retrieve player units', () => {
    const code = getPostMatchRoute()
    expect(code).toMatch(/loadPostMatchDataFn[\s\S]{0,2000}getUnitsForArmy/)
  })

  // 10.27 — returns units array with id, name, type, xp fields
  it('[4.1-SFN-013] loadPostMatchDataFn return value contains units array with id, name, type, xp', () => {
    const code = getPostMatchRoute()
    expect(code).toMatch(/loadPostMatchDataFn[\s\S]{0,3000}units[\s\S]{0,400}(id|name|type|xp)/)
  })
})

// ---------------------------------------------------------------------------
// 10.10–10.13 — submitUnitXpFn: server function contract (Task 4.1-4.3)
// AC: 3, 4, 7, 8
// ---------------------------------------------------------------------------

describe('[AC3][AC4][AC7][AC8][P0] submitUnitXpFn — server function contract (Tasks 4.1-4.3)', () => {
  // 10.10 — submitUnitXpFn defined as POST server function
  it('[4.1-SFN-014] post-match.tsx defines submitUnitXpFn as createServerFn POST', () => {
    const code = getPostMatchRoute()
    expect(code).toMatch(/submitUnitXpFn[\s\S]{0,200}createServerFn[\s\S]{0,100}method.*POST|createServerFn[\s\S]{0,100}method.*POST[\s\S]{0,500}submitUnitXpFn/)
  })

  // 10.10 — submitUnitXpFn uses authMiddleware
  it('[4.1-SFN-015] submitUnitXpFn uses authMiddleware middleware', () => {
    const code = getPostMatchRoute()
    expect(code).toMatch(/submitUnitXpFn[\s\S]{0,400}authMiddleware/)
  })

  // 10.10 — submitUnitXpFn uses inputValidator with submitUnitXpSchema
  it('[4.1-SFN-016] submitUnitXpFn uses inputValidator(submitUnitXpSchema)', () => {
    const code = getPostMatchRoute()
    expect(code).toMatch(/submitUnitXpFn[\s\S]{0,600}inputValidator[\s\S]{0,200}submitUnitXpSchema/)
  })

  // 10.10 — rejects guest users (returns UNAUTHORIZED)
  it('[4.1-SFN-017] submitUnitXpFn rejects guest users with UNAUTHORIZED (returns ServerResult error)', () => {
    const code = getPostMatchRoute()
    // Must return { success: false, error: { code: 'UNAUTHORIZED', ... } } for guests
    expect(code).toMatch(/submitUnitXpFn[\s\S]{0,1500}UNAUTHORIZED/)
  })

  // 10.11 — rejects unit not belonging to player's army (FORBIDDEN)
  it('[4.1-SFN-018] submitUnitXpFn rejects unit not owned by player army with FORBIDDEN', () => {
    const code = getPostMatchRoute()
    // Must check unit.armyId === army.id
    expect(code).toMatch(/submitUnitXpFn[\s\S]{0,2000}armyId[\s\S]{0,200}FORBIDDEN/)
  })

  // 10.11 — uses getUnitById for ownership verification
  it('[4.1-SFN-019] submitUnitXpFn uses getUnitById to verify unit ownership', () => {
    const code = getPostMatchRoute()
    expect(code).toMatch(/submitUnitXpFn[\s\S]{0,2000}getUnitById/)
  })

  // 10.12 — calls upsertMatchXpEntryWithIncrement (atomic upsert + increment)
  it('[4.1-SFN-020] submitUnitXpFn calls upsertMatchXpEntryWithIncrement (atomic upsert + increment)', () => {
    const code = getPostMatchRoute()
    expect(code).toMatch(/submitUnitXpFn[\s\S]{0,2000}upsertMatchXpEntryWithIncrement/)
  })

  // 10.12 — returns { success: true, data: { unitId, newXp } } on success
  it('[4.1-SFN-021] submitUnitXpFn returns { success: true, data: { unitId, newXp } } on success', () => {
    const code = getPostMatchRoute()
    expect(code).toMatch(/submitUnitXpFn[\s\S]{0,3000}success.*true[\s\S]{0,200}(unitId|newXp)/)
  })

  // 10.13 — (Story 4-1b superseded this: incrementUnitXp is now conditional on delta !== 0)
  // Original 4.1 intent: no early return for xpGained === 0 before incrementUnitXp.
  // 4-1b replaced this with delta strategy — see [4.1b-SFN-003] for the current assertion.
  it('[4.1-SFN-022] submitUnitXpFn does not short-circuit on raw xpGained === 0 (delta strategy handles zero case)', () => {
    const code = getPostMatchRoute()
    // Must NOT have an early return based on raw xpGained === 0 (delta logic handles this)
    expect(code).not.toMatch(/submitUnitXpFn[\s\S]{0,3000}data\.xpGained\s*===\s*0[\s\S]{0,200}return/)
  })
})

// ---------------------------------------------------------------------------
// 10.14–10.17 — completeEvolutionsFn: server function contract (Task 5.1-5.3)
// AC: 5
// ---------------------------------------------------------------------------

// completeEvolutionsFn removed (deprecated, replaced by completeEvolutionsWithGainsFn batch commit)
describe.skip('[AC5][P0] completeEvolutionsFn — server function contract (Tasks 5.1-5.3)', () => {
  // 10.14 — completeEvolutionsFn defined as POST server function
  it('[4.1-SFN-023] post-match.tsx defines completeEvolutionsFn as createServerFn POST', () => {
    const code = getPostMatchRoute()
    expect(code).toMatch(/completeEvolutionsFn[\s\S]{0,200}createServerFn[\s\S]{0,100}method.*POST|createServerFn[\s\S]{0,100}method.*POST[\s\S]{0,500}completeEvolutionsFn/)
  })

  // 10.14 — rejects guest users
  it('[4.1-SFN-024] completeEvolutionsFn rejects guest users with UNAUTHORIZED', () => {
    const code = getPostMatchRoute()
    expect(code).toMatch(/completeEvolutionsFn[\s\S]{0,1500}UNAUTHORIZED/)
  })

  // 10.15 — rejects non-participant
  it('[4.1-SFN-025] completeEvolutionsFn rejects non-participant army with FORBIDDEN', () => {
    const code = getPostMatchRoute()
    expect(code).toMatch(/completeEvolutionsFn[\s\S]{0,2000}FORBIDDEN/)
  })

  // 10.15 — uses getMatchParticipantForEvolutionByPlayer for participant check (single query — Fix 7)
  it('[4.1-SFN-026] completeEvolutionsFn uses getMatchParticipantForEvolutionByPlayer to verify participation', () => {
    const code = getPostMatchRoute()
    expect(code).toMatch(/completeEvolutionsFn[\s\S]{0,2000}getMatchParticipantForEvolutionByPlayer/)
  })

  // 10.16 — calls markEvolutionsEntered
  it('[4.1-SFN-027] completeEvolutionsFn calls markEvolutionsEntered to stamp evolutionsEnteredAt', () => {
    const code = getPostMatchRoute()
    expect(code).toMatch(/completeEvolutionsFn[\s\S]{0,2000}markEvolutionsEntered/)
  })

  // 10.16 — returns { success: true, data: { matchId } } on success
  it('[4.1-SFN-028] completeEvolutionsFn returns { success: true, data: { matchId } } on success', () => {
    const code = getPostMatchRoute()
    expect(code).toMatch(/completeEvolutionsFn[\s\S]{0,3000}success.*true[\s\S]{0,300}matchId/)
  })

  // 10.17 — idempotent: if already completed, return success without re-stamping
  it('[4.1-SFN-029] completeEvolutionsFn is idempotent — returns success if evolutionsEnteredAt already set', () => {
    const code = getPostMatchRoute()
    // Must check evolutionsEnteredAt before calling markEvolutionsEntered, or handle null check
    expect(code).toMatch(/completeEvolutionsFn[\s\S]{0,3000}evolutionsEnteredAt/)
  })

  // 10.16 — uses inputValidator with completeEvolutionsSchema
  it('[4.1-SFN-030] completeEvolutionsFn uses inputValidator(completeEvolutionsSchema)', () => {
    const code = getPostMatchRoute()
    expect(code).toMatch(/completeEvolutionsFn[\s\S]{0,600}inputValidator[\s\S]{0,200}completeEvolutionsSchema/)
  })
})

// ---------------------------------------------------------------------------
// Already-completed state (Task 9.1)
// AC: 5
// ---------------------------------------------------------------------------

describe('[AC5][P0] Post-match route — already-completed state (Task 9.1)', () => {
  it('[4.1-SFN-031] post-match.tsx renders "alreadyCompleted" message when evolutions already entered', () => {
    const code = getPostMatchRoute()
    // Must handle alreadyCompleted: true from loader
    expect(code).toMatch(/alreadyCompleted/)
  })

  it('[4.1-SFN-032] post-match.tsx contains French message for already-completed state', () => {
    const code = getPostMatchRoute()
    // "Evolutions deja saisies" or similar French message
    expect(code).toMatch(/(Evolutions|évolutions)[\s\S]{0,100}(saisies|deja|déjà)/)
  })
})

// ---------------------------------------------------------------------------
// Story 4-1b — submitUnitXpFn: delta strategy (AC1, AC3, AC5)
// ---------------------------------------------------------------------------

describe('[AC1][AC3][AC5][P0] submitUnitXpFn — atomic upsert+increment (Story 4-1b → match-edit-restrictions)', () => {
  // 4.1b-SFN-001 — submitUnitXpFn uses atomic upsertMatchXpEntryWithIncrement
  it('[4.1b-SFN-001] submitUnitXpFn calls upsertMatchXpEntryWithIncrement (atomic)', () => {
    const code = getPostMatchRoute()
    expect(code).toMatch(
      /submitUnitXpFn[\s\S]{0,3000}upsertMatchXpEntryWithIncrement/,
    )
  })

  // 4.1b-SFN-002 — upsertMatchXpEntryWithIncrement returns newUnitXp used in response
  it('[4.1b-SFN-002] submitUnitXpFn uses newUnitXp from atomic function', () => {
    const code = getPostMatchRoute()
    expect(code).toMatch(
      /submitUnitXpFn[\s\S]{0,3000}newUnitXp/,
    )
  })

  // 4.1b-SFN-003 — atomic function is defined in evolutions.ts with transaction
  it('[4.1b-SFN-003] upsertMatchXpEntryWithIncrement wraps in db.transaction', () => {
    const code = readFileSync(resolve(root, 'src/db/queries/evolutions.ts'), 'utf-8')
    expect(code).toMatch(/upsertMatchXpEntryWithIncrement[\s\S]{0,500}db\.transaction/)
  })

  // 4.1b-SFN-004 — atomic function computes delta internally
  it('[4.1b-SFN-004] upsertMatchXpEntryWithIncrement computes delta internally', () => {
    const code = readFileSync(resolve(root, 'src/db/queries/evolutions.ts'), 'utf-8')
    expect(code).toMatch(/upsertMatchXpEntryWithIncrement[\s\S]{0,1500}xpGained\s*-\s*\(previousXpGained\s*\?\?\s*0\)/)
  })

  // 4.1b-SFN-005 — atomic function handles delta === 0 case
  it('[4.1b-SFN-005] upsertMatchXpEntryWithIncrement handles delta === 0', () => {
    const code = readFileSync(resolve(root, 'src/db/queries/evolutions.ts'), 'utf-8')
    expect(code).toMatch(/upsertMatchXpEntryWithIncrement[\s\S]{0,2000}delta\s*!==\s*0/)
  })
})

// ---------------------------------------------------------------------------
// Story 4-1b — loadPostMatchDataFn: pre-fill with previousXpGained (AC2)
// ---------------------------------------------------------------------------

describe('[AC2][P0] loadPostMatchDataFn — pre-fill with previousXpGained (Story 4-1b)', () => {
  // 4.1b-SFN-006 — loader must call getMatchXpEntries to fetch previously saved XP
  it('[4.1b-SFN-006] loadPostMatchDataFn calls getMatchXpEntries for pre-fill data', () => {
    const code = getPostMatchRoute()
    expect(code).toMatch(
      /loadPostMatchDataFn[\s\S]{0,3000}getMatchXpEntries/,
    )
  })

  // 4.1b-SFN-007 — units returned by the loader include previousXpGained
  it('[4.1b-SFN-007] loadPostMatchDataFn maps units with previousXpGained field', () => {
    const code = getPostMatchRoute()
    expect(code).toMatch(
      /loadPostMatchDataFn[\s\S]{0,4000}previousXpGained/,
    )
  })

  // 4.1b-SFN-008 — PostMatchLoaderData type carries previousXpGained in its units array
  it('[4.1b-SFN-008] PostMatchLoaderData type includes previousXpGained in units array', () => {
    const code = getPostMatchRoute()
    expect(code).toMatch(/PostMatchLoaderData[\s\S]{0,500}previousXpGained/)
  })
})

// ---------------------------------------------------------------------------
// Story 4-1b — submitUnitXpFn: matchParticipantId in input (AC1)
// ---------------------------------------------------------------------------

describe('[AC1][P0] submitUnitXpFn — matchParticipantId in input (Story 4-1b)', () => {
  // 4.1b-SFN-009 — server function must read matchParticipantId from validated input
  it('[4.1b-SFN-009] submitUnitXpFn accesses data.matchParticipantId', () => {
    const code = getPostMatchRoute()
    expect(code).toMatch(
      /submitUnitXpFn[\s\S]{0,3000}data\.matchParticipantId/,
    )
  })
})
