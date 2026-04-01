// src/db/__tests__/queries-post-match.test.ts
// Story 4.1: Post-Match Flow — XP Entry per Unit & Character
// Status: RED — written before implementation (TDD)
//
// Static file-contract tests for the new DB query functions added to src/db/queries.ts:
//   - getMatchParticipantForEvolutionByPlayer(matchId, playerId)
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
import { readAllQueries as getQueries } from '../../../tests/helpers/read-queries'

const root = resolve(__dirname, '../../..')

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
// 10.6, 10.7 — getMatchParticipantForEvolutionByPlayer function (Task 1.1, player-first refactor)
// AC: 3, 4, 5, 7
// ---------------------------------------------------------------------------

describe('[AC3][AC4][AC5][AC7][P0] DB queries — getMatchParticipantForEvolutionByPlayer — src/db/queries.ts', () => {
  // 10.6 — returns participant with evolutionsEnteredAt field
  it('[4.1-QRY-017] queries.ts exports getMatchParticipantForEvolutionByPlayer as async function', () => {
    const queries = getQueries()
    expect(queries).toContain('export async function getMatchParticipantForEvolutionByPlayer')
  })

  // 10.6 — accepts matchId and playerId parameters
  it('[4.1-QRY-018] getMatchParticipantForEvolutionByPlayer accepts matchId and playerId parameters', () => {
    const queries = getQueries()
    expect(queries).toMatch(/getMatchParticipantForEvolutionByPlayer[\s\S]{0,300}matchId[\s\S]{0,100}playerId/)
  })

  // 10.6 — returns row with evolutionsEnteredAt field
  it('[4.1-QRY-019] getMatchParticipantForEvolutionByPlayer selects evolutionsEnteredAt field', () => {
    const queries = getQueries()
    expect(queries).toMatch(/getMatchParticipantForEvolutionByPlayer[\s\S]{0,1500}evolutionsEnteredAt/)
  })

  // 10.6 — returns { id, matchId, playerId, armyId, result, evolutionsEnteredAt } shape
  it('[4.1-QRY-020] getMatchParticipantForEvolutionByPlayer returns row with id, matchId, playerId, armyId, result, evolutionsEnteredAt', () => {
    const queries = getQueries()
    expect(queries).toMatch(/getMatchParticipantForEvolutionByPlayer[\s\S]{0,2000}id[\s\S]{0,200}matchId[\s\S]{0,200}playerId[\s\S]{0,200}armyId[\s\S]{0,200}result[\s\S]{0,200}evolutionsEnteredAt/)
  })

  // 10.6 — queries matchParticipants table
  it('[4.1-QRY-021] getMatchParticipantForEvolutionByPlayer queries matchParticipants table', () => {
    const queries = getQueries()
    expect(queries).toMatch(/getMatchParticipantForEvolutionByPlayer[\s\S]{0,1000}matchParticipants/)
  })

  // 10.6 — filters by both matchId AND playerId
  it('[4.1-QRY-022] getMatchParticipantForEvolutionByPlayer filters by both matchId AND playerId using and()', () => {
    const queries = getQueries()
    expect(queries).toMatch(/getMatchParticipantForEvolutionByPlayer[\s\S]{0,1500}and\(/)
  })

  // 10.7 — returns null for non-participant
  it('[4.1-QRY-023] getMatchParticipantForEvolutionByPlayer returns null when player is not a participant', () => {
    const queries = getQueries()
    expect(queries).toMatch(/getMatchParticipantForEvolutionByPlayer[\s\S]{0,1500}null/)
  })

  // 10.6 — uses limit(1) for efficiency
  it('[4.1-QRY-024] getMatchParticipantForEvolutionByPlayer uses limit(1) for single-row lookup', () => {
    const queries = getQueries()
    expect(queries).toMatch(/getMatchParticipantForEvolutionByPlayer[\s\S]{0,1500}\.limit\(1\)/)
  })
})

// ---------------------------------------------------------------------------
// Story 4-1b: Match XP Tracking & Wizard Resume
// ---------------------------------------------------------------------------

function getSchema() {
  return readFileSync(resolve(root, 'src/db/schema.ts'), 'utf-8')
}

// ---------------------------------------------------------------------------
// 4-1b — matchXpEntries table in schema.ts (AC1)
// ---------------------------------------------------------------------------

describe('[AC1][P0] DB schema — matchXpEntries table — src/db/schema.ts', () => {
  it('[4.1b-SCH-001] schema.ts defines matchXpEntries pgTable', () => {
    const schema = getSchema()
    expect(schema).toMatch(/export const matchXpEntries\s*=\s*pgTable\(/)
  })

  it('[4.1b-SCH-002] matchXpEntries has matchParticipantId FK to matchParticipants with cascade', () => {
    const schema = getSchema()
    expect(schema).toMatch(
      /matchXpEntries[\s\S]{0,1500}matchParticipantId[\s\S]{0,300}\.references\(\(\)\s*=>\s*matchParticipants\.id[\s\S]{0,100}onDelete:\s*['"]cascade['"]/
    )
  })

  it('[4.1b-SCH-003] matchXpEntries has unitId FK to units with cascade', () => {
    const schema = getSchema()
    expect(schema).toMatch(
      /matchXpEntries[\s\S]{0,2000}unitId[\s\S]{0,300}\.references\(\(\)\s*=>\s*units\.id[\s\S]{0,100}onDelete:\s*['"]cascade['"]/
    )
  })

  it('[4.1b-SCH-004] matchXpEntries has xpGained integer notNull', () => {
    const schema = getSchema()
    expect(schema).toMatch(
      /matchXpEntries[\s\S]{0,2500}xpGained[\s\S]{0,100}integer\([\s\S]{0,50}\)\.notNull\(\)/
    )
  })

  it('[4.1b-SCH-005] matchXpEntries has uniqueIndex on (matchParticipantId, unitId)', () => {
    const schema = getSchema()
    expect(schema).toMatch(
      /matchXpEntries[\s\S]{0,3000}unique(Index)?\([\s\S]{0,200}matchParticipantId[\s\S]{0,100}unitId/
    )
  })
})

// ---------------------------------------------------------------------------
// 4-1b — upsertMatchXpEntry function (AC1, AC3, AC5)
// ---------------------------------------------------------------------------

describe('[AC1][AC3][AC5][P0] DB queries — upsertMatchXpEntry — src/db/queries.ts', () => {
  it('[4.1b-QRY-001] queries.ts exports upsertMatchXpEntry as async function', () => {
    const queries = getQueries()
    expect(queries).toContain('export async function upsertMatchXpEntry')
  })

  it('[4.1b-QRY-002] upsertMatchXpEntry accepts matchParticipantId, unitId, xpGained params', () => {
    const queries = getQueries()
    expect(queries).toMatch(
      /upsertMatchXpEntry[\s\S]{0,300}matchParticipantId[\s\S]{0,150}unitId[\s\S]{0,150}xpGained/
    )
  })

  it('[4.1b-QRY-003] upsertMatchXpEntry SELECTs existing entry before upserting inside a transaction', () => {
    const queries = getQueries()
    // Must run inside a transaction (db.transaction), SELECT then INSERT/upsert via tx
    expect(queries).toMatch(
      /upsertMatchXpEntry[\s\S]{0,1500}db\.transaction[\s\S]{0,1500}tx\.select\([\s\S]{0,500}matchXpEntries[\s\S]{0,1500}tx\.insert\(matchXpEntries\)/
    )
  })

  it('[4.1b-QRY-004] upsertMatchXpEntry uses onConflictDoUpdate on matchXpEntries', () => {
    const queries = getQueries()
    expect(queries).toMatch(
      /upsertMatchXpEntry[\s\S]{0,2500}onConflictDoUpdate/
    )
  })

  it('[4.1b-QRY-005] upsertMatchXpEntry returns { previousXpGained } shape (number | null)', () => {
    const queries = getQueries()
    expect(queries).toMatch(
      /upsertMatchXpEntry[\s\S]{0,3000}previousXpGained/
    )
  })
})

// ---------------------------------------------------------------------------
// 4-1b — getMatchXpEntries function (AC2)
// ---------------------------------------------------------------------------

describe('[AC2][P0] DB queries — getMatchXpEntries — src/db/queries.ts', () => {
  it('[4.1b-QRY-006] queries.ts exports getMatchXpEntries as async function', () => {
    const queries = getQueries()
    expect(queries).toContain('export async function getMatchXpEntries')
  })

  it('[4.1b-QRY-007] getMatchXpEntries accepts matchParticipantId param', () => {
    const queries = getQueries()
    expect(queries).toMatch(
      /getMatchXpEntries[\s\S]{0,300}matchParticipantId/
    )
  })

  it('[4.1b-QRY-008] getMatchXpEntries queries matchXpEntries table', () => {
    const queries = getQueries()
    expect(queries).toMatch(
      /getMatchXpEntries[\s\S]{0,1000}matchXpEntries/
    )
  })

  it('[4.1b-QRY-009] getMatchXpEntries returns Array with unitId and xpGained fields', () => {
    const queries = getQueries()
    expect(queries).toMatch(
      /getMatchXpEntries[\s\S]{0,1500}unitId[\s\S]{0,500}xpGained/
    )
  })
})

// ---------------------------------------------------------------------------
// 4-1b — getTimelineForArmy modifications (AC4)
// ---------------------------------------------------------------------------

describe('[AC4][P0] DB queries — getTimelineForArmy modifications for XP entries — src/db/queries.ts', () => {
  it('[4.1b-QRY-010] getTimelineForArmy selects matchParticipants.id (needed as join key for XP entries)', () => {
    const queries = getQueries()
    expect(queries).toMatch(
      /getTimelineForArmy[\s\S]{0,2000}matchParticipants\.id/
    )
  })

  it('[4.1b-QRY-011] getTimelineForArmy references matchXpEntries for secondary XP query', () => {
    const queries = getQueries()
    expect(queries).toMatch(
      /getTimelineForArmy[\s\S]{0,8000}matchXpEntries/
    )
  })

  it('[4.1b-QRY-012] getTimelineForArmy returns unitXpEntries field in its results', () => {
    const queries = getQueries()
    expect(queries).toMatch(
      /getTimelineForArmy[\s\S]{0,8000}unitXpEntries/
    )
  })
})
