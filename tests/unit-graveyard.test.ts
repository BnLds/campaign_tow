// tests/unit-graveyard.test.ts
// Unit Graveyard & Permanent Deletion — file-contract tests
// Pattern: readFileSync + regex assertions (no runtime DB)

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '..')

function getFile(relPath: string) {
  return readFileSync(resolve(root, relPath), 'utf-8')
}

// ---------------------------------------------------------------------------
// Schema assertions (Task 1)
// ---------------------------------------------------------------------------

describe('[P0] Schema — units table status + graveyardReason', () => {
  it('exports a unitStatusEnum with active and graveyard values', () => {
    const schema = getFile('src/db/schema.ts')
    expect(schema).toMatch(/export const unitStatusEnum\s*=\s*pgEnum\('unit_status',\s*\['active',\s*'graveyard'\]\)/)
  })

  it('units table has status column using unitStatusEnum with default active', () => {
    const schema = getFile('src/db/schema.ts')
    expect(schema).toMatch(/units[\s\S]{0,1200}status:\s*unitStatusEnum\('status'\)\.notNull\(\)\.default\('active'\)/)
  })

  it('units table has graveyardReason column as nullable text', () => {
    const schema = getFile('src/db/schema.ts')
    expect(schema).toMatch(/units[\s\S]{0,1400}graveyardReason:\s*text\('graveyard_reason'\)/)
  })
})

// ---------------------------------------------------------------------------
// Query assertions (Task 3)
// ---------------------------------------------------------------------------

describe('[P0] Queries — getUnitsForArmy filters by active status', () => {
  it('getUnitsForArmy includes status = active filter', () => {
    const code = getFile('src/db/queries/units.ts')
    expect(code).toMatch(/getUnitsForArmy[\s\S]{0,600}eq\(units\.status,\s*'active'\)/)
  })

  it('getArmyWithUnits includes status = active filter', () => {
    const code = getFile('src/db/queries/units.ts')
    expect(code).toMatch(/getArmyWithUnits[\s\S]{0,1200}eq\(units\.status,\s*'active'\)/)
  })

  it('exports getGraveyardUnits function filtering by graveyard status', () => {
    const code = getFile('src/db/queries/units.ts')
    expect(code).toMatch(/export async function getGraveyardUnits[\s\S]{0,600}eq\(units\.status,\s*'graveyard'\)/)
  })

  it('exports sendUnitToGraveyard function that sets status to graveyard', () => {
    const code = getFile('src/db/queries/units.ts')
    expect(code).toMatch(/export async function sendUnitToGraveyard[\s\S]{0,400}status:\s*'graveyard'/)
  })

  it('exports restoreUnitFromGraveyard function that sets status to active and clears reason', () => {
    const code = getFile('src/db/queries/units.ts')
    expect(code).toMatch(/export async function restoreUnitFromGraveyard[\s\S]{0,400}status:\s*'active',\s*graveyardReason:\s*null/)
  })

  it('exports deleteUnitPermanently function using db.delete', () => {
    const code = getFile('src/db/queries/units.ts')
    expect(code).toMatch(/export async function deleteUnitPermanently[\s\S]{0,300}db\s*\.\s*delete\(units\)/)
  })

  it('getUnitById selects status field (needed for server fn validation)', () => {
    const code = getFile('src/db/queries/units.ts')
    expect(code).toMatch(/getUnitById[\s\S]{0,500}status:\s*units\.status/)
  })
})

// ---------------------------------------------------------------------------
// Server function assertions (Task 4)
// ---------------------------------------------------------------------------

describe('[P0] Server functions — graveyard and deletion', () => {
  it('sendToGraveyardFn validates unit is active before graveyard', () => {
    const code = getFile('src/server-fns/unit-mutations.ts')
    expect(code).toMatch(/sendToGraveyardFn[\s\S]{0,1200}\.status\s*!==\s*'active'/)
  })

  it('sendToGraveyardFn checks for in-progress post-match', () => {
    const code = getFile('src/server-fns/unit-mutations.ts')
    expect(code).toMatch(/sendToGraveyardFn[\s\S]{0,1500}hasInProgressPostMatch/)
  })

  it('sendToGraveyardFn requires reason with min 1 and max 200 chars', () => {
    const code = getFile('src/server-fns/unit-mutations.ts')
    expect(code).toMatch(/sendToGraveyardFn[\s\S]{0,600}reason:\s*z\.string\(\)\.trim\(\)\.min\(1/)
    expect(code).toMatch(/sendToGraveyardFn[\s\S]{0,600}\.max\(200\)/)
  })

  it('deleteUnitFn validates unit ownership via assertUnitBelongsToArmy', () => {
    const code = getFile('src/server-fns/unit-mutations.ts')
    expect(code).toMatch(/deleteUnitFn[\s\S]{0,800}assertUnitBelongsToArmy/)
  })

  it('deleteUnitFn checks for in-progress post-match before deletion', () => {
    const code = getFile('src/server-fns/unit-mutations.ts')
    expect(code).toMatch(/deleteUnitFn[\s\S]{0,1500}hasInProgressPostMatch/)
  })

  it('deleteUnitFn uses deleteUnitPermanently with returning to check rows', () => {
    const code = getFile('src/server-fns/unit-mutations.ts')
    expect(code).toMatch(/deleteUnitFn[\s\S]{0,2000}deleteUnitPermanently[\s\S]{0,200}deleted\.length\s*===\s*0/)
  })

  it('restoreUnitFn validates unit is in graveyard before restore', () => {
    const code = getFile('src/server-fns/unit-mutations.ts')
    expect(code).toMatch(/restoreUnitFn[\s\S]{0,1200}\.status\s*!==\s*'graveyard'/)
  })

  it('all three server functions use armyOwnerMiddleware', () => {
    const code = getFile('src/server-fns/unit-mutations.ts')
    expect(code).toMatch(/sendToGraveyardFn[\s\S]{0,200}armyOwnerMiddleware/)
    expect(code).toMatch(/deleteUnitFn[\s\S]{0,200}armyOwnerMiddleware/)
    expect(code).toMatch(/restoreUnitFn[\s\S]{0,200}armyOwnerMiddleware/)
  })
})

// ---------------------------------------------------------------------------
// Component assertions (Tasks 6 & 7)
// ---------------------------------------------------------------------------

describe('[P1] UnitEditPanel — graveyard and delete buttons', () => {
  it('renders graveyard button with test id', () => {
    const code = getFile('src/components/unit-edit-panel/danger-zone.tsx')
    expect(code).toContain('data-testid="graveyard-button"')
  })

  it('renders graveyard reason input with test id', () => {
    const code = getFile('src/components/unit-edit-panel/danger-zone.tsx')
    expect(code).toContain('data-testid="graveyard-reason-input"')
  })

  it('renders permanent delete button with test id', () => {
    const code = getFile('src/components/unit-edit-panel/danger-zone.tsx')
    expect(code).toContain('data-testid="delete-unit-button"')
  })

  it('uses AlertDialog with AlertDialogAction for deletion confirmation containing cascade warning', () => {
    const code = getFile('src/components/unit-edit-panel/danger-zone.tsx')
    // delete-unit-button is inside an AlertDialogTrigger
    expect(code).toMatch(/AlertDialogTrigger[\s\S]{0,300}delete-unit-button/)
    // delete-unit-confirm testid is on an AlertDialogAction
    expect(code).toMatch(/<AlertDialogAction[\s\S]{0,100}data-testid="delete-unit-confirm"/)
    // Cascade warning inside AlertDialogDescription — coupled to the component
    expect(code).toMatch(/AlertDialogDescription[\s\S]{0,500}ses sous-profils, ses modificateurs de stats, ses gains/)
  })
})

describe('[P1] Army view — graveyard section', () => {
  it('renders graveyard section with test id', () => {
    const code = getFile('src/components/army-view.tsx')
    expect(code).toContain('data-testid="graveyard-section"')
  })

  it('graveyard section only shown to owners', () => {
    const code = getFile('src/components/army-view.tsx')
    expect(code).toMatch(/isOwner\s*&&\s*graveyardUnits\.length\s*>\s*0/)
  })

  it('graveyard section has restore button per unit', () => {
    const code = getFile('src/components/army-view.tsx')
    expect(code).toMatch(/data-testid=\{`restore-unit-\$\{gu\.id\}`\}/)
  })

  it('graveyard section has delete button per unit', () => {
    const code = getFile('src/components/army-view.tsx')
    expect(code).toMatch(/data-testid=\{`delete-graveyard-unit-\$\{gu\.id\}`\}/)
  })

  it('loadArmyFn fetches graveyard units alongside active units', () => {
    const code = getFile('src/server-fns/unit-queries.ts')
    expect(code).toMatch(/getGraveyardUnits[\s\S]{0,500}graveyardUnits/)
  })
})
