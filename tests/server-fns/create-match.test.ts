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

  it('[3.2-SFN-004] createMatchFn throws French error "Vous devez avoir une armee" when no army — Test 8.12', () => {
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
  it('[3.2-SFN-005] createMatchFn compares playerArmyId with opponentArmyId — Test 8.13', () => {
    // AC: 8 — Test 8.13
    const code = getFab()
    expect(code).toMatch(/createMatchFn[\s\S]{0,3000}(opponentArmyId[\s\S]{0,200}army[\s\S]{0,100}id|army[\s\S]{0,100}id[\s\S]{0,200}opponentArmyId)/)
  })

  it('[3.2-SFN-006] createMatchFn throws French error "Vous ne pouvez pas jouer contre votre propre armee" — Test 8.13', () => {
    // AC: 8 — Test 8.13
    const code = getFab()
    expect(code).toMatch(/Vous ne pouvez pas jouer contre votre propre armee/)
  })
})

// ---------------------------------------------------------------------------
// AC8 — createMatchFn: rejects nonexistent opponent army (Task 4.2, 8.14)
// Test 8.14
// ---------------------------------------------------------------------------

describe('[AC8][P0] createMatchFn — rejects nonexistent opponent army (Task 4.2, 8.14)', () => {
  it('[3.2-SFN-007] createMatchFn calls getArmyById to validate opponent exists — Test 8.14', () => {
    // AC: 8 — Test 8.14
    const code = getFab()
    expect(code).toMatch(/createMatchFn[\s\S]{0,3000}getArmyById/)
  })

  it('[3.2-SFN-008] createMatchFn uses dynamic import of getArmyById from queries — Test 8.14', () => {
    // AC: 8 — Test 8.14
    const code = getFab()
    expect(code).toMatch(/getArmyById[\s\S]{0,300}import\(['"][\s\S]{0,80}queries['"]/)
  })

  it("[3.2-SFN-009] createMatchFn throws French error \"L'armee adverse n'existe pas\" when opponent missing — Test 8.14", () => {
    // AC: 8 — Test 8.14
    const code = getFab()
    expect(code).toMatch(/L'armee adverse n'existe pas/)
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

  it('[3.2-SFN-012] createMatchFn normalizes date to midnight UTC via T00:00:00Z suffix — Test 8.18', () => {
    // AC: 3 — Test 8.18
    const code = getFab()
    expect(code).toMatch(/T00:00:00Z/)
  })

  it('[3.2-SFN-013] createMatchFn defaults to today when no date is provided — Test 8.17', () => {
    // AC: 3 — Test 8.17
    const code = getFab()
    // When date is not provided, uses new Date().toISOString().split('T')[0]
    expect(code).toMatch(/createMatchFn[\s\S]{0,3000}(new Date\(\)[\s\S]{0,200}split|!data\.date|data\.date[\s\S]{0,200}\?[\s\S]{0,200}:)/)
  })

  it('[3.2-SFN-014] createMatchFn creates a Date object from normalized string — Test 8.18', () => {
    // AC: 3 — Test 8.18
    const code = getFab()
    expect(code).toMatch(/createMatchFn[\s\S]{0,3000}new Date\([\s\S]{0,200}T00:00:00Z/)
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

  it('[3.2-SFN-020] createMatchFn returns { matchId } on success — Test 8.16', () => {
    // AC: 4 — Test 8.16
    const code = getFab()
    expect(code).toMatch(/return[\s\S]{0,200}\{[\s\S]{0,100}matchId/)
  })
})

// ---------------------------------------------------------------------------
// AC5, AC7 — Campaign view: loadCampaignTimelineFn includes pendingMatches (Task 7.1, 8.22)
// Test 8.22
// ---------------------------------------------------------------------------

describe('[AC5][AC7][P0] Campaign view — loadCampaignTimelineFn includes pendingMatches (Task 7.1, 8.22)', () => {
  it('[3.2-SFN-021] index.tsx imports PendingMatchData type from db/queries — Test 8.22', () => {
    // AC: 5 — Test 8.22
    const code = getCampaignView()
    expect(code).toMatch(/import[\s\S]{0,200}PendingMatchData[\s\S]{0,100}db\/queries/)
  })

  it('[3.2-SFN-022] loadCampaignTimelineFn calls getPendingMatches — Test 8.22', () => {
    // AC: 5 — Test 8.22
    const code = getCampaignView()
    expect(code).toMatch(/getPendingMatches/)
  })

  it('[3.2-SFN-023] loadCampaignTimelineFn imports getPendingMatches from db/queries (dynamic import)', () => {
    // AC: 5 — Test 8.22
    const code = getCampaignView()
    expect(code).toMatch(/getPendingMatches[\s\S]{0,300}import\(['"][\s\S]{0,80}queries['"]/)
  })

  it('[3.2-SFN-024] loadCampaignTimelineFn returns pendingMatches in its return object — Test 8.22', () => {
    // AC: 5 — Test 8.22
    const code = getCampaignView()
    expect(code).toMatch(/loadCampaignTimelineFn[\s\S]{0,2000}pendingMatches/)
  })

  it('[3.2-SFN-025] loadCampaignTimelineFn returns pendingMatches: [] for guest users — Test 8.22', () => {
    // AC: 5 — Test 8.22
    const code = getCampaignView()
    expect(code).toMatch(/(isGuest[\s\S]{0,400}pendingMatches.*\[\]|pendingMatches.*\[\][\s\S]{0,400}isGuest)/)
  })

  it('[3.2-SFN-026] loadCampaignTimelineFn returns pendingMatches: [] when army is null — Test 8.22', () => {
    // AC: 5 — Test 8.22
    const code = getCampaignView()
    // When army is null, pendingMatches defaults to []
    expect(code).toMatch(/pendingMatches[\s\S]{0,200}(\[\]|empty)/)
  })
})

// ---------------------------------------------------------------------------
// AC5 — Campaign view: action strip rendered when pendingMatches exist (Task 7.2, 8.19, 8.20)
// Tests 8.19, 8.20
// ---------------------------------------------------------------------------

describe('[AC5][P0] Campaign view — action strip (Task 7.2, 8.19, 8.20)', () => {
  it('[3.2-SFN-027] index.tsx imports ActionChip component', () => {
    // AC: 5
    const code = getCampaignView()
    expect(code).toMatch(/import[\s\S]{0,200}ActionChip[\s\S]{0,100}action-chip/)
  })

  it('[3.2-SFN-028] index.tsx renders action strip only when pendingMatches.length > 0 — Test 8.20', () => {
    // AC: 5 — Test 8.19, 8.20
    const code = getCampaignView()
    expect(code).toMatch(/pendingMatches\.length/)
  })

  it('[3.2-SFN-029] index.tsx renders ActionChip for each pending match — Test 8.19', () => {
    // AC: 5 — Test 8.19
    const code = getCampaignView()
    expect(code).toMatch(/<ActionChip/)
  })

  it('[3.2-SFN-030] Action strip is horizontally scrollable (overflow-x: auto) — Task 7.2', () => {
    // AC: 5
    const code = getCampaignView()
    expect(code).toMatch(/overflowX.*auto|overflow-x.*auto/)
  })

  it('[3.2-SFN-031] Action strip uses display: flex with gap (Task 7.2)', () => {
    // AC: 5
    const code = getCampaignView()
    // flex container for horizontal chip row
    expect(code).toMatch(/(display.*flex[\s\S]{0,200}gap|gap[\s\S]{0,200}display.*flex)[\s\S]{0,300}pendingMatches/)
  })

  it('[3.2-SFN-032] Action strip hides scrollbar (scrollbarWidth: none — Task 7.2)', () => {
    // AC: 5
    const code = getCampaignView()
    expect(code).toMatch(/scrollbarWidth.*none|scrollbar-width.*none/)
  })
})

// ---------------------------------------------------------------------------
// AC5 — Campaign view: ActionChip label differentiation (Task 7.3, 8.21)
// Test 8.21
// ---------------------------------------------------------------------------

describe('[AC5][P0] Campaign view — ActionChip label logic (Task 7.3, 8.21)', () => {
  it('[3.2-SFN-033] index.tsx uses "Resultat a entrer" label when myResult is null — Test 8.21', () => {
    // AC: 5 — Test 8.21 (case 1)
    const code = getCampaignView()
    expect(code).toContain('Resultat a entrer')
  })

  it('[3.2-SFN-034] index.tsx uses "Rapport de bataille" label when myResult set but evolutions null — Test 8.21', () => {
    // AC: 5 — Test 8.21 (case 2)
    const code = getCampaignView()
    expect(code).toContain('Rapport de bataille')
  })

  it('[3.2-SFN-035] ActionChip label includes "vs {opponentArmyName}" — Test 8.21', () => {
    // AC: 5 — Test 8.21
    const code = getCampaignView()
    expect(code).toMatch(/vs[\s\S]{0,200}(opponentArmyName|opponent)/)
  })

  it('[3.2-SFN-036] ActionChip label includes formatted date using Intl.DateTimeFormat fr-FR — Task 7.3', () => {
    // AC: 5
    const code = getCampaignView()
    expect(code).toMatch(/Intl\.DateTimeFormat[\s\S]{0,200}fr-FR/)
  })

  it('[3.2-SFN-037] Date format uses day: numeric, month: short (e.g. "5 mars") — Task 7.3', () => {
    // AC: 5
    const code = getCampaignView()
    expect(code).toMatch(/day.*numeric[\s\S]{0,100}month.*short|month.*short[\s\S]{0,100}day.*numeric/)
  })

  it('[3.2-SFN-038] label check: myResult null takes priority over evolutions check (case 1 before case 2) — Test 8.21', () => {
    // AC: 5 — Test 8.21 (case 1 takes priority)
    const code = getCampaignView()
    // The check must evaluate myResult === null first
    expect(code).toMatch(/(myResult[\s\S]{0,200}null[\s\S]{0,500}Resultat a entrer|Resultat a entrer[\s\S]{0,500}myResult[\s\S]{0,200}null)/)
  })
})

// ---------------------------------------------------------------------------
// AC7 — New match appears in both players' timelines (existing getTimelineForArmy)
// Test 8.22 — No new code needed; timeline already shows all matches.
// Verify timeline and pendingMatches coexist in loader return.
// ---------------------------------------------------------------------------

describe('[AC7][P0] Campaign view — timeline and pending matches coexist in loader (Task 7.5, 8.22)', () => {
  it('[3.2-SFN-039] loadCampaignTimelineFn still returns timeline alongside pendingMatches — Test 8.22', () => {
    // AC: 7 — Test 8.22
    const code = getCampaignView()
    // Both timeline and pendingMatches must be in the return object
    expect(code).toMatch(/loadCampaignTimelineFn[\s\S]{0,2000}(timeline[\s\S]{0,200}pendingMatches|pendingMatches[\s\S]{0,200}timeline)/)
  })

  it('[3.2-SFN-040] CampaignView destructures both timeline and pendingMatches from loader data', () => {
    // AC: 7 — Test 8.22
    const code = getCampaignView()
    expect(code).toMatch(/\{[\s\S]{0,200}(timeline[\s\S]{0,200}pendingMatches|pendingMatches[\s\S]{0,200}timeline)[\s\S]{0,200}\}[\s\S]{0,100}useLoaderData/)
  })

  it('[3.2-SFN-041] TODO comment for story 3.3 link on "Resultat a entrer" chip (Task 7.4)', () => {
    // AC: 5 — Task 7.4 — future link to story 3.3
    const code = getCampaignView()
    expect(code).toMatch(/(TODO.*story 3\.3|story 3\.3.*TODO)/)
  })
})
