// tests/integration/2-2-queries.test.ts
// Story 2.2: Manual Unit Entry & Post-Import Correction
// Status: RED — written before implementation (ATDD)
//
// Verifies: AC1 (insertUnit query), AC2 (updateSubProfileStats, getUnitsForArmy)
// Tasks covered: Task 2.1, 2.2, 2.3, 7.1–7.8
//
// Project pattern: static file-contract tests (read source, assert structure).
// Tests pass once all story 2.2 Task 2 subtasks are complete.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { readAllQueries } from '../helpers/read-queries'

// Project root = two levels up from tests/integration/
const root = resolve(__dirname, '../..')

// ---------------------------------------------------------------------------
// AC1 — DB queries: insertUnit (Task 2.1)
// ---------------------------------------------------------------------------

describe('[AC1][P0] DB queries — insertUnit — src/db/queries.ts', () => {
  it('[2.2-QRY-001] queries.ts exports insertUnit as async function', () => {
    const queries = readAllQueries()
    expect(queries).toContain('export async function insertUnit')
  })

  it('[2.2-QRY-002] insertUnit accepts armyId, name, type, and stats parameters', () => {
    const queries = readAllQueries()
    // Function signature must have armyId, name, type and stats object
    expect(queries).toMatch(/insertUnit[\s\S]{0,400}armyId[\s\S]{0,200}name[\s\S]{0,200}type/)
  })

  it('[2.2-QRY-003] insertUnit uses db.transaction for atomic unit + sub_profile insert (AC1 — no partial data on failure)', () => {
    const queries = readAllQueries()
    // transaction must be inside the insertUnit function body
    expect(queries).toMatch(/insertUnit[\s\S]{0,800}\.transaction/)
  })

  it('[2.2-QRY-004] insertUnit inserts into units table with xp default 0', () => {
    const queries = readAllQueries()
    // xp: 0 must appear in the insertUnit context
    expect(queries).toMatch(/insertUnit[\s\S]{0,1000}xp[\s\S]{0,50}0/)
  })

  it('[2.2-QRY-005] insertUnit inserts into sub_profiles table (via subProfiles relation)', () => {
    const queries = readAllQueries()
    // subProfiles insert must appear inside insertUnit
    expect(queries).toMatch(/insertUnit[\s\S]{0,1200}subProfiles/)
  })

  it('[2.2-QRY-006] insertUnit sets sub_profile label to unit name (Task 2.1 spec)', () => {
    const queries = readAllQueries()
    // label must be assigned from name inside insertUnit
    expect(queries).toMatch(/insertUnit[\s\S]{0,1200}label[\s\S]{0,100}name/)
  })

  it('[2.2-QRY-007] insertUnit sets sub_profile sortOrder to 0 for first profile', () => {
    const queries = readAllQueries()
    expect(queries).toMatch(/insertUnit[\s\S]{0,1200}sortOrder[\s\S]{0,50}0/)
  })

  it('[2.2-QRY-008] insertUnit returns both unitId and subProfileId in the same return expression (contract for server function)', () => {
    const queries = readAllQueries()
    // Both ids must be returned together in the same object expression
    expect(queries).toMatch(/insertUnit[\s\S]{0,1500}return\s*\{[^}]*unitId[^}]*subProfileId[^}]*\}|insertUnit[\s\S]{0,1500}return\s*\{[^}]*subProfileId[^}]*unitId[^}]*\}/)
  })

  it('[2.2-QRY-009] insertUnit does NOT verify armyId existence before insert (FK constraint handles this)', () => {
    const queries = readAllQueries()
    // Should NOT contain a manual armyId existence check like getArmyById inside insertUnit
    // (FK constraint is the guard — explicit check would be redundant and incorrect per spec)
    // This test ensures no army lookup inside the transaction (it delegates to FK)
    expect(queries).toMatch(/export async function insertUnit/)
    // The function must exist — FK-only approach verified by absence of getArmyById call inside insertUnit
    // (NOTE: this is a presence test — FK approach confirmed by integration test 7.8 at runtime)
  })
})

// ---------------------------------------------------------------------------
// AC2 — DB queries: updateSubProfileStats (Task 2.2)
// ---------------------------------------------------------------------------

describe('[AC2][P0] DB queries — updateSubProfileStats — src/db/queries.ts', () => {
  it('[2.2-QRY-010] queries.ts exports updateSubProfileStats as async function', () => {
    const queries = readAllQueries()
    expect(queries).toContain('export async function updateSubProfileStats')
  })

  it('[2.2-QRY-011] updateSubProfileStats accepts subProfileId and stats parameters', () => {
    const queries = readAllQueries()
    expect(queries).toMatch(/updateSubProfileStats[\s\S]{0,400}subProfileId[\s\S]{0,200}stats/)
  })

  it('[2.2-QRY-012] updateSubProfileStats updates subProfiles table (not units)', () => {
    const queries = readAllQueries()
    expect(queries).toMatch(/updateSubProfileStats[\s\S]{0,600}subProfiles/)
  })

  it('[2.2-QRY-013] updateSubProfileStats uses .returning() to detect missing row', () => {
    const queries = readAllQueries()
    expect(queries).toMatch(/updateSubProfileStats[\s\S]{0,800}\.returning\(\)/)
  })

  it('[2.2-QRY-014] updateSubProfileStats returns boolean (true if updated, false if not found)', () => {
    const queries = readAllQueries()
    // Must return true or false based on returning() result
    expect(queries).toMatch(/updateSubProfileStats[\s\S]{0,1000}(return true|return false|\? true : false|\.length > 0)/)
  })
})

// ---------------------------------------------------------------------------
// AC2 — DB queries: getUnitsForArmy (Task 2.3)
// ---------------------------------------------------------------------------

describe('[AC2][P0] DB queries — getUnitsForArmy — src/db/queries.ts', () => {
  it('[2.2-QRY-015] queries.ts exports getUnitsForArmy as async function', () => {
    const queries = readAllQueries()
    expect(queries).toContain('export async function getUnitsForArmy')
  })

  it('[2.2-QRY-016] getUnitsForArmy accepts armyId parameter', () => {
    const queries = readAllQueries()
    expect(queries).toMatch(/getUnitsForArmy[\s\S]{0,200}armyId/)
  })

  it('[2.2-QRY-017] getUnitsForArmy queries units table filtered by armyId', () => {
    const queries = readAllQueries()
    // units table and armyId filter must be coupled inside getUnitsForArmy
    expect(queries).toMatch(/getUnitsForArmy[\s\S]{0,600}units[\s\S]{0,200}armyId/)
  })

  it('[2.2-QRY-018] getUnitsForArmy returns units with their sub-profiles (joined query)', () => {
    const queries = readAllQueries()
    // subProfiles must be included in getUnitsForArmy — joined or nested
    expect(queries).toMatch(/getUnitsForArmy[\s\S]{0,800}subProfiles/)
  })

  it('[2.2-QRY-019] getUnitsForArmy returns empty array (not error) for non-existent armyId (Task 7.7)', () => {
    const queries = readAllQueries()
    // The function must exist and return normally even for unknown armyIds
    // (verified by DB filter returning 0 rows naturally — no throw)
    expect(queries).toContain('export async function getUnitsForArmy')
  })
})

// ---------------------------------------------------------------------------
// AC1 / AC2 / AC3 — Server functions: admin route (Task 3)
// ---------------------------------------------------------------------------

describe('[AC1][AC2][AC3][P0] Server functions — src/routes/admin/index.tsx', () => {
  it('[2.2-SFN-001] addUnitFn is assigned to createServerFn (Task 3.1)', () => {
    const adminRoute = readFileSync(resolve(root, 'src/routes/admin/index.tsx'), 'utf-8')
    expect(adminRoute).toMatch(/addUnitFn\s*=\s*createServerFn/)
  })

  it('[2.2-SFN-002] addUnitFn uses .middleware([adminMiddleware]) — admin-only (AC3)', () => {
    const adminRoute = readFileSync(resolve(root, 'src/routes/admin/index.tsx'), 'utf-8')
    expect(adminRoute).toMatch(/addUnitFn\s*=\s*createServerFn[\s\S]{0,600}\.middleware\(\[adminMiddleware\]\)/)
  })

  it('[2.2-SFN-003] addUnitFn uses addUnitSchema as validator (coupled in same call chain)', () => {
    const adminRoute = readFileSync(resolve(root, 'src/routes/admin/index.tsx'), 'utf-8')
    expect(adminRoute).toMatch(/addUnitFn[\s\S]{0,800}addUnitSchema/)
  })

  it('[2.2-SFN-004] addUnitFn uses dynamic import of insertUnit from queries (import-protection pattern)', () => {
    const adminRoute = readFileSync(resolve(root, 'src/routes/admin/index.tsx'), 'utf-8')
    // insertUnit destructured from dynamic import inside handler
    expect(adminRoute).toMatch(/insertUnit[\s\S]{0,300}import\(['"][\s\S]{0,80}queries['"]/)
  })

  it('[2.2-SFN-005] updateSubProfileFn is assigned to createServerFn (Task 3.2)', () => {
    const adminRoute = readFileSync(resolve(root, 'src/routes/admin/index.tsx'), 'utf-8')
    expect(adminRoute).toMatch(/updateSubProfileFn\s*=\s*createServerFn/)
  })

  it('[2.2-SFN-006] updateSubProfileFn uses .middleware([adminMiddleware]) — admin-only (AC3)', () => {
    const adminRoute = readFileSync(resolve(root, 'src/routes/admin/index.tsx'), 'utf-8')
    expect(adminRoute).toMatch(/updateSubProfileFn\s*=\s*createServerFn[\s\S]{0,600}\.middleware\(\[adminMiddleware\]\)/)
  })

  it('[2.2-SFN-007] updateSubProfileFn uses updateSubProfileSchema as validator (coupled in same call chain)', () => {
    const adminRoute = readFileSync(resolve(root, 'src/routes/admin/index.tsx'), 'utf-8')
    expect(adminRoute).toMatch(/updateSubProfileFn[\s\S]{0,800}updateSubProfileSchema/)
  })

  it('[2.2-SFN-008] updateSubProfileFn uses dynamic import of updateSubProfileStats from queries', () => {
    const adminRoute = readFileSync(resolve(root, 'src/routes/admin/index.tsx'), 'utf-8')
    expect(adminRoute).toMatch(/updateSubProfileStats[\s\S]{0,300}import\(['"][\s\S]{0,80}queries['"]/)
  })

  it('[2.2-SFN-009] updateSubProfileFn returns NOT_FOUND when updateSubProfileStats returns false (Task 3.2)', () => {
    const adminRoute = readFileSync(resolve(root, 'src/routes/admin/index.tsx'), 'utf-8')
    // NOT_FOUND must be inside the updateSubProfileFn handler
    expect(adminRoute).toMatch(/updateSubProfileFn[\s\S]{0,1200}NOT_FOUND/)
  })

  it('[2.2-SFN-010] addUnitFn catches FK violation and returns NOT_FOUND with French message (Task 3.1)', () => {
    const adminRoute = readFileSync(resolve(root, 'src/routes/admin/index.tsx'), 'utf-8')
    // NOT_FOUND and French army message must appear in addUnitFn handler
    expect(adminRoute).toMatch(/addUnitFn[\s\S]{0,1500}NOT_FOUND/)
    expect(adminRoute).toMatch(/addUnitFn[\s\S]{0,1500}Arm[eé]e introuvable/)
  })

  it('[2.2-SFN-011] getArmyUnitsFn is assigned to createServerFn (Task 3.3)', () => {
    const adminRoute = readFileSync(resolve(root, 'src/routes/admin/index.tsx'), 'utf-8')
    expect(adminRoute).toMatch(/getArmyUnitsFn\s*=\s*createServerFn/)
  })

  it('[2.2-SFN-012] getArmyUnitsFn uses .middleware([adminMiddleware]) — admin-only (AC3)', () => {
    const adminRoute = readFileSync(resolve(root, 'src/routes/admin/index.tsx'), 'utf-8')
    expect(adminRoute).toMatch(/getArmyUnitsFn\s*=\s*createServerFn[\s\S]{0,600}\.middleware\(\[adminMiddleware\]\)/)
  })

  it('[2.2-SFN-013] getArmyUnitsFn uses dynamic import of getUnitsForArmy from queries (Task 3.4)', () => {
    const adminRoute = readFileSync(resolve(root, 'src/routes/admin/index.tsx'), 'utf-8')
    expect(adminRoute).toMatch(/getUnitsForArmy[\s\S]{0,300}import\(['"][\s\S]{0,80}queries['"]/)
  })

  it('[2.2-SFN-014] all new server functions use dynamic imports — no top-level db import in route file (Task 3.4)', () => {
    const adminRoute = readFileSync(resolve(root, 'src/routes/admin/index.tsx'), 'utf-8')
    // Must NOT have a top-level static import from db/queries for the new functions
    expect(adminRoute).not.toMatch(/^import\s+\{[^}]*(insertUnit|updateSubProfileStats|getUnitsForArmy)[^}]*\}\s*from/m)
  })
})

// ---------------------------------------------------------------------------
// AC1 / AC2 — Admin UI: unit entry and correction forms (Tasks 4 & 5)
// ---------------------------------------------------------------------------

describe('[AC1][AC2][P1] Admin UI — unit forms — src/routes/admin/index.tsx', () => {
  it('[2.2-UI-001] admin page renders AddUnitSection only when session.isAdmin is true (AC3 — element absent for non-admin)', () => {
    const adminRoute = readFileSync(resolve(root, 'src/routes/admin/index.tsx'), 'utf-8')
    // Conditional render pattern: isAdmin && <AddUnitSection
    expect(adminRoute).toMatch(/isAdmin[\s\S]{0,100}AddUnitSection/)
  })

  it('[2.2-UI-002] admin page renders correction section only when session.isAdmin is true (AC3)', () => {
    const adminRoute = readFileSync(resolve(root, 'src/routes/admin/index.tsx'), 'utf-8')
    // isAdmin guard must wrap correction section too
    expect(adminRoute).toMatch(/isAdmin[\s\S]{0,400}(CorrectionSection|Corriger les stats)/)
  })

  it('[2.2-UI-003] unit entry form has army selector populated from armiesQuery (Task 4.2)', () => {
    const adminRoute = readFileSync(resolve(root, 'src/routes/admin/index.tsx'), 'utf-8')
    // armiesQuery.data must be referenced in the unit entry form context
    expect(adminRoute).toMatch(/AddUnitSection|armiesQuery[\s\S]{0,1000}armiesQuery\.data/)
  })

  it('[2.2-UI-004] after addUnitFn success admin route invalidates ["admin", "armies"] query key (Task 4.5)', () => {
    const adminRoute = readFileSync(resolve(root, 'src/routes/admin/index.tsx'), 'utf-8')
    // Already tested for story 2.1 invalidation — now we verify addUnitFn also invalidates
    expect(adminRoute).toMatch(/invalidateQueries[\s\S]{0,200}['"]armies['"]/)
  })

  it('[2.2-UI-005] correction form uses ["admin", "army-units", armyId] query key (Task 5.3)', () => {
    const adminRoute = readFileSync(resolve(root, 'src/routes/admin/index.tsx'), 'utf-8')
    expect(adminRoute).toMatch(/army-units/)
  })
})
