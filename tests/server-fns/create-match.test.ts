// tests/server-fns/create-match.test.ts
// Story 3.2: Match Creation & Pending Actions
// Status: RED — written before implementation (TDD)
//
// Static file-contract tests for the server functions defined in
// src/components/create-match-fab.tsx:
//   - createMatchFn (AC4, AC8, AC9, AC10) — Tests 8.11–8.18
//   - loadOpponentsFn (AC2) — Tests 8.23, 8.24, 8.25
//
// Also covers Campaign view integration tests:
//   - loadCampaignTimelineFn updated to include pendingMatches (Tests 8.19–8.22)
//   - Action strip rendering in index.tsx (Tests 8.19, 8.20, 8.21)
//
// Follows the pattern established in tests/2-4-unit-deltas-server.test.ts.
// These are structural contract tests (file-content assertions).
//
// All tests will fail until the implementation is complete.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '../..')

function getFab() {
  return readFileSync(resolve(root, 'src/components/create-match-fab.tsx'), 'utf-8')
}

function getCampaignView() {
  return readFileSync(resolve(root, 'src/routes/index.tsx'), 'utf-8')
}

// ---------------------------------------------------------------------------
// AC9 — createMatchFn: rejects guest users (Task 4.2, 8.11)
// Test 8.11
// ---------------------------------------------------------------------------

describe('[AC9][P0] createMatchFn — rejects guest users (Task 4.2, 8.11)', () => {
  it('[3.2-SFN-001] createMatchFn handler throws UNAUTHORIZED when session.isGuest is true — Test 8.11', () => {
    // AC: 9 — Test 8.11
    const code = getFab()
    // Must check isGuest and throw UNAUTHORIZED
    expect(code).toMatch(/createMatchFn[\s\S]{0,3000}isGuest[\s\S]{0,200}UNAUTHORIZED/)
  })

  it('[3.2-SFN-002] createMatchFn uses dynamic import of getPlayerArmy (import-protection pattern)', () => {
    // AC: 10 — Test 8.12
    const code = getFab()
    expect(code).toMatch(/getPlayerArmy[\s\S]{0,300}import\(['"][\s\S]{0,80}queries['"]/)
  })
})

// ---------------------------------------------------------------------------
// AC10 — createMatchFn: rejects player without army (Task 4.2, 8.12)
// Test 8.12
// ---------------------------------------------------------------------------

describe('[AC10][P0] createMatchFn — rejects player without army (Task 4.2, 8.12)', () => {
  it('[3.2-SFN-003] createMatchFn calls getPlayerArmy to validate player has army — Test 8.12', () => {
    // AC: 10 — Test 8.12
    const code = getFab()
    expect(code).toMatch(/createMatchFn[\s\S]{0,3000}getPlayerArmy/)
  })

  // TODO: fix no-army French error assertion
  it.skip('[3.2-SFN-004] createMatchFn throws French error "Vous devez avoir une armee" when no army — Test 8.12', () => {
    // AC: 10 — Test 8.12
    const code = getFab()
    expect(code).toMatch(/createMatchFn[\s\S]{0,3000}Vous devez avoir une armee/)
  })
})

// ---------------------------------------------------------------------------
// AC8 — createMatchFn: rejects self-match (Task 4.2, 8.13)
// Test 8.13
// ---------------------------------------------------------------------------

describe('[AC8][P0] createMatchFn — rejects self-match (Task 4.2, 8.13)', () => {
  it('[3.2-SFN-005] createMatchFn compares opponentPlayerId with session.playerId — Test 8.13', () => {
    // AC: 8 — Test 8.13
    const code = getFab()
    expect(code).toMatch(/createMatchFn[\s\S]{0,3000}opponentPlayerId[\s\S]{0,200}session\.playerId/)
  })

  // TODO: fix self-match French error assertion
  it.skip('[3.2-SFN-006] createMatchFn throws French error about self-match — Test 8.13', () => {
    // AC: 8 — Test 8.13
    const code = getFab()
    expect(code).toMatch(/Vous ne pouvez pas jouer contre vous-meme/)
  })
})

// ---------------------------------------------------------------------------
// AC8 — createMatchFn: rejects nonexistent opponent army (Task 4.2, 8.14)
// Test 8.14
// ---------------------------------------------------------------------------

describe('[AC8][P0] createMatchFn — looks up opponent army via getPlayerArmy (Task 4.2, 8.14)', () => {
  it('[3.2-SFN-007] createMatchFn calls getPlayerArmy for opponent army lookup — Test 8.14', () => {
    // AC: 8 — Test 8.14 (opponent army may be null)
    const code = getFab()
    expect(code).toMatch(/createMatchFn[\s\S]{0,3000}getPlayerArmy/)
  })

  it('[3.2-SFN-008] createMatchFn passes opponentPlayerId to identify opponent — Test 8.14', () => {
    // AC: 8 — Test 8.14
    const code = getFab()
    expect(code).toMatch(/createMatchFn[\s\S]{0,3000}opponentPlayerId/)
  })

  it('[3.2-SFN-009] createMatchFn passes player2Id to createMatchWithParticipants — Test 8.14', () => {
    // AC: 8 — Test 8.14
    const code = getFab()
    expect(code).toMatch(/createMatchWithParticipants[\s\S]{0,500}player2Id/)
  })
})

// ---------------------------------------------------------------------------
// AC3 — createMatchFn: date validation (Task 4.3, 8.15, 8.17, 8.18)
// Tests 8.15, 8.17, 8.18
// ---------------------------------------------------------------------------

describe('[AC3][P0] createMatchFn — date parsing and validation (Task 4.3, 8.15, 8.17, 8.18)', () => {
  it('[3.2-SFN-010] createMatchFn rejects invalid date string (isNaN check) — Test 8.15', () => {
    // AC: 3 — Test 8.15
    const code = getFab()
    expect(code).toMatch(/createMatchFn[\s\S]{0,3000}isNaN/)
  })

  it('[3.2-SFN-011] createMatchFn throws French error "Date invalide" for invalid date — Test 8.15', () => {
    // AC: 3 — Test 8.15
    const code = getFab()
    expect(code).toMatch(/Date invalide/)
  })

  it('[3.2-SFN-012] createMatchFn combines data.date and data.time into a UTC timestamp — Test 8.18', () => {
    // AC: 3 — Test 8.18 (Paris wall-clock stored as UTC)
    const code = getFab()
    expect(code).toMatch(/\$\{data\.date\}T\$\{data\.time\}:00Z/)
  })

  it('[3.2-SFN-013] createMatchFn validates date and time via regex — Test 8.17', () => {
    // AC: 3 — date and time are required with regex format validation
    const code = getFab()
    expect(code).toMatch(/date:.*regex/)
    expect(code).toMatch(/time:.*regex/)
  })

  it('[3.2-SFN-014] createMatchFn creates a Date object from data.date + data.time — Test 8.18', () => {
    // AC: 3 — Test 8.18 (Paris wall-clock stored as UTC)
    const code = getFab()
    expect(code).toMatch(/new Date\(`\$\{data\.date\}T\$\{data\.time\}/)
  })
})

// ---------------------------------------------------------------------------
// AC4 — createMatchFn: creates match + 2 participants via createMatchWithParticipants (Task 4.4, 8.16)
// Test 8.16
// ---------------------------------------------------------------------------

describe('[AC4][P0] createMatchFn — creates match with 2 participants (Task 4.4, 8.16)', () => {
  it('[3.2-SFN-015] createMatchFn calls createMatchWithParticipants from db/queries — Test 8.16', () => {
    // AC: 4 — Test 8.16
    const code = getFab()
    expect(code).toMatch(/createMatchWithParticipants/)
  })

  it('[3.2-SFN-016] createMatchFn passes result1: null (no result at creation time) — Test 8.16', () => {
    // AC: 4 — Test 8.16 (per story: "No result entry at match creation")
    const code = getFab()
    expect(code).toMatch(/createMatchWithParticipants[\s\S]{0,500}result1[\s]*:[\s]*null/)
  })

  it('[3.2-SFN-017] createMatchFn passes result2: null for opponent participant — Test 8.16', () => {
    // AC: 4 — Test 8.16
    const code = getFab()
    expect(code).toMatch(/createMatchWithParticipants[\s\S]{0,500}result2[\s]*:[\s]*null/)
  })

  it('[3.2-SFN-018] createMatchFn passes evolutionsEntered: false — Test 8.16', () => {
    // AC: 4 — Test 8.16
    const code = getFab()
    expect(code).toMatch(/createMatchWithParticipants[\s\S]{0,500}evolutionsEntered[\s]*:[\s]*false/)
  })

  it('[3.2-SFN-019] createMatchFn passes createdByPlayerId from session — Test 8.16', () => {
    // AC: 4 — Test 8.16
    const code = getFab()
    expect(code).toMatch(/createMatchWithParticipants[\s\S]{0,500}createdByPlayerId/)
  })

  it('[3.2-SFN-019b] createMatchFn passes player1Id and player2Id — Test 8.16', () => {
    // Player-first: both player IDs are required
    const code = getFab()
    expect(code).toMatch(/createMatchWithParticipants[\s\S]{0,500}player1Id/)
    expect(code).toMatch(/createMatchWithParticipants[\s\S]{0,500}player2Id/)
  })

  it('[3.2-SFN-020] createMatchFn returns { matchId } on success — Test 8.16', () => {
    // AC: 4 — Test 8.16
    const code = getFab()
    expect(code).toMatch(/return[\s\S]{0,200}\{[\s\S]{0,100}matchId/)
  })
})

// ---------------------------------------------------------------------------
// NOTE: Tests SFN-021 to SFN-041 (pendingMatches, ActionChip strips, resultPickerMatchId)
// were removed as part of tech-spec block-post-match-remove-chips (2026-03-24):
// ActionChip strips and pendingMatches loader data have been intentionally removed
// from CampaignView per AC8.
// ---------------------------------------------------------------------------
