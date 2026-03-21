// tests/bugfix-mount-flag.test.ts
// Structural contract tests + integration test for the isMount bugfix.
// Pattern: fs.readFileSync + string/regex assertions (no runtime mocking).

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { composeUnitView } from '../src/lib/delta-composer'
import { readAllQueries } from './helpers/read-queries'

const ROOT = join(__dirname, '..')

function readSrc(relPath: string) {
  if (relPath === 'src/db/queries.ts') return readAllQueries()
  return readFileSync(join(ROOT, relPath), 'utf-8')
}

// ---------------------------------------------------------------------------
// 1. $armyId.tsx contains toggleMountFn with armyOwnerMiddleware and correct schema
// ---------------------------------------------------------------------------

describe('[MOUNT-STRUCT-001] toggleMountFn server function declaration', () => {
  it('toggleMountFn is declared with armyOwnerMiddleware', () => {
    const code = readSrc('src/routes/armies/$armyId.tsx')
    // Coupled: declaration and middleware on the same server function block
    expect(code).toMatch(/const toggleMountFn\s*=\s*createServerFn[\s\S]{0,200}\.middleware\(\[armyOwnerMiddleware\]\)/)
  })

  it('toggleMountFn uses the correct z.object input schema', () => {
    const code = readSrc('src/routes/armies/$armyId.tsx')
    // Coupled: inputValidator and schema on the same toggleMountFn block
    expect(code).toMatch(/const toggleMountFn[\s\S]{0,300}z\.object\(\{ armyId: z\.string\(\), subProfileId: z\.string\(\), isMount: z\.boolean\(\) \}\)/)
  })
})

// ---------------------------------------------------------------------------
// 2. toggleMountFn handler contains ownership check pattern
// ---------------------------------------------------------------------------

describe('[MOUNT-STRUCT-002] toggleMountFn ownership check pattern', () => {
  it('handler fetches sub-profile then checks army ownership', () => {
    const code = readSrc('src/routes/armies/$armyId.tsx')
    // Coupled: getSubProfileById call followed by getUnitById on the returned sp.unitId
    expect(code).toMatch(/getSubProfileById\(data\.subProfileId\)[\s\S]{0,200}getUnitById\(sp\.unitId\)/)
    // Coupled: getUnitById followed by the armyId ownership check
    expect(code).toMatch(/getUnitById\(sp\.unitId\)[\s\S]{0,100}unit\.armyId !== data\.armyId/)
  })
})

// ---------------------------------------------------------------------------
// 3. queries.ts exports updateSubProfileIsMount and getSubProfileById
// ---------------------------------------------------------------------------

describe('[MOUNT-STRUCT-003] queries.ts new exports', () => {
  it('exports updateSubProfileIsMount and getSubProfileById', () => {
    const code = readSrc('src/db/queries.ts')
    expect(code).toMatch(/export async function updateSubProfileIsMount\s*\(/)
    expect(code).toMatch(/export async function getSubProfileById\s*\(/)
  })
})

// ---------------------------------------------------------------------------
// 4. UnitEditPanel contains data-testid and Switch import
// ---------------------------------------------------------------------------

describe('[MOUNT-STRUCT-004] UnitEditPanel mount toggle presence', () => {
  it('contains section-sub-profiles testid and Switch import', () => {
    const code = readSrc('src/components/unit-edit-panel.tsx')
    expect(code).toContain('data-testid="section-sub-profiles"')
    expect(code).toMatch(/import\s*\{[^}]*Switch[^}]*\}\s*from\s*['"]\.\/ui\/switch['"]/)
  })
})

// ---------------------------------------------------------------------------
// 5. UnitEditPanel section is guarded by subProfiles.length >= 2
// ---------------------------------------------------------------------------

describe('[MOUNT-STRUCT-005] UnitEditPanel conditional render guard', () => {
  it('sub-profiles section is guarded by subProfiles.length >= 2', () => {
    const code = readSrc('src/components/unit-edit-panel.tsx')
    expect(code).toContain('subProfiles.length >= 2')
  })
})

// ---------------------------------------------------------------------------
// 6. Integration: composeUnitView with isMount=true skips modifiers on mount
// ---------------------------------------------------------------------------

describe('[MOUNT-INTEGRATION-006] composeUnitView mount exclusion — full path', () => {
  it('mount sub-profile has modified=false for all stats when modifiers exist', () => {
    const rider = {
      id: 'sp-rider',
      unitId: 'unit-1',
      sortOrder: 0,
      label: 'Chevalier',
      isMount: false,
      m: '4', cc: '5', ct: '3', f: '4', e: '4', pv: '2', i: '4', a: '3', cd: '8',
    }
    const mount = {
      id: 'sp-mount',
      unitId: 'unit-1',
      sortOrder: 1,
      label: 'Destrier',
      isMount: true,
      m: '8', cc: '3', ct: null, f: '4', e: '4', pv: '1', i: '3', a: '2', cd: null,
    }
    const modifier = {
      id: 'mod-1',
      unitId: 'unit-1',
      stat: 'cc',
      delta: 1,
      source: 'tier_up',
      temporary: false,
    }

    const result = composeUnitView([rider, mount], [modifier], [])

    // Rider (index 0) gets the modifier
    expect(result.subProfiles[0].stats['cc'].modified).toBe(true)

    // Mount (index 1) — all stats unmodified
    const mountStats = result.subProfiles[1].stats
    for (const key of ['m', 'cc', 'ct', 'f', 'e', 'pv', 'i', 'a', 'cd']) {
      expect(mountStats[key].modified, `mount stat ${key} should not be modified`).toBe(false)
      expect(mountStats[key].delta, `mount stat ${key} delta should be null`).toBeNull()
    }
  })
})
