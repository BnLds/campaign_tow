// tests/3-1-schema.test.ts
// Story 3.1: Army Timeline View
// Status: RED — written before implementation (TDD)
//
// Static file-contract tests for the new DB schema tables added to src/db/schema.ts.
// Follows the pattern established in tests/2-4-unit-deltas-queries.test.ts.
//
// NOTE: These are structural contract tests (file-content assertions).
// They verify code patterns exist but do not test runtime behavior.
//
// Covers Task 1 (schema) and story tasks 7.22, 7.23.
// All tests will fail until the implementation is complete (tables don't exist yet).

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '..')

function getSchema() {
  return readFileSync(resolve(root, 'src/db/schema.ts'), 'utf-8')
}

// ---------------------------------------------------------------------------
// AC1, AC3, AC4, AC6 — matches table (Task 1.1)
// ---------------------------------------------------------------------------

describe('[AC1][AC3][AC4][AC6][P0] DB schema — matches table — src/db/schema.ts', () => {
  it('[3.1-SCH-001] schema.ts exports a matches table', () => {
    const schema = getSchema()
    expect(schema).toMatch(/export const matches\s*=\s*pgTable\('matches'/)
  })

  it('[3.1-SCH-002] matches table has id column as text primary key with UUID default', () => {
    const schema = getSchema()
    expect(schema).toMatch(/matches[\s\S]{0,600}id:\s*text\('id'\)\.primaryKey\(\)\.\$defaultFn/)
  })

  it('[3.1-SCH-003] matches table has date column as timestamp (not null)', () => {
    const schema = getSchema()
    expect(schema).toMatch(/matches[\s\S]{0,600}date:\s*timestamp\('date'\)\.notNull\(\)/)
  })

  it('[3.1-SCH-004] matches table has createdByPlayerId FK to players.id with onDelete set null', () => {
    const schema = getSchema()
    expect(schema).toContain(".references(() => players.id, { onDelete: 'set null' })")
    // The references with set null must be inside the matches table block
    expect(schema).toMatch(/matches[\s\S]{0,800}onDelete:\s*'set null'/)
  })

  it('[3.1-SCH-005] matches table has createdAt column as timestamp (not null, defaultNow)', () => {
    const schema = getSchema()
    // Both the matches and match_participants tables have createdAt — verify matches has it
    // Match specific context: after "matches = pgTable('matches'" there must be a createdAt
    expect(schema).toMatch(/matches[\s\S]{0,800}createdAt[\s\S]{0,200}defaultNow/)
  })
})

// ---------------------------------------------------------------------------
// AC1, AC3, AC4, AC6 — match_participants table (Task 1.2)
// ---------------------------------------------------------------------------

describe('[AC1][AC3][AC4][AC6][P0] DB schema — match_participants table — src/db/schema.ts', () => {
  it('[3.1-SCH-006] schema.ts exports a matchParticipants table', () => {
    const schema = getSchema()
    expect(schema).toMatch(/export const matchParticipants\s*=\s*pgTable\('match_participants'/)
  })

  it('[3.1-SCH-007] match_participants table has id column as text primary key with UUID default', () => {
    const schema = getSchema()
    expect(schema).toMatch(/matchParticipants[\s\S]{0,600}id:\s*text\('id'\)\.primaryKey\(\)\.\$defaultFn/)
  })

  it('[3.1-SCH-008] match_participants has matchId FK to matches.id with onDelete cascade (not null)', () => {
    const schema = getSchema()
    // matchId must reference matches.id with cascade and notNull
    expect(schema).toMatch(/matchParticipants[\s\S]{0,600}matchId[\s\S]{0,300}references\(\(\)\s*=>\s*matches\.id,\s*\{\s*onDelete:\s*'cascade'\s*\}/)
  })

  it('[3.1-SCH-009] matchId column is notNull in match_participants', () => {
    const schema = getSchema()
    expect(schema).toMatch(/matchParticipants[\s\S]{0,600}matchId[\s\S]{0,300}\.notNull\(\)/)
  })

  it('[3.1-SCH-010] match_participants has playerId FK to players.id with onDelete cascade (not null)', () => {
    const schema = getSchema()
    expect(schema).toMatch(/matchParticipants[\s\S]{0,800}playerId[\s\S]{0,300}references\(\(\)\s*=>\s*players\.id,\s*\{\s*onDelete:\s*'cascade'\s*\}/)
  })

  it('[3.1-SCH-011] playerId column is notNull in match_participants', () => {
    const schema = getSchema()
    expect(schema).toMatch(/matchParticipants[\s\S]{0,800}playerId[\s\S]{0,300}\.notNull\(\)/)
  })

  it('[3.1-SCH-011b] match_participants has armyId FK to armies.id with onDelete set null (nullable)', () => {
    const schema = getSchema()
    expect(schema).toMatch(/matchParticipants[\s\S]{0,1000}armyId[\s\S]{0,300}references\(\(\)\s*=>\s*armies\.id,\s*\{\s*onDelete:\s*'set null'\s*\}/)
  })

  it('[3.1-SCH-012] match_participants has result column as nullable enum (victory|defeat|draw, no .notNull())', () => {
    const schema = getSchema()
    // result column uses matchResultEnum — enforces valid values at DB level
    expect(schema).toMatch(/matchParticipants[\s\S]{0,1000}result:\s*matchResultEnum\('result'\)/)
    // result should NOT have .notNull() chained — nullable for pending state
    const resultLineMatch = schema.match(/result:\s*matchResultEnum\('result'\)[^,\n]*/)
    expect(resultLineMatch).not.toBeNull()
    if (resultLineMatch) {
      expect(resultLineMatch[0]).not.toContain('.notNull()')
    }
  })

  it('[3.1-SCH-013] match_participants has evolutionsEnteredAt column as nullable timestamp', () => {
    const schema = getSchema()
    expect(schema).toMatch(/matchParticipants[\s\S]{0,1200}evolutionsEnteredAt[\s\S]{0,200}timestamp/)
    // evolutionsEnteredAt must NOT have .notNull()
    const evoLineMatch = schema.match(/evolutionsEnteredAt[\s\S]{0,100}timestamp[^,\n]*/)
    expect(evoLineMatch).not.toBeNull()
    if (evoLineMatch) {
      expect(evoLineMatch[0]).not.toContain('.notNull()')
    }
  })

  it('[3.1-SCH-014] match_participants has createdAt column as timestamp (not null, defaultNow)', () => {
    const schema = getSchema()
    // Both tables have createdAt — verify matchParticipants context contains it
    expect(schema).toMatch(/matchParticipants[\s\S]{0,1400}createdAt[\s\S]{0,200}defaultNow/)
  })
})

// ---------------------------------------------------------------------------
// AC1, AC3, AC4 — Drizzle relations (Task 1.3)
// ---------------------------------------------------------------------------

describe('[AC1][AC3][AC4][P1] DB schema — Drizzle relations — src/db/schema.ts', () => {
  it('[3.1-SCH-015] schema.ts imports relations from drizzle-orm', () => {
    const schema = getSchema()
    expect(schema).toMatch(/import[\s\S]{0,200}relations[\s\S]{0,100}drizzle-orm/)
  })

  it('[3.1-SCH-016] schema defines matchesRelations (one match -> many participants)', () => {
    const schema = getSchema()
    expect(schema).toMatch(/matchesRelations\s*=\s*relations\(matches/)
  })

  it('[3.1-SCH-017] schema defines matchParticipantsRelations (participant -> match and army)', () => {
    const schema = getSchema()
    expect(schema).toMatch(/matchParticipantsRelations\s*=\s*relations\(matchParticipants/)
  })
})
