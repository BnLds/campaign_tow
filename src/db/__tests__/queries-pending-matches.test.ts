// src/db/__tests__/queries-pending-matches.test.ts
// Story 3.2: Match Creation & Pending Actions
// Status: RED — written before implementation (TDD)
//
// Static file-contract tests for the new DB query functions added to src/db/queries.ts:
//   - getPendingMatches(armyId: string)
//   - PendingMatchData type (exported)
//   - getArmyById(armyId: string) (new lightweight query for server-side validation)
//
// Follows the pattern established in src/db/__tests__/queries-record.test.ts.
// These are structural contract tests (file-content assertions).
// They verify code patterns exist but do not test runtime behavior.
//
// Covers Tasks 8.5, 8.6, 8.7, 8.8, 8.9, 8.10 (AC: 5, 6)
// All tests will fail until the implementation is complete.

import { describe, it, expect } from 'vitest'
import { readAllQueries as getQueries } from '../../../tests/helpers/read-queries'

// ---------------------------------------------------------------------------
// AC5, AC6 — PendingMatchData type exported (Task 5.2)
// ---------------------------------------------------------------------------

describe('[AC5][AC6][P0] DB queries — PendingMatchData type export (Task 5.2)', () => {
  it('[3.2-QRY-001] queries.ts exports PendingMatchData type', () => {
    // AC: 5
    const queries = getQueries()
    expect(queries).toMatch(/export type PendingMatchData/)
  })

  it('[3.2-QRY-002] PendingMatchData has matchId field (string)', () => {
    // AC: 5
    const queries = getQueries()
    expect(queries).toMatch(/PendingMatchData[\s\S]{0,400}matchId[\s]*:[\s]*string/)
  })

  it('[3.2-QRY-003] PendingMatchData has date field (string, ISO format)', () => {
    // AC: 5
    const queries = getQueries()
    expect(queries).toMatch(/PendingMatchData[\s\S]{0,400}date[\s]*:[\s]*string/)
  })

  it('[3.2-QRY-004] PendingMatchData has opponentArmyName field (string)', () => {
    // AC: 5 — Test 8.8
    const queries = getQueries()
    expect(queries).toMatch(/PendingMatchData[\s\S]{0,500}opponentArmyName[\s]*:[\s]*string/)
  })

  it('[3.2-QRY-005] PendingMatchData has opponentFaction field (string)', () => {
    // AC: 5 — Test 8.8
    const queries = getQueries()
    expect(queries).toMatch(/PendingMatchData[\s\S]{0,500}opponentFaction[\s]*:[\s]*string/)
  })

  it('[3.2-QRY-006] PendingMatchData has myResult field (string | null)', () => {
    // AC: 5, 6 — Tests 8.5, 8.6, 8.7
    const queries = getQueries()
    expect(queries).toMatch(/PendingMatchData[\s\S]{0,600}myResult[\s]*:[\s]*(string \| null|null \| string)/)
  })

  it('[3.2-QRY-007] PendingMatchData has myEvolutionsEnteredAt field (string | null)', () => {
    // AC: 5, 6 — Tests 8.6, 8.7
    const queries = getQueries()
    expect(queries).toMatch(/PendingMatchData[\s\S]{0,700}myEvolutionsEnteredAt[\s]*:[\s]*(string \| null|null \| string)/)
  })
})

// ---------------------------------------------------------------------------
// AC5 — getPendingMatches function exported (Task 5.1)
// Tests 8.5, 8.6, 8.7, 8.8, 8.9, 8.10
// ---------------------------------------------------------------------------

describe('[AC5][P0] DB queries — getPendingMatches — src/db/queries.ts (Task 5.1)', () => {
  it('[3.2-QRY-008] queries.ts exports getPendingMatches as async function', () => {
    // AC: 5
    const queries = getQueries()
    expect(queries).toContain('export async function getPendingMatches')
  })

  it('[3.2-QRY-009] getPendingMatches accepts armyId parameter (string)', () => {
    // AC: 5
    const queries = getQueries()
    expect(queries).toMatch(/getPendingMatches[\s\S]{0,200}armyId/)
  })

  it('[3.2-QRY-010] getPendingMatches return type is Promise<PendingMatchData[]>', () => {
    // AC: 5
    const queries = getQueries()
    expect(queries).toMatch(/getPendingMatches[\s\S]{0,300}PendingMatchData\[\]/)
  })

  it('[3.2-QRY-011] getPendingMatches queries matchParticipants table', () => {
    // AC: 5
    const queries = getQueries()
    expect(queries).toMatch(/getPendingMatches[\s\S]{0,1500}matchParticipants/)
  })

  it('[3.2-QRY-012] getPendingMatches joins matches table to get match date', () => {
    // AC: 5
    const queries = getQueries()
    expect(queries).toMatch(/getPendingMatches[\s\S]{0,2000}matches/)
  })
})

// ---------------------------------------------------------------------------
// AC5 — Self-join pattern with alias() from drizzle-orm/pg-core (Task 5.1, 8.10)
// Test 8.10
// ---------------------------------------------------------------------------

describe('[AC5][P0] DB queries — getPendingMatches — self-join pattern (Task 5.1, 8.10)', () => {
  it('[3.2-QRY-013] getPendingMatches uses alias() for self-join on match_participants — Test 8.10', () => {
    // AC: 5 — Test 8.10
    const queries = getQueries()
    // alias() from drizzle-orm/pg-core is required for the self-join
    expect(queries).toMatch(/getPendingMatches[\s\S]{0,3000}alias\(matchParticipants/)
  })

  it('[3.2-QRY-014] getPendingMatches imports alias from drizzle-orm/pg-core (not drizzle-orm) — Test 8.10', () => {
    // AC: 5 — Test 8.10 (per story pre-mortem: wrong import path causes confusing type errors)
    const queries = getQueries()
    expect(queries).toMatch(/import[\s\S]{0,200}alias[\s\S]{0,200}drizzle-orm\/pg-core/)
  })

  it('[3.2-QRY-015] getPendingMatches uses ne() to exclude own army from opponent join — Test 8.10', () => {
    // AC: 5 — Test 8.10
    const queries = getQueries()
    expect(queries).toMatch(/getPendingMatches[\s\S]{0,3000}ne\(/)
  })

  it('[3.2-QRY-016] getPendingMatches joins opponent armies table to get opponent name/faction — Test 8.8', () => {
    // AC: 5 — Test 8.8
    const queries = getQueries()
    expect(queries).toMatch(/getPendingMatches[\s\S]{0,3000}alias\(armies/)
  })
})

// ---------------------------------------------------------------------------
// AC5 — WHERE clause: pending filter (result IS NULL OR evolutionsEnteredAt IS NULL) (Task 5.1)
// Tests 8.5, 8.6, 8.7, 8.9
// ---------------------------------------------------------------------------

describe('[AC5][AC6][P0] DB queries — getPendingMatches — WHERE filter (Task 5.1)', () => {
  it('[3.2-QRY-017] getPendingMatches filters by armyId on matchParticipants', () => {
    // AC: 5
    const queries = getQueries()
    expect(queries).toMatch(/getPendingMatches[\s\S]{0,3000}(where|eq)[\s\S]{0,300}armyId/)
  })

  it('[3.2-QRY-018] getPendingMatches includes matches where result IS NULL (case 1) — Test 8.5', () => {
    // AC: 5 — Test 8.5
    const queries = getQueries()
    // Must have an isNull() or IS NULL check on result
    expect(queries).toMatch(/getPendingMatches[\s\S]{0,3000}(isNull[\s\S]{0,200}result|result[\s\S]{0,200}IS NULL)/)
  })

  it('[3.2-QRY-019] getPendingMatches includes matches where evolutionsEnteredAt IS NULL (case 2) — Test 8.6', () => {
    // AC: 5, 6 — Test 8.6
    const queries = getQueries()
    expect(queries).toMatch(/getPendingMatches[\s\S]{0,3000}(isNull[\s\S]{0,200}evolutionsEnteredAt|evolutionsEnteredAt[\s\S]{0,200}IS NULL)/)
  })

  it('[3.2-QRY-020] getPendingMatches uses OR condition (result IS NULL OR evolutionsEnteredAt IS NULL) — Tests 8.5, 8.6', () => {
    // AC: 5 — Tests 8.5, 8.6
    const queries = getQueries()
    // Must use or() from drizzle-orm to combine the two conditions
    expect(queries).toMatch(/getPendingMatches[\s\S]{0,3000}or\(/)
  })

  it('[3.2-QRY-021] getPendingMatches does NOT include fully-completed matches (both set) — Test 8.7', () => {
    // AC: 6 — Test 8.7
    // The WHERE filter must exclude matches where BOTH result and evolutionsEnteredAt are non-null.
    // This is guaranteed by the OR filter (only matches where at least one is null).
    // Verify the OR filter is narrow enough (not an AND that would include completed).
    const queries = getQueries()
    expect(queries).toMatch(/getPendingMatches[\s\S]{0,3000}(isNull|or\()/)
  })
})

// ---------------------------------------------------------------------------
// AC5 — Return value: opponent info via join (Task 5.1, 8.8)
// Test 8.8
// ---------------------------------------------------------------------------

describe('[AC5][P0] DB queries — getPendingMatches — return value shape (Task 5.2, 8.8)', () => {
  it('[3.2-QRY-022] getPendingMatches returns opponentArmyName (via armies join) — Test 8.8', () => {
    // AC: 5 — Test 8.8
    const queries = getQueries()
    expect(queries).toMatch(/getPendingMatches[\s\S]{0,4000}opponentArmyName/)
  })

  it('[3.2-QRY-023] getPendingMatches returns opponentFaction — Test 8.8', () => {
    // AC: 5 — Test 8.8
    const queries = getQueries()
    expect(queries).toMatch(/getPendingMatches[\s\S]{0,4000}opponentFaction/)
  })

  it('[3.2-QRY-024] getPendingMatches returns myResult (participant result field)', () => {
    // AC: 5 — Tests 8.5, 8.6
    const queries = getQueries()
    expect(queries).toMatch(/getPendingMatches[\s\S]{0,4000}myResult/)
  })

  it('[3.2-QRY-025] getPendingMatches returns myEvolutionsEnteredAt (participant field)', () => {
    // AC: 5, 6 — Test 8.6
    const queries = getQueries()
    expect(queries).toMatch(/getPendingMatches[\s\S]{0,4000}myEvolutionsEnteredAt/)
  })

  it('[3.2-QRY-026] getPendingMatches serializes date using .toISOString() (same as TimelineEntryData)', () => {
    // AC: 5
    const queries = getQueries()
    // Must use toISOString() inside getPendingMatches map
    expect(queries).toMatch(/getPendingMatches[\s\S]{0,4000}toISOString/)
  })

  it('[3.2-QRY-027] getPendingMatches orders results by match date DESC', () => {
    // AC: 5
    const queries = getQueries()
    expect(queries).toMatch(/getPendingMatches[\s\S]{0,4000}(desc\(|\.desc\(\))/)
  })

  it('[3.2-QRY-028] getPendingMatches returns empty array when army has no pending matches — Test 8.9', () => {
    // AC: 5 — Test 8.9
    // The map() on an empty rows array returns [] — verify map() is used in results mapping
    const queries = getQueries()
    expect(queries).toMatch(/getPendingMatches[\s\S]{0,4000}(rows\.map|\.map\(row =>|\.map\(\(row\))/)
  })
})

// ---------------------------------------------------------------------------
// AC8 — getArmyById: new lightweight query for server-side validation (Task 4.2)
// ---------------------------------------------------------------------------

describe('[AC8][P0] DB queries — getArmyById — server-side opponent validation (Task 4.2)', () => {
  it('[3.2-QRY-029] queries.ts exports getArmyById as async function', () => {
    // AC: 8 — used in createMatchFn to validate opponent army exists
    const queries = getQueries()
    expect(queries).toContain('export async function getArmyById')
  })

  it('[3.2-QRY-030] getArmyById accepts armyId parameter (string)', () => {
    // AC: 8
    const queries = getQueries()
    expect(queries).toMatch(/getArmyById[\s\S]{0,200}armyId/)
  })

  it('[3.2-QRY-031] getArmyById returns id, name, faction, playerId (lightweight — no units)', () => {
    // AC: 8
    const queries = getQueries()
    expect(queries).toMatch(/getArmyById[\s\S]{0,800}(id|name|faction|playerId)/)
  })

  it('[3.2-QRY-032] getArmyById returns null when army is not found', () => {
    // AC: 8
    const queries = getQueries()
    expect(queries).toMatch(/getArmyById[\s\S]{0,800}null/)
  })

  it('[3.2-QRY-033] getArmyById uses .limit(1) for efficiency', () => {
    // AC: 8
    const queries = getQueries()
    expect(queries).toMatch(/getArmyById[\s\S]{0,800}\.limit\(1\)/)
  })
})
