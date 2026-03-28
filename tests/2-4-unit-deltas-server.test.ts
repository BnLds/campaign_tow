// tests/2-4-unit-deltas-server.test.ts
// Story 2.4: Direct Edit of Unit & Character Deltas
// Status: RED — written before implementation (TDD)
//
// Static file-contract tests for the server mutations added to the army route file.
// Follows the pattern established in tests/integration/2-2-queries.test.ts.
//
// NOTE: These are structural contract tests (file-content assertions).
// They verify code patterns exist but do not test runtime behavior.
// Integration/behavioral tests should be added when a test DB is available.
//
// Tests cover:
//   - Server function declarations (createServerFn) and middleware wiring
//   - Input validation (delta != 0, description non-empty, xp >= 0)
//   - Unit-army consistency check pattern (AC9)
//   - armyOwnerMiddleware integration (AC6)
//   - Import-protection pattern (dynamic imports inside .handler())
//
// All tests will fail until the implementation is complete.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '..')

function getUnitMutations() {
  return readFileSync(resolve(root, 'src/server-fns/unit-mutations.ts'), 'utf-8')
}

function getUnitQueries() {
  return readFileSync(resolve(root, 'src/server-fns/unit-queries.ts'), 'utf-8')
}

function getGuards() {
  return readFileSync(resolve(root, 'src/server-fns/guards.ts'), 'utf-8')
}

// ---------------------------------------------------------------------------
// AC1, AC2 — addStatModifierFn (Task 2.1)
// ---------------------------------------------------------------------------

describe('[AC1][AC2][P0] Server function — addStatModifierFn — src/server-fns/unit-mutations.ts', () => {
  it('[2.4-SFN-001] addStatModifierFn is assigned to createServerFn', () => {
    const code = getUnitMutations()
    expect(code).toMatch(/addStatModifierFn\s*=\s*createServerFn/)
  })

  it('[2.4-SFN-002] addStatModifierFn uses armyOwnerMiddleware (AC6 ownership enforcement)', () => {
    const code = getUnitMutations()
    expect(code).toMatch(/addStatModifierFn\s*=\s*createServerFn[\s\S]{0,600}\.middleware\(\[armyOwnerMiddleware\]\)/)
  })

  it('[2.4-SFN-003] addStatModifierFn validates that delta !== 0 — rejects zero delta', () => {
    const code = getUnitMutations()
    // delta=0 must be rejected inside addStatModifierFn with French error message
    expect(code).toMatch(/addStatModifierFn[\s\S]{0,2000}(delta[\s\S]{0,100}!== 0|\.int\(\)[\s\S]{0,100}min\(|refine[\s\S]{0,200}delta|Le delta doit être)/)
  })

  it('[2.4-SFN-004] addStatModifierFn validates stat is one of the 9 valid stat keys', () => {
    const code = getUnitMutations()
    // Must enumerate or reference the 9 valid stat keys: m, cc, ct, f, e, pv, i, a, cd
    expect(code).toMatch(/addStatModifierFn[\s\S]{0,2000}(m.*cc.*ct.*f.*e.*pv.*i.*a.*cd|Stat invalide|z\.enum)/)
  })

  it('[2.4-SFN-005] addStatModifierFn validates source is non-empty (trimmed)', () => {
    const code = getUnitMutations()
    expect(code).toMatch(/addStatModifierFn[\s\S]{0,2000}(source[\s\S]{0,200}min\(1\)|La source ne peut pas être vide)/)
  })

  it('[2.4-SFN-006] addStatModifierFn performs unit-army consistency check via assertUnitBelongsToArmy (AC9)', () => {
    const code = getUnitMutations()
    expect(code).toMatch(/addStatModifierFn[\s\S]{0,2000}assertUnitBelongsToArmy/)
  })

  it("[2.4-SFN-007] assertUnitBelongsToArmy returns French error when unit doesn't belong to army (AC9)", () => {
    const guards = getGuards()
    expect(guards).toMatch(/assertUnitBelongsToArmy[\s\S]{0,2000}Cette unité n'appartient pas/)
  })

  it('[2.4-SFN-008] addStatModifierFn uses dynamic import of insertStatModifier from queries (import-protection)', () => {
    const code = getUnitMutations()
    expect(code).toMatch(/insertStatModifier[\s\S]{0,300}import\(['"][\s\S]{0,80}queries['"]/)
  })

  it('[2.4-SFN-009] addStatModifierFn returns ServerResult shape on success (success: true, data with id)', () => {
    const code = getUnitMutations()
    expect(code).toMatch(/addStatModifierFn[\s\S]{0,2000}success:\s*true/)
  })
})

// ---------------------------------------------------------------------------
// AC7 — removeStatModifierFn (Task 2.2)
// ---------------------------------------------------------------------------

describe('[AC7][P0] Server function — removeStatModifierFn — src/server-fns/unit-mutations.ts', () => {
  it('[2.4-SFN-010] removeStatModifierFn is assigned to createServerFn', () => {
    const code = getUnitMutations()
    expect(code).toMatch(/removeStatModifierFn\s*=\s*createServerFn/)
  })

  it('[2.4-SFN-011] removeStatModifierFn uses armyOwnerMiddleware (AC6)', () => {
    const code = getUnitMutations()
    expect(code).toMatch(/removeStatModifierFn\s*=\s*createServerFn[\s\S]{0,600}\.middleware\(\[armyOwnerMiddleware\]\)/)
  })

  it('[2.4-SFN-012] removeStatModifierFn accepts modifierId in its input schema', () => {
    const code = getUnitMutations()
    expect(code).toMatch(/removeStatModifierFn[\s\S]{0,800}modifierId/)
  })

  it('[2.4-SFN-013] removeStatModifierFn uses dynamic import of deleteStatModifier from queries', () => {
    const code = getUnitMutations()
    expect(code).toMatch(/deleteStatModifier[\s\S]{0,300}import\(['"][\s\S]{0,80}queries['"]/)
  })
})

// ---------------------------------------------------------------------------
// AC3 — addUnitGainFn (Task 2.3)
// ---------------------------------------------------------------------------

describe('[AC3][P0] Server function — addUnitGainFn — src/server-fns/unit-mutations.ts', () => {
  it('[2.4-SFN-014] addUnitGainFn is assigned to createServerFn', () => {
    const code = getUnitMutations()
    expect(code).toMatch(/addUnitGainFn\s*=\s*createServerFn/)
  })

  it('[2.4-SFN-015] addUnitGainFn uses armyOwnerMiddleware (AC6)', () => {
    const code = getUnitMutations()
    expect(code).toMatch(/addUnitGainFn\s*=\s*createServerFn[\s\S]{0,600}\.middleware\(\[armyOwnerMiddleware\]\)/)
  })

  it('[2.4-SFN-016] addUnitGainFn validates description is non-empty (trimmed, min 1)', () => {
    const code = getUnitMutations()
    // z.string().trim().min(1) or equivalent French error
    expect(code).toMatch(/addUnitGainFn[\s\S]{0,2000}(description[\s\S]{0,200}min\(1\)|La description ne peut pas être vide)/)
  })

  it('[2.4-SFN-017] addUnitGainFn performs unit-army consistency check via assertUnitBelongsToArmy (AC9)', () => {
    const code = getUnitMutations()
    expect(code).toMatch(/addUnitGainFn[\s\S]{0,2000}assertUnitBelongsToArmy/)
  })

  it('[2.4-SFN-018] addUnitGainFn uses dynamic import of insertUnitGain from queries', () => {
    const code = getUnitMutations()
    expect(code).toMatch(/insertUnitGain[\s\S]{0,300}import\(['"][\s\S]{0,80}queries['"]/)
  })
})

// ---------------------------------------------------------------------------
// AC8 — removeUnitGainFn (Task 2.4)
// ---------------------------------------------------------------------------

describe('[AC8][P0] Server function — removeUnitGainFn — src/server-fns/unit-mutations.ts', () => {
  it('[2.4-SFN-019] removeUnitGainFn is assigned to createServerFn', () => {
    const code = getUnitMutations()
    expect(code).toMatch(/removeUnitGainFn\s*=\s*createServerFn/)
  })

  it('[2.4-SFN-020] removeUnitGainFn uses armyOwnerMiddleware (AC6)', () => {
    const code = getUnitMutations()
    expect(code).toMatch(/removeUnitGainFn\s*=\s*createServerFn[\s\S]{0,600}\.middleware\(\[armyOwnerMiddleware\]\)/)
  })

  it('[2.4-SFN-021] removeUnitGainFn accepts gainId in its input schema', () => {
    const code = getUnitMutations()
    expect(code).toMatch(/removeUnitGainFn[\s\S]{0,800}gainId/)
  })

  it('[2.4-SFN-022] removeUnitGainFn uses dynamic import of deleteUnitGain from queries', () => {
    const code = getUnitMutations()
    expect(code).toMatch(/deleteUnitGain[\s\S]{0,300}import\(['"][\s\S]{0,80}queries['"]/)
  })
})

// ---------------------------------------------------------------------------
// AC4, AC5 — updateXpFn (Task 2.5)
// ---------------------------------------------------------------------------

describe('[AC4][AC5][P0] Server function — updateXpFn — src/server-fns/unit-mutations.ts', () => {
  it('[2.4-SFN-023] updateXpFn is assigned to createServerFn', () => {
    const code = getUnitMutations()
    expect(code).toMatch(/updateXpFn\s*=\s*createServerFn/)
  })

  it('[2.4-SFN-024] updateXpFn uses armyOwnerMiddleware (AC6)', () => {
    const code = getUnitMutations()
    expect(code).toMatch(/updateXpFn\s*=\s*createServerFn[\s\S]{0,600}\.middleware\(\[armyOwnerMiddleware\]\)/)
  })

  it('[2.4-SFN-025] updateXpFn validates xp >= 0 and is integer — rejects negative XP', () => {
    const code = getUnitMutations()
    // z.number().int().min(0) or equivalent French error
    expect(code).toMatch(/updateXpFn[\s\S]{0,2000}(\.int\(\)[\s\S]{0,100}\.min\(0\)|\.min\(0\)[\s\S]{0,100}\.int\(\)|XP doit être)/)
  })

  it('[2.4-SFN-026] updateXpFn performs unit-army consistency check via assertUnitBelongsToArmy (AC9)', () => {
    const code = getUnitMutations()
    expect(code).toMatch(/updateXpFn[\s\S]{0,2000}assertUnitBelongsToArmy/)
  })

  it('[2.4-SFN-027] updateXpFn uses dynamic import of updateUnitXp from queries', () => {
    const code = getUnitMutations()
    expect(code).toMatch(/updateUnitXp[\s\S]{0,300}import\(['"][\s\S]{0,80}queries['"]/)
  })

  it('[2.4-SFN-028] updateXpFn recalculates tier using calculateTier() and returns it in response', () => {
    const code = getUnitMutations()
    // calculateTier must be called inside updateXpFn and its result returned
    expect(code).toMatch(/updateXpFn[\s\S]{0,2000}calculateTier/)
  })

  it('[2.4-SFN-029] updateXpFn returns ServerResult with xp and tier in data (AC4, AC5)', () => {
    const code = getUnitMutations()
    // Response must contain both xp and tier in the success data
    expect(code).toMatch(/updateXpFn[\s\S]{0,2000}xp[\s\S]{0,100}tier|tier[\s\S]{0,100}xp/)
  })
})

// ---------------------------------------------------------------------------
// AC1, AC3, AC4 — fetchUnitDeltasFn (Task 2.6) — used by edit panel to pre-load data
// ---------------------------------------------------------------------------

describe('[AC1][AC3][P0] Server function — fetchUnitDeltasFn — src/server-fns/unit-queries.ts', () => {
  it('[2.4-SFN-030] fetchUnitDeltasFn is assigned to createServerFn with GET method', () => {
    const code = getUnitQueries()
    expect(code).toMatch(/fetchUnitDeltasFn\s*=\s*createServerFn/)
  })

  it('[2.4-SFN-031] fetchUnitDeltasFn uses armyOwnerMiddleware (ownership verification — H1 fix)', () => {
    const code = getUnitQueries()
    expect(code).toMatch(/fetchUnitDeltasFn\s*=\s*createServerFn[\s\S]{0,600}\.middleware\(\[armyOwnerMiddleware\]\)/)
  })

  it('[2.4-SFN-032] fetchUnitDeltasFn accepts unitId parameter', () => {
    const code = getUnitQueries()
    expect(code).toMatch(/fetchUnitDeltasFn[\s\S]{0,400}unitId/)
  })

  it('[2.4-SFN-033] fetchUnitDeltasFn returns both statModifiers and unitGains (full rows with IDs)', () => {
    const code = getUnitQueries()
    expect(code).toMatch(/fetchUnitDeltasFn[\s\S]{0,2000}statModifiers[\s\S]{0,200}unitGains|unitGains[\s\S]{0,200}statModifiers/)
  })

  it('[2.4-SFN-034] fetchUnitDeltasFn uses dynamic imports of getStatModifiers and getUnitGains', () => {
    const code = getUnitQueries()
    expect(code).toMatch(/getStatModifiers[\s\S]{0,300}import\(['"][\s\S]{0,80}queries['"]/)
    expect(code).toMatch(/getUnitGains[\s\S]{0,300}import\(['"][\s\S]{0,80}queries['"]/)
  })
})

// ---------------------------------------------------------------------------
// AC6 — armyOwnerMiddleware import in route file
// ---------------------------------------------------------------------------

describe('[AC6][P0] Middleware import — armyOwnerMiddleware — src/server-fns/unit-mutations.ts', () => {
  it('[2.4-SFN-035] armyOwnerMiddleware is imported in the unit mutations file', () => {
    const code = getUnitMutations()
    expect(code).toMatch(/import[\s\S]{0,200}armyOwnerMiddleware[\s\S]{0,200}middleware/)
  })
})

// ---------------------------------------------------------------------------
// AC6 — armyOwnerMiddleware behaviour (src/lib/middleware.ts — already exists)
// ---------------------------------------------------------------------------

describe('[AC6][P0] armyOwnerMiddleware behaviour — src/lib/middleware.ts', () => {
  it('[2.4-MW-001] armyOwnerMiddleware rejects guest users (isGuest: true → UNAUTHORIZED)', () => {
    const middleware = readFileSync(resolve(root, 'src/lib/middleware.ts'), 'utf-8')
    // isGuest check must be inside armyOwnerMiddleware (already implemented — verify contract)
    expect(middleware).toMatch(/armyOwnerMiddleware[\s\S]{0,600}isGuest[\s\S]{0,100}UNAUTHORIZED/)
  })

  it('[2.4-MW-002] armyOwnerMiddleware throws FORBIDDEN for non-owner non-admin player', () => {
    const middleware = readFileSync(resolve(root, 'src/lib/middleware.ts'), 'utf-8')
    expect(middleware).toMatch(/armyOwnerMiddleware[\s\S]{0,800}FORBIDDEN/)
  })

  it('[2.4-MW-003] armyOwnerMiddleware allows admin to bypass ownership check', () => {
    const middleware = readFileSync(resolve(root, 'src/lib/middleware.ts'), 'utf-8')
    // isAdmin must be an exception in the ownership check
    expect(middleware).toMatch(/armyOwnerMiddleware[\s\S]{0,800}isAdmin/)
  })
})

// ---------------------------------------------------------------------------
// AC9 — Unit-army consistency: unit-army consistency pattern used in all mutations
// ---------------------------------------------------------------------------

describe('[AC9][P0] Unit-army consistency validation — src/server-fns/guards.ts', () => {
  it('[2.4-CON-001] guards file uses getUnitById (query) for consistency checks', () => {
    const guards = getGuards()
    expect(guards).toContain('getUnitById')
  })

  it('[2.4-CON-002] guards file contains French error message for cross-army injection attempt', () => {
    const guards = getGuards()
    expect(guards).toContain("Cette unité n'appartient pas à cette armée")
  })

  it('[2.4-CON-003] consistency check verifies unit.armyId matches request armyId', () => {
    const guards = getGuards()
    // Pattern: unit.armyId !== armyId (or equivalent)
    expect(guards).toMatch(/unit\.armyId\s*!==\s*(data\.armyId|armyId)|armyId\s*!==\s*unit\.armyId/)
  })

  it('[2.4-CON-004] no direct static import of getUnitById at top level (must be dynamic import in handler)', () => {
    const guards = getGuards()
    // Must NOT have top-level import of getUnitById
    expect(guards).not.toMatch(/^import\s+\{[^}]*getUnitById[^}]*\}\s*from/m)
  })
})

// ---------------------------------------------------------------------------
// AC1–AC5 — Route loader extended with isOwner flag (Task 4.2)
// ---------------------------------------------------------------------------

describe('[AC1][AC6][P1] Route loader — isOwner flag — src/server-fns/unit-queries.ts', () => {
  it('[2.4-LDR-001] loadArmyFn returns isOwner boolean in its response', () => {
    const code = getUnitQueries()
    expect(code).toContain('isOwner')
  })

  it('[2.4-LDR-002] isOwner is calculated by comparing session.playerId with army.playerId', () => {
    const code = getUnitQueries()
    expect(code).toMatch(/isOwner[\s\S]{0,300}(playerId|isAdmin)/)
  })
})
