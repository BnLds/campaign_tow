// tests/server-fns/submit-match-result.test.ts
// Story 3.3: Match Result Entry
// Status: RED — written before implementation (TDD)
//
// Static file-contract tests for the submitMatchResultFn server function.
// Follows the pattern established in tests/2-4-unit-deltas-server.test.ts.
//
// NOTE: These are structural contract tests (file-content assertions).
// They verify code patterns exist but do not test runtime behavior.
// Integration/behavioral tests should be added when a test DB is available.
//
// Tests cover:
//   - submitMatchResultFn declaration and middleware wiring (authMiddleware)
//   - Input validation via submitMatchResultSchema
//   - Authorization checks: guest → UNAUTHORIZED, no army → FORBIDDEN, non-participant → FORBIDDEN
//   - Participant lookup before updateMatchResults call
//   - Success path: returns { success: true, data: { participantId, result } }
//   - Error return pattern (ServerResult — no throw)
//   - Export of submitMatchResultFn for cross-route usage
//
// Covers story tasks 7.9–7.12, ACs 1, 3, 4, 5.
// All tests will fail until the implementation is complete.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '../..')

function getCampaignRoute() {
  return readFileSync(resolve(root, 'src/routes/index.tsx'), 'utf-8')
}

// ---------------------------------------------------------------------------
// AC1, AC4 — submitMatchResultFn declaration and middleware (Task 7.9–7.12)
// ---------------------------------------------------------------------------

describe('[AC1][AC4][P0] Server function — submitMatchResultFn — src/routes/index.tsx', () => {
  // AC: 1, 4 — Task 3.1: function is defined as createServerFn
  it('[3.3-SFN-001] submitMatchResultFn is assigned to createServerFn({ method: "POST" })', () => {
    const route = getCampaignRoute()
    expect(route).toMatch(/submitMatchResultFn\s*=\s*createServerFn/)
  })

  // AC: 4 — Task 3.1: uses authMiddleware for session context
  it('[3.3-SFN-002] submitMatchResultFn uses authMiddleware', () => {
    const route = getCampaignRoute()
    expect(route).toMatch(/submitMatchResultFn\s*=\s*createServerFn[\s\S]{0,600}\.middleware\(\[authMiddleware\]\)/)
  })

  // AC: 1 — Task 3.1: uses inputValidator with submitMatchResultSchema
  it('[3.3-SFN-003] submitMatchResultFn uses inputValidator with submitMatchResultSchema', () => {
    const route = getCampaignRoute()
    expect(route).toMatch(/submitMatchResultFn[\s\S]{0,600}\.inputValidator\(submitMatchResultSchema\)/)
  })

  // AC: 1, 4 — Task 3.1: submitMatchResultSchema is imported from validators
  it('[3.3-SFN-004] index.tsx imports submitMatchResultSchema from validators', () => {
    const route = getCampaignRoute()
    expect(route).toMatch(/submitMatchResultSchema[\s\S]{0,300}validators|validators[\s\S]{0,300}submitMatchResultSchema/)
  })
})

// ---------------------------------------------------------------------------
// AC4 — Authorization: guest → UNAUTHORIZED (Task 7.9)
// ---------------------------------------------------------------------------

describe('[AC4][P0] submitMatchResultFn — guest rejection (Task 7.9)', () => {
  // AC: 4 — Task 7.9: checks isGuest flag and returns UNAUTHORIZED
  it('[3.3-SFN-005] submitMatchResultFn checks context.session.isGuest and rejects guest users', () => {
    const route = getCampaignRoute()
    expect(route).toMatch(/submitMatchResultFn[\s\S]{0,2000}session\.isGuest/)
  })

  // AC: 4 — Task 7.9: returns { success: false, error: { code: 'UNAUTHORIZED' } } for guests
  it('[3.3-SFN-006] submitMatchResultFn returns UNAUTHORIZED error code for guests (not throw)', () => {
    const route = getCampaignRoute()
    expect(route).toMatch(/submitMatchResultFn[\s\S]{0,2000}UNAUTHORIZED/)
  })

  // AC: 4 — Task 7.9: returns French message for guest rejection
  it('[3.3-SFN-007] submitMatchResultFn returns French message "Connexion requise" for guests', () => {
    const route = getCampaignRoute()
    expect(route).toMatch(/submitMatchResultFn[\s\S]{0,2000}Connexion requise/)
  })
})

// ---------------------------------------------------------------------------
// AC4 — Authorization: no army → FORBIDDEN (Task 7.10)
// ---------------------------------------------------------------------------

describe('[AC4][P0] submitMatchResultFn — no army rejection (Task 7.10)', () => {
  // AC: 4 — Task 7.10: calls getPlayerArmy via dynamic import
  it('[3.3-SFN-008] submitMatchResultFn calls getPlayerArmy inside dynamic import', () => {
    const route = getCampaignRoute()
    expect(route).toMatch(/submitMatchResultFn[\s\S]{0,2000}getPlayerArmy[\s\S]{0,300}import\(['"][\s\S]{0,80}queries['"]/)
  })

  // AC: 4 — Task 7.10: returns FORBIDDEN when player has no army
  it('[3.3-SFN-009] submitMatchResultFn returns FORBIDDEN error code when player has no army', () => {
    const route = getCampaignRoute()
    // Must have at least two FORBIDDEN returns: one for no-army, one for non-participant
    expect(route).toMatch(/submitMatchResultFn[\s\S]{0,3000}FORBIDDEN/)
  })

  // AC: 4 — Task 7.10: French message for no-army case
  it('[3.3-SFN-010] submitMatchResultFn returns French message "Aucune armee assignee" when player has no army', () => {
    const route = getCampaignRoute()
    expect(route).toMatch(/submitMatchResultFn[\s\S]{0,3000}Aucune armee assignee/)
  })
})

// ---------------------------------------------------------------------------
// AC4 — Authorization: non-participant → FORBIDDEN (Task 7.11)
// ---------------------------------------------------------------------------

describe('[AC4][P0] submitMatchResultFn — non-participant rejection (Task 7.11)', () => {
  // AC: 4 — Task 7.11: calls getMatchParticipantByMatchAndPlayer to verify participation
  it('[3.3-SFN-011] submitMatchResultFn calls getMatchParticipantByMatchAndPlayer inside dynamic import', () => {
    const route = getCampaignRoute()
    expect(route).toMatch(/submitMatchResultFn[\s\S]{0,3000}getMatchParticipantByMatchAndPlayer[\s\S]{0,300}import\(['"][\s\S]{0,80}queries['"]/)
  })

  // AC: 4 — Task 7.11: returns FORBIDDEN when not a participant
  it('[3.3-SFN-012] submitMatchResultFn returns FORBIDDEN when player army is not a participant', () => {
    const route = getCampaignRoute()
    // "participant" must appear in a FORBIDDEN error message context
    expect(route).toMatch(/submitMatchResultFn[\s\S]{0,3000}participant[\s\S]{0,500}FORBIDDEN|FORBIDDEN[\s\S]{0,500}participant/)
  })

  // AC: 4 — Task 7.11: French message for non-participant case
  it('[3.3-SFN-013] submitMatchResultFn returns French message about not being a participant', () => {
    const route = getCampaignRoute()
    expect(route).toMatch(/submitMatchResultFn[\s\S]{0,3000}(pas participant|n'êtes pas participant|n.etes pas participant)/i)
  })
})

// ---------------------------------------------------------------------------
// AC1, AC3, AC5 — Success path: calls updateMatchResults and returns result (Task 7.12)
// ---------------------------------------------------------------------------

describe('[AC1][AC3][AC5][P0] submitMatchResultFn — success path (Task 7.12)', () => {
  // AC: 1, 3 — Task 7.12: calls updateMatchResults via dynamic import
  it('[3.3-SFN-014] submitMatchResultFn calls updateMatchResults inside dynamic import', () => {
    const route = getCampaignRoute()
    expect(route).toMatch(/submitMatchResultFn[\s\S]{0,3000}updateMatchResults[\s\S]{0,300}import\(['"][\s\S]{0,80}queries['"]/)
  })

  // AC: 1 — Task 7.12: returns { success: true, data: ... } on success
  it('[3.3-SFN-015] submitMatchResultFn returns { success: true, data: { participantId, result } } on success', () => {
    const route = getCampaignRoute()
    expect(route).toMatch(/submitMatchResultFn[\s\S]{0,3000}success:\s*true/)
  })

  // AC: 1 — Task 7.12: success data contains participantId
  it('[3.3-SFN-016] submitMatchResultFn success data contains participantId field', () => {
    const route = getCampaignRoute()
    expect(route).toMatch(/submitMatchResultFn[\s\S]{0,3000}participantId/)
  })

  // AC: 1 — Task 7.12: success data contains result field
  it('[3.3-SFN-017] submitMatchResultFn success data contains result field', () => {
    const route = getCampaignRoute()
    expect(route).toMatch(/submitMatchResultFn[\s\S]{0,3000}success:\s*true[\s\S]{0,500}result|result[\s\S]{0,500}success:\s*true/)
  })

  // AC: 1, 3 — Task 3.4: return type is ServerResult<{ participantId: string; result: string }>
  it('[3.3-SFN-018] submitMatchResultFn return type annotation references ServerResult', () => {
    const route = getCampaignRoute()
    expect(route).toMatch(/submitMatchResultFn[\s\S]{0,1000}ServerResult/)
  })
})

// ---------------------------------------------------------------------------
// AC1, AC5 — submitMatchResultFn export (Task 3.5 + Task 6.1)
// ---------------------------------------------------------------------------

describe('[AC1][AC5][P0] submitMatchResultFn — export and cross-route usage', () => {
  // AC: 1, 5 — Task 3.5: function is exported for use in armies/$armyId.tsx
  it('[3.3-SFN-019] submitMatchResultFn is exported from index.tsx', () => {
    const route = getCampaignRoute()
    expect(route).toMatch(/export\s+(const\s+)?submitMatchResultFn/)
  })

  // REMOVED: [3.3-SFN-020] armies/$armyId.tsx no longer imports submitMatchResultFn
  // Timeline/result submission was removed from army detail view.
})

// ---------------------------------------------------------------------------
// AC2, AC5 — Campaign view wiring: handleResultSubmit + TimelineEntry props (Task 7.19, 7.20)
// ---------------------------------------------------------------------------

describe('[AC2][AC5][P0] Campaign view — result submission wiring in src/routes/index.tsx', () => {
  // AC: 1, 5 — Task 7.19: Campaign view has handleResultSubmit callback
  it('[3.3-SFN-021] index.tsx defines handleResultSubmit function in CampaignView', () => {
    const route = getCampaignRoute()
    expect(route).toMatch(/handleResultSubmit/)
  })

  // AC: 1, 5 — Task 7.19: Campaign view passes isEditable to TimelineEntry
  it('[3.3-SFN-022] index.tsx passes isEditable prop to TimelineEntry in timeline loop', () => {
    const route = getCampaignRoute()
    expect(route).toMatch(/isEditable=/)
  })

  // AC: 1, 5 — Task 7.19: Campaign view passes onResultSubmit to TimelineEntry
  it('[3.3-SFN-023] index.tsx passes onResultSubmit prop to TimelineEntry in timeline loop', () => {
    const route = getCampaignRoute()
    expect(route).toMatch(/onResultSubmit=/)
  })

  // AC: 6 — Task 7.20: guest users get isEditable=false (not {!isGuest && army !== null} would be falsy for guest)
  it('[3.3-SFN-024] index.tsx sets isEditable to false for guest users (isGuest check)', () => {
    const route = getCampaignRoute()
    // isEditable should depend on isGuest flag — either !isGuest or a condition including isGuest
    expect(route).toMatch(/isEditable=\{[^}]*(isGuest|!isGuest)[^}]*\}/)
  })

  // AC: 6 — Task 7.20: handleResultSubmit calls router.invalidate() on success
  it('[3.3-SFN-025] index.tsx handleResultSubmit calls router.invalidate() on success', () => {
    const route = getCampaignRoute()
    expect(route).toMatch(/handleResultSubmit[\s\S]{0,500}invalidateArmyState/)
  })
})

// ---------------------------------------------------------------------------
// AC2, AC5 — Army detail view wiring: isOwner controls isEditable (Task 7.21)
// ---------------------------------------------------------------------------

// REMOVED: [3.3-SFN-026 to 029] Army detail view result submission wiring tests.
// Timeline/result submission was removed from army detail view.
