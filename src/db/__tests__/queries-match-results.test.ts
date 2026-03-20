// src/db/__tests__/queries-match-results.test.ts
// Story 3.3: Match Result Entry
// Status: RED — written before implementation (TDD)
//
// Static file-contract tests for the new DB query functions and helper added to src/db/queries.ts:
//   - getMatchParticipantByMatchAndArmy(matchId, armyId)
//   - invertResult(r)
//   - updateMatchResults(matchId, myArmyId, myResult)
//
// Follows the pattern established in src/db/__tests__/queries-record.test.ts.
// These are structural contract tests (file-content assertions).
// They verify code patterns exist but do not test runtime behavior.
//
// All tests will fail until the implementation is complete.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '../../..')

function getQueries() {
  return readFileSync(resolve(root, 'src/db/queries.ts'), 'utf-8')
}

// ---------------------------------------------------------------------------
// AC1, AC4 — getMatchParticipantByMatchAndArmy (Task 7.1, 7.2, 7.3)
// ---------------------------------------------------------------------------

describe('[AC1][AC4][P0] DB queries — getMatchParticipantByMatchAndArmy — src/db/queries.ts', () => {
  // AC: 1, 4
  it('[3.3-QRY-001] queries.ts exports getMatchParticipantByMatchAndArmy as async function', () => {
    const queries = getQueries()
    expect(queries).toContain('export async function getMatchParticipantByMatchAndArmy')
  })

  // AC: 1, 4
  it('[3.3-QRY-002] getMatchParticipantByMatchAndArmy accepts matchId and armyId parameters', () => {
    const queries = getQueries()
    expect(queries).toMatch(/getMatchParticipantByMatchAndArmy[\s\S]{0,200}matchId[\s\S]{0,100}armyId/)
  })

  // AC: 1, 4
  it('[3.3-QRY-003] getMatchParticipantByMatchAndArmy queries matchParticipants table', () => {
    const queries = getQueries()
    expect(queries).toMatch(/getMatchParticipantByMatchAndArmy[\s\S]{0,1000}matchParticipants/)
  })

  // AC: 1, 4 — Task 7.1: returns { id, matchId, armyId, result } shape
  it('[3.3-QRY-004] getMatchParticipantByMatchAndArmy returns row with id, matchId, armyId, result fields', () => {
    const queries = getQueries()
    // Selects these four fields from matchParticipants
    expect(queries).toMatch(/getMatchParticipantByMatchAndArmy[\s\S]{0,1500}id[\s\S]{0,500}matchId[\s\S]{0,500}armyId[\s\S]{0,500}result/)
  })

  // AC: 4 — Task 7.1: filters by both matchId AND armyId
  it('[3.3-QRY-005] getMatchParticipantByMatchAndArmy filters by both matchId AND armyId using and()', () => {
    const queries = getQueries()
    expect(queries).toMatch(/getMatchParticipantByMatchAndArmy[\s\S]{0,1500}and\(/)
  })

  // AC: 4 — Task 7.1 and 7.2: returns null when no row found
  it('[3.3-QRY-006] getMatchParticipantByMatchAndArmy returns null when army is not a participant', () => {
    const queries = getQueries()
    // Function must have a null return path (rows.length === 0 → null)
    expect(queries).toMatch(/getMatchParticipantByMatchAndArmy[\s\S]{0,1500}null/)
  })

  // AC: 4 — Task 7.2: uses limit(1) for efficient lookup
  it('[3.3-QRY-007] getMatchParticipantByMatchAndArmy uses limit(1) for single-row lookup', () => {
    const queries = getQueries()
    expect(queries).toMatch(/getMatchParticipantByMatchAndArmy[\s\S]{0,1500}limit\(1\)/)
  })

  // AC: 4 — Task 7.3: returns null when matchId does not exist (same null path)
  it('[3.3-QRY-008] getMatchParticipantByMatchAndArmy return type is { id, matchId, armyId, result } | null', () => {
    const queries = getQueries()
    // The function uses a ternary or conditional returning null for the zero-row case
    expect(queries).toMatch(/getMatchParticipantByMatchAndArmy[\s\S]{0,2000}(length > 0[\s\S]{0,100}null|null[\s\S]{0,100}length > 0|\? rows\[0\] : null)/)
  })
})

// ---------------------------------------------------------------------------
// AC3 — invertResult pure helper (Task 7.4)
// ---------------------------------------------------------------------------

describe('[AC3][P0] DB queries — invertResult helper — src/db/queries.ts', () => {
  // AC: 3 — Task 7.4: exported for use in tests and server functions
  it('[3.3-QRY-009] queries.ts exports invertResult as a named function', () => {
    const queries = getQueries()
    expect(queries).toMatch(/export function invertResult/)
  })

  // AC: 3 — Task 7.4: victory → defeat mapping
  it('[3.3-QRY-010] invertResult maps victory to defeat', () => {
    const queries = getQueries()
    expect(queries).toMatch(/invertResult[\s\S]{0,500}victory[\s\S]{0,200}defeat/)
  })

  // AC: 3 — Task 7.4: defeat → victory mapping
  it('[3.3-QRY-011] invertResult maps defeat to victory', () => {
    const queries = getQueries()
    expect(queries).toMatch(/invertResult[\s\S]{0,500}defeat[\s\S]{0,200}victory/)
  })

  // AC: 3 — Task 7.4: draw → draw mapping
  it('[3.3-QRY-012] invertResult maps draw to draw', () => {
    const queries = getQueries()
    expect(queries).toMatch(/invertResult[\s\S]{0,500}draw[\s\S]{0,200}draw/)
  })

  // AC: 3 — invertResult uses exhaustive mapping (switch/object/ternary)
  it('[3.3-QRY-013] invertResult handles all three result values', () => {
    const queries = getQueries()
    // All three values must appear within the function body
    expect(queries).toMatch(/invertResult[\s\S]{0,800}victory[\s\S]{0,400}defeat[\s\S]{0,400}draw/)
  })
})

// ---------------------------------------------------------------------------
// AC3, AC5 — updateMatchResults transactional function (Task 7.5, 7.6, 7.7, 7.8)
// ---------------------------------------------------------------------------

describe('[AC3][AC5][P0] DB queries — updateMatchResults — src/db/queries.ts', () => {
  // AC: 1, 3 — function exists and is exported
  it('[3.3-QRY-014] queries.ts exports updateMatchResults as async function', () => {
    const queries = getQueries()
    expect(queries).toContain('export async function updateMatchResults')
  })

  // AC: 1, 3 — accepts matchId, myArmyId, myResult params
  it('[3.3-QRY-015] updateMatchResults accepts matchId, myArmyId, myResult parameters', () => {
    const queries = getQueries()
    expect(queries).toMatch(/updateMatchResults[\s\S]{0,300}matchId[\s\S]{0,200}myArmyId[\s\S]{0,200}myResult/)
  })

  // AC: 3 — Task 7.5: wraps both updates in a db.transaction()
  it('[3.3-QRY-016] updateMatchResults uses db.transaction() for atomicity', () => {
    const queries = getQueries()
    expect(queries).toMatch(/updateMatchResults[\s\S]{0,1500}db\.transaction/)
  })

  // AC: 3 — Task 7.5: updates MY result (eq on both matchId and armyId)
  it('[3.3-QRY-017] updateMatchResults updates the requesting army result with eq(matchParticipants.armyId, myArmyId)', () => {
    const queries = getQueries()
    expect(queries).toMatch(/updateMatchResults[\s\S]{0,2000}eq\(matchParticipants\.armyId,\s*myArmyId\)/)
  })

  // AC: 3 — Task 7.5: updates opponent result with ne() condition
  it('[3.3-QRY-018] updateMatchResults updates opponent result using ne(matchParticipants.armyId, myArmyId)', () => {
    const queries = getQueries()
    expect(queries).toMatch(/updateMatchResults[\s\S]{0,2500}ne\(matchParticipants\.armyId,\s*myArmyId\)/)
  })

  // AC: 3 — Task 7.5: sets opponent result to invertResult(myResult)
  it('[3.3-QRY-019] updateMatchResults sets opponent result to invertResult(myResult)', () => {
    const queries = getQueries()
    expect(queries).toMatch(/updateMatchResults[\s\S]{0,2500}invertResult\(myResult\)/)
  })

  // AC: 3 — Task 7.5, 7.6, 7.7, 7.8: returns boolean
  it('[3.3-QRY-020] updateMatchResults return type is Promise<boolean>', () => {
    const queries = getQueries()
    expect(queries).toMatch(/updateMatchResults[\s\S]{0,400}Promise<boolean>/)
  })

  // AC: 3 — Task 7.5: uses .returning() to count affected rows
  it('[3.3-QRY-021] updateMatchResults uses .returning() to verify both rows were updated', () => {
    const queries = getQueries()
    expect(queries).toMatch(/updateMatchResults[\s\S]{0,2500}\.returning\(/)
  })

  // AC: 3 — Task 7.5: returns true when both mine and opp updated
  it('[3.3-QRY-022] updateMatchResults returns false early if mine update matched 0 rows, then returns opp.length === 1', () => {
    const queries = getQueries()
    // Guard: if mine update fails (0 rows), returns false before updating opponent
    expect(queries).toMatch(/updateMatchResults[\s\S]{0,2500}mine\.length\s*===\s*0/)
    // Final return is based on opp.length
    expect(queries).toMatch(/updateMatchResults[\s\S]{0,3000}opp\.length\s*===\s*1/)
  })

  // AC: 3 — Both updates filter by matchId
  it('[3.3-QRY-023] updateMatchResults filters both updates by matchId', () => {
    const queries = getQueries()
    // matchId must appear in the WHERE clauses — appears at least twice (mine + opp updates)
    const matchIdCount = (queries.match(/updateMatchResults[\s\S]{0,3000}/)?.[0] ?? '').split('matchId').length - 1
    expect(matchIdCount).toBeGreaterThanOrEqual(2)
  })
})
