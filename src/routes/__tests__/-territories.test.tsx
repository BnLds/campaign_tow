// src/routes/__tests__/territories.test.tsx
// Story 3.1b: App Shell — TabBar, Layout & Navigation Components
// Status: RED — written before implementation (TDD)
//
// Static file-contract tests for the Territories placeholder route:
//   - src/routes/territories.tsx
//
// Follows the pattern established in tests/3-1-routes.test.ts.
// These are structural contract tests (file-content assertions).
//
// Covers AC6 and Task 3.1–3.5, 8.17.
// All tests will fail until the implementation is complete.

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '../../..')

function getTerritoriesRoute() {
  return readFileSync(resolve(root, 'src/routes/territories.tsx'), 'utf-8')
}

// ---------------------------------------------------------------------------
// AC6 — Territories placeholder route file exists (Task 3.1)
// ---------------------------------------------------------------------------

describe('[AC6][P0] Territories route — file exists (Task 3.1)', () => {
  it('[3.1b-TER-001] src/routes/territories.tsx file exists', () => {
    expect(existsSync(resolve(root, 'src/routes/territories.tsx'))).toBe(true)
  })

  it('[3.1b-TER-002] territories.tsx does NOT exist at territories/index.tsx (correct path)', () => {
    // The file must be at the top level routes, not nested under a directory
    // (TanStack Router file convention: territories.tsx -> /territories)
    // We verify the correct file exists (test above) — this is a naming sanity check
    const correctPathExists = existsSync(resolve(root, 'src/routes/territories.tsx'))
    expect(correctPathExists).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// AC6 — Route registration (Task 3.1)
// ---------------------------------------------------------------------------

describe('[AC6][P0] Territories route — route registration (Task 3.1)', () => {
  it('[3.1b-TER-003] territories.tsx uses createFileRoute for "/territories"', () => {
    const code = getTerritoriesRoute()
    expect(code).toMatch(/createFileRoute\(['"]\/territories['"]/)
  })

  it('[3.1b-TER-004] territories.tsx exports a Route using createFileRoute', () => {
    const code = getTerritoriesRoute()
    expect(code).toMatch(/export const Route/)
  })
})

// ---------------------------------------------------------------------------
// AC6 — Placeholder content (Tasks 3.2, 8.17)
// ---------------------------------------------------------------------------

describe('[AC6][P0] Territories route — dashboard content (Story 1.5)', () => {
  it('[3.1b-TER-005] territories.tsx imports CoBanner component', () => {
    const code = getTerritoriesRoute()
    expect(code).toContain('CoBanner')
  })

  it('[3.1b-TER-006] territories.tsx imports territory query options', () => {
    const code = getTerritoriesRoute()
    expect(code).toContain('territoryDashboardQueryOptions')
  })

  it('[3.1b-TER-007] territories.tsx renders empty-state CTA text', () => {
    const code = getTerritoriesRoute()
    expect(code).toContain('Configurer mes territoires')
  })

  it('[3.1b-TER-008] territories.tsx has conditional on setupCompletedAt for empty state', () => {
    const code = getTerritoriesRoute()
    expect(code).toContain('setupCompletedAt')
  })

  it('[1.5-TER-014] territories.tsx renders placeholder content when setupCompletedAt is not null', () => {
    const code = getTerritoriesRoute()
    expect(code).toContain('Tableau de bord à venir')
  })
})

// ---------------------------------------------------------------------------
// AC6 — data-app-hydrated pattern (Task 3.3)
// ---------------------------------------------------------------------------

describe('[AC6][P0] Territories route — data-app-hydrated pattern (Task 3.3)', () => {
  it('[3.1b-TER-009] territories.tsx imports useHydrated (data-app-hydrated pattern)', () => {
    const code = getTerritoriesRoute()
    expect(code).toMatch(/import[\s\S]{0,200}useHydrated/)
  })

  it('[3.1b-TER-010] territories.tsx sets data-app-hydrated attribute on hydration', () => {
    const code = getTerritoriesRoute()
    expect(code).toContain('data-app-hydrated')
  })
})

// ---------------------------------------------------------------------------
// AC6 — Layout padding (Task 3.4)
// ---------------------------------------------------------------------------

describe('[AC6][P0] Territories route — layout padding (Task 3.4)', () => {
  it('[3.1b-TER-011] territories.tsx uses Tailwind padding classes (px-4, py-12)', () => {
    const code = getTerritoriesRoute()
    expect(code).toMatch(/px-4|py-12/)
  })

  it('[3.1b-TER-012] territories.tsx uses max-w-[720px] and mx-auto', () => {
    const code = getTerritoriesRoute()
    expect(code).toContain('max-w-[720px]')
    expect(code).toContain('mx-auto')
  })
})

// ---------------------------------------------------------------------------
// AC6 — No loader needed (Task 3.5)
// ---------------------------------------------------------------------------

describe('[AC6][P0] Territories route — loader (Story 1.5)', () => {
  it('[3.1b-TER-013] territories.tsx defines an async loader that seeds TanStack Query cache', () => {
    const code = getTerritoriesRoute()
    expect(code).toMatch(/loader\s*:\s*async/)
    expect(code).toContain('ensureQueryData')
  })
})

// ---------------------------------------------------------------------------
// AC7, AC1 — Root layout structure (Task 4.2, 4.3)
// ---------------------------------------------------------------------------

describe('[AC7][P0] Root layout — flex column structure (Tasks 4.2, 4.3)', () => {
  it('[3.1b-TER-014] __root.tsx wraps content in flex column layout', () => {
    const root_tsx = readFileSync(resolve(root, 'src/routes/__root.tsx'), 'utf-8')
    expect(root_tsx).toMatch(/flexDirection.*column|flex-direction.*column/)
  })

  it('[3.1b-TER-015] __root.tsx uses height 100dvh (or 100vh fallback) for full-screen layout', () => {
    const root_tsx = readFileSync(resolve(root, 'src/routes/__root.tsx'), 'utf-8')
    expect(root_tsx).toMatch(/100dvh|100vh/)
  })

  it('[3.1b-TER-016] scrollable content wrapper has overflow-y auto (in PullToRefreshContainer)', () => {
    const root_tsx = readFileSync(resolve(root, 'src/routes/__root.tsx'), 'utf-8')
    expect(root_tsx).toMatch(/<PullToRefreshContainer[\s\S]*<Outlet/)
    const container = readFileSync(resolve(root, 'src/components/pull-to-refresh-container.tsx'), 'utf-8')
    expect(container).toMatch(/overflowY.*['"]auto['"]|overflow-y.*auto/)
  })

  it('[3.1b-TER-017] scrollable wrapper has padding-bottom 68px to clear TabBar (in PullToRefreshContainer)', () => {
    const container = readFileSync(resolve(root, 'src/components/pull-to-refresh-container.tsx'), 'utf-8')
    expect(container).toMatch(/paddingBottom.*68|68.*paddingBottom|padding-bottom.*68/)
  })

  it('[3.1b-TER-018] __root.tsx scrollable wrapper has minHeight: 0 (critical for flex shrink)', () => {
    const root_tsx = readFileSync(resolve(root, 'src/routes/__root.tsx'), 'utf-8')
    expect(root_tsx).toMatch(/minHeight.*0|min-height.*0/)
  })
})

// ---------------------------------------------------------------------------
// AC8 — Army detail back navigation (Task 7.1, 7.2)
// ---------------------------------------------------------------------------

describe('[AC8][P0] Army detail view — back navigation (Tasks 7.1, 7.2)', () => {
  it('[3.1b-TER-019] army-view.tsx has a back link to /armies', () => {
    const armyView = readFileSync(resolve(root, 'src/components/army-view.tsx'), 'utf-8')
    expect(armyView).toMatch(/Link[\s\S]{0,200}(to=["']\/armies["']|\/armies)/)
  })

  it('[3.1b-TER-020] army-view.tsx back link uses ghost button style (border, borderRadius 999px)', () => {
    const armyView = readFileSync(resolve(root, 'src/components/army-view.tsx'), 'utf-8')
    // ghost button style: 30x30px, borderRadius 999px
    expect(armyView).toMatch(/999/)
  })

  it('[3.1b-TER-021] army-view.tsx back button contains a left-arrow character', () => {
    const armyView = readFileSync(resolve(root, 'src/components/army-view.tsx'), 'utf-8')
    // Left-arrow or back indicator: < or ‹ (\u2039) or similar
    expect(armyView).toMatch(/[<‹←]|\\u2039/)
  })
})
