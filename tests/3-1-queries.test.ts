// tests/3-1-queries.test.ts
// Story 3.1: Army Timeline View
// Status: RED — written before implementation (TDD)
//
// Static file-contract tests for the new DB query functions added to src/db/queries.ts.
// Follows the pattern established in tests/2-4-unit-deltas-queries.test.ts.
//
// NOTE: These are structural contract tests (file-content assertions).
// They verify code patterns exist but do not test runtime behavior.
//
// Covers Task 2 (query functions) and story tasks 7.1–7.8.
// All tests will fail until the implementation is complete.

import { describe, it, expect } from 'vitest'
import { readAllQueries as getQueries } from './helpers/read-queries'

// ---------------------------------------------------------------------------
// AC1, AC3, AC4, AC5, AC6 — getTimelineForArmy (Task 2.1)
// Task 7.1: returns matches in reverse chronological order
// Task 7.2: returns empty array for army with no matches
// Task 7.3: includes opponent info via self-join
// Task 7.4: returns result from requesting army's participant row
// Task 7.5: hasEvolutions is true when evolutionsEnteredAt is non-null
// Task 7.6: handles missing opponent (cascade-deleted army)
// ---------------------------------------------------------------------------

describe('[AC1][AC3][AC4][AC5][AC6][P0] DB queries — getTimelineForArmy — src/db/queries.ts', () => {
  it('[3.1-QRY-001] queries.ts exports getTimelineForArmy as async function', () => {
    const queries = getQueries()
    expect(queries).toContain('export async function getTimelineForArmy')
  })

  it('[3.1-QRY-002] getTimelineForArmy accepts armyId parameter', () => {
    const queries = getQueries()
    expect(queries).toMatch(/getTimelineForArmy[\s\S]{0,200}armyId/)
  })

  it('[3.1-QRY-003] getTimelineForArmy queries matchParticipants table', () => {
    const queries = getQueries()
    expect(queries).toMatch(/getTimelineForArmy[\s\S]{0,1500}matchParticipants/)
  })

  it('[3.1-QRY-004] getTimelineForArmy joins matches table to get match date', () => {
    const queries = getQueries()
    expect(queries).toMatch(/getTimelineForArmy[\s\S]{0,2000}matches/)
  })

  it('[3.1-QRY-005] getTimelineForArmy uses alias() for self-join on match_participants (opponent lookup)', () => {
    const queries = getQueries()
    // alias() from drizzle-orm/pg-core is required for the self-join
    expect(queries).toMatch(/alias\(matchParticipants/)
  })

  it('[3.1-QRY-006] getTimelineForArmy imports alias from drizzle-orm/pg-core (not drizzle-orm)', () => {
    const queries = getQueries()
    expect(queries).toMatch(/import[\s\S]{0,200}alias[\s\S]{0,200}drizzle-orm\/pg-core/)
  })

  it('[3.1-QRY-007] getTimelineForArmy orders results by match date DESC (reverse chronological)', () => {
    const queries = getQueries()
    // Must use desc() or .desc() on the date field inside getTimelineForArmy
    expect(queries).toMatch(/getTimelineForArmy[\s\S]{0,2000}(desc\(|\.desc\(\))/)
  })

  it('[3.1-QRY-008] getTimelineForArmy returns hasEvolutions boolean (evolutionsEnteredAt not null)', () => {
    const queries = getQueries()
    // hasEvolutions or equivalent derived from evolutionsEnteredAt
    expect(queries).toMatch(/getTimelineForArmy[\s\S]{0,2500}(hasEvolutions|evolutionsEnteredAt)/)
  })

  it('[3.1-QRY-009] getTimelineForArmy includes opponent army name and faction in return shape', () => {
    const queries = getQueries()
    // The opponent army name (opponentName or similar) must be in the result
    expect(queries).toMatch(/getTimelineForArmy[\s\S]{0,2500}(opponent|opp)[\s\S]{0,200}(name|faction)/)
  })

  it('[3.1-QRY-010] getTimelineForArmy does not expose raw DB internals (returns typed TimelineEntryData array)', () => {
    const queries = getQueries()
    // Function must declare a return type or export a type alongside
    expect(queries).toMatch(/(TimelineEntryData|TimelineEntry)/)
  })

  it('[3.1-QRY-011] getTimelineForArmy filters by armyId (the requesting army — not opponent)', () => {
    const queries = getQueries()
    // WHERE clause filtering by armyId on the primary participant row
    expect(queries).toMatch(/getTimelineForArmy[\s\S]{0,2000}(where|eq)[\s\S]{0,300}armyId/)
  })

  it('[3.1-QRY-026] getTimelineForArmy self-join excludes the requesting army\'s own participant row (ne condition)', () => {
    const queries = getQueries()
    // The oppParticipant join must use ne(oppParticipant.armyId, ...) to avoid duplicate entries
    // where an army appears as its own opponent
    expect(queries).toMatch(/ne\(oppParticipant\.armyId/)
  })
})

// ---------------------------------------------------------------------------
// AC1, AC2 — getPlayerArmy (Task 2.2)
// Task 7.7: returns the army for the given player
// Task 7.8: returns null when player has no army
// ---------------------------------------------------------------------------

describe('[AC1][AC2][P0] DB queries — getPlayerArmy — src/db/queries.ts', () => {
  it('[3.1-QRY-012] queries.ts exports getPlayerArmy as async function', () => {
    const queries = getQueries()
    expect(queries).toContain('export async function getPlayerArmy')
  })

  it('[3.1-QRY-013] getPlayerArmy accepts playerId parameter', () => {
    const queries = getQueries()
    expect(queries).toMatch(/getPlayerArmy[\s\S]{0,200}playerId/)
  })

  it('[3.1-QRY-014] getPlayerArmy queries the armies table filtered by playerId', () => {
    const queries = getQueries()
    expect(queries).toMatch(/getPlayerArmy[\s\S]{0,600}armies[\s\S]{0,200}playerId/)
  })

  it('[3.1-QRY-015] getPlayerArmy returns null when no army found (not throwing)', () => {
    const queries = getQueries()
    expect(queries).toMatch(/getPlayerArmy[\s\S]{0,1000}null/)
  })

  it('[3.1-QRY-016] getPlayerArmy returns id, name, faction, playerId in the result shape', () => {
    const queries = getQueries()
    // These fields must appear inside the getPlayerArmy function body
    expect(queries).toMatch(/getPlayerArmy[\s\S]{0,800}(id[\s\S]{0,100}name[\s\S]{0,100}faction|name[\s\S]{0,100}faction[\s\S]{0,100}id)/)
  })

  it('[3.1-QRY-017] getPlayerArmy uses .limit(1) to avoid multiple rows (1 army per player)', () => {
    const queries = getQueries()
    expect(queries).toMatch(/getPlayerArmy[\s\S]{0,800}\.limit\(1\)/)
  })
})

// ---------------------------------------------------------------------------
// AC1, AC4, AC7 — TypelineEntryData type exported (Task 2.4)
// ---------------------------------------------------------------------------

describe('[AC1][AC4][P0] Type export — TimelineEntryData — src/db/queries.ts', () => {
  it('[3.1-QRY-018] queries.ts exports a TimelineEntryData type', () => {
    const queries = getQueries()
    expect(queries).toMatch(/export (type|interface) TimelineEntryData/)
  })

  it('[3.1-QRY-019] TimelineEntryData type includes matchId, date, result fields', () => {
    const queries = getQueries()
    expect(queries).toMatch(/TimelineEntryData[\s\S]{0,600}(matchId|date|result)/)
  })

  it('[3.1-QRY-020] TimelineEntryData type includes hasEvolutions boolean field', () => {
    const queries = getQueries()
    expect(queries).toMatch(/TimelineEntryData[\s\S]{0,800}hasEvolutions/)
  })

  it('[3.1-QRY-021] TimelineEntryData type includes opponent shape (name, faction)', () => {
    const queries = getQueries()
    expect(queries).toMatch(/TimelineEntryData[\s\S]{0,1000}opponent[\s\S]{0,200}(name|faction)/)
  })
})

// ---------------------------------------------------------------------------
// AC4, AC7 — getAllArmies still works (Task 2.3 — verify no regression)
// ---------------------------------------------------------------------------

describe('[AC4][AC7][P0] DB queries — getAllArmies still present — src/db/queries.ts', () => {
  it('[3.1-QRY-022] queries.ts still exports getAllArmies (no regression from story 2.1)', () => {
    const queries = getQueries()
    expect(queries).toContain('export async function getAllArmies')
  })

  it('[3.1-QRY-023] getAllArmies returns playerDisplayName (needed for armies list AC7)', () => {
    const queries = getQueries()
    expect(queries).toMatch(/getAllArmies[\s\S]{0,600}playerDisplayName/)
  })
})

// ---------------------------------------------------------------------------
// AC1, AC3, AC4 — imports from schema updated (Task 1.5)
// ---------------------------------------------------------------------------

describe('[AC1][AC3][AC4][P0] DB schema imports in queries.ts — Task 1.5', () => {
  it('[3.1-QRY-024] queries.ts imports matches from schema', () => {
    const queries = getQueries()
    expect(queries).toMatch(/import[\s\S]{0,500}matches[\s\S]{0,200}schema/)
  })

  it('[3.1-QRY-025] queries.ts imports matchParticipants from schema', () => {
    const queries = getQueries()
    expect(queries).toMatch(/import[\s\S]{0,500}matchParticipants[\s\S]{0,200}schema/)
  })
})
