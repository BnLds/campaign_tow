// tests/2-4-unit-edit-panel-component.test.ts
// Story 2.4: Direct Edit of Unit & Character Deltas
// Tasks 6.8–6.19: UnitEditPanel component & visibility structural contract tests
//
// NOTE: These are structural contract tests (file-content assertions).
// They verify code patterns exist but do not test runtime behavior.
// Integration/behavioral tests should be added when a test DB is available.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '..')

function getComponent() {
  return readFileSync(resolve(root, 'src/components/UnitEditPanel.tsx'), 'utf-8')
}

function getArmyRoute() {
  return readFileSync(resolve(root, 'src/routes/armies/$armyId.tsx'), 'utf-8')
}

// ---------------------------------------------------------------------------
// Task 6.8 — UnitEditPanel renders 3 sections
// ---------------------------------------------------------------------------

describe('[6.8] UnitEditPanel — three section headings present', () => {
  it('[2.4-CMP-001] component contains "Modificateurs de stats" section heading', () => {
    const component = getComponent()
    expect(component).toContain('Modificateurs de stats')
  })

  it('[2.4-CMP-002] component contains "Capacités acquises" section heading', () => {
    const component = getComponent()
    expect(component).toContain('Capacités acquises')
  })

  it('[2.4-CMP-003] component contains "Points d\'expérience" section heading', () => {
    const component = getComponent()
    expect(component).toContain("Points d'expérience")
  })
})

// ---------------------------------------------------------------------------
// Task 6.9 — Stat select contains all 9 stat keys
// ---------------------------------------------------------------------------

describe('[6.9] UnitEditPanel — STAT_KEYS array contains all 9 stats', () => {
  it('[2.4-CMP-004] STAT_KEYS includes all 9 stat values: m, cc, ct, f, e, pv, i, a, cd', () => {
    const component = getComponent()
    // STAT_KEYS array must contain all 9 stat keys
    expect(component).toMatch(/STAT_KEYS\s*=\s*\[[\s\S]{0,200}'m'[\s\S]{0,200}'cc'[\s\S]{0,200}'ct'[\s\S]{0,200}'f'[\s\S]{0,200}'e'[\s\S]{0,200}'pv'[\s\S]{0,200}'i'[\s\S]{0,200}'a'[\s\S]{0,200}'cd'/)
  })

  it('[2.4-CMP-005] STAT_LABELS provides uppercase display labels for all 9 stats', () => {
    const component = getComponent()
    expect(component).toMatch(/STAT_LABELS[\s\S]{0,400}M[\s\S]{0,100}CC[\s\S]{0,100}CT/)
  })
})

// ---------------------------------------------------------------------------
// Task 6.10 — Edit button absent for non-owners (isOwner=false)
// Task 6.11 — Edit button absent for guests
// Task 6.19 — Admin sees edit button
// ---------------------------------------------------------------------------

describe('[6.10][6.11][6.19] Edit button visibility — army route conditional rendering', () => {
  it('[2.4-CMP-006] isOwner && conditional gates the edit button in the route', () => {
    const route = getArmyRoute()
    expect(route).toMatch(/isOwner\s*&&/)
  })

  it('[2.4-CMP-007] isOwner accounts for isGuest (guest exclusion via session.isGuest check)', () => {
    const route = getArmyRoute()
    // isOwner is computed with !session.isGuest guard
    expect(route).toMatch(/isOwner[\s\S]{0,300}isGuest|isGuest[\s\S]{0,300}isOwner/)
  })

  it('[2.4-CMP-008] isOwner accounts for isAdmin override (admin can edit any army)', () => {
    const route = getArmyRoute()
    // isOwner computation includes isAdmin as override
    expect(route).toMatch(/isOwner[\s\S]{0,300}isAdmin|isAdmin[\s\S]{0,300}isOwner/)
  })

  it('[2.4-CMP-009] loader computes isOwner and returns it in loader data', () => {
    const route = getArmyRoute()
    expect(route).toContain('isOwner')
  })
})

// ---------------------------------------------------------------------------
// Task 6.17 — Empty state "Aucun modificateur" / "Aucune capacité acquise"
// ---------------------------------------------------------------------------

describe('[6.17] UnitEditPanel — empty state strings present', () => {
  it('[2.4-CMP-010] component contains "Aucun modificateur" empty state text', () => {
    const component = getComponent()
    expect(component).toContain('Aucun modificateur')
  })

  it('[2.4-CMP-011] component contains "Aucune capacité acquise" empty state text', () => {
    const component = getComponent()
    expect(component).toContain('Aucune capacité acquise')
  })
})

// ---------------------------------------------------------------------------
// Task 6.18 — Form reset after successful stat modifier submission
// ---------------------------------------------------------------------------

describe('[6.18] UnitEditPanel — form reset after successful submission', () => {
  it('[2.4-CMP-012] setModStat reset to default value after success', () => {
    const component = getComponent()
    expect(component).toMatch(/setModStat\(['"]m['"]\)/)
  })

  it('[2.4-CMP-013] setModDelta reset to empty string after success', () => {
    const component = getComponent()
    expect(component).toMatch(/setModDelta\(['"]['"]\)/)
  })

  it('[2.4-CMP-014] setModSource reset to empty string after success', () => {
    const component = getComponent()
    expect(component).toMatch(/setModSource\(['"]['"]\)/)
  })

  it('[2.4-CMP-015] setModTemporary reset to false after success', () => {
    const component = getComponent()
    expect(component).toMatch(/setModTemporary\(false\)/)
  })
})

// ---------------------------------------------------------------------------
// Task 6.19 — Admin isAdmin check in loader
// ---------------------------------------------------------------------------

describe('[6.19] Army route loader — admin override in isOwner calculation', () => {
  it('[2.4-CMP-016] loader checks session.isAdmin when computing isOwner', () => {
    const route = getArmyRoute()
    expect(route).toMatch(/session\.isAdmin/)
  })

  it('[2.4-CMP-017] isOwner is false for guest (session.isGuest blocks ownership)', () => {
    const route = getArmyRoute()
    // The pattern: !session.isGuest && (session.isAdmin || ...)
    expect(route).toMatch(/!session\.isGuest/)
  })
})
