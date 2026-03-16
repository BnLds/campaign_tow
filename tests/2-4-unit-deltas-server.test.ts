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

function getArmyRoute() {
  return readFileSync(resolve(root, 'src/routes/armies/$armyId.tsx'), 'utf-8')
}

// ---------------------------------------------------------------------------
// AC1, AC2 — addStatModifierFn (Task 2.1)
// ---------------------------------------------------------------------------

describe('[AC1][AC2][P0] Server function — addStatModifierFn — src/routes/armies/$armyId.tsx', () => {
  it('[2.4-SFN-001] addStatModifierFn is assigned to createServerFn', () => {
    const route = getArmyRoute()
    expect(route).toMatch(/addStatModifierFn\s*=\s*createServerFn/)
  })

  it('[2.4-SFN-002] addStatModifierFn uses armyOwnerMiddleware (AC6 ownership enforcement)', () => {
    const route = getArmyRoute()
    expect(route).toMatch(/addStatModifierFn\s*=\s*createServerFn[\s\S]{0,600}\.middleware\(\[armyOwnerMiddleware\]\)/)
  })

  it('[2.4-SFN-003] addStatModifierFn validates that delta !== 0 — rejects zero delta', () => {
    const route = getArmyRoute()
    // delta=0 must be rejected inside addStatModifierFn with French error message
    expect(route).toMatch(/addStatModifierFn[\s\S]{0,2000}(delta[\s\S]{0,100}!== 0|\.int\(\)[\s\S]{0,100}min\(|refine[\s\S]{0,200}delta|Le delta doit être)/)
  })

  it('[2.4-SFN-004] addStatModifierFn validates stat is one of the 9 valid stat keys', () => {
    const route = getArmyRoute()
    // Must enumerate or reference the 9 valid stat keys: m, cc, ct, f, e, pv, i, a, cd
    expect(route).toMatch(/addStatModifierFn[\s\S]{0,2000}(m.*cc.*ct.*f.*e.*pv.*i.*a.*cd|Stat invalide|z\.enum)/)
  })

  it('[2.4-SFN-005] addStatModifierFn validates source is non-empty (trimmed)', () => {
    const route = getArmyRoute()
    expect(route).toMatch(/addStatModifierFn[\s\S]{0,2000}(source[\s\S]{0,200}min\(1\)|La source ne peut pas être vide)/)
  })

  it('[2.4-SFN-006] addStatModifierFn performs unit-army consistency check (AC9)', () => {
    const route = getArmyRoute()
    // Must call getUnitById and verify unit.armyId === armyId
    expect(route).toMatch(/addStatModifierFn[\s\S]{0,2000}getUnitById/)
  })

  it("[2.4-SFN-007] addStatModifierFn returns French error when unit doesn't belong to army (AC9)", () => {
    const route = getArmyRoute()
    expect(route).toMatch(/addStatModifierFn[\s\S]{0,2000}Cette unité n'appartient pas/)
  })

  it('[2.4-SFN-008] addStatModifierFn uses dynamic import of insertStatModifier from queries (import-protection)', () => {
    const route = getArmyRoute()
    expect(route).toMatch(/insertStatModifier[\s\S]{0,300}import\(['"][\s\S]{0,80}queries['"]/)
  })

  it('[2.4-SFN-009] addStatModifierFn returns ServerResult shape on success (success: true, data with id)', () => {
    const route = getArmyRoute()
    expect(route).toMatch(/addStatModifierFn[\s\S]{0,2000}success:\s*true/)
  })
})

// ---------------------------------------------------------------------------
// AC7 — removeStatModifierFn (Task 2.2)
// ---------------------------------------------------------------------------

describe('[AC7][P0] Server function — removeStatModifierFn — src/routes/armies/$armyId.tsx', () => {
  it('[2.4-SFN-010] removeStatModifierFn is assigned to createServerFn', () => {
    const route = getArmyRoute()
    expect(route).toMatch(/removeStatModifierFn\s*=\s*createServerFn/)
  })

  it('[2.4-SFN-011] removeStatModifierFn uses armyOwnerMiddleware (AC6)', () => {
    const route = getArmyRoute()
    expect(route).toMatch(/removeStatModifierFn\s*=\s*createServerFn[\s\S]{0,600}\.middleware\(\[armyOwnerMiddleware\]\)/)
  })

  it('[2.4-SFN-012] removeStatModifierFn accepts modifierId in its input schema', () => {
    const route = getArmyRoute()
    expect(route).toMatch(/removeStatModifierFn[\s\S]{0,800}modifierId/)
  })

  it('[2.4-SFN-013] removeStatModifierFn uses dynamic import of deleteStatModifier from queries', () => {
    const route = getArmyRoute()
    expect(route).toMatch(/deleteStatModifier[\s\S]{0,300}import\(['"][\s\S]{0,80}queries['"]/)
  })
})

// ---------------------------------------------------------------------------
// AC3 — addUnitGainFn (Task 2.3)
// ---------------------------------------------------------------------------

describe('[AC3][P0] Server function — addUnitGainFn — src/routes/armies/$armyId.tsx', () => {
  it('[2.4-SFN-014] addUnitGainFn is assigned to createServerFn', () => {
    const route = getArmyRoute()
    expect(route).toMatch(/addUnitGainFn\s*=\s*createServerFn/)
  })

  it('[2.4-SFN-015] addUnitGainFn uses armyOwnerMiddleware (AC6)', () => {
    const route = getArmyRoute()
    expect(route).toMatch(/addUnitGainFn\s*=\s*createServerFn[\s\S]{0,600}\.middleware\(\[armyOwnerMiddleware\]\)/)
  })

  it('[2.4-SFN-016] addUnitGainFn validates description is non-empty (trimmed, min 1)', () => {
    const route = getArmyRoute()
    // z.string().trim().min(1) or equivalent French error
    expect(route).toMatch(/addUnitGainFn[\s\S]{0,2000}(description[\s\S]{0,200}min\(1\)|La description ne peut pas être vide)/)
  })

  it('[2.4-SFN-017] addUnitGainFn performs unit-army consistency check (AC9)', () => {
    const route = getArmyRoute()
    expect(route).toMatch(/addUnitGainFn[\s\S]{0,2000}getUnitById/)
  })

  it('[2.4-SFN-018] addUnitGainFn uses dynamic import of insertUnitGain from queries', () => {
    const route = getArmyRoute()
    expect(route).toMatch(/insertUnitGain[\s\S]{0,300}import\(['"][\s\S]{0,80}queries['"]/)
  })
})

// ---------------------------------------------------------------------------
// AC8 — removeUnitGainFn (Task 2.4)
// ---------------------------------------------------------------------------

describe('[AC8][P0] Server function — removeUnitGainFn — src/routes/armies/$armyId.tsx', () => {
  it('[2.4-SFN-019] removeUnitGainFn is assigned to createServerFn', () => {
    const route = getArmyRoute()
    expect(route).toMatch(/removeUnitGainFn\s*=\s*createServerFn/)
  })

  it('[2.4-SFN-020] removeUnitGainFn uses armyOwnerMiddleware (AC6)', () => {
    const route = getArmyRoute()
    expect(route).toMatch(/removeUnitGainFn\s*=\s*createServerFn[\s\S]{0,600}\.middleware\(\[armyOwnerMiddleware\]\)/)
  })

  it('[2.4-SFN-021] removeUnitGainFn accepts gainId in its input schema', () => {
    const route = getArmyRoute()
    expect(route).toMatch(/removeUnitGainFn[\s\S]{0,800}gainId/)
  })

  it('[2.4-SFN-022] removeUnitGainFn uses dynamic import of deleteUnitGain from queries', () => {
    const route = getArmyRoute()
    expect(route).toMatch(/deleteUnitGain[\s\S]{0,300}import\(['"][\s\S]{0,80}queries['"]/)
  })
})

// ---------------------------------------------------------------------------
// AC4, AC5 — updateXpFn (Task 2.5)
// ---------------------------------------------------------------------------

describe('[AC4][AC5][P0] Server function — updateXpFn — src/routes/armies/$armyId.tsx', () => {
  it('[2.4-SFN-023] updateXpFn is assigned to createServerFn', () => {
    const route = getArmyRoute()
    expect(route).toMatch(/updateXpFn\s*=\s*createServerFn/)
  })

  it('[2.4-SFN-024] updateXpFn uses armyOwnerMiddleware (AC6)', () => {
    const route = getArmyRoute()
    expect(route).toMatch(/updateXpFn\s*=\s*createServerFn[\s\S]{0,600}\.middleware\(\[armyOwnerMiddleware\]\)/)
  })

  it('[2.4-SFN-025] updateXpFn validates xp >= 0 and is integer — rejects negative XP', () => {
    const route = getArmyRoute()
    // z.number().int().min(0) or equivalent French error
    expect(route).toMatch(/updateXpFn[\s\S]{0,2000}(\.int\(\)[\s\S]{0,100}\.min\(0\)|\.min\(0\)[\s\S]{0,100}\.int\(\)|XP doit être)/)
  })

  it('[2.4-SFN-026] updateXpFn performs unit-army consistency check (AC9)', () => {
    const route = getArmyRoute()
    expect(route).toMatch(/updateXpFn[\s\S]{0,2000}getUnitById/)
  })

  it('[2.4-SFN-027] updateXpFn uses dynamic import of updateUnitXp from queries', () => {
    const route = getArmyRoute()
    expect(route).toMatch(/updateUnitXp[\s\S]{0,300}import\(['"][\s\S]{0,80}queries['"]/)
  })

  it('[2.4-SFN-028] updateXpFn recalculates tier using calculateTier() and returns it in response', () => {
    const route = getArmyRoute()
    // calculateTier must be called inside updateXpFn and its result returned
    expect(route).toMatch(/updateXpFn[\s\S]{0,2000}calculateTier/)
  })

  it('[2.4-SFN-029] updateXpFn returns ServerResult with xp and tier in data (AC4, AC5)', () => {
    const route = getArmyRoute()
    // Response must contain both xp and tier in the success data
    expect(route).toMatch(/updateXpFn[\s\S]{0,2000}xp[\s\S]{0,100}tier|tier[\s\S]{0,100}xp/)
  })
})

// ---------------------------------------------------------------------------
// AC1, AC3, AC4 — fetchUnitDeltasFn (Task 2.6) — used by edit panel to pre-load data
// ---------------------------------------------------------------------------

describe('[AC1][AC3][P0] Server function — fetchUnitDeltasFn — src/routes/armies/$armyId.tsx', () => {
  it('[2.4-SFN-030] fetchUnitDeltasFn is assigned to createServerFn with GET method', () => {
    const route = getArmyRoute()
    expect(route).toMatch(/fetchUnitDeltasFn\s*=\s*createServerFn/)
  })

  it('[2.4-SFN-031] fetchUnitDeltasFn uses armyOwnerMiddleware (ownership verification — H1 fix)', () => {
    const route = getArmyRoute()
    expect(route).toMatch(/fetchUnitDeltasFn\s*=\s*createServerFn[\s\S]{0,600}\.middleware\(\[armyOwnerMiddleware\]\)/)
  })

  it('[2.4-SFN-032] fetchUnitDeltasFn accepts unitId parameter', () => {
    const route = getArmyRoute()
    expect(route).toMatch(/fetchUnitDeltasFn[\s\S]{0,400}unitId/)
  })

  it('[2.4-SFN-033] fetchUnitDeltasFn returns both statModifiers and unitGains (full rows with IDs)', () => {
    const route = getArmyRoute()
    expect(route).toMatch(/fetchUnitDeltasFn[\s\S]{0,2000}statModifiers[\s\S]{0,200}unitGains|unitGains[\s\S]{0,200}statModifiers/)
  })

  it('[2.4-SFN-034] fetchUnitDeltasFn uses dynamic imports of getStatModifiers and getUnitGains', () => {
    const route = getArmyRoute()
    expect(route).toMatch(/getStatModifiers[\s\S]{0,300}import\(['"][\s\S]{0,80}queries['"]/)
    expect(route).toMatch(/getUnitGains[\s\S]{0,300}import\(['"][\s\S]{0,80}queries['"]/)
  })
})

// ---------------------------------------------------------------------------
// AC6 — armyOwnerMiddleware import in route file
// ---------------------------------------------------------------------------

describe('[AC6][P0] Middleware import — armyOwnerMiddleware — src/routes/armies/$armyId.tsx', () => {
  it('[2.4-SFN-035] armyOwnerMiddleware is imported in the army route file', () => {
    const route = getArmyRoute()
    expect(route).toMatch(/import[\s\S]{0,200}armyOwnerMiddleware[\s\S]{0,200}middleware/)
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

describe('[AC9][P0] Unit-army consistency validation — src/routes/armies/$armyId.tsx', () => {
  it('[2.4-CON-001] route file uses getUnitById (new query) for consistency checks', () => {
    const route = getArmyRoute()
    expect(route).toContain('getUnitById')
  })

  it('[2.4-CON-002] route file contains French error message for cross-army injection attempt', () => {
    const route = getArmyRoute()
    expect(route).toContain("Cette unité n'appartient pas à cette armée")
  })

  it('[2.4-CON-003] consistency check verifies unit.armyId matches request armyId', () => {
    const route = getArmyRoute()
    // Pattern: unit.armyId !== data.armyId (or equivalent)
    expect(route).toMatch(/unit\.armyId\s*!==\s*(data\.armyId|armyId)|armyId\s*!==\s*unit\.armyId/)
  })

  it('[2.4-CON-004] no direct static import of getUnitById at top level (must be dynamic import in handler)', () => {
    const route = getArmyRoute()
    // Must NOT have top-level import of getUnitById
    expect(route).not.toMatch(/^import\s+\{[^}]*getUnitById[^}]*\}\s*from/m)
  })
})

// ---------------------------------------------------------------------------
// AC1–AC5 — Route loader extended with isOwner flag (Task 4.2)
// ---------------------------------------------------------------------------

describe('[AC1][AC6][P1] Route loader — isOwner flag — src/routes/armies/$armyId.tsx', () => {
  it('[2.4-LDR-001] route loader returns isOwner boolean in its response', () => {
    const route = getArmyRoute()
    expect(route).toContain('isOwner')
  })

  it('[2.4-LDR-002] isOwner is calculated by comparing session.playerId with army.playerId', () => {
    const route = getArmyRoute()
    expect(route).toMatch(/isOwner[\s\S]{0,300}(playerId|isAdmin)/)
  })
})
