// src/db/__tests__/queries-record.test.ts
// Story 3.1b: App Shell — TabBar, Layout & Navigation Components
// Status: RED — written before implementation (TDD)
//
// Static file-contract tests for the new DB query functions added to src/db/queries.ts:
//   - getArmyRecord(armyId: string)
//   - getAllArmyRecords()
//
// Follows the pattern established in tests/3-1-queries.test.ts.
// These are structural contract tests (file-content assertions).
// They verify code patterns exist but do not test runtime behavior.
//
// Covers AC4, AC10 and Tasks 5.1, 6.1, 8.13–8.17.
// All tests will fail until the implementation is complete.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { readAllQueries as getQueries } from '../../../tests/helpers/read-queries'

const root = resolve(__dirname, '../../..')

// ---------------------------------------------------------------------------
// AC4, AC10 — getArmyRecord function (Task 5.1)
// Task 8.13: returns correct counts for victories, defeats, draws
// Task 8.14: returns zeros when army has no completed matches
// Task 8.15: does not count null results (pending matches)
// ---------------------------------------------------------------------------

describe('[AC4][AC10][P0] DB queries — getArmyRecord — src/db/queries.ts', () => {
  it('[3.1b-QRY-001] queries.ts exports getArmyRecord as async function', () => {
    const queries = getQueries()
    expect(queries).toContain('export async function getArmyRecord')
  })

  it('[3.1b-QRY-002] getArmyRecord accepts armyId parameter', () => {
    const queries = getQueries()
    expect(queries).toMatch(/getArmyRecord[\s\S]{0,200}armyId/)
  })

  it('[3.1b-QRY-003] getArmyRecord returns wins count', () => {
    const queries = getQueries()
    expect(queries).toMatch(/getArmyRecord[\s\S]{0,800}wins/)
  })

  it('[3.1b-QRY-004] getArmyRecord returns draws count', () => {
    const queries = getQueries()
    expect(queries).toMatch(/getArmyRecord[\s\S]{0,800}draws/)
  })

  it('[3.1b-QRY-005] getArmyRecord returns losses count', () => {
    const queries = getQueries()
    expect(queries).toMatch(/getArmyRecord[\s\S]{0,800}losses/)
  })

  it('[3.1b-QRY-006] getArmyRecord queries matchParticipants table', () => {
    const queries = getQueries()
    expect(queries).toMatch(/getArmyRecord[\s\S]{0,1000}matchParticipants/)
  })

  it('[3.1b-QRY-007] getArmyRecord uses COUNT FILTER for victory (Task 8.13, 8.15)', () => {
    const queries = getQueries()
    // Must use COUNT(*) FILTER (WHERE result = 'victory') pattern via Drizzle sql template
    expect(queries).toMatch(/getArmyRecord[\s\S]{0,1500}count[\s\S]{0,200}filter[\s\S]{0,200}victory/i)
  })

  it('[3.1b-QRY-008] getArmyRecord uses COUNT FILTER for draw (Task 8.13)', () => {
    const queries = getQueries()
    expect(queries).toMatch(/getArmyRecord[\s\S]{0,1500}count[\s\S]{0,200}filter[\s\S]{0,200}draw/i)
  })

  it('[3.1b-QRY-009] getArmyRecord uses COUNT FILTER for defeat/losses (Task 8.13)', () => {
    const queries = getQueries()
    expect(queries).toMatch(/getArmyRecord[\s\S]{0,1500}count[\s\S]{0,200}filter[\s\S]{0,200}defeat/i)
  })

  it('[3.1b-QRY-010] getArmyRecord filters by armyId on matchParticipants (Task 8.14)', () => {
    const queries = getQueries()
    expect(queries).toMatch(/getArmyRecord[\s\S]{0,1500}(where|eq)[\s\S]{0,300}armyId/)
  })

  it('[3.1b-QRY-011] getArmyRecord wraps counts with Number() to convert string|null (Task 8.14)', () => {
    const queries = getQueries()
    // Drizzle returns string|null for raw SQL aggregates — must convert with Number()
    expect(queries).toMatch(/getArmyRecord[\s\S]{0,1500}Number\(/)
  })

  it('[3.1b-QRY-012] getArmyRecord returns { wins, draws, losses } shape', () => {
    const queries = getQueries()
    expect(queries).toMatch(/getArmyRecord[\s\S]{0,1500}\{\s*(wins|draws|losses)/)
  })

  it('[3.1b-QRY-013] getArmyRecord uses sql template from drizzle-orm for COUNT FILTER', () => {
    const queries = getQueries()
    // Must import sql from drizzle-orm
    expect(queries).toMatch(/import[\s\S]{0,300}sql[\s\S]{0,100}drizzle-orm/)
  })
})

// ---------------------------------------------------------------------------
// AC3, AC10 — getAllArmyRecords batch function (Task 6.1)
// Task 8.16: returns records grouped by army ID
// Task 8.17: returns empty Map when no match_participants exist
// ---------------------------------------------------------------------------

describe('[AC3][AC10][P0] DB queries — getAllArmyRecords — src/db/queries.ts', () => {
  it('[3.1b-QRY-014] queries.ts exports getAllArmyRecords as async function', () => {
    const queries = getQueries()
    expect(queries).toContain('export async function getAllArmyRecords')
  })

  it('[3.1b-QRY-015] getAllArmyRecords takes no parameters (batch query — no armyId filter)', () => {
    const queries = getQueries()
    // Function signature must have empty or no params (batch query)
    expect(queries).toMatch(/getAllArmyRecords\(\s*\)/)
  })

  it('[3.1b-QRY-016] getAllArmyRecords groups results by army_id (Task 8.16)', () => {
    const queries = getQueries()
    expect(queries).toMatch(/getAllArmyRecords[\s\S]{0,1000}(groupBy|group_by)[\s\S]{0,200}armyId/i)
  })

  it('[3.1b-QRY-017] getAllArmyRecords returns a Map (Task 8.16, 8.17)', () => {
    const queries = getQueries()
    // Must return a Map<string, {...}> — not a plain array
    expect(queries).toMatch(/getAllArmyRecords[\s\S]{0,1500}(Map|new Map)/)
  })

  it('[3.1b-QRY-018] getAllArmyRecords Map key is armyId (string)', () => {
    const queries = getQueries()
    expect(queries).toMatch(/getAllArmyRecords[\s\S]{0,1500}map\.set\([\s\S]{0,100}armyId/)
  })

  it('[3.1b-QRY-019] getAllArmyRecords Map value contains wins, draws, losses', () => {
    const queries = getQueries()
    expect(queries).toMatch(/getAllArmyRecords[\s\S]{0,2000}wins[\s\S]{0,200}draws[\s\S]{0,200}losses/)
  })

  it('[3.1b-QRY-020] getAllArmyRecords uses COUNT FILTER for victory (batch N+1 prevention)', () => {
    const queries = getQueries()
    expect(queries).toMatch(/getAllArmyRecords[\s\S]{0,1500}count[\s\S]{0,200}filter[\s\S]{0,200}victory/i)
  })

  it('[3.1b-QRY-021] getAllArmyRecords wraps counts with Number() for type safety', () => {
    const queries = getQueries()
    expect(queries).toMatch(/getAllArmyRecords[\s\S]{0,1500}Number\(/)
  })

  it('[3.1b-QRY-022] getAllArmyRecords return type is Map<string, { wins, draws, losses }>', () => {
    const queries = getQueries()
    // TypeScript return type annotation on the function
    expect(queries).toMatch(/getAllArmyRecords[\s\S]{0,400}Map<string/)
  })
})

// ---------------------------------------------------------------------------
// AC4 — Root layout loads getArmyRecord via getPlayerArmyInfoFn (moved from index.tsx)
// ---------------------------------------------------------------------------

describe('[AC4][P0] Root layout — getArmyRecord integration (Task 5.2 → moved to __root.tsx)', () => {
  it('[3.1b-QRY-023] __root.tsx calls getArmyRecord in getPlayerArmyInfoFn', () => {
    const rootRoute = readFileSync(resolve(root, 'src/routes/__root.tsx'), 'utf-8')
    expect(rootRoute).toMatch(/getArmyRecord/)
  })

  it('[3.1b-QRY-024] __root.tsx includes record in beforeLoad return value', () => {
    const rootRoute = readFileSync(resolve(root, 'src/routes/__root.tsx'), 'utf-8')
    expect(rootRoute).toMatch(/return\s*\{[^}]*record/)
  })

  it('[3.1b-QRY-025] __root.tsx returns record: null for guest users', () => {
    const rootRoute = readFileSync(resolve(root, 'src/routes/__root.tsx'), 'utf-8')
    expect(rootRoute).toMatch(/isGuest[\s\S]{0,600}record.*null|record.*null[\s\S]{0,600}isGuest/)
  })
})

// ---------------------------------------------------------------------------
// AC4, AC10 — Root header displays record (Task 5.3, 5.4 → moved to __root.tsx)
// ---------------------------------------------------------------------------

describe('[AC4][AC10][P0] Root header — record display (Task 5.3, 5.4 → moved to __root.tsx)', () => {
  it('[3.1b-QRY-026] __root.tsx contains "Aucune partie" for zero/null record (AC10)', () => {
    const rootRoute = readFileSync(resolve(root, 'src/routes/__root.tsx'), 'utf-8')
    expect(rootRoute).toContain('Aucune partie')
  })

  it('[3.1b-QRY-027] __root.tsx contains "parties" text in record format (e.g. "4 parties")', () => {
    const rootRoute = readFileSync(resolve(root, 'src/routes/__root.tsx'), 'utf-8')
    expect(rootRoute).toContain('parties')
  })

  it('[3.1b-QRY-028] __root.tsx applies --color-bonus token for wins display', () => {
    const rootRoute = readFileSync(resolve(root, 'src/routes/__root.tsx'), 'utf-8')
    expect(rootRoute).toContain('--color-bonus')
  })

  it('[3.1b-QRY-029] __root.tsx applies --color-malus token for losses display', () => {
    const rootRoute = readFileSync(resolve(root, 'src/routes/__root.tsx'), 'utf-8')
    expect(rootRoute).toContain('--color-malus')
  })
})
