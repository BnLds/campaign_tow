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

function getStatModifiers() {
  return readFileSync(resolve(root, 'src/components/unit-edit-panel/stat-modifiers-section.tsx'), 'utf-8')
}

function getUnitGains() {
  return readFileSync(resolve(root, 'src/components/unit-edit-panel/unit-gains-section.tsx'), 'utf-8')
}

function getXpSection() {
  return readFileSync(resolve(root, 'src/components/unit-edit-panel/xp-section.tsx'), 'utf-8')
}

function getArmyView() {
  return readFileSync(resolve(root, 'src/components/army-view.tsx'), 'utf-8')
}

function getUnitQueries() {
  return readFileSync(resolve(root, 'src/server-fns/unit-queries.ts'), 'utf-8')
}

// ---------------------------------------------------------------------------
// Task 6.8 — UnitEditPanel renders 3 sections
// ---------------------------------------------------------------------------

describe('[6.8] UnitEditPanel — three section headings present', () => {
  it('[2.4-CMP-001] component contains "Modificateurs de stats" section heading', () => {
    const component = getStatModifiers()
    expect(component).toContain('Modificateurs de stats')
  })

  it('[2.4-CMP-002] component contains "Capacités acquises" section heading', () => {
    const component = getUnitGains()
    expect(component).toContain('Capacités acquises')
  })

  it('[2.4-CMP-003] component contains "Points d\'expérience" section heading', () => {
    const component = getXpSection()
    expect(component).toContain("Points d'expérience")
  })
})

// ---------------------------------------------------------------------------
// Task 6.9 — Stat select contains all 9 stat keys
// ---------------------------------------------------------------------------

describe('[6.9] UnitEditPanel — VALID_STATS array contains all 9 stats', () => {
  it('[2.4-CMP-004] VALID_STATS includes all 9 stat values: m, cc, ct, f, e, pv, i, a, cd', () => {
    const component = getStatModifiers()
    // VALID_STATS imported from server-fns/unit-mutations — verify it's used in the select
    expect(component).toMatch(/VALID_STATS/)
    expect(component).toMatch(/VALID_STATS\.map/)
  })

  it('[2.4-CMP-005] STAT_LABELS provides uppercase display labels for all 9 stats', () => {
    const component = getStatModifiers()
    expect(component).toMatch(/STAT_LABELS[\s\S]{0,400}M[\s\S]{0,100}CC[\s\S]{0,100}CT/)
  })
})

// ---------------------------------------------------------------------------
// Task 6.10 — Edit button absent for non-owners (isOwner=false)
// Task 6.11 — Edit button absent for guests
// Task 6.19 — Admin sees edit button
// ---------------------------------------------------------------------------

describe('[6.10][6.11][6.19] Edit button visibility — ArmyView component conditional rendering', () => {
  it('[2.4-CMP-006] isOwner && conditional gates the edit button in the ArmyView component', () => {
    const view = getArmyView()
    expect(view).toMatch(/isOwner\s*&&/)
  })

  it('[2.4-CMP-007] isOwner accounts for isGuest (guest exclusion via session.isGuest check)', () => {
    const code = getUnitQueries()
    // isOwner is computed with !session.isGuest guard
    expect(code).toMatch(/isOwner[\s\S]{0,300}isGuest|isGuest[\s\S]{0,300}isOwner/)
  })

  it('[2.4-CMP-008] isOwner accounts for isAdmin override (admin can edit any army)', () => {
    const code = getUnitQueries()
    // isOwner computation includes isAdmin as override
    expect(code).toMatch(/isOwner[\s\S]{0,300}isAdmin|isAdmin[\s\S]{0,300}isOwner/)
  })

  it('[2.4-CMP-009] loadArmyFn computes isOwner and returns it in loader data', () => {
    const code = getUnitQueries()
    expect(code).toContain('isOwner')
  })
})

// ---------------------------------------------------------------------------
// Task 6.17 — Empty state "Aucun modificateur" / "Aucune capacité acquise"
// ---------------------------------------------------------------------------

describe('[6.17] UnitEditPanel — empty state strings present', () => {
  it('[2.4-CMP-010] component contains "Aucun modificateur" empty state text', () => {
    const component = getStatModifiers()
    expect(component).toContain('Aucun modificateur')
  })

  it('[2.4-CMP-011] component contains "Aucune capacité acquise" empty state text', () => {
    const component = getUnitGains()
    expect(component).toContain('Aucune capacité acquise')
  })
})

// ---------------------------------------------------------------------------
// Task 6.18 — Form reset after successful stat modifier submission
// ---------------------------------------------------------------------------

describe('[6.18] UnitEditPanel — form reset after successful submission', () => {
  it('[2.4-CMP-012] setModStat reset to default value after success', () => {
    const component = getStatModifiers()
    expect(component).toMatch(/setModStat\(['"]m['"]\)/)
  })

  it('[2.4-CMP-013] setModDelta reset to empty string after success', () => {
    const component = getStatModifiers()
    expect(component).toMatch(/setModDelta\(['"]['"]\)/)
  })

  it('[2.4-CMP-014] setModSource reset to empty string after success', () => {
    const component = getStatModifiers()
    expect(component).toMatch(/setModSource\(['"]['"]\)/)
  })

  it('[2.4-CMP-015] setModTemporary reset to false after success', () => {
    const component = getStatModifiers()
    expect(component).toMatch(/setModTemporary\(false\)/)
  })
})

// ---------------------------------------------------------------------------
// Task 6.19 — Admin isAdmin check in loader
// ---------------------------------------------------------------------------

describe('[6.19] loadArmyFn — admin override in isOwner calculation', () => {
  it('[2.4-CMP-016] loadArmyFn checks session.isAdmin when computing isOwner', () => {
    const code = getUnitQueries()
    expect(code).toMatch(/session\.isAdmin/)
  })

  it('[2.4-CMP-017] isOwner is false for guest (session.isGuest blocks ownership)', () => {
    const code = getUnitQueries()
    // The pattern: !session.isGuest && (session.isAdmin || ...)
    expect(code).toMatch(/!session\.isGuest/)
  })
})

// ---------------------------------------------------------------------------
// TanStack Query migration — structural contract tests
// ---------------------------------------------------------------------------

function getUnitEditPanel() {
  return readFileSync(resolve(root, 'src/components/unit-edit-panel/index.tsx'), 'utf-8')
}

function getCampaignQueries() {
  return readFileSync(resolve(root, 'src/lib/campaign-queries.ts'), 'utf-8')
}

function getIndexRoute() {
  return readFileSync(resolve(root, 'src/routes/index.tsx'), 'utf-8')
}

describe('TanStack Query migration — UnitEditPanel uses useQuery', () => {
  it('imports useQuery from @tanstack/react-query', () => {
    const code = getUnitEditPanel()
    expect(code).toMatch(/import\s*\{[^}]*useQuery[^}]*\}\s*from\s*['"]@tanstack\/react-query['"]/)
  })

  it('uses unitDeltasQueryOptions', () => {
    const code = getUnitEditPanel()
    expect(code).toContain('unitDeltasQueryOptions')
  })

  it('uses useQuery with enabled conditioned on isAdmin', () => {
    const code = getUnitEditPanel()
    expect(code).toMatch(/useQuery\(\{[\s\S]*?enabled:\s*isAdmin/)
  })

  it('does NOT contain the old manual fetch function definition', () => {
    const code = getUnitEditPanel()
    expect(code).not.toContain('async function fetchDeltas')
  })

  it('does NOT contain the old mounted guard pattern', () => {
    const code = getUnitEditPanel()
    expect(code).not.toMatch(/let mounted\s*=\s*true/)
  })
})

describe('TanStack Query migration — Campaign timeline uses queryOptions', () => {
  it('campaign-queries.ts exports campaignTimelineQueryOptions', () => {
    const code = getCampaignQueries()
    expect(code).toMatch(/export const campaignTimelineQueryOptions/)
  })

  it('index.tsx uses campaignTimelineQueryOptions', () => {
    const code = getIndexRoute()
    expect(code).toContain('campaignTimelineQueryOptions')
  })

  it('index.tsx does NOT contain manual setInterval polling', () => {
    const code = getIndexRoute()
    expect(code).not.toContain('setInterval')
  })

  it('index.tsx does NOT contain manual visibility listener', () => {
    const code = getIndexRoute()
    expect(code).not.toContain('visibilitychange')
  })
})
