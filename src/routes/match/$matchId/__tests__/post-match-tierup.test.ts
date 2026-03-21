// src/routes/match/$matchId/__tests__/post-match-tierup.test.ts
// Story 4.2: Tier-Up Detection & Improvement Choice
// Status: RED — written before implementation (TDD)
//
// Static file-contract tests for the submitTierUpFn server function
// in src/routes/match/$matchId/post-match.tsx.
//
// Pattern follows tests/server-fns/create-match.test.ts (file-content assertions).
// These are structural contract tests — they verify code patterns exist.
//
// The submitTierUpFn does NOT exist yet in post-match.tsx.
// All tests will fail until the implementation is complete.
//
// Covers Tasks 13.1–13.4 (AC: 3)

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '../../../../../')

function getPostMatchRoute() {
  return readFileSync(resolve(root, 'src/routes/match/$matchId/post-match.tsx'), 'utf-8')
}

function getValidators() {
  return readFileSync(resolve(root, 'src/lib/validators.ts'), 'utf-8')
}

// ---------------------------------------------------------------------------
// Task 13.4 — submitTierUpSchema in validators.ts
// AC: 3
// ---------------------------------------------------------------------------

describe('[AC3][P0] submitTierUpSchema — validators.ts (Task 13.4)', () => {
  it('[4.2-SFN-001] validators.ts exports submitTierUpSchema', () => {
    const code = getValidators()
    expect(code).toMatch(/export const submitTierUpSchema/)
  })

  it('[4.2-SFN-002] submitTierUpSchema includes unitId as z.string().min(1)', () => {
    const code = getValidators()
    expect(code).toMatch(/submitTierUpSchema[\s\S]{0,500}unitId[\s\S]{0,200}z\.string\(\)\.min\(1\)/)
  })

  it('[4.2-SFN-003] submitTierUpSchema includes matchParticipantId as z.string().min(1)', () => {
    const code = getValidators()
    expect(code).toMatch(/submitTierUpSchema[\s\S]{0,500}matchParticipantId[\s\S]{0,200}z\.string\(\)\.min\(1\)/)
  })

  it('[4.2-SFN-004] submitTierUpSchema includes improvements as z.array(...).min(1)', () => {
    const code = getValidators()
    expect(code).toMatch(/submitTierUpSchema[\s\S]{0,500}improvements[\s\S]{0,200}z\.array/)
  })

  it('[4.2-SFN-005] submitTierUpSchema improvements items have description field', () => {
    const code = getValidators()
    expect(code).toMatch(/submitTierUpSchema[\s\S]{0,600}improvements[\s\S]{0,400}description[\s\S]{0,200}z\.string/)
  })

  it('[4.2-SFN-006] validators.ts exports SubmitTierUpInput type', () => {
    const code = getValidators()
    expect(code).toMatch(/export type SubmitTierUpInput/)
  })
})

// ---------------------------------------------------------------------------
// Task 13.1 — submitTierUpFn creates unit_gains entries
// AC: 3
// ---------------------------------------------------------------------------

// submitTierUpFn removed (deprecated, replaced by completeEvolutionsWithGainsFn batch commit)
describe.skip('[AC3][P0] submitTierUpFn — creates unit_gains entries (Task 13.1)', () => {
  it('[4.2-SFN-007] post-match.tsx exports submitTierUpFn', () => {
    const code = getPostMatchRoute()
    expect(code).toMatch(/export const submitTierUpFn/)
  })

  it('[4.2-SFN-008] submitTierUpFn uses POST method', () => {
    const code = getPostMatchRoute()
    expect(code).toMatch(/submitTierUpFn\s*=\s*createServerFn\(\s*\{[\s\S]{0,100}method\s*:\s*['"]POST['"]/)
  })

  it('[4.2-SFN-009] submitTierUpFn uses authMiddleware', () => {
    const code = getPostMatchRoute()
    expect(code).toMatch(/submitTierUpFn[\s\S]{0,400}\.middleware\(\[authMiddleware\]\)/)
  })

  it('[4.2-SFN-010] submitTierUpFn uses submitTierUpSchema for input validation', () => {
    const code = getPostMatchRoute()
    expect(code).toMatch(/submitTierUpFn[\s\S]{0,500}submitTierUpSchema/)
  })

  it('[4.2-SFN-011] submitTierUpFn calls insertUnitGain for each improvement', () => {
    const code = getPostMatchRoute()
    expect(code).toMatch(/submitTierUpFn[\s\S]{0,2000}insertUnitGain/)
  })

  it('[4.2-SFN-012] submitTierUpFn imports insertUnitGain from db/queries (dynamic import pattern)', () => {
    const code = getPostMatchRoute()
    expect(code).toMatch(/insertUnitGain[\s\S]{0,400}import\(['"][\s\S]{0,80}queries['"]/)
  })

  it('[4.2-SFN-013] submitTierUpFn passes improvement.description to insertUnitGain', () => {
    const code = getPostMatchRoute()
    expect(code).toMatch(/submitTierUpFn[\s\S]{0,2000}insertUnitGain[\s\S]{0,200}description/)
  })

  it('[4.2-SFN-014] submitTierUpFn returns ServerResult with unitId and gainsCreated', () => {
    const code = getPostMatchRoute()
    expect(code).toMatch(/submitTierUpFn[\s\S]{0,2000}(unitId[\s\S]{0,200}gainsCreated|gainsCreated[\s\S]{0,200}unitId)/)
  })
})

// ---------------------------------------------------------------------------
// Task 13.2 — submitTierUpFn rejects guest session
// AC: 3
// ---------------------------------------------------------------------------

describe.skip('[AC3][P0] submitTierUpFn — rejects guest session (Task 13.2)', () => {
  it('[4.2-SFN-015] submitTierUpFn checks isGuest and returns UNAUTHORIZED', () => {
    const code = getPostMatchRoute()
    expect(code).toMatch(/submitTierUpFn[\s\S]{0,1500}isGuest[\s\S]{0,200}UNAUTHORIZED/)
  })

  it('[4.2-SFN-016] submitTierUpFn returns French error message for guest', () => {
    const code = getPostMatchRoute()
    expect(code).toMatch(/submitTierUpFn[\s\S]{0,1500}(Connexion requise|UNAUTHORIZED)/)
  })
})

// ---------------------------------------------------------------------------
// Task 13.3 — submitTierUpFn rejects unit not belonging to player's army
// AC: 3
// ---------------------------------------------------------------------------

describe.skip('[AC3][P0] submitTierUpFn — rejects unit not belonging to player army (Task 13.3)', () => {
  it('[4.2-SFN-017] submitTierUpFn calls getPlayerArmy to verify army ownership', () => {
    const code = getPostMatchRoute()
    expect(code).toMatch(/submitTierUpFn[\s\S]{0,2000}getPlayerArmy/)
  })

  it('[4.2-SFN-018] submitTierUpFn calls getUnitById to verify unit ownership', () => {
    const code = getPostMatchRoute()
    expect(code).toMatch(/submitTierUpFn[\s\S]{0,2000}getUnitById/)
  })

  it('[4.2-SFN-019] submitTierUpFn checks unit.armyId matches player army.id', () => {
    const code = getPostMatchRoute()
    // Must verify armyId match — similar to submitUnitXpFn pattern
    expect(code).toMatch(/submitTierUpFn[\s\S]{0,2000}armyId[\s\S]{0,200}army\.id|army\.id[\s\S]{0,200}armyId/)
  })

  it('[4.2-SFN-020] submitTierUpFn returns FORBIDDEN when unit not found or wrong army', () => {
    const code = getPostMatchRoute()
    expect(code).toMatch(/submitTierUpFn[\s\S]{0,2000}FORBIDDEN/)
  })

  it('[4.2-SFN-021] submitTierUpFn returns French error "n\'appartient pas" when unit not in army', () => {
    const code = getPostMatchRoute()
    expect(code).toMatch(/submitTierUpFn[\s\S]{0,2000}(appartient pas|n.appartient pas)/)
  })
})

// ---------------------------------------------------------------------------
// Task 8 — PostMatchRoute passes onSubmitTierUp to wizard
// AC: 3
// ---------------------------------------------------------------------------

describe('[AC3][P0] PostMatchRoute — passes onCompleteEvolutions to wizard (Task 8, batch commit)', () => {
  it('[4.2-SFN-022] post-match.tsx PostMatchRoute passes onCompleteEvolutions prop to PostMatchWizard', () => {
    const code = getPostMatchRoute()
    expect(code).toMatch(/<PostMatchWizard[\s\S]{0,500}onCompleteEvolutions/)
  })

  it('[4.2-SFN-023] post-match.tsx defines handleCompleteEvolutions wrapper calling completeEvolutionsWithGainsFn', () => {
    const code = getPostMatchRoute()
    expect(code).toMatch(/handleCompleteEvolutions[\s\S]{0,300}completeEvolutionsWithGainsFn/)
  })
})

// ---------------------------------------------------------------------------
// Loader update — hasMount per unit
// AC: Task 7.15
// ---------------------------------------------------------------------------

describe('[AC1][P0] loadPostMatchDataFn — includes hasMount per unit (Task 7.15)', () => {
  it('[4.2-SFN-024] post-match.tsx loader includes hasMount boolean in unit objects', () => {
    const code = getPostMatchRoute()
    expect(code).toMatch(/hasMount/)
  })

  it('[4.2-SFN-025] post-match.tsx PostMatchLoaderData units type includes hasMount', () => {
    const code = getPostMatchRoute()
    expect(code).toMatch(/PostMatchLoaderData[\s\S]{0,300}hasMount/)
  })
})
