// tests/2-4-unit-deltas-queries.test.ts
// Story 2.4: Direct Edit of Unit & Character Deltas
// Status: RED — written before implementation (TDD)
//
// Static file-contract tests for the new DB query functions that will be added to
// src/db/queries.ts. Follows the pattern established in tests/integration/2-2-queries.test.ts.
//
// NOTE: These are structural contract tests (file-content assertions).
// They verify code patterns exist but do not test runtime behavior.
// Integration/behavioral tests should be added when a test DB is available.
//
// All tests will fail until the implementation is complete (functions don't exist yet).

import { describe, it, expect } from 'vitest'
import { readAllQueries as getQueries } from './helpers/read-queries'

// ---------------------------------------------------------------------------
// AC1, AC2 — insertStatModifier (Task 1.1)
// ---------------------------------------------------------------------------

describe('[AC1][AC2][P0] DB queries — insertStatModifier — src/db/queries.ts', () => {
  it('[2.4-QRY-001] queries.ts exports insertStatModifier as async function', () => {
    const queries = getQueries()
    expect(queries).toContain('export async function insertStatModifier')
  })

  it('[2.4-QRY-002] insertStatModifier accepts unitId, stat, delta, source, temporary parameters', () => {
    const queries = getQueries()
    expect(queries).toMatch(/insertStatModifier[\s\S]{0,400}unitId[\s\S]{0,200}stat[\s\S]{0,200}delta[\s\S]{0,200}source[\s\S]{0,200}temporary/)
  })

  it('[2.4-QRY-003] insertStatModifier inserts into statModifiers table', () => {
    const queries = getQueries()
    expect(queries).toMatch(/insertStatModifier[\s\S]{0,600}statModifiers/)
  })

  it('[2.4-QRY-004] insertStatModifier uses .returning() to return the inserted row', () => {
    const queries = getQueries()
    expect(queries).toMatch(/insertStatModifier[\s\S]{0,800}\.returning\(\)/)
  })

  it('[2.4-QRY-005] insertStatModifier returns an object with id field (for delete operations)', () => {
    const queries = getQueries()
    // The inserted row must have an id — confirmed by .returning() and statModifiers schema
    expect(queries).toMatch(/insertStatModifier[\s\S]{0,1000}(return|\.returning)/)
  })
})

// ---------------------------------------------------------------------------
// AC7 — deleteStatModifier (Task 1.2)
// ---------------------------------------------------------------------------

describe('[AC7][P0] DB queries — deleteStatModifier — src/db/queries.ts', () => {
  it('[2.4-QRY-006] queries.ts exports deleteStatModifier as async function', () => {
    const queries = getQueries()
    expect(queries).toContain('export async function deleteStatModifier')
  })

  it('[2.4-QRY-007] deleteStatModifier accepts modifierId parameter', () => {
    const queries = getQueries()
    expect(queries).toMatch(/deleteStatModifier[\s\S]{0,200}modifierId/)
  })

  it('[2.4-QRY-008] deleteStatModifier deletes from statModifiers table by id', () => {
    const queries = getQueries()
    expect(queries).toMatch(/deleteStatModifier[\s\S]{0,600}statModifiers[\s\S]{0,200}id/)
  })

  it('[2.4-QRY-009] deleteStatModifier uses .returning() to detect if row existed', () => {
    const queries = getQueries()
    expect(queries).toMatch(/deleteStatModifier[\s\S]{0,800}\.returning\(\)/)
  })

  it('[2.4-QRY-010] deleteStatModifier returns boolean (true if deleted, false if not found)', () => {
    const queries = getQueries()
    expect(queries).toMatch(/deleteStatModifier[\s\S]{0,1000}(return true|return false|\? true : false|\.length > 0)/)
  })
})

// ---------------------------------------------------------------------------
// AC3 — insertUnitGain (Task 1.3)
// ---------------------------------------------------------------------------

describe('[AC3][P0] DB queries — insertUnitGain — src/db/queries.ts', () => {
  it('[2.4-QRY-011] queries.ts exports insertUnitGain as async function', () => {
    const queries = getQueries()
    expect(queries).toContain('export async function insertUnitGain')
  })

  it('[2.4-QRY-012] insertUnitGain accepts unitId, description parameters', () => {
    const queries = getQueries()
    expect(queries).toMatch(/insertUnitGain[\s\S]{0,400}unitId[\s\S]{0,200}description/)
  })

  it('[2.4-QRY-013] insertUnitGain inserts into unitGains table', () => {
    const queries = getQueries()
    expect(queries).toMatch(/insertUnitGain[\s\S]{0,600}unitGains/)
  })

  it('[2.4-QRY-014] insertUnitGain uses .returning() to return the inserted row', () => {
    const queries = getQueries()
    expect(queries).toMatch(/insertUnitGain[\s\S]{0,800}\.returning\(\)/)
  })
})

// ---------------------------------------------------------------------------
// AC8 — deleteUnitGain (Task 1.4)
// ---------------------------------------------------------------------------

describe('[AC8][P0] DB queries — deleteUnitGain — src/db/queries.ts', () => {
  it('[2.4-QRY-015] queries.ts exports deleteUnitGain as async function', () => {
    const queries = getQueries()
    expect(queries).toContain('export async function deleteUnitGain')
  })

  it('[2.4-QRY-016] deleteUnitGain accepts gainId parameter', () => {
    const queries = getQueries()
    expect(queries).toMatch(/deleteUnitGain[\s\S]{0,200}gainId/)
  })

  it('[2.4-QRY-017] deleteUnitGain deletes from unitGains table by id', () => {
    const queries = getQueries()
    expect(queries).toMatch(/deleteUnitGain[\s\S]{0,600}unitGains[\s\S]{0,200}id/)
  })

  it('[2.4-QRY-018] deleteUnitGain uses .returning() to detect if row existed', () => {
    const queries = getQueries()
    expect(queries).toMatch(/deleteUnitGain[\s\S]{0,800}\.returning\(\)/)
  })

  it('[2.4-QRY-019] deleteUnitGain returns boolean (true if deleted, false if not found)', () => {
    const queries = getQueries()
    expect(queries).toMatch(/deleteUnitGain[\s\S]{0,1000}(return true|return false|\? true : false|\.length > 0)/)
  })
})

// ---------------------------------------------------------------------------
// AC4, AC5 — updateUnitXp (Task 1.5)
// ---------------------------------------------------------------------------

describe('[AC4][AC5][P0] DB queries — updateUnitXp — src/db/queries.ts', () => {
  it('[2.4-QRY-020] queries.ts exports updateUnitXp as async function', () => {
    const queries = getQueries()
    expect(queries).toContain('export async function updateUnitXp')
  })

  it('[2.4-QRY-021] updateUnitXp accepts unitId and xp parameters', () => {
    const queries = getQueries()
    expect(queries).toMatch(/updateUnitXp[\s\S]{0,200}unitId[\s\S]{0,100}xp/)
  })

  it('[2.4-QRY-022] updateUnitXp updates the units table (sets xp field)', () => {
    const queries = getQueries()
    expect(queries).toMatch(/updateUnitXp[\s\S]{0,600}units[\s\S]{0,200}xp/)
  })

  it('[2.4-QRY-023] updateUnitXp uses .returning() to detect if unit existed', () => {
    const queries = getQueries()
    expect(queries).toMatch(/updateUnitXp[\s\S]{0,800}\.returning\(\)/)
  })

  it('[2.4-QRY-024] updateUnitXp returns boolean (true if updated, false if not found)', () => {
    const queries = getQueries()
    expect(queries).toMatch(/updateUnitXp[\s\S]{0,1000}(return true|return false|\? true : false|\.length > 0)/)
  })
})

// ---------------------------------------------------------------------------
// AC9 — getUnitById (Task 1.6) — needed for unit-army consistency check
// ---------------------------------------------------------------------------

describe('[AC9][P0] DB queries — getUnitById — src/db/queries.ts', () => {
  it('[2.4-QRY-025] queries.ts exports getUnitById as async function', () => {
    const queries = getQueries()
    expect(queries).toContain('export async function getUnitById')
  })

  it('[2.4-QRY-026] getUnitById accepts unitId parameter', () => {
    const queries = getQueries()
    expect(queries).toMatch(/getUnitById[\s\S]{0,200}unitId/)
  })

  it('[2.4-QRY-027] getUnitById queries the units table', () => {
    const queries = getQueries()
    expect(queries).toMatch(/getUnitById[\s\S]{0,600}units/)
  })

  it('[2.4-QRY-028] getUnitById returns armyId in the result (essential for cross-army consistency check)', () => {
    const queries = getQueries()
    // armyId must be selected/returned inside getUnitById
    expect(queries).toMatch(/getUnitById[\s\S]{0,800}armyId/)
  })

  it('[2.4-QRY-029] getUnitById returns null for non-existent unit (not throwing)', () => {
    const queries = getQueries()
    // Must return null when no unit found — same pattern as getArmyOwner
    expect(queries).toMatch(/getUnitById[\s\S]{0,1000}null/)
  })
})
