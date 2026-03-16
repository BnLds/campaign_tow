// tests/integration/army-import.test.ts
// Story 2.1: OWB Army Import & Player Assignment
// Status: RED — written before implementation (ATDD)
//
// Verifies: AC1 (schema, queries, validators, server fns), AC3 (assignment, middleware), AC4 (error handling)
//
// Project pattern: static file-contract tests (read source, assert structure).
// No test.skip() — tests fail naturally when source doesn't match expectations.
// Tests pass once all story 2.1 tasks are complete.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Project root = two levels up from tests/integration/
const root = resolve(__dirname, '../..')

// ---------------------------------------------------------------------------
// AC1 — Schema: armies table (Task 1.1)
// ---------------------------------------------------------------------------

describe('[AC1][P0] Schema — armies table — src/db/schema.ts', () => {
  it('[2.1-INT-001] schema.ts exports "armies" pgTable (same export declaration)', () => {
    const schema = readFileSync(resolve(root, 'src/db/schema.ts'), 'utf-8')
    expect(schema).toMatch(/export const armies\s*=\s*pgTable/)
  })

  it('[2.1-INT-002] armies.playerId is nullable FK referencing players.id with ON DELETE SET NULL', () => {
    const schema = readFileSync(resolve(root, 'src/db/schema.ts'), 'utf-8')
    // playerId nullable FK + onDelete set null must be on the same references() call
    expect(schema).toMatch(/player_id[\s\S]{0,200}\.references\(\(\)\s*=>\s*players\.id,\s*\{\s*onDelete:\s*['"]set null['"]/)
  })

  it('[2.1-INT-003] armies table has name (text NOT NULL) and faction (text NOT NULL) columns', () => {
    const schema = readFileSync(resolve(root, 'src/db/schema.ts'), 'utf-8')
    // Both must appear inside the armies table definition
    expect(schema).toMatch(/armies[\s\S]{0,500}text\('name'\)\.notNull/)
    expect(schema).toMatch(/armies[\s\S]{0,500}text\('faction'\)\.notNull/)
  })
})

// ---------------------------------------------------------------------------
// AC1 — Schema: units table (Task 1.2)
// ---------------------------------------------------------------------------

describe('[AC1][P0] Schema — units table — src/db/schema.ts', () => {
  it('[2.1-INT-004] schema.ts exports "units" pgTable (same export declaration)', () => {
    const schema = readFileSync(resolve(root, 'src/db/schema.ts'), 'utf-8')
    expect(schema).toMatch(/export const units\s*=\s*pgTable/)
  })

  it('[2.1-INT-005] units.armyId FK references armies.id with ON DELETE CASCADE', () => {
    const schema = readFileSync(resolve(root, 'src/db/schema.ts'), 'utf-8')
    // army_id FK and CASCADE must be coupled on the same references() call
    expect(schema).toMatch(/army_id[\s\S]{0,200}\.references\(\(\)\s*=>\s*armies\.id,\s*\{\s*onDelete:\s*['"]cascade['"]/)
  })

  it('[2.1-INT-006] units.xp is integer with DEFAULT 0 (XP tracking from campaign start)', () => {
    const schema = readFileSync(resolve(root, 'src/db/schema.ts'), 'utf-8')
    // xp integer and default(0) must be coupled inside units table
    expect(schema).toMatch(/units[\s\S]{0,800}xp[\s\S]{0,100}integer[\s\S]{0,50}\.default\(0\)/)
  })
})

// ---------------------------------------------------------------------------
// AC1 — Schema: sub_profiles table (Task 1.3)
// ---------------------------------------------------------------------------

describe('[AC1][P0] Schema — sub_profiles table — src/db/schema.ts', () => {
  it('[2.1-INT-007] schema.ts exports "subProfiles" pgTable (same export declaration)', () => {
    const schema = readFileSync(resolve(root, 'src/db/schema.ts'), 'utf-8')
    expect(schema).toMatch(/export const subProfiles\s*=\s*pgTable/)
  })

  it('[2.1-INT-008] subProfiles.unitId FK references units.id with ON DELETE CASCADE', () => {
    const schema = readFileSync(resolve(root, 'src/db/schema.ts'), 'utf-8')
    expect(schema).toMatch(/unit_id[\s\S]{0,200}\.references\(\(\)\s*=>\s*units\.id,\s*\{\s*onDelete:\s*['"]cascade['"]/)
  })

  it('[2.1-INT-009] stat columns (m, cc, ct, f, e, pv, i, a, cd) are text type — not integer (dice expressions must be preserved)', () => {
    const schema = readFileSync(resolve(root, 'src/db/schema.ts'), 'utf-8')
    // All 9 stat columns must be text inside subProfiles — not integer
    // Check a representative sample: m and cd must be text columns in sub_profiles table
    expect(schema).toMatch(/subProfiles[\s\S]{0,1200}text\('m'\)/)
    expect(schema).toMatch(/subProfiles[\s\S]{0,1200}text\('cd'\)/)
  })

  it("[2.1-INT-010] stat columns are nullable — OWB may omit stats for some sub-profiles", () => {
    const schema = readFileSync(resolve(root, 'src/db/schema.ts'), 'utf-8')
    // m column must NOT have .notNull() — it is nullable
    expect(schema).not.toMatch(/text\('m'\)\.notNull/)
  })
})

// ---------------------------------------------------------------------------
// AC1 — DB queries: army CRUD functions (Task 3)
// ---------------------------------------------------------------------------

describe('[AC1][P0] DB queries — src/db/queries.ts', () => {
  it('[2.1-INT-011] queries.ts exports createArmyWithUnits as async function', () => {
    const queries = readFileSync(resolve(root, 'src/db/queries.ts'), 'utf-8')
    expect(queries).toContain('export async function createArmyWithUnits')
  })

  it('[2.1-INT-012] createArmyWithUnits uses db.transaction for atomic insert (AC4 — no partial data on failure)', () => {
    const queries = readFileSync(resolve(root, 'src/db/queries.ts'), 'utf-8')
    // transaction must be inside the createArmyWithUnits function body
    expect(queries).toMatch(/createArmyWithUnits[\s\S]{0,500}\.transaction/)
  })

  it('[2.1-INT-013] queries.ts exports assignArmyToPlayer as async function', () => {
    const queries = readFileSync(resolve(root, 'src/db/queries.ts'), 'utf-8')
    expect(queries).toContain('export async function assignArmyToPlayer')
  })

  it('[2.1-INT-014] queries.ts exports getArmyById as async function', () => {
    const queries = readFileSync(resolve(root, 'src/db/queries.ts'), 'utf-8')
    expect(queries).toContain('export async function getArmyById')
  })

  it('[2.1-INT-015] queries.ts exports getAllArmies as async function', () => {
    const queries = readFileSync(resolve(root, 'src/db/queries.ts'), 'utf-8')
    expect(queries).toContain('export async function getAllArmies')
  })

  it('[2.1-INT-017] createArmyWithUnits does NOT import bcryptjs — no auth logic in DB layer', () => {
    const queries = readFileSync(resolve(root, 'src/db/queries.ts'), 'utf-8')
    expect(queries).not.toContain('bcryptjs')
  })
})

// ---------------------------------------------------------------------------
// AC1 / AC3 — Validators: importArmySchema + assignArmySchema (Task 4)
// ---------------------------------------------------------------------------

describe('[AC1][AC3][P0] Validators — src/lib/validators.ts', () => {
  it('[2.1-INT-018] validators.ts exports importArmySchema', () => {
    const validators = readFileSync(resolve(root, 'src/lib/validators.ts'), 'utf-8')
    expect(validators).toContain('export const importArmySchema')
  })

  it('[2.1-INT-019] importArmySchema has rawText field with .min(1) — empty text rejected at validator level', () => {
    const validators = readFileSync(resolve(root, 'src/lib/validators.ts'), 'utf-8')
    // rawText and .min(1) must be coupled inside importArmySchema
    expect(validators).toMatch(/importArmySchema[\s\S]{0,300}rawText[\s\S]{0,100}\.min\(1\)/)
  })

  it('[2.1-INT-020] validators.ts exports assignArmySchema', () => {
    const validators = readFileSync(resolve(root, 'src/lib/validators.ts'), 'utf-8')
    expect(validators).toContain('export const assignArmySchema')
  })

  it('[2.1-INT-021] assignArmySchema has armyId and playerId string fields (coupled in same schema definition)', () => {
    const validators = readFileSync(resolve(root, 'src/lib/validators.ts'), 'utf-8')
    // armyId and playerId must be inside the assignArmySchema definition
    expect(validators).toMatch(/assignArmySchema[\s\S]{0,400}armyId/)
    expect(validators).toMatch(/assignArmySchema[\s\S]{0,400}playerId/)
  })
})

// ---------------------------------------------------------------------------
// AC3 — armyOwnerMiddleware: real implementation (Task 7)
// ---------------------------------------------------------------------------

describe('[AC3][P0] armyOwnerMiddleware — src/lib/middleware.ts', () => {
  it('[2.1-INT-022] middleware.ts exports armyOwnerMiddleware using createMiddleware (same declaration)', () => {
    const middleware = readFileSync(resolve(root, 'src/lib/middleware.ts'), 'utf-8')
    expect(middleware).toMatch(/export const armyOwnerMiddleware\s*=\s*createMiddleware/)
  })

  it('[2.1-INT-023] armyOwnerMiddleware chains authMiddleware (session already populated)', () => {
    const middleware = readFileSync(resolve(root, 'src/lib/middleware.ts'), 'utf-8')
    expect(middleware).toMatch(/armyOwnerMiddleware[\s\S]{0,400}\.middleware\(\[authMiddleware\]\)/)
  })

  it('[2.1-INT-024] armyOwnerMiddleware throws FORBIDDEN for non-owner non-admin (ownership check)', () => {
    const middleware = readFileSync(resolve(root, 'src/lib/middleware.ts'), 'utf-8')
    // FORBIDDEN must be inside the armyOwnerMiddleware declaration
    expect(middleware).toMatch(/armyOwnerMiddleware[\s\S]{0,800}FORBIDDEN/)
  })

  it('[2.1-INT-025] armyOwnerMiddleware checks army.playerId equality (not just admin status)', () => {
    const middleware = readFileSync(resolve(root, 'src/lib/middleware.ts'), 'utf-8')
    // playerId comparison must be inside armyOwnerMiddleware
    expect(middleware).toMatch(/armyOwnerMiddleware[\s\S]{0,800}playerId/)
  })
})

// ---------------------------------------------------------------------------
// AC1 — Admin route: importArmyFn server function (Task 5.1)
// ---------------------------------------------------------------------------

describe('[AC1][P0] Admin route server functions — src/routes/admin/index.tsx', () => {
  it('[2.1-INT-026] importArmyFn is assigned to createServerFn (same declaration)', () => {
    const adminRoute = readFileSync(resolve(root, 'src/routes/admin/index.tsx'), 'utf-8')
    expect(adminRoute).toMatch(/importArmyFn\s*=\s*createServerFn/)
  })

  it('[2.1-INT-027] importArmyFn uses .middleware([adminMiddleware]) — admin-only action', () => {
    const adminRoute = readFileSync(resolve(root, 'src/routes/admin/index.tsx'), 'utf-8')
    expect(adminRoute).toMatch(/importArmyFn\s*=\s*createServerFn[\s\S]{0,400}\.middleware\(\[adminMiddleware\]\)/)
  })

  it('[2.1-INT-028] importArmyFn uses importArmySchema as validator (coupled in same call chain)', () => {
    const adminRoute = readFileSync(resolve(root, 'src/routes/admin/index.tsx'), 'utf-8')
    expect(adminRoute).toMatch(/importArmyFn[\s\S]{0,600}importArmySchema/)
  })

  it('[2.1-INT-029] listArmiesFn is assigned to createServerFn (same declaration)', () => {
    const adminRoute = readFileSync(resolve(root, 'src/routes/admin/index.tsx'), 'utf-8')
    expect(adminRoute).toMatch(/listArmiesFn\s*=\s*createServerFn/)
  })

  it('[2.1-INT-030] assignArmyFn is assigned to createServerFn (same declaration)', () => {
    const adminRoute = readFileSync(resolve(root, 'src/routes/admin/index.tsx'), 'utf-8')
    expect(adminRoute).toMatch(/assignArmyFn\s*=\s*createServerFn/)
  })

  it('[2.1-INT-031] assignArmyFn uses .middleware([adminMiddleware]) — admin-only action', () => {
    const adminRoute = readFileSync(resolve(root, 'src/routes/admin/index.tsx'), 'utf-8')
    expect(adminRoute).toMatch(/assignArmyFn\s*=\s*createServerFn[\s\S]{0,400}\.middleware\(\[adminMiddleware\]\)/)
  })
})

// ---------------------------------------------------------------------------
// AC1 — Admin route: import-protection (dynamic imports in handlers)
// ---------------------------------------------------------------------------

describe('[AC1][P1] Admin route dynamic imports — src/routes/admin/index.tsx', () => {
  it('[2.1-INT-032] owb-parser is imported dynamically inside the handler — not at module top level', () => {
    const adminRoute = readFileSync(resolve(root, 'src/routes/admin/index.tsx'), 'utf-8')
    // Dynamic import must appear inside a function body (handler), not as a top-level import
    expect(adminRoute).toMatch(/import\(['"][\s\S]{0,50}owb-parser['"]/)
    // Must NOT be a top-level static import of owb-parser
    expect(adminRoute).not.toMatch(/^import\s+\{[^}]*parseOwbExport[^}]*\}\s*from/m)
  })

  it('[2.1-INT-033] createArmyWithUnits is imported dynamically inside the handler (DB import-protection)', () => {
    const adminRoute = readFileSync(resolve(root, 'src/routes/admin/index.tsx'), 'utf-8')
    // Destructuring comes before the import call: const { createArmyWithUnits } = await import('../db/queries')
    expect(adminRoute).toMatch(/createArmyWithUnits[\s\S]{0,300}import\(['"][\s\S]{0,50}queries['"]/)
  })
})

// ---------------------------------------------------------------------------
// AC1 — Admin route: query key invalidation (Task 6.5)
// ---------------------------------------------------------------------------

describe('[AC1][P1] Admin route query invalidation — src/routes/admin/index.tsx', () => {
  it("[2.1-INT-034] admin route invalidates [\"admin\", \"armies\"] query key after import/assignment", () => {
    const adminRoute = readFileSync(resolve(root, 'src/routes/admin/index.tsx'), 'utf-8')
    // invalidateQueries and the armies query key must be coupled in the same call
    expect(adminRoute).toMatch(/invalidateQueries[\s\S]{0,200}['"]armies['"]/)
  })
})
