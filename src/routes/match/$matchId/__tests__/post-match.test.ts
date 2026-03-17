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
  it('[4.1-SFN-009] loadPostMatchDataFn calls getMatchParticipantForEvolution to verify participation', () => {
    const code = getPostMatchRoute()
    expect(code).toMatch(/loadPostMatchDataFn[\s\S]{0,2000}getMatchParticipantForEvolution/)
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

  // 10.12 — calls incrementUnitXp (not updateUnitXp — increment not absolute SET)
  it('[4.1-SFN-020] submitUnitXpFn calls incrementUnitXp (not updateUnitXp — must use increment, not absolute SET)', () => {
    const code = getPostMatchRoute()
    expect(code).toMatch(/submitUnitXpFn[\s\S]{0,2000}incrementUnitXp/)
  })

  // 10.12 — returns { success: true, data: { unitId, newXp } } on success
  it('[4.1-SFN-021] submitUnitXpFn returns { success: true, data: { unitId, newXp } } on success', () => {
    const code = getPostMatchRoute()
    expect(code).toMatch(/submitUnitXpFn[\s\S]{0,3000}success.*true[\s\S]{0,200}(unitId|newXp)/)
  })

  // 10.13 — calls incrementUnitXp even when xpGained === 0 (no special case)
  it('[4.1-SFN-022] submitUnitXpFn always calls incrementUnitXp — no special case for xpGained === 0', () => {
    const code = getPostMatchRoute()
    // Must NOT have an early return or if(xpGained === 0) branch before incrementUnitXp
    // The incrementUnitXp call must not be conditional on xpGained > 0
    expect(code).not.toMatch(/submitUnitXpFn[\s\S]{0,3000}xpGained\s*===\s*0[\s\S]{0,200}return[\s\S]{0,200}incrementUnitXp/)
  })
})

// ---------------------------------------------------------------------------
// 10.14–10.17 — completeEvolutionsFn: server function contract (Task 5.1-5.3)
// AC: 5
// ---------------------------------------------------------------------------

describe('[AC5][P0] completeEvolutionsFn — server function contract (Tasks 5.1-5.3)', () => {
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

  // 10.15 — uses getMatchParticipantForEvolution for participant check (single query — Fix 7)
  it('[4.1-SFN-026] completeEvolutionsFn uses getMatchParticipantForEvolution to verify participation', () => {
    const code = getPostMatchRoute()
    expect(code).toMatch(/completeEvolutionsFn[\s\S]{0,2000}getMatchParticipantForEvolution/)
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
