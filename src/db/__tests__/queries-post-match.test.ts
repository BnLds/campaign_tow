// src/db/__tests__/queries-post-match.test.ts
// Story 4.1: Post-Match Flow — XP Entry per Unit & Character
// Status: RED — written before implementation (TDD)
//
// Static file-contract tests for the new DB query functions added to src/db/queries.ts:
//   - getMatchParticipantForEvolution(matchId, armyId)
//   - incrementUnitXp(unitId, xpGained)
//   - markEvolutionsEntered(matchParticipantId)
//
// Follows the pattern established in src/db/__tests__/queries-record.test.ts.
// These are structural contract tests (file-content assertions).
// They verify code patterns exist but do not test runtime behavior.
//
// Covers Tasks 10.1–10.7 (AC: 3, 4, 5, 7, 8)
// All tests will fail until the implementation is complete.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '../../..')

function getQueries() {
  return readFileSync(resolve(root, 'src/db/queries.ts'), 'utf-8')
}

// ---------------------------------------------------------------------------
// 10.1, 10.2, 10.3 — incrementUnitXp function (Task 1.2)
// AC: 3, 4, 8
// ---------------------------------------------------------------------------

describe('[AC3][AC4][AC8][P0] DB queries — incrementUnitXp — src/db/queries.ts', () => {
  // 10.1 — increments XP atomically (start at 5, add 3 → 8)
  it('[4.1-QRY-001] queries.ts exports incrementUnitXp as async function', () => {
    const queries = getQueries()
    expect(queries).toContain('export async function incrementUnitXp')
  })

  // 10.1 — accepts unitId and xpGained parameters
  it('[4.1-QRY-002] incrementUnitXp accepts unitId and xpGained parameters', () => {
    const queries = getQueries()
    expect(queries).toMatch(/incrementUnitXp[\s\S]{0,200}unitId[\s\S]{0,100}xpGained/)
  })

  // 10.1 — uses SQL atomic increment (SET xp = xp + $amount) not read-then-write
  it('[4.1-QRY-003] incrementUnitXp uses SQL-level increment expression (xp + xpGained) for atomicity', () => {
    const queries = getQueries()
    // Must use sql template for atomic increment: sql`${units.xp} + ${xpGained}`
    expect(queries).toMatch(/incrementUnitXp[\s\S]{0,800}sql`[\s\S]{0,200}xp[\s\S]{0,100}\+[\s\S]{0,100}xpGained/)
  })

  // 10.1 — uses UPDATE, not SELECT+UPDATE (no read-then-write)
  it('[4.1-QRY-004] incrementUnitXp uses db.update(units) with .set({ xp: ... })', () => {
    const queries = getQueries()
    expect(queries).toMatch(/incrementUnitXp[\s\S]{0,600}db\.update\(units\)[\s\S]{0,200}\.set\(\{[\s\S]{0,100}xp/)
  })

  // 10.1 — returns { id, xp } with new total
  it('[4.1-QRY-005] incrementUnitXp uses .returning() to get new xp value', () => {
    const queries = getQueries()
    expect(queries).toMatch(/incrementUnitXp[\s\S]{0,1000}\.returning\(/)
  })

  // 10.2 — adding 0 XP returns same value (no special case needed)
  it('[4.1-QRY-006] incrementUnitXp return type is Promise<{ id: string; xp: number } | null>', () => {
    const queries = getQueries()
    expect(queries).toMatch(/incrementUnitXp[\s\S]{0,400}Promise<[\s\S]{0,100}\{ id: string;[\s\S]{0,50}xp: number[\s\S]{0,50}\} \| null>/)
  })

  // 10.3 — returns null for non-existent unitId
  it('[4.1-QRY-007] incrementUnitXp returns null when unit not found (rows.length === 0)', () => {
    const queries = getQueries()
    expect(queries).toMatch(/incrementUnitXp[\s\S]{0,1000}(rows\.length > 0[\s\S]{0,100}null|\? rows\[0\] : null|length === 0[\s\S]{0,100}null)/)
  })

  // 10.1 — filters by unitId using eq()
  it('[4.1-QRY-008] incrementUnitXp filters by unitId using eq(units.id, unitId)', () => {
    const queries = getQueries()
    expect(queries).toMatch(/incrementUnitXp[\s\S]{0,800}eq\(units\.id,\s*unitId\)/)
  })
})

// ---------------------------------------------------------------------------
// 10.4, 10.5 — markEvolutionsEntered function (Task 1.3)
// AC: 5
// ---------------------------------------------------------------------------

describe('[AC5][P0] DB queries — markEvolutionsEntered — src/db/queries.ts', () => {
  // 10.4 — sets timestamp and returns true
  it('[4.1-QRY-009] queries.ts exports markEvolutionsEntered as async function', () => {
    const queries = getQueries()
    expect(queries).toContain('export async function markEvolutionsEntered')
  })

  // 10.4 — accepts matchParticipantId parameter
  it('[4.1-QRY-010] markEvolutionsEntered accepts matchParticipantId parameter', () => {
    const queries = getQueries()
    expect(queries).toMatch(/markEvolutionsEntered[\s\S]{0,200}matchParticipantId/)
  })

  // 10.4 — sets evolutionsEnteredAt = NOW()
  it('[4.1-QRY-011] markEvolutionsEntered sets evolutionsEnteredAt via SQL NOW() or new Date()', () => {
    const queries = getQueries()
    expect(queries).toMatch(/markEvolutionsEntered[\s\S]{0,800}evolutionsEnteredAt[\s\S]{0,300}(NOW\(\)|new Date\(\)|sql`now\(\)`)/)
  })

  // 10.4 — updates matchParticipants table
  it('[4.1-QRY-012] markEvolutionsEntered updates matchParticipants table', () => {
    const queries = getQueries()
    expect(queries).toMatch(/markEvolutionsEntered[\s\S]{0,600}db\.update\(matchParticipants\)/)
  })

  // 10.4 — return type is Promise<boolean>
  it('[4.1-QRY-013] markEvolutionsEntered return type is Promise<boolean>', () => {
    const queries = getQueries()
    expect(queries).toMatch(/markEvolutionsEntered[\s\S]{0,400}Promise<boolean>/)
  })

  // 10.4 — returns true when row updated
  it('[4.1-QRY-014] markEvolutionsEntered returns true when at least one row was updated', () => {
    const queries = getQueries()
    // Must check rows length to return boolean
    expect(queries).toMatch(/markEvolutionsEntered[\s\S]{0,1000}(\.length > 0|rows\.length === 1|rows\.length >= 1)/)
  })

  // 10.5 — returns false for non-existent participant
  it('[4.1-QRY-015] markEvolutionsEntered returns false when matchParticipantId does not exist (zero rows updated)', () => {
    const queries = getQueries()
    // Must have both true and false return paths
    expect(queries).toMatch(/markEvolutionsEntered[\s\S]{0,1000}(return false|: false|\? true : false)/)
  })

  // 10.4 — filters by matchParticipantId using eq()
  it('[4.1-QRY-016] markEvolutionsEntered filters by id using eq(matchParticipants.id, matchParticipantId)', () => {
    const queries = getQueries()
    expect(queries).toMatch(/markEvolutionsEntered[\s\S]{0,800}eq\(matchParticipants\.id,\s*matchParticipantId\)/)
  })
})

// ---------------------------------------------------------------------------
// 10.6, 10.7 — getMatchParticipantForEvolution function (Task 1.1)
// AC: 3, 4, 5, 7
// ---------------------------------------------------------------------------

describe('[AC3][AC4][AC5][AC7][P0] DB queries — getMatchParticipantForEvolution — src/db/queries.ts', () => {
  // 10.6 — returns participant with evolutionsEnteredAt field
  it('[4.1-QRY-017] queries.ts exports getMatchParticipantForEvolution as async function', () => {
    const queries = getQueries()
    expect(queries).toContain('export async function getMatchParticipantForEvolution')
  })

  // 10.6 — accepts matchId and armyId parameters
  it('[4.1-QRY-018] getMatchParticipantForEvolution accepts matchId and armyId parameters', () => {
    const queries = getQueries()
    expect(queries).toMatch(/getMatchParticipantForEvolution[\s\S]{0,300}matchId[\s\S]{0,100}armyId/)
  })

  // 10.6 — returns row with evolutionsEnteredAt field
  it('[4.1-QRY-019] getMatchParticipantForEvolution selects evolutionsEnteredAt field', () => {
    const queries = getQueries()
    expect(queries).toMatch(/getMatchParticipantForEvolution[\s\S]{0,1500}evolutionsEnteredAt/)
  })

  // 10.6 — returns { id, matchId, armyId, result, evolutionsEnteredAt } shape
  it('[4.1-QRY-020] getMatchParticipantForEvolution returns row with id, matchId, armyId, result, evolutionsEnteredAt', () => {
    const queries = getQueries()
    expect(queries).toMatch(/getMatchParticipantForEvolution[\s\S]{0,2000}id[\s\S]{0,200}matchId[\s\S]{0,200}armyId[\s\S]{0,200}result[\s\S]{0,200}evolutionsEnteredAt/)
  })

  // 10.6 — queries matchParticipants table
  it('[4.1-QRY-021] getMatchParticipantForEvolution queries matchParticipants table', () => {
    const queries = getQueries()
    expect(queries).toMatch(/getMatchParticipantForEvolution[\s\S]{0,1000}matchParticipants/)
  })

  // 10.6 — filters by both matchId AND armyId
  it('[4.1-QRY-022] getMatchParticipantForEvolution filters by both matchId AND armyId using and()', () => {
    const queries = getQueries()
    expect(queries).toMatch(/getMatchParticipantForEvolution[\s\S]{0,1500}and\(/)
  })

  // 10.7 — returns null for non-participant
  it('[4.1-QRY-023] getMatchParticipantForEvolution returns null when army is not a participant', () => {
    const queries = getQueries()
    expect(queries).toMatch(/getMatchParticipantForEvolution[\s\S]{0,1500}null/)
  })

  // 10.6 — uses limit(1) for efficiency
  it('[4.1-QRY-024] getMatchParticipantForEvolution uses limit(1) for single-row lookup', () => {
    const queries = getQueries()
    expect(queries).toMatch(/getMatchParticipantForEvolution[\s\S]{0,1500}\.limit\(1\)/)
  })
})
