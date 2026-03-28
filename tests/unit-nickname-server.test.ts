// tests/unit-nickname-server.test.ts
// Unit Nickname feature — static file-contract tests.
// Verifies server function and DB query code patterns without a test DB.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '..')

function getUnitMutations() {
  return readFileSync(resolve(root, 'src/server-fns/unit-mutations.ts'), 'utf-8')
}

function getUnitsQuery() {
  return readFileSync(resolve(root, 'src/db/queries/units.ts'), 'utf-8')
}

// ---------------------------------------------------------------------------
// updateNicknameFn — route server function
// ---------------------------------------------------------------------------

describe('[NICK-SFN] Server function — updateNicknameFn', () => {
  it('[NICK-SFN-001] updateNicknameFn is assigned to createServerFn', () => {
    expect(getUnitMutations()).toMatch(/updateNicknameFn\s*=\s*createServerFn/)
  })

  it('[NICK-SFN-002] updateNicknameFn uses armyOwnerMiddleware', () => {
    expect(getUnitMutations()).toMatch(/updateNicknameFn\s*=\s*createServerFn[\s\S]{0,600}\.middleware\(\[armyOwnerMiddleware\]\)/)
  })

  it('[NICK-SFN-003] updateNicknameFn validates nickname with max(80)', () => {
    expect(getUnitMutations()).toMatch(/updateNicknameFn[\s\S]{0,1000}max\(80\)/)
  })

  it('[NICK-SFN-004] updateNicknameFn normalizes empty string to null', () => {
    const code = getUnitMutations()
    // Must convert empty string nickname to null before saving
    expect(code).toMatch(/updateNicknameFn[\s\S]{0,2000}(=== '' \? null|=== "" \? null)/)
  })

  it('[NICK-SFN-005] updateNicknameFn performs unit-army consistency check via guard', () => {
    expect(getUnitMutations()).toMatch(/updateNicknameFn[\s\S]{0,2000}assertUnitBelongsToArmy/)
  })

  it("[NICK-SFN-006] guard returns French error when unit doesn't belong to army", () => {
    const guards = readFileSync(resolve(root, 'src/server-fns/guards.ts'), 'utf-8')
    expect(guards).toMatch(/assertUnitBelongsToArmy[\s\S]{0,1000}Cette unité n'appartient pas/)
  })

  it('[NICK-SFN-007] updateNicknameFn calls updateUnitNickname via dynamic import', () => {
    expect(getUnitMutations()).toMatch(/updateUnitNickname[\s\S]{0,300}import\(['"][\s\S]{0,80}queries['"]/)
  })

  it('[NICK-SFN-008] updateNicknameFn returns success: true on success', () => {
    expect(getUnitMutations()).toMatch(/updateNicknameFn[\s\S]{0,2000}success: true as const/)
  })
})

// ---------------------------------------------------------------------------
// updateUnitNickname — DB query
// ---------------------------------------------------------------------------

describe('[NICK-QUERY] DB query — updateUnitNickname', () => {
  it('[NICK-QUERY-001] updateUnitNickname is exported', () => {
    expect(getUnitsQuery()).toMatch(/export async function updateUnitNickname/)
  })

  it('[NICK-QUERY-002] updateUnitNickname updates units table with nickname field', () => {
    expect(getUnitsQuery()).toMatch(/updateUnitNickname[\s\S]{0,500}\.update\(units\)[\s\S]{0,200}nickname/)
  })

  it('[NICK-QUERY-003] updateUnitNickname returns boolean', () => {
    expect(getUnitsQuery()).toMatch(/updateUnitNickname[\s\S]{0,300}: Promise<boolean>/)
  })
})
